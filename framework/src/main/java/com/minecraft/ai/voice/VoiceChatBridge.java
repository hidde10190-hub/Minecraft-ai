package com.minecraft.ai.voice;

import de.maxhenkel.voicechat.api.VoicechatApi;
import de.maxhenkel.voicechat.api.VoicechatPlugin;
import de.maxhenkel.voicechat.api.events.EventRegistration;
import de.maxhenkel.voicechat.api.events.VoicechatServerStartedEvent;
import de.maxhenkel.voicechat.api.events.MicrophonePacketEvent;
import de.maxhenkel.voicechat.api.events.EntitySoundPacketEvent;
import com.minecraft.ai.network.GameStateExporter;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;

import java.util.UUID;

/**
 * Bridge for Simple Voice Chat API.
 * Captures audio packets from the player and pipes them to the AI perception engine.
 */
public class VoiceChatBridge implements VoicechatPlugin {

    private static VoiceChatBridge instance;
    private VoicechatApi api;

    @Override
    public String getPluginId() {
        return "minecraft_ai_bridge_voice";
    }

    @Override
    public void initialize(VoicechatApi api) {
        this.api = api;
        instance = this;
    }

    @Override
    public void registerEvents(EventRegistration registration) {
        // Listen for audio packets from other entities (players talking to the bot)
        registration.registerEvent(EntitySoundPacketEvent.class, this::onEntitySound);
    }

    private void onEntitySound(EntitySoundPacketEvent event) {
        if (event.getSenderConnection() == null || event.getSenderConnection().getPlayer() == null) return;
        
        UUID senderId = event.getSenderConnection().getPlayer().getUuid();
        
        // Signal the Web Dashboard that voice is being received
        com.minecraft.ai.network.GameStateExporter.broadcastLog("VOICE_HEARD_FROM:" + senderId.toString());
        
        // If the sender is nearby and talking, we can trigger an AI perception check
        // This is a placeholder for the actual audio processing pipeline.
    }

    public static void log(String message) {
        Minecraft.getInstance().execute(() -> {
            if (Minecraft.getInstance().player != null) {
                Minecraft.getInstance().player.sendSystemMessage(Component.literal("[VoiceBridge] " + message));
            }
        });
    }
}
