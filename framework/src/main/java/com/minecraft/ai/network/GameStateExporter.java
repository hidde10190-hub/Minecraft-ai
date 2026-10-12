package com.minecraft.ai.network;

import com.minecraft.ai.auth.SessionManager;
import com.minecraft.ai.input.AiInputController;
import com.minecraft.ai.litematica.LitematicaBridge;
import com.minecraft.ai.standalone.AutoConnectHandler;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import io.javalin.Javalin;
import io.javalin.websocket.WsContext;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.EntityHitResult;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Embedded High-Throughput HTTP & WebSocket IPC Server.
 * Exposes full Minecraft client telemetry (pose, vitals, inventory, raycast, entities)
 * and accepts real-time control actions from external AI Brains (Python/Node.js/Go).
 */
public class GameStateExporter {

    private static final Logger LOGGER = LoggerFactory.getLogger(GameStateExporter.class);
    private static final Gson GSON = new Gson();
    private static final List<JsonObject> recentChatMessages = new CopyOnWriteArrayList<>();
    private static final Pattern CHAT_PATTERN = Pattern.compile("^<([^>]+)>\\s*(.*)$");
    private static final Pattern BRACKET_PATTERN = Pattern.compile("^\\[([^\\]]+)\\]\\s*(.*)$");

    private final int port;
    private Javalin server;
    private final Set<WsContext> connectedSockets = ConcurrentHashMap.newKeySet();

    public GameStateExporter(int port) {
        this.port = port;
        instance = this;
    }

    /**
     * Starts the embedded Javalin server on the specified port.
     */
    public void start() {
        try {
            this.server = Javalin.create(config -> {
                config.showJavalinBanner = false;
                config.http.defaultContentType = "application/json";
            });

            // Global CORS headers for cross-origin browser & dashboard connectivity
            this.server.before(ctx -> {
                ctx.header("Access-Control-Allow-Origin", "*");
                ctx.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                ctx.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
            });

            this.server.options("/*", ctx -> {
                ctx.header("Access-Control-Allow-Origin", "*");
                ctx.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                ctx.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
                ctx.status(200);
            });

            // Root Bridge Welcome Landing (HTML for browsers, JSON for API clients)
            this.server.get("/", ctx -> {
                String accept = ctx.header("Accept");
                JsonObject status = AutoConnectHandler.getStatusJson();
                if (accept != null && accept.contains("text/html")) {
                    String botName = status.has("bot_name") ? status.get("bot_name").getAsString() : "Gemini";
                    boolean inGame = status.has("in_game") && status.get("in_game").getAsBoolean();
                    String serverTarget = status.has("server") ? status.get("server").getAsString() : "host.docker.internal:25565";
                    String html = """
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Minecraft AI Standalone Bridge</title>
                            <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f17; color: #e2e8f0; margin: 0; padding: 40px 20px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
                                .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; max-width: 600px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
                                h1 { color: #10b981; font-size: 22px; margin-top: 0; display: flex; align-items: center; gap: 8px; }
                                .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #059669; }
                                .info-box { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 13px; line-height: 1.8; }
                                .info-row { display: flex; justify-content: space-between; border-bottom: 1px solid #1e293b; padding: 4px 0; }
                                .info-row:last-child { border-bottom: none; }
                                .label { color: #94a3b8; }
                                .val { color: #38bdf8; font-weight: 600; }
                                .btn { display: inline-block; background: #10b981; color: #022c22; font-weight: 700; text-decoration: none; padding: 12px 20px; border-radius: 8px; transition: background 0.2s; text-align: center; }
                                .btn:hover { background: #34d399; }
                                code { background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #a7f3d0; font-size: 12px; }
                            </style>
                        </head>
                        <body>
                            <div class="card">
                                <h1>⚡ Minecraft AI Fabric Bridge <span class="badge">PORT %d ONLINE</span></h1>
                                <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">The standalone Fabric client IPC telemetry & control bridge is active and ready. Open the main web dashboard at port 3000 to monitor and control the AI bot.</p>
                                <div class="info-box">
                                    <div class="info-row"><span class="label">Bot Username:</span><span class="val">%s</span></div>
                                    <div class="info-row"><span class="label">Target Server:</span><span class="val">%s</span></div>
                                    <div class="info-row"><span class="label">In-Game Status:</span><span class="val" style="color: %s;">%s</span></div>
                                    <div class="info-row"><span class="label">IPC Port:</span><span class="val">%d</span></div>
                                    <div class="info-row"><span class="label">WebSocket URL:</span><span class="val"><code>ws://localhost:%d/ws</code></span></div>
                                </div>
                                <a class="btn" href="http://localhost:3000">Launch AI Web Dashboard (localhost:3000) &rarr;</a>
                            </div>
                        </body>
                        </html>
                        """.formatted(
                            this.port,
                            botName,
                            serverTarget,
                            inGame ? "#34d399" : "#fbbf24",
                            inGame ? "CONNECTED IN-GAME" : "CONNECTING / READY",
                            this.port,
                            this.port
                        );
                    ctx.contentType("text/html").result(html);
                } else {
                    JsonObject res = new JsonObject();
                    res.addProperty("status", "online");
                    res.addProperty("service", "Minecraft 26.2 AI Fabric Bridge");
                    res.addProperty("port", this.port);
                    res.addProperty("dashboard_url", "http://localhost:3000");
                    res.addProperty("websocket", "ws://localhost:" + this.port + "/ws");
                    res.add("bot", status);
                    ctx.result(GSON.toJson(res));
                }
            });

            this.server.get("/api", ctx -> {
                JsonObject res = new JsonObject();
                res.addProperty("status", "online");
                res.addProperty("service", "Minecraft 26.2 AI Fabric Bridge");
                res.addProperty("port", this.port);
                res.addProperty("dashboard_url", "http://localhost:3000");
                res.addProperty("websocket", "ws://localhost:" + this.port + "/ws");
                res.add("bot", AutoConnectHandler.getStatusJson());
                ctx.result(GSON.toJson(res));
            });

            // WebSocket Endpoint for real-time bidirectional streaming
            this.server.ws("/ws", ws -> {
                ws.onConnect(ctx -> {
                    connectedSockets.add(ctx);
                    LOGGER.info("[GameStateExporter] External AI Controller connected via WebSocket. (Active clients: {})", connectedSockets.size());
                });

                ws.onClose(ctx -> {
                    connectedSockets.remove(ctx);
                    LOGGER.info("[GameStateExporter] AI Controller disconnected from WebSocket. (Remaining clients: {})", connectedSockets.size());
                    // Safety: Release all held keys when AI disconnects
                    AiInputController.getInstance().releaseAllKeys();
                });

                ws.onMessage(ctx -> {
                    handleIncomingPacket(ctx.message());
                });

                ws.onError(ctx -> {
                    LOGGER.error("[GameStateExporter] WebSocket error occurred: ", ctx.error());
                });
            });

            // REST Endpoints
            this.server.get("/api/state", ctx -> {
                Minecraft client = Minecraft.getInstance();
                if (client.player == null || client.level == null) {
                    ctx.status(503).result("{\"error\": \"Player or world is null. Client not in active game.\"}");
                    return;
                }
                ctx.result(serializeTelemetry(client));
            });

            this.server.get("/api/litematica/diff", ctx -> {
                int limit = ctx.queryParamAsClass("limit", Integer.class).getOrDefault(250);
                ctx.result(LitematicaBridge.getInstance().getSchematicDiffJson(limit));
            });

            this.server.get("/api/litematica/materials", ctx -> {
                ctx.result(LitematicaBridge.getInstance().getRequiredMaterialsJson());
            });

            this.server.get("/api/status", ctx -> {
                ctx.result(AutoConnectHandler.getStatusJson().toString());
            });

            this.server.get("/api/chat", ctx -> {
                ctx.result(GSON.toJson(recentChatMessages));
            });

            // Real World 3D Voxel Cube Map Scan (ground-truth blocks from client world)
            this.server.get("/api/cube-map", ctx -> {
                Minecraft client = Minecraft.getInstance();
                if (client.player == null || client.level == null) {
                    ctx.status(503).result("{\"error\": \"Not in active game.\"}");
                    return;
                }
                double cx = ctx.queryParamAsClass("x", Double.class).getOrDefault(client.player.position().x);
                double cy = ctx.queryParamAsClass("y", Double.class).getOrDefault(client.player.position().y);
                double cz = ctx.queryParamAsClass("z", Double.class).getOrDefault(client.player.position().z);
                int radius = Math.min(8, Math.max(1, ctx.queryParamAsClass("radius", Integer.class).getOrDefault(3)));
                ctx.result(serializeCubeMap(client, cx, cy, cz, radius));
            });

            this.server.post("/api/action", ctx -> {
                handleIncomingPacket(ctx.body());
                ctx.result("{\"status\": \"accepted\"}");
            });

            // Session switching API (allows dynamic account swapping via HTTP)
            this.server.post("/api/session/offline", ctx -> {
                JsonObject body = GSON.fromJson(ctx.body(), JsonObject.class);
                String username = body.has("username") ? body.get("username").getAsString() : "Gemini";
                SessionManager.getInstance().setOfflineSession(username);
                ctx.result("{\"status\": \"swapped\", \"session\": \"" + SessionManager.getInstance().getCurrentSessionInfo() + "\"}");
            });

            this.server.get("/api/session", ctx -> {
                ctx.result("{\"session\": \"" + SessionManager.getInstance().getCurrentSessionInfo() + "\"}");
            });

            // Convenience route aliases for direct access
            this.server.get("/status", ctx -> ctx.result(AutoConnectHandler.getStatusJson().toString()));
            this.server.get("/state", ctx -> {
                Minecraft client = Minecraft.getInstance();
                if (client.player == null || client.level == null) {
                    ctx.status(503).result("{\"error\": \"Player or world is null. Client not in active game.\"}");
                    return;
                }
                ctx.result(serializeTelemetry(client));
            });
            this.server.get("/chat", ctx -> ctx.result(GSON.toJson(recentChatMessages)));
            this.server.get("/endpoint", ctx -> {
                JsonObject res = new JsonObject();
                res.addProperty("status", "online");
                res.addProperty("service", "Minecraft 26.2 AI Fabric Bridge");
                res.addProperty("status_url", "http://localhost:" + this.port + "/api/status");
                res.addProperty("state_url", "http://localhost:" + this.port + "/api/state");
                res.addProperty("chat_url", "http://localhost:" + this.port + "/api/chat");
                res.addProperty("websocket_url", "ws://localhost:" + this.port + "/ws");
                ctx.result(GSON.toJson(res));
            });
            this.server.get("/endpoints", ctx -> {
                JsonObject res = new JsonObject();
                res.addProperty("status", "online");
                res.addProperty("service", "Minecraft 26.2 AI Fabric Bridge");
                res.addProperty("status_url", "http://localhost:" + this.port + "/api/status");
                res.addProperty("state_url", "http://localhost:" + this.port + "/api/state");
                res.addProperty("chat_url", "http://localhost:" + this.port + "/api/chat");
                res.addProperty("websocket_url", "ws://localhost:" + this.port + "/ws");
                ctx.result(GSON.toJson(res));
            });

            // Informative 404 fallback
            this.server.error(404, ctx -> {
                if (ctx.result() == null || ctx.result().isEmpty() || ctx.result().contains("Not found")) {
                    JsonObject notFound = new JsonObject();
                    notFound.addProperty("error", "Endpoint not found: " + ctx.path());
                    notFound.addProperty("hint", "Available endpoints: / (landing), /api/status, /api/state, /api/chat, /ws, /api/action, /api/litematica/diff");
                    ctx.contentType("application/json").result(GSON.toJson(notFound));
                }
            });

            this.server.start(this.port);
            LOGGER.info("[GameStateExporter] IPC Telemetry server listening at http://0.0.0.0:{}", this.port);
        } catch (Exception e) {
            LOGGER.error("[GameStateExporter] Failed to start telemetry server on port {}: ", this.port, e);
        }
    }

    /**
     * Gracefully stops the Javalin server.
     */
    public void stop() {
        if (this.server != null) {
            this.server.stop();
            this.connectedSockets.clear();
            LOGGER.info("[GameStateExporter] Telemetry server stopped.");
        }
    }

    /**
     * Broadcasts a text log message to all connected clients.
     */
    public static void broadcastLog(String message) {
        JsonObject obj = new JsonObject();
        obj.addProperty("type", "log");
        obj.addProperty("message", message);
        obj.addProperty("timestamp", System.currentTimeMillis());
        getInstance().broadcastJson(GSON.toJson(obj));
    }

    private static String lastChatText = "";
    private static long lastChatTime = 0;

    public static synchronized void handleIncomingChat(String text) {
        if (text == null || text.trim().isEmpty()) return;
        String clean = text.trim();
        long now = System.currentTimeMillis();
        if (clean.equals(lastChatText) && (now - lastChatTime < 2000)) {
            return;
        }
        lastChatText = clean;
        lastChatTime = now;
        String sender = "Player";
        String message = clean;

        Matcher m = CHAT_PATTERN.matcher(clean);
        if (m.find()) {
            sender = m.group(1);
            message = m.group(2);
        } else {
            Matcher m2 = BRACKET_PATTERN.matcher(clean);
            if (m2.find()) {
                sender = m2.group(1);
                message = m2.group(2);
            }
        }

        JsonObject chatObj = new JsonObject();
        chatObj.addProperty("type", "chat");
        chatObj.addProperty("sender", sender);
        chatObj.addProperty("text", message);
        chatObj.addProperty("raw", clean);
        chatObj.addProperty("timestamp", System.currentTimeMillis());

        recentChatMessages.add(chatObj);
        while (recentChatMessages.size() > 50) {
            recentChatMessages.remove(0);
        }

        if (getInstance() != null) {
            getInstance().broadcastJson(GSON.toJson(chatObj));
        }
        broadcastLog("[Chat] " + clean);
    }

    private void broadcastJson(String json) {
        if (connectedSockets.isEmpty()) return;
        for (WsContext ctx : connectedSockets) {
            try {
                if (ctx.session.isOpen()) {
                    ctx.send(json);
                }
            } catch (Exception e) {
                connectedSockets.remove(ctx);
            }
        }
    }

    private static GameStateExporter instance;
    public static GameStateExporter getInstance() { return instance; }

    /**
     * Broadcasts current game state snapshot to all connected WebSocket clients.
     * Called every client tick from ClientTickEvents.END_CLIENT_TICK.
     */
    public void broadcastTickTelemetry(Minecraft client) {
        if (connectedSockets.isEmpty() || client == null) return;
        
        // Safety: only broadcast if the player is actually in a world and fully loaded
        Screen activeScreen = AutoConnectHandler.getScreen(client);
        if (client.player == null || client.level == null || (activeScreen != null && activeScreen.isPauseScreen())) {
            return;
        }

        try {
            String json = serializeTelemetry(client);
            if (json == null || json.equals("{}")) return;

            for (WsContext ctx : connectedSockets) {
                try {
                    if (ctx.session.isOpen()) {
                        ctx.send(json);
                    }
                } catch (Exception wsError) {
                    // Fail silently for individual socket errors to avoid crashing the broadcast loop
                    connectedSockets.remove(ctx);
                }
            }
        } catch (Exception e) {
            LOGGER.error("[GameStateExporter] Telemetry broadcast failed: ", e);
        }
    }

    /**
     * Serializes complete player, world, raycast, and nearby entity state into high-density JSON.
     */
    /**
     * Serializes a real-world 3D voxel cube map centered at (cx, cy, cz) with the given radius.
     * Reads actual loaded block states from the client world - this is the ground-truth sensor
     * used by all AI providers so they never hallucinate coordinates or block identities.
     */
    public String serializeCubeMap(Minecraft client, double cx, double cy, double cz, int radius) {
        LocalPlayer player = client.player;
        ClientLevel world = client.level;
        if (player == null || world == null) return "{}";

        int bx = (int) Math.floor(cx);
        int by = (int) Math.floor(cy);
        int bz = (int) Math.floor(cz);
        int r = Math.min(8, Math.max(1, radius));

        JsonArray voxels = new JsonArray();
        JsonArray ores = new JsonArray();
        JsonArray hazards = new JsonArray();
        JsonObject blockCounts = new JsonObject();
        int solidCount = 0;
        int airCount = 0;

        for (int dy = r; dy >= -r; dy--) {
            for (int dz = -r; dz <= r; dz++) {
                for (int dx = -r; dx <= r; dx++) {
                    int x = bx + dx;
                    int y = by + dy;
                    int z = bz + dz;
                    BlockPos bp = new BlockPos(x, y, z);
                    var state = world.getBlockState(bp);
                    String fullName = BuiltInRegistries.BLOCK.getKey(state.getBlock()).toString();
                    String cleanName = fullName.startsWith("minecraft:") ? fullName.substring(10) : fullName;

                    boolean isAir = "air".equals(cleanName) || "cave_air".equals(cleanName) || "void_air".equals(cleanName);
                    boolean isHazard = cleanName.contains("lava") || cleanName.contains("fire");
                    boolean isOre = cleanName.contains("ore");
                    boolean solid = !isAir && !cleanName.contains("water") && !isHazard;

                    if (solid) solidCount++; else airCount++;
                    if (!blockCounts.has(cleanName)) blockCounts.addProperty(cleanName, 0);
                    blockCounts.addProperty(cleanName, blockCounts.get(cleanName).getAsInt() + 1);

                    double dist = Math.sqrt((double) dx * dx + (double) dy * dy + (double) dz * dz);

                    if (!isAir) {
                        JsonObject v = new JsonObject();
                        v.addProperty("x", x);
                        v.addProperty("y", y);
                        v.addProperty("z", z);
                        v.addProperty("name", fullName);
                        v.addProperty("solid", solid);
                        v.addProperty("isHazard", isHazard);
                        v.addProperty("isOre", isOre);
                        voxels.add(v);
                    }
                    if (isOre) {
                        JsonObject o = new JsonObject();
                        o.addProperty("name", cleanName);
                        JsonArray posArr = new JsonArray();
                        posArr.add(x); posArr.add(y); posArr.add(z);
                        o.add("pos", posArr);
                        o.addProperty("distance", Math.round(dist * 10.0) / 10.0);
                        ores.add(o);
                    }
                    if (isHazard) {
                        JsonObject h = new JsonObject();
                        h.addProperty("name", cleanName);
                        JsonArray posArr = new JsonArray();
                        posArr.add(x); posArr.add(y); posArr.add(z);
                        h.add("pos", posArr);
                        hazards.add(h);
                    }
                }
            }
        }

        JsonObject root = new JsonObject();
        root.addProperty("source", "live_minecraft_world");
        JsonArray center = new JsonArray();
        center.add(bx); center.add(by); center.add(bz);
        root.add("center", center);
        root.addProperty("radius", r);
        JsonObject dims = new JsonObject();
        int width = r * 2 + 1;
        dims.addProperty("width", width);
        dims.addProperty("height", width);
        dims.addProperty("depth", width);
        root.add("dimensions", dims);
        root.addProperty("totalBlocks", voxels.size());
        root.addProperty("solidBlocks", solidCount);
        root.addProperty("airBlocks", airCount);

        JsonObject summary = new JsonObject();
        summary.add("ores", ores);
        summary.add("hazards", hazards);
        summary.add("blockCounts", blockCounts);
        summary.addProperty("densityPct", voxels.size() > 0 ? Math.round((solidCount / (float) (width * width * width)) * 100) : 0);
        root.add("summary", summary);
        root.add("voxels", voxels);
        return GSON.toJson(root);
    }

    public String serializeTelemetry(Minecraft client) {
        if (client == null) return "{}";
        LocalPlayer player = client.player;
        ClientLevel world = client.level;

        if (player == null || world == null) {
            return "{}";
        }

        JsonObject root = new JsonObject();
        root.addProperty("tick", client.gui != null ? System.currentTimeMillis() : 0);

        // 1. Pose and Kinematics
        JsonObject pose = new JsonObject();
        Vec3 pos = player.position();
        pose.addProperty("x", Math.round(pos.x * 1000.0) / 1000.0);
        pose.addProperty("y", Math.round(pos.y * 1000.0) / 1000.0);
        pose.addProperty("z", Math.round(pos.z * 1000.0) / 1000.0);
        pose.addProperty("yaw", Math.round(player.getYRot() * 100.0) / 100.0);
        pose.addProperty("pitch", Math.round(player.getXRot() * 100.0) / 100.0);

        // Vitals and Status
        pose.addProperty("health", player.getHealth());
        pose.addProperty("max_health", player.getMaxHealth());
        pose.addProperty("food", player.getFoodData().getFoodLevel());
        pose.addProperty("saturation", player.getFoodData().getSaturationLevel());
        pose.addProperty("air", player.getAirSupply());
        pose.addProperty("is_sneaking", player.isShiftKeyDown());
        pose.addProperty("is_sprinting", player.isSprinting());
        pose.addProperty("is_in_water", player.isInWater());
        pose.addProperty("selected_slot", player.getInventory().getSelectedSlot());
        pose.addProperty("attack_cooldown", player.getAttackStrengthScale(0.0f));
        pose.addProperty("hurt_time", player.hurtTime);
        pose.addProperty("last_attacker", player.getLastAttacker() != null ? player.getLastAttacker().getName().getString() : null);

        ItemStack mainHand = player.getMainHandItem();
        pose.addProperty("main_hand", mainHand.isEmpty() ? "minecraft:air" : BuiltInRegistries.ITEM.getKey(mainHand.getItem()).toString());
        ItemStack offHand = player.getOffhandItem();
        pose.addProperty("off_hand", offHand.isEmpty() ? "minecraft:air" : BuiltInRegistries.ITEM.getKey(offHand.getItem()).toString());
        root.add("player", pose);

        // Inventory Overview (Limited to Hotbar + Armor for AI focus)
        JsonArray invArray = new JsonArray();
        for (int i = 0; i < 9; i++) { // Hotbar
            ItemStack stack = player.getInventory().getItem(i);
            if (!stack.isEmpty()) {
                JsonObject itemObj = new JsonObject();
                itemObj.addProperty("slot", i);
                itemObj.addProperty("item", BuiltInRegistries.ITEM.getKey(stack.getItem()).toString());
                itemObj.addProperty("count", stack.getCount());
                invArray.add(itemObj);
            }
        }
        for (int i = 36; i < 40; i++) { // Armor
            ItemStack stack = player.getInventory().getItem(i);
            if (!stack.isEmpty()) {
                JsonObject itemObj = new JsonObject();
                itemObj.addProperty("slot", i);
                itemObj.addProperty("item", BuiltInRegistries.ITEM.getKey(stack.getItem()).toString());
                itemObj.addProperty("count", stack.getCount());
                invArray.add(itemObj);
            }
        }
        root.add("inventory", invArray);

        // 2. Crosshair Raycast Target (Voxel or Entity)
        JsonObject raycastObj = new JsonObject();
        HitResult hit = client.hitResult;
        if (hit == null || hit.getType() == HitResult.Type.MISS) {
            raycastObj.addProperty("type", "MISS");
        } else if (hit instanceof BlockHitResult bhr) {
            raycastObj.addProperty("type", "BLOCK");
            BlockPos bp = bhr.getBlockPos();
            raycastObj.addProperty("x", bp.getX());
            raycastObj.addProperty("y", bp.getY());
            raycastObj.addProperty("z", bp.getZ());
            raycastObj.addProperty("side", bhr.getDirection().name().toLowerCase());
            raycastObj.addProperty("block", BuiltInRegistries.BLOCK.getKey(world.getBlockState(bp).getBlock()).toString());
        } else if (hit instanceof EntityHitResult ehr) {
            raycastObj.addProperty("type", "ENTITY");
            Entity targetEnt = ehr.getEntity();
            raycastObj.addProperty("entity_id", targetEnt.getId());
            raycastObj.addProperty("name", targetEnt.getName().getString());
            raycastObj.addProperty("entity_type", BuiltInRegistries.ENTITY_TYPE.getKey(targetEnt.getType()).toString());
            if (targetEnt instanceof LivingEntity le) {
                raycastObj.addProperty("health", le.getHealth());
            }
        }
        root.add("raycast", raycastObj);

        // 3. Nearby Entities within 16-block radius (Limited to closest 8 for AI performance)
        JsonArray nearbyEntities = new JsonArray();
        AABB boundingBox = player.getBoundingBox().inflate(16.0);
        List<Entity> entities = world.getEntities(player, boundingBox, ent -> ent instanceof LivingEntity);
        entities.sort((a, b) -> Float.compare(player.distanceTo(a), player.distanceTo(b)));
        
        int count = 0;
        for (Entity e : entities) {
            if (count++ >= 8) break;
            if (e instanceof LivingEntity le) {
                JsonObject entObj = new JsonObject();
                entObj.addProperty("id", le.getId());
                entObj.addProperty("type", BuiltInRegistries.ENTITY_TYPE.getKey(le.getType()).toString());
                entObj.addProperty("name", le.getName().getString());
                entObj.addProperty("is_player", le instanceof Player);
                entObj.addProperty("is_blocking", le.isBlocking());
                entObj.addProperty("x", Math.round(le.getX() * 100.0) / 100.0);
                entObj.addProperty("y", Math.round(le.getY() * 100.0) / 100.0);
                entObj.addProperty("z", Math.round(le.getZ() * 100.0) / 100.0);
                entObj.addProperty("distance", Math.round(player.distanceTo(le) * 100.0) / 100.0);
                entObj.addProperty("health", le.getHealth());
                ItemStack mainStack = le.getMainHandItem();
                entObj.addProperty("held_item", mainStack.isEmpty() ? "minecraft:air" : BuiltInRegistries.ITEM.getKey(mainStack.getItem()).toString());
                nearbyEntities.add(entObj);
            }
        }
        root.add("nearby_entities", nearbyEntities);
        root.add("recent_chat", GSON.toJsonTree(recentChatMessages));

        return GSON.toJson(root);
    }

    /**
     * Parses incoming JSON action packets from the AI Brain.
     */
    private void handleIncomingPacket(String rawJson) {
        try {
            JsonObject json = GSON.fromJson(rawJson, JsonObject.class);
            if (!json.has("type")) return;

            String type = json.get("type").getAsString();
            AiInputController controller = AiInputController.getInstance();

            switch (type) {
                case "look_at" -> {
                    int ticks = json.has("ticks") ? json.get("ticks").getAsInt() : (json.has("duration_ticks") ? json.get("duration_ticks").getAsInt() : 2);
                    if (json.has("x") && json.has("y") && json.has("z")) {
                        double x = json.get("x").getAsDouble();
                        double y = json.get("y").getAsDouble();
                        double z = json.get("z").getAsDouble();
                        // If targeting a block or coordinates are integer block coords, aim at the exact center (+0.5)
                        if (json.has("block") || (x == Math.floor(x) && y == Math.floor(y) && z == Math.floor(z))) {
                            x = Math.floor(x) + 0.5;
                            y = Math.floor(y) + 0.5;
                            z = Math.floor(z) + 0.5;
                        }
                        controller.lookAt(x, y, z, ticks);
                    } else if (json.has("target") && json.get("target").isJsonArray()) {
                        var arr = json.get("target").getAsJsonArray();
                        if (arr.size() >= 3) {
                            double x = arr.get(0).getAsDouble();
                            double y = arr.get(1).getAsDouble();
                            double z = arr.get(2).getAsDouble();
                            if (json.has("block") || (x == Math.floor(x) && y == Math.floor(y) && z == Math.floor(z))) {
                                x = Math.floor(x) + 0.5;
                                y = Math.floor(y) + 0.5;
                                z = Math.floor(z) + 0.5;
                            }
                            controller.lookAt(x, y, z, ticks);
                        }
                    } else if (json.has("yaw") && json.has("pitch")) {
                        float yaw = json.get("yaw").getAsFloat();
                        float pitch = json.get("pitch").getAsFloat();
                        controller.setRotation(yaw, pitch);
                    } else if (json.has("yaw")) {
                        float yaw = json.get("yaw").getAsFloat();
                        controller.setRotation(yaw, 0.0f);
                    }
                }
                case "mine", "dig", "harvest", "break_block" -> {
                    // Dedicated atomic mining action: locks aim onto block center and holds attack
                    double x = json.has("x") ? json.get("x").getAsDouble() : 0;
                    double y = json.has("y") ? json.get("y").getAsDouble() : 0;
                    double z = json.has("z") ? json.get("z").getAsDouble() : 0;
                    if (json.has("x") && json.has("y") && json.has("z")) {
                        x = Math.floor(x) + 0.5;
                        y = Math.floor(y) + 0.5;
                        z = Math.floor(z) + 0.5;
                        controller.lookAt(x, y, z, 1);
                    }
                    if (json.has("slot")) {
                        controller.selectHotbarSlot(json.get("slot").getAsInt());
                    }
                    int durationTicks = 40; // Default 2000ms
                    if (json.has("duration_ticks")) {
                        durationTicks = json.get("duration_ticks").getAsInt();
                    } else if (json.has("duration_ms")) {
                        durationTicks = Math.max(1, json.get("duration_ms").getAsInt() / 50);
                    } else if (json.has("durationMs")) {
                        durationTicks = Math.max(1, json.get("durationMs").getAsInt() / 50);
                    }
                    controller.pressKey("attack", durationTicks);
                }
                case "set_rotation" -> {
                    float yaw = json.has("yaw") ? json.get("yaw").getAsFloat() : 0.0f;
                    float pitch = json.has("pitch") ? json.get("pitch").getAsFloat() : 0.0f;
                    controller.setRotation(yaw, pitch);
                }
                case "press_key" -> {
                    String key = json.get("key").getAsString();
                    int durationTicks = 1;
                    if (json.has("duration_ticks")) {
                        durationTicks = json.get("duration_ticks").getAsInt();
                    } else if (json.has("duration_ms")) {
                        int ms = json.get("duration_ms").getAsInt();
                        durationTicks = ms < 0 ? -1 : Math.max(1, ms / 50);
                    } else if (json.has("hold") && json.get("hold").getAsBoolean()) {
                        durationTicks = -1;
                    }
                    controller.pressKey(key, durationTicks);
                }
                case "release_key" -> {
                    String key = json.get("key").getAsString();
                    controller.releaseKey(key);
                }
                case "release_all_keys" -> {
                    controller.releaseAllKeys();
                }
                case "mouse_scroll" -> {
                    double amount = json.has("amount") ? json.get("amount").getAsDouble() : (json.has("delta") ? json.get("delta").getAsDouble() : 1.0);
                    controller.scrollMouse(amount);
                }
                case "select_hotbar" -> {
                    int slot = json.get("slot").getAsInt();
                    controller.selectHotbarSlot(slot);
                }
                case "place_block" -> {
                    InteractionHand hand = json.has("hand") && "off".equalsIgnoreCase(json.get("hand").getAsString())
                            ? InteractionHand.OFF_HAND : InteractionHand.MAIN_HAND;
                    BlockPos pos = null;
                    Direction side = Direction.UP;
                    if (json.has("x") && json.has("y") && json.has("z")) {
                        pos = new BlockPos(json.get("x").getAsInt(), json.get("y").getAsInt(), json.get("z").getAsInt());
                    }
                    if (json.has("side")) {
                        side = Direction.byName(json.get("side").getAsString().toLowerCase());
                        if (side == null) side = Direction.UP;
                    }
                    controller.placeBlock(hand, pos, side);
                }
                case "attack_entity" -> {
                    int entityId = json.has("entity_id") ? json.get("entity_id").getAsInt() : -1;
                    controller.attackEntity(entityId);
                }
                case "drop_item" -> {
                    boolean dropAll = json.has("all") && json.get("all").getAsBoolean();
                    controller.dropItem(dropAll);
                }
                case "w_tap" -> {
                    controller.executeWTap();
                }
                case "look_at_relative" -> {
                    float dyaw = json.get("yaw").getAsFloat();
                    float dpitch = json.get("pitch").getAsFloat();
                    int ticks = json.has("ticks") ? json.get("ticks").getAsInt() : 5;
                    controller.lookAtRelative(dyaw, dpitch, ticks);
                }
                case "set_human_kinematics" -> {
                    boolean enabled = !json.has("enabled") || json.get("enabled").getAsBoolean();
                    controller.setHumanKinematicsEnabled(enabled);
                }
                case "send_chat" -> {
                    if (json.has("message")) {
                        String msg = json.get("message").getAsString();
                        // Strip bracketed name prefix if present so Minecraft doesn't print <Bot> <Bot> text
                        if (msg.startsWith("<") && msg.contains("> ")) {
                            msg = msg.substring(msg.indexOf("> ") + 2).trim();
                        }
                        final String finalMsg = msg;
                        Minecraft mc = Minecraft.getInstance();
                        if (mc != null) {
                            mc.execute(() -> {
                                if (mc.getConnection() != null) {
                                    if (finalMsg.startsWith("/")) {
                                        mc.getConnection().sendCommand(finalMsg.substring(1));
                                    } else {
                                        try {
                                            mc.getConnection().sendChat(finalMsg);
                                        } catch (Exception e) {
                                            try {
                                                mc.getConnection().sendCommand("say " + finalMsg);
                                            } catch (Exception e2) {
                                                mc.getConnection().sendCommand("me " + finalMsg);
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    }
                }
                case "connect_server" -> {
                    String server = json.has("server") ? json.get("server").getAsString() : AutoConnectHandler.getTargetServer();
                    String botName = json.has("bot_name") ? json.get("bot_name").getAsString() : AutoConnectHandler.getBotUsername();
                    AutoConnectHandler.connect(Minecraft.getInstance(), server, botName);
                }
                case "reconnect" -> {
                    AutoConnectHandler.connect(Minecraft.getInstance());
                }
            }
        } catch (Exception e) {
            LOGGER.error("[GameStateExporter] Failed to process incoming action: {}", rawJson, e);
        }
    }
}
