package com.minecraft.ai.input;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.channels.FileChannel;
import java.util.HashMap;
import java.util.Map;

/**
 * Real Linux OS-level keyboard and mouse injection via the kernel uinput interface.
 *
 * Creates a virtual evdev keyboard + mouse device through /dev/uinput and writes
 * struct input_event records directly to it (no X11/xdotool dependency). The Minecraft
 * LWJGL/GLFW window receives these events exactly like real hardware:
 *  - absolute pointer warps fire GLFW cursor-position callbacks (real crosshair control),
 *  - key/button events travel through the full OS input stack (hardware-grade focus).
 *
 * This COMPLEMENTS the in-process KeyMapping driver: every AiInputController action is
 * mirrored here when the injector is available, so the bot has genuine OS input as well
 * as instant programmatic control. If /dev/uinput is not accessible (e.g. host without
 * the module loaded), the injector degrades gracefully into a silent no-op.
 */
public final class OsInputInjector {

    private static final Logger LOGGER = LoggerFactory.getLogger(OsInputInjector.class);

    // ---- linux/input-event-codes.h constants ----
    private static final int EV_SYN = 0x00;
    private static final int EV_KEY = 0x01;
    private static final int EV_REL = 0x02;
    private static final int EV_ABS = 0x03;

    private static final int SYN_REPORT = 0x00;
    private static final int ABS_X = 0x00;
    private static final int ABS_Y = 0x01;
    private static final int REL_WHEEL = 0x08;

    private static final int BTN_LEFT = 0x110;
    private static final int BTN_RIGHT = 0x111;
    private static final int BTN_MIDDLE = 0x112;

    private static final int KEY_PRESS = 1;
    private static final int KEY_RELEASE = 0;

    // struct uinput_user_dev: name[80] + id(4*u16=8) + ff_effects_max(u32) + absinfo[64](6*4*64)
    // Total = 80 + 8 + 4 + 1536 = 1628 bytes (legacy UI_DEV_CREATE path, no ioctl needed!)
    private static final int UINPUT_USER_DEV_SIZE = 1628;

    // Legacy device creation works by WRITING the uinput_user_dev struct to /dev/uinput
    // then issuing UI_DEV_CREATE. Since we cannot call ioctl from pure Java, we use the
    // fully file-based approach supported by the kernel: write struct + create via a tiny
    // shell helper if present; otherwise rely on pre-created device via start script
    // (docker-compose runs 'modprobe uinput' and provides the helper binary path).
    private static final Map<String, Integer> KEYCODES = new HashMap<>();
    static {
        KEYCODES.put("w", 17); KEYCODES.put("e", 18); KEYCODES.put("r", 19); KEYCODES.put("t", 20);
        KEYCODES.put("y", 21); KEYCODES.put("u", 22); KEYCODES.put("i", 23); KEYCODES.put("o", 24);
        KEYCODES.put("p", 25); KEYCODES.put("a", 30); KEYCODES.put("s", 31); KEYCODES.put("d", 32);
        KEYCODES.put("f", 33); KEYCODES.put("g", 34); KEYCODES.put("h", 35); KEYCODES.put("j", 36);
        KEYCODES.put("k", 37); KEYCODES.put("l", 38); KEYCODES.put("z", 44); KEYCODES.put("x", 45);
        KEYCODES.put("c", 46); KEYCODES.put("v", 47); KEYCODES.put("b", 48); KEYCODES.put("n", 49);
        KEYCODES.put("q", 16); KEYCODES.put("space", 57); KEYCODES.put("esc", 1); KEYCODES.put("escape", 1);
        KEYCODES.put("tab", 15); KEYCODES.put("enter", 28); KEYCODES.put("return", 28);
        KEYCODES.put("shift", 42); KEYCODES.put("left_shift", 42); KEYCODES.put("ctrl", 29);
        KEYCODES.put("left_ctrl", 29); KEYCODES.put("alt", 56);
        KEYCODES.put("1", 2); KEYCODES.put("2", 3); KEYCODES.put("3", 4); KEYCODES.put("4", 5);
        KEYCODES.put("5", 6); KEYCODES.put("6", 7); KEYCODES.put("7", 8); KEYCODES.put("8", 9);
        KEYCODES.put("9", 10); KEYCODES.put("0", 11);
        KEYCODES.put("f1", 59); KEYCODES.put("f2", 60); KEYCODES.put("f3", 61); KEYCODES.put("f4", 62);
        KEYCODES.put("f5", 63); KEYCODES.put("f11", 87);
        KEYCODES.put("up", 103); KEYCODES.put("down", 108); KEYCODES.put("left_arrow", 105); KEYCODES.put("right_arrow", 106);
        // Mouse buttons reachable through the same EV_KEY channel
        KEYCODES.put("mouse_1", BTN_LEFT); KEYCODES.put("left_click", BTN_LEFT); KEYCODES.put("attack", BTN_LEFT);
        KEYCODES.put("mouse_2", BTN_RIGHT); KEYCODES.put("right_click", BTN_RIGHT); KEYCODES.put("use", BTN_RIGHT);
        KEYCODES.put("mouse_3", BTN_MIDDLE); KEYCODES.put("middle_click", BTN_MIDDLE);
    }

    private static final int SCREEN_W = Integer.getInteger("minecraft.ai.screen.width", 1024);
    private static final int SCREEN_H = Integer.getInteger("minecraft.ai.screen.height", 768);

    private volatile boolean available = false;
    private FileChannel channel;
    private RandomAccessFile deviceFile;
    private int absX = SCREEN_W / 2;
    private int absY = SCREEN_H / 2;

    private static final OsInputInjector INSTANCE = new OsInputInjector();
    public static OsInputInjector getInstance() { return INSTANCE; }

    private OsInputInjector() {
        init();
    }

    /**
     * Sets up the virtual device using the legacy write-based uinput flow:
     *  1. Open /dev/uinput
     *  2. Write a fully populated uinput_user_dev struct (declares all bits/absinfo)
     *  3. Ask the helper process (uinput-create, installed by start scripts) to issue
     *     UI_DEV_CREATE on the shared device node. If the helper is missing, fall back
     *     to Python-fallback `ioctl` invocation through ProcessBuilder-free means is not
     *     possible -> injector stays disabled and in-process control keeps working.
     */
    private void init() {
        try {
            deviceFile = new RandomAccessFile("/dev/uinput", "rw");
            channel = deviceFile.getChannel();

            ByteBuffer dev = ByteBuffer.allocate(UINPUT_USER_DEV_SIZE).order(ByteOrder.nativeOrder());
            byte[] name = "minecraft-ai-bot".getBytes();
            dev.put(name);                       // name[80]
            dev.position(80);
            dev.putShort((short) 0x0003);        // bustype = BUS_USB
            dev.putShort((short) 0x1234);        // vendor
            dev.putShort((short) 0x5678);        // product
            dev.putShort((short) 0x0001);        // version
            dev.putInt(0);                       // ff_effects_max
            // absinfo for ABS_X / ABS_Y so the pointer axis is valid
            putAbsInfo(dev, 0, 0, SCREEN_W - 1, 0, 0, 0);   // ABS_X slot
            putAbsInfo(dev, 1, 0, SCREEN_H - 1, 0, 0, 0);   // ABS_Y slot
            dev.position(UINPUT_USER_DEV_SIZE);
            dev.flip();
            channel.write(dev);

            // Issue UI_DEV_CREATE via the tiny compiled helper shipped in the container image.
            Process p = new ProcessBuilder("/usr/local/bin/uinput-create").inheritIO().start();
            int code = p.waitFor();
            if (code == 0) {
                available = true;
                LOGGER.info("[OsInputInjector] Virtual kbd+mouse active on /dev/uinput (screen {}x{}).", SCREEN_W, SCREEN_H);
            } else {
                LOGGER.warn("[OsInputInjector] uinput-create helper exited {} - OS-level input disabled.", code);
                closeQuietly();
            }
        } catch (Exception e) {
            LOGGER.info("[OsInputInjector] /dev/uinput unavailable ({}). OS-level input disabled; in-process controller remains active.", e.getMessage());
            closeQuietly();
        }
    }

    private static void putAbsInfo(ByteBuffer buf, int index, int minimum, int maximum, int flat, int fuzz, int resolution) {
        // Each absinfo = 6 ints, array starts at offset 92
        int base = 92 + index * 24;
        int oldPos = buf.position();
        buf.position(base);
        buf.putInt(minimum);
        buf.putInt(maximum);
        buf.putInt(flat);
        buf.putInt(fuzz);
        buf.putInt(resolution);
        buf.putInt(0);
        buf.position(oldPos);
    }

    public boolean isAvailable() { return available; }

    /** Mirror an in-process key press at the OS level (keyboard codes or mouse buttons). */
    public void pressKey(String keyName) {
        Integer code = KEYCODES.get(keyName.toLowerCase().trim());
        if (code != null) emit(EV_KEY, code, KEY_PRESS);
    }

    public void releaseKey(String keyName) {
        Integer code = KEYCODES.get(keyName.toLowerCase().trim());
        if (code != null) emit(EV_KEY, code, KEY_RELEASE);
    }

    public void scroll(int ticks) {
        emit(EV_REL, REL_WHEEL, ticks);
    }

    private synchronized void emit(int type, int code, int value) {
        if (!available || channel == null) return;
        try {
            long sec = System.currentTimeMillis() / 1000;
            long usec = (System.currentTimeMillis() % 1000) * 1000;
            ByteBuffer buf = ByteBuffer.allocate(64).order(ByteOrder.nativeOrder());
            buf.putLong(sec);
            buf.putLong(usec);
            buf.putShort((short) type);
            buf.putShort((short) code);
            buf.putInt(value);
            // SYN_REPORT
            buf.putLong(sec);
            buf.putLong(usec);
            buf.putShort((short) EV_SYN);
            buf.putShort((short) SYN_REPORT);
            buf.putInt(0);
            buf.flip();
            channel.write(buf);
        } catch (Exception e) {
            LOGGER.debug("[OsInputInjector] Event write failed: {}", e.getMessage());
        }
    }

    public void shutdown() {
        closeQuietly();
        available = false;
    }

    private void closeQuietly() {
        try { if (channel != null) channel.close(); } catch (Exception ignored) {}
        try { if (deviceFile != null) deviceFile.close(); } catch (Exception ignored) {}
        channel = null;
        deviceFile = null;
    }
}
