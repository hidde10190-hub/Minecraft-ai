package com.minecraft.ai.auth;

import net.minecraft.client.Minecraft;
import net.minecraft.client.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

/**
 * Multi-Authentication and Session Handler.
 * Dynamically switches client identity between offline (unauthenticated/cracked)
 * accounts and Microsoft Account (MSA OAuth) tokens without restarting Minecraft.
 */
public class SessionManager {

    private static final Logger LOGGER = LoggerFactory.getLogger(SessionManager.class);
    private static final SessionManager INSTANCE = new SessionManager();

    private volatile User currentSession = null;

    private SessionManager() {
        // Initialize default session with target bot name (Gemini) immediately on load
        String defaultBot = resolveDefaultUsername();
        setOfflineSession(defaultBot);
    }

    public static SessionManager getInstance() {
        return INSTANCE;
    }

    public static String resolveDefaultUsername() {
        String u = System.getProperty("minecraft.ai.botname");
        if (u == null || u.trim().isEmpty() || u.startsWith("$")) {
            u = System.getenv("MINECRAFT_BOT_USERNAME");
        }
        if (u == null || u.trim().isEmpty() || u.startsWith("$")) {
            u = System.getenv("BOT_NAME");
        }
        if (u == null || u.trim().isEmpty() || u.startsWith("$")) {
            u = "Gemini";
        }
        return u.trim();
    }

    public User getCurrentSession() {
        return currentSession;
    }

    /**
     * Replaces client session with an offline identity.
     * Computes deterministic offline player UUID compatible with offline-mode Spigot/Paper/Fabric servers.
     */
    public void setOfflineSession(String username) {
        if (username == null || username.trim().isEmpty()) {
            username = resolveDefaultUsername();
        }
        username = username.trim();
        UUID offlineUuid = UUID.nameUUIDFromBytes(("OfflinePlayer:" + username).getBytes(StandardCharsets.UTF_8));

        User offlineSession = new User(
                username,
                offlineUuid,
                "0",
                Optional.empty(),
                Optional.empty()
        );

        this.currentSession = offlineSession;
        LOGGER.info("[SessionManager] Successfully swapped session to Offline Mode: {} (UUID: {})", username, offlineUuid);
    }


    /**
     * Replaces client session with standard Microsoft Authentication (MSA) tokens.
     */
    public void setMsaSession(String username, String uuidStr, String msaAccessToken) {
        UUID uuid = uuidStr != null ? UUID.fromString(uuidStr) : UUID.nameUUIDFromBytes(username.getBytes(StandardCharsets.UTF_8));

        User msaSession = new User(
                username,
                uuid,
                msaAccessToken,
                Optional.empty(),
                Optional.empty()
        );

        this.currentSession = msaSession;
        LOGGER.info("[SessionManager] Successfully swapped session to MSA Authenticated: {} (UUID: {})", username, uuid);
    }

    public String getCurrentSessionInfo() {
        Minecraft client = Minecraft.getInstance();
        User s = client != null ? client.getUser() : null;
        if (s == null) s = this.currentSession;
        if (s == null) return "None";
        return String.format("Username: %s, UUID: %s", s.getName(), s.getProfileId());
    }

    public void inject() {
        if (currentSession == null) return;
        Minecraft client = Minecraft.getInstance();
        if (client != null) {
            try {
                java.lang.reflect.Field userField = Minecraft.class.getDeclaredField("user");
                userField.setAccessible(true);
                userField.set(client, currentSession);
            } catch (Throwable ignored) {
                // MinecraftClientMixin injects into getUser(), ensuring the custom session is returned
            }
            LOGGER.info("[SessionManager] Injected session '{}'", currentSession.getName());
        }
    }
}

