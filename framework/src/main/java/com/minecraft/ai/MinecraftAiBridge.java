package com.minecraft.ai;

import com.minecraft.ai.auth.SessionManager;
import com.minecraft.ai.input.AiInputController;
import com.minecraft.ai.litematica.LitematicaBridge;
import com.minecraft.ai.litematica.SyncmaticaBridge;
import com.minecraft.ai.network.GameStateExporter;
import com.minecraft.ai.standalone.AutoConnectHandler;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientLifecycleEvents;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.message.v1.ClientReceiveMessageEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Main entry point for the Minecraft AI Controller Fabric Client Mod.
 * Bootstraps the IPC WebSocket/REST server, Virtual Input Controller,
 * Session Switcher, and Litematica/Syncmatica Bridge.
 */
public class MinecraftAiBridge implements ClientModInitializer {

    public static final String MOD_ID = "minecraft-ai-bridge";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    private static MinecraftAiBridge instance;
    private GameStateExporter stateExporter;
    private AiInputController inputController;
    private LitematicaBridge litematicaBridge;
    private SyncmaticaBridge syncmaticaBridge;
    private SessionManager sessionManager;

    @Override
    public void onInitializeClient() {
        instance = this;
        LOGGER.info("[Minecraft-AI-Bridge] Initializing Fabric Client AI Bridge subsystem for Minecraft 26.2...");

        // 1. Initialize Subsystems
        this.inputController = AiInputController.getInstance();
        this.litematicaBridge = LitematicaBridge.getInstance();
        this.syncmaticaBridge = SyncmaticaBridge.getInstance();
        this.sessionManager = SessionManager.getInstance();
        this.stateExporter = new GameStateExporter(8080);

        // 2. Start WebSocket / REST Server on localhost:8080
        this.stateExporter.start();

        // 3. Register Client Tick events for telemetry streaming, input stepping, and standalone auto-connect
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            AutoConnectHandler.checkAutoConnect(client);

            if (client.player != null && client.level != null) {
                this.stateExporter.broadcastTickTelemetry(client);
            }
        });

        // 4. Register Network Connection Events to track and verify server join every time
        ClientPlayConnectionEvents.JOIN.register((handler, sender, client) -> {
            AutoConnectHandler.onServerJoin(client);
        });

        ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> {
            AutoConnectHandler.onServerDisconnect(client);
        });

        // 5. Register Chat and Game Message Listeners for AI Perception
        ClientReceiveMessageEvents.CHAT.register((message, signedMessage, sender, params, timestamp) -> {
            if (message != null) {
                String text = message.getString();
                if (!text.isEmpty()) {
                    GameStateExporter.handleIncomingChat(text);
                }
            }
        });

        ClientReceiveMessageEvents.GAME.register((message, overlay) -> {
            if (message != null && !overlay) {
                String text = message.getString();
                if (!text.isEmpty() && !text.contains("<") && !text.contains(">")) {
                    GameStateExporter.handleIncomingChat(text);
                }
            }
        });

        // 6. Register Shutdown Hook for clean socket closure
        ClientLifecycleEvents.CLIENT_STOPPING.register(client -> {
            LOGGER.info("[Minecraft-AI-Bridge] Stopping telemetry server and releasing input state...");
            if (this.stateExporter != null) {
                this.stateExporter.stop();
            }
            this.inputController.releaseAllKeys();
        });

        LOGGER.info("[Minecraft-AI-Bridge] Subsystems initialized. Listening for AI Brain orchestrators on ws://localhost:8080/ws");
    }

    public static MinecraftAiBridge getInstance() {
        return instance;
    }

    public GameStateExporter getStateExporter() {
        return stateExporter;
    }

    public AiInputController getInputController() {
        return inputController;
    }

    public LitematicaBridge getLitematicaBridge() {
        return litematicaBridge;
    }

    public SessionManager getSessionManager() {
        return sessionManager;
    }
}
