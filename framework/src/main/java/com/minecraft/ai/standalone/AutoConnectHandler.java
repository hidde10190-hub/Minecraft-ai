package com.minecraft.ai.standalone;

import com.minecraft.ai.auth.SessionManager;
import com.google.gson.JsonObject;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.ConnectScreen;
import net.minecraft.client.gui.screens.multiplayer.WarningScreen;
import net.minecraft.client.gui.screens.DisconnectedScreen;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.client.multiplayer.ServerData;
import net.minecraft.client.multiplayer.resolver.ServerAddress;
import net.minecraft.network.DisconnectionDetails;
import net.minecraft.network.chat.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Field;

/**
 * Autonomous Standalone Client Connection Manager for Minecraft 26.2.
 * Handles auto-connection on startup, automatic bypass of warning screens,
 * disconnect recovery, retry loop with backoff, and live connection verification.
 */
public class AutoConnectHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger("AutoConnectHandler");

    private static boolean initialConnectTriggered = false;
    private static int initialDelayTicks = 20; // 1 second after startup
    private static int disconnectCooldown = 60; // 3 seconds between retries
    private static int reconnectAttempts = 0;
    private static boolean isInGame = false;
    private static String lastDisconnectReason = null;
    private static long lastJoinSuccessTime = 0;
    private static volatile Field screenField = null;

    /**
     * Safely resolves the currently active Screen from the Minecraft instance across
     * all runtime mappings and access restrictions.
     */
    public static Screen getScreen(Minecraft client) {
        if (client == null) return null;
        if (screenField != null) {
            try {
                return (Screen) screenField.get(client);
            } catch (Throwable ignored) {}
        }
        try {
            for (String fieldName : new String[]{"screen", "currentScreen"}) {
                try {
                    Field f = Minecraft.class.getDeclaredField(fieldName);
                    f.setAccessible(true);
                    screenField = f;
                    return (Screen) f.get(client);
                } catch (NoSuchFieldException ignored) {}
            }
            for (Field f : Minecraft.class.getDeclaredFields()) {
                if (Screen.class.isAssignableFrom(f.getType())) {
                    f.setAccessible(true);
                    screenField = f;
                    return (Screen) f.get(client);
                }
            }
        } catch (Throwable ignored) {}
        return null;
    }

    /**
     * Called every client tick from ClientTickEvents.END_CLIENT_TICK.
     */
    public static void checkAutoConnect(Minecraft client) {
        // 1. Wait if initial splash overlay is still loading game assets
        if (client.gui != null && client.gui.overlay() != null) {
            return;
        }

        // 2. Ensure multiplayer warning screens are automatically skipped
        if (client.options != null && !client.options.skipMultiplayerWarning) {
            client.options.skipMultiplayerWarning = true;
            try {
                client.options.save();
            } catch (Exception ignored) {}
        }

        // 3. If in-game with world and player, connection is confirmed working!
        if (client.level != null && client.player != null) {
            if (!isInGame) {
                onServerJoin(client);
            }
            return;
        } else {
            isInGame = false;
        }

        Screen currentScreen = getScreen(client);

        // 4. If currently on ConnectScreen, connection is actively in progress
        if (currentScreen instanceof ConnectScreen) {
            return;
        }

        // 5. If on WarningScreen, bypass it
        if (currentScreen instanceof WarningScreen) {
            LOGGER.info("[AutoConnectHandler] Bypassing WarningScreen...");
            connect(client);
            return;
        }

        // 6. If on DisconnectedScreen (e.g. server was rebooting, kicked, connection refused)
        if (currentScreen instanceof DisconnectedScreen ds) {
            String reason = getDisconnectReason(ds);
            if (!reason.equals(lastDisconnectReason)) {
                lastDisconnectReason = reason;
                LOGGER.warn("[AutoConnectHandler] Disconnected from server. Reason: '{}'. Will retry automatically in 3 seconds...", reason);
            }

            disconnectCooldown--;
            if (disconnectCooldown <= 0) {
                disconnectCooldown = 60; // 3 seconds
                LOGGER.info("[AutoConnectHandler] Retrying server connection now [Attempt #{}] -> {}", reconnectAttempts + 1, getTargetServer());
                connect(client);
            }
            return;
        }

        // 7. Initial boot on TitleScreen
        if (!initialConnectTriggered) {
            if (initialDelayTicks > 0) {
                initialDelayTicks--;
                return;
            }
            initialConnectTriggered = true;
            LOGGER.info("[AutoConnectHandler] Game initialized. Auto-connecting to target server: {}", getTargetServer());
            connect(client);
        }
    }

    /**
     * Connects to the default configured server using the default bot username.
     */
    public static void connect(Minecraft client) {
        connect(client, getTargetServer(), getBotUsername());
    }

    /**
     * Connects to a specific target server and bot username.
     */
    public static void connect(Minecraft client, String serverHost, String botName) {
        if (serverHost == null || serverHost.trim().isEmpty()) {
            LOGGER.warn("[AutoConnectHandler] Cannot connect: target server is empty");
            return;
        }

        serverHost = serverHost.trim();
        botName = (botName != null && !botName.trim().isEmpty()) ? botName.trim() : getBotUsername();

        reconnectAttempts++;
        LOGGER.info("[AutoConnectHandler] Initiating connection [Attempt #{}] to server: {} with username: {}",
                reconnectAttempts, serverHost, botName);

        // Update session identity synchronously
        SessionManager.getInstance().setOfflineSession(botName);

        try {
            String host = serverHost.contains(":") ? serverHost.split(":")[0] : serverHost;
            int port = serverHost.contains(":") ? Integer.parseInt(serverHost.split(":")[1]) : 25565;

            ServerData serverData = new ServerData("AI-Bot-Target", host + ":" + port, ServerData.Type.OTHER);
            serverData.setResourcePackStatus(ServerData.ServerPackStatus.ENABLED);
            ServerAddress serverAddress = ServerAddress.parseString(host + ":" + port);

            client.execute(() -> {
                try {
                    client.options.skipMultiplayerWarning = true;
                    // Transition to ConnectScreen with a clean TitleScreen parent
                    // In 26.2, we use the startConnecting public method
                    Screen parentScreen = getScreen(client);
                    if (parentScreen == null) {
                        parentScreen = new TitleScreen();
                    }
                    ConnectScreen.startConnecting(parentScreen, client, serverAddress, serverData, false, null);
                } catch (Throwable t) {
                    LOGGER.error("[AutoConnectHandler] ConnectScreen failed to launch: ", t);
                }
            });
        } catch (Throwable t) {
            LOGGER.error("[AutoConnectHandler] Failed to prepare connection parameters: ", t);
        }
    }

    /**
     * Callback triggered when connection is confirmed and world is ready.
     */
    public static void onServerJoin(Minecraft client) {
        isInGame = true;
        reconnectAttempts = 0;
        lastDisconnectReason = null;
        lastJoinSuccessTime = System.currentTimeMillis();
        String serverAddr = client.getCurrentServer() != null ? client.getCurrentServer().ip : getTargetServer();
        LOGGER.info("[AutoConnectHandler] >>> JOIN CONFIRMED: Successfully joined server: {} (Player: {}, UUID: {}) <<<",
                serverAddr,
                client.getUser() != null ? client.getUser().getName() : "unknown",
                client.getUser() != null ? client.getUser().getProfileId() : "unknown");
    }

    /**
     * Callback triggered when client disconnects.
     */
    public static void onServerDisconnect(Minecraft client) {
        isInGame = false;
        disconnectCooldown = 60; // 3 seconds before next reconnect attempt
        LOGGER.warn("[AutoConnectHandler] Client disconnected from server. Scheduled auto-reconnect countdown in 3s...");
    }

    /**
     * Extracts the human-readable disconnect reason from DisconnectedScreen via reflection.
     */
    public static String getDisconnectReason(DisconnectedScreen screen) {
        try {
            for (Field f : DisconnectedScreen.class.getDeclaredFields()) {
                if (DisconnectionDetails.class.isAssignableFrom(f.getType())) {
                    f.setAccessible(true);
                    DisconnectionDetails details = (DisconnectionDetails) f.get(screen);
                    if (details != null && details.reason() != null) {
                        return details.reason().getString();
                    }
                } else if (Component.class.isAssignableFrom(f.getType())) {
                    f.setAccessible(true);
                    Component text = (Component) f.get(screen);
                    if (text != null && !text.getString().isEmpty() && !text.getString().equalsIgnoreCase("Disconnected")) {
                        return text.getString();
                    }
                }
            }
        } catch (Exception ignored) {}
        return "Disconnected from server";
    }

    /**
     * Resolves target server from system property or environment variables.
     */
    public static String getTargetServer() {
        String s = System.getProperty("minecraft.ai.server");
        if (s == null || s.trim().isEmpty() || s.startsWith("$")) {
            s = System.getenv("MINECRAFT_SERVER");
        }
        if (s == null || s.trim().isEmpty() || s.startsWith("$")) {
            s = System.getenv("MINECRAFT_SERVER_HOST");
        }
        if (s == null || s.trim().isEmpty() || s.startsWith("$")) {
            s = System.getenv("SERVER");
        }
        if (s == null || s.trim().isEmpty() || s.startsWith("$")) {
            s = "host.docker.internal:25565";
        }
        return s.trim();
    }

    /**
     * Resolves bot username from system property or environment variables.
     */
    public static String getBotUsername() {
        return SessionManager.resolveDefaultUsername();
    }


    public static boolean isInGame() {
        return isInGame;
    }

    public static int getReconnectAttempts() {
        return reconnectAttempts;
    }

    public static String getLastDisconnectReason() {
        return lastDisconnectReason;
    }

    public static long getLastJoinSuccessTime() {
        return lastJoinSuccessTime;
    }

    public static JsonObject getStatusJson() {
        JsonObject obj = new JsonObject();
        obj.addProperty("in_game", isInGame);
        obj.addProperty("server", getTargetServer());
        obj.addProperty("bot_name", getBotUsername());
        obj.addProperty("reconnect_attempts", reconnectAttempts);
        obj.addProperty("last_disconnect_reason", lastDisconnectReason);
        obj.addProperty("last_join_success_time", lastJoinSuccessTime);
        return obj;
    }

    public static void reset() {
        initialConnectTriggered = false;
        initialDelayTicks = 20;
        disconnectCooldown = 60;
        reconnectAttempts = 0;
        isInGame = false;
        lastDisconnectReason = null;
    }
}
