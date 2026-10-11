import { UnifiedEnvConfig } from "../types";

export const DEFAULT_ENV_CONFIG: UnifiedEnvConfig = {
  // 1. Server Connection
  minecraftServerHost: "host.docker.internal",
  minecraftServerPort: 25565,
  minecraftAutoReconnect: true,
  minecraftReconnectDelayMs: 3000,
  minecraftVersion: "26.2",

  // 2. Bot Usernames & Swarm
  botCount: 3,
  botPrimaryUsername: "Gemini",
  botUsernames: ["Gemini", "Builder-Bot", "Miner-Bot", "Scout-Bot", "Guard-Bot"],
  botRoles: ["Assistant", "Builder", "Miner", "Scout", "Guard"],
  botIpcPorts: [8080, 8081, 8082, 8083, 8084],
  botTeamName: "AI-Swarm",

  // 3. AI Providers & APIs
  geminiApiKey: "",
  geminiModel: "gemini-3.8-flash",
  nvidiaApiKey: "",
  nvidiaModel: "meta/llama-3.2-11b-vision-instruct",
  nvidiaBaseUrl: "https://integrate.api.nvidia.com/v1",
  ollamaModel: "llama3.2:3b",
  ollamaBaseUrl: "http://127.0.0.1:11434",
  ollamaNumCtx: 131072,
  ollamaVisionModel: "moondream:1.8b",
  aiProvider: "auto",
  enableBuiltinOfflineFallback: true,
  aiTickRateMs: 50,
  aiAutonomyEnabled: true,
  aiAutonomyIntervalSeconds: 3,

  // 4. In-Game Chat Perception & Radar
  chatListenEnabled: true,
  chatAutoReply: true,
  chatRequirePrefix: false,
  chatCommandPrefix: "!",
  chatIgnoreOtherBots: true,
  chatProactiveAnnounce: true,
  chatHumanizeDelay: "natural",
  chatPersonaTone: "assistant",
  radarScanRadiusBlocks: 64,
  radarFovDegrees: 360,

  // 5. Dashboard & Web Studio Settings
  dashboardPort: 3000,
  appUrl: "",
  dashboardTheme: "midnight",
  dashboardSoundAlerts: true,
  dashboardDefaultTab: "workbench",
  litematicaBuildSpeedMs: 150,
  litematicaAutoHotbarSwitch: true,
  mapExploreRadiusChunks: 8,
};

const STORAGE_KEY = "minecraft_ai_unified_env_config_v1";

/**
 * Loads configuration from browser storage, falling back to defaults.
 */
export function loadSavedEnvConfig(): UnifiedEnvConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ENV_CONFIG;
    const parsed = JSON.parse(raw);
    // Auto-migrate from deprecated / non-functional models
    if (!parsed.nvidiaModel || parsed.nvidiaModel === "meta/llama-3.1-405b-instruct" || parsed.nvidiaModel === "google/diffusiongemma-26b-a4b-it" || parsed.nvidiaModel === "meta/llama-3.3-70b-instruct") {
      parsed.nvidiaModel = "meta/llama-3.2-11b-vision-instruct";
    }
    if (!parsed.geminiModel || parsed.geminiModel === "gemini-1.5-pro" || parsed.geminiModel === "gemini-1.5-flash" || parsed.geminiModel === "gemini-2.0-flash") {
      parsed.geminiModel = "gemini-3.8-flash";
    }
    if (!parsed.ollamaModel || parsed.ollamaModel === "qwen2.5-coder:7b") parsed.ollamaModel = "llama3.2:3b";
    if (!parsed.ollamaBaseUrl) parsed.ollamaBaseUrl = "http://host.docker.internal:11434";
    if (!parsed.ollamaNumCtx) parsed.ollamaNumCtx = 131072;
    if (!parsed.ollamaVisionModel) parsed.ollamaVisionModel = "moondream:1.8b";
    if (!parsed.aiProvider) parsed.aiProvider = "auto";
    return { ...DEFAULT_ENV_CONFIG, ...parsed };
  } catch {
    return DEFAULT_ENV_CONFIG;
  }
}

/**
 * Saves current configuration to browser storage.
 */
export function persistEnvConfig(config: UnifiedEnvConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error("Failed to persist .env config in localStorage:", err);
  }
}

/**
 * Formats a UnifiedEnvConfig object into a clean, annotated .env file string.
 */
export function generateDotEnvString(config: UnifiedEnvConfig): string {
  return `# ==============================================================================
# MINECRAFT AI CONTROLLER & MULTI-AGENT SWARM ENVIRONMENT CONFIGURATION (.env)
# ==============================================================================
# Generated: ${new Date().toISOString()}
# Everything configurable for the Minecraft client bots, swarm, APIs, and dashboard.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. MINECRAFT SERVER CONNECTION
# ------------------------------------------------------------------------------
MINECRAFT_SERVER_HOST="${config.minecraftServerHost}"
MINECRAFT_SERVER_PORT=${config.minecraftServerPort}
MINECRAFT_AUTO_RECONNECT=${config.minecraftAutoReconnect}
MINECRAFT_RECONNECT_DELAY_MS=${config.minecraftReconnectDelayMs}
MINECRAFT_VERSION="${config.minecraftVersion}"

# ------------------------------------------------------------------------------
# 2. BOT USERNAMES & SWARM CONFIGURATION
# ------------------------------------------------------------------------------
BOT_COUNT=${config.botCount}
BOT_PRIMARY_USERNAME="${config.botPrimaryUsername}"
BOT_USERNAMES="${config.botUsernames.join(",")}"
BOT_ROLES="${config.botRoles.join(",")}"
BOT_IPC_PORTS="${config.botIpcPorts.join(",")}"
BOT_TEAM_NAME="${config.botTeamName}"

# ------------------------------------------------------------------------------
# 3. AI PROVIDERS & API KEYS
# ------------------------------------------------------------------------------
GEMINI_API_KEY="${config.geminiApiKey}"
GEMINI_MODEL="${config.geminiModel}"
NVIDIA_API_KEY="${config.nvidiaApiKey}"
NVIDIA_MODEL="${config.nvidiaModel}"
NVIDIA_BASE_URL="${config.nvidiaBaseUrl}"
OLLAMA_MODEL="${config.ollamaModel}"
OLLAMA_BASE_URL="${config.ollamaBaseUrl}"
OLLAMA_NUM_CTX=${config.ollamaNumCtx || 131072}
OLLAMA_VISION_MODEL="${config.ollamaVisionModel || "moondream:1.8b"}"
AI_PROVIDER="${config.aiProvider}"
ENABLE_BUILTIN_OFFLINE_FALLBACK=${config.enableBuiltinOfflineFallback}
AI_TICK_RATE_MS=${config.aiTickRateMs}
AI_AUTONOMY_ENABLED=${config.aiAutonomyEnabled}
AI_AUTONOMY_INTERVAL_SECONDS=${config.aiAutonomyIntervalSeconds}

# ------------------------------------------------------------------------------
# 4. IN-GAME CHAT PERCEPTION & HUD RADAR
# ------------------------------------------------------------------------------
CHAT_LISTEN_ENABLED=${config.chatListenEnabled}
CHAT_AUTO_REPLY=${config.chatAutoReply}
CHAT_REQUIRE_PREFIX=${config.chatRequirePrefix}
CHAT_COMMAND_PREFIX="${config.chatCommandPrefix}"
CHAT_IGNORE_OTHER_BOTS=${config.chatIgnoreOtherBots}
CHAT_PROACTIVE_ANNOUNCE=${config.chatProactiveAnnounce}
CHAT_HUMANIZE_DELAY="${config.chatHumanizeDelay}"
CHAT_PERSONA_TONE="${config.chatPersonaTone}"
RADAR_SCAN_RADIUS_BLOCKS=${config.radarScanRadiusBlocks}
RADAR_FOV_DEGREES=${config.radarFovDegrees}

# ------------------------------------------------------------------------------
# 5. DASHBOARD & WEB STUDIO SETTINGS
# ------------------------------------------------------------------------------
DASHBOARD_PORT=${config.dashboardPort}
APP_URL="${config.appUrl}"
DASHBOARD_THEME="${config.dashboardTheme}"
DASHBOARD_SOUND_ALERTS=${config.dashboardSoundAlerts}
DASHBOARD_DEFAULT_TAB="${config.dashboardDefaultTab}"
LITEMATICA_BUILD_SPEED_MS=${config.litematicaBuildSpeedMs}
LITEMATICA_AUTO_HOTBAR_SWITCH=${config.litematicaAutoHotbarSwitch}
MAP_EXPLORE_RADIUS_CHUNKS=${config.mapExploreRadiusChunks}
`;
}

/**
 * Parses a raw .env text string into a typed UnifiedEnvConfig object.
 */
export function parseDotEnvString(envText: string, current: UnifiedEnvConfig = DEFAULT_ENV_CONFIG): UnifiedEnvConfig {
  const lines = envText.split("\n");
  const parsedMap: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    parsedMap[key] = val;
  }

  const result: UnifiedEnvConfig = { ...current };

  if (parsedMap["MINECRAFT_SERVER_HOST"] !== undefined) result.minecraftServerHost = parsedMap["MINECRAFT_SERVER_HOST"];
  if (parsedMap["MINECRAFT_SERVER_PORT"] !== undefined) result.minecraftServerPort = parseInt(parsedMap["MINECRAFT_SERVER_PORT"], 10) || 25565;
  if (parsedMap["MINECRAFT_AUTO_RECONNECT"] !== undefined) result.minecraftAutoReconnect = parsedMap["MINECRAFT_AUTO_RECONNECT"] === "true";
  if (parsedMap["MINECRAFT_RECONNECT_DELAY_MS"] !== undefined) result.minecraftReconnectDelayMs = parseInt(parsedMap["MINECRAFT_RECONNECT_DELAY_MS"], 10) || 3000;
  if (parsedMap["MINECRAFT_VERSION"] !== undefined) result.minecraftVersion = parsedMap["MINECRAFT_VERSION"];

  if (parsedMap["BOT_COUNT"] !== undefined) result.botCount = Math.min(8, Math.max(1, parseInt(parsedMap["BOT_COUNT"], 10) || 1));
  if (parsedMap["BOT_PRIMARY_USERNAME"] !== undefined) result.botPrimaryUsername = parsedMap["BOT_PRIMARY_USERNAME"];
  if (parsedMap["BOT_USERNAMES"] !== undefined) {
    result.botUsernames = parsedMap["BOT_USERNAMES"].split(",").map(s => s.trim()).filter(Boolean);
  }
  if (parsedMap["BOT_ROLES"] !== undefined) {
    result.botRoles = parsedMap["BOT_ROLES"].split(",").map(s => s.trim()) as any;
  }
  if (parsedMap["BOT_IPC_PORTS"] !== undefined) {
    result.botIpcPorts = parsedMap["BOT_IPC_PORTS"].split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  }
  if (parsedMap["BOT_TEAM_NAME"] !== undefined) result.botTeamName = parsedMap["BOT_TEAM_NAME"];

  if (parsedMap["GEMINI_API_KEY"] !== undefined) result.geminiApiKey = parsedMap["GEMINI_API_KEY"];
  if (parsedMap["GEMINI_MODEL"] !== undefined) result.geminiModel = parsedMap["GEMINI_MODEL"];
  if (parsedMap["NVIDIA_API_KEY"] !== undefined) result.nvidiaApiKey = parsedMap["NVIDIA_API_KEY"];
  if (parsedMap["NVIDIA_MODEL"] !== undefined) result.nvidiaModel = parsedMap["NVIDIA_MODEL"];
  if (parsedMap["NVIDIA_BASE_URL"] !== undefined) result.nvidiaBaseUrl = parsedMap["NVIDIA_BASE_URL"];
  if (parsedMap["OLLAMA_MODEL"] !== undefined) result.ollamaModel = parsedMap["OLLAMA_MODEL"];
  if (parsedMap["OLLAMA_BASE_URL"] !== undefined) result.ollamaBaseUrl = parsedMap["OLLAMA_BASE_URL"];
  if (parsedMap["OLLAMA_NUM_CTX"] !== undefined) result.ollamaNumCtx = parseInt(parsedMap["OLLAMA_NUM_CTX"], 10) || 131072;
  if (parsedMap["OLLAMA_VISION_MODEL"] !== undefined) result.ollamaVisionModel = parsedMap["OLLAMA_VISION_MODEL"];
  if (parsedMap["AI_PROVIDER"] !== undefined) result.aiProvider = parsedMap["AI_PROVIDER"] as any;
  if (parsedMap["ENABLE_BUILTIN_OFFLINE_FALLBACK"] !== undefined) result.enableBuiltinOfflineFallback = parsedMap["ENABLE_BUILTIN_OFFLINE_FALLBACK"] === "true";
  if (parsedMap["AI_TICK_RATE_MS"] !== undefined) result.aiTickRateMs = parseInt(parsedMap["AI_TICK_RATE_MS"], 10) || 50;
  if (parsedMap["AI_AUTONOMY_ENABLED"] !== undefined) result.aiAutonomyEnabled = parsedMap["AI_AUTONOMY_ENABLED"] === "true";
  if (parsedMap["AI_AUTONOMY_INTERVAL_SECONDS"] !== undefined) result.aiAutonomyIntervalSeconds = parseInt(parsedMap["AI_AUTONOMY_INTERVAL_SECONDS"], 10) || 6;

  if (parsedMap["CHAT_LISTEN_ENABLED"] !== undefined) result.chatListenEnabled = parsedMap["CHAT_LISTEN_ENABLED"] === "true";
  if (parsedMap["CHAT_AUTO_REPLY"] !== undefined) result.chatAutoReply = parsedMap["CHAT_AUTO_REPLY"] === "true";
  if (parsedMap["CHAT_REQUIRE_PREFIX"] !== undefined) result.chatRequirePrefix = parsedMap["CHAT_REQUIRE_PREFIX"] === "true";
  if (parsedMap["CHAT_COMMAND_PREFIX"] !== undefined) result.chatCommandPrefix = parsedMap["CHAT_COMMAND_PREFIX"];
  if (parsedMap["CHAT_IGNORE_OTHER_BOTS"] !== undefined) result.chatIgnoreOtherBots = parsedMap["CHAT_IGNORE_OTHER_BOTS"] === "true";
  if (parsedMap["CHAT_PROACTIVE_ANNOUNCE"] !== undefined) result.chatProactiveAnnounce = parsedMap["CHAT_PROACTIVE_ANNOUNCE"] === "true";
  if (parsedMap["CHAT_HUMANIZE_DELAY"] !== undefined) result.chatHumanizeDelay = parsedMap["CHAT_HUMANIZE_DELAY"] as any;
  if (parsedMap["CHAT_PERSONA_TONE"] !== undefined) result.chatPersonaTone = parsedMap["CHAT_PERSONA_TONE"] as any;
  if (parsedMap["RADAR_SCAN_RADIUS_BLOCKS"] !== undefined) result.radarScanRadiusBlocks = parseInt(parsedMap["RADAR_SCAN_RADIUS_BLOCKS"], 10) || 64;
  if (parsedMap["RADAR_FOV_DEGREES"] !== undefined) result.radarFovDegrees = parseInt(parsedMap["RADAR_FOV_DEGREES"], 10) || 360;

  if (parsedMap["DASHBOARD_PORT"] !== undefined) result.dashboardPort = parseInt(parsedMap["DASHBOARD_PORT"], 10) || 3000;
  if (parsedMap["APP_URL"] !== undefined) result.appUrl = parsedMap["APP_URL"];
  if (parsedMap["DASHBOARD_THEME"] !== undefined) result.dashboardTheme = parsedMap["DASHBOARD_THEME"] as any;
  if (parsedMap["DASHBOARD_SOUND_ALERTS"] !== undefined) result.dashboardSoundAlerts = parsedMap["DASHBOARD_SOUND_ALERTS"] === "true";
  if (parsedMap["DASHBOARD_DEFAULT_TAB"] !== undefined) result.dashboardDefaultTab = parsedMap["DASHBOARD_DEFAULT_TAB"];
  if (parsedMap["LITEMATICA_BUILD_SPEED_MS"] !== undefined) result.litematicaBuildSpeedMs = parseInt(parsedMap["LITEMATICA_BUILD_SPEED_MS"], 10) || 150;
  if (parsedMap["LITEMATICA_AUTO_HOTBAR_SWITCH"] !== undefined) result.litematicaAutoHotbarSwitch = parsedMap["LITEMATICA_AUTO_HOTBAR_SWITCH"] === "true";
  if (parsedMap["MAP_EXPLORE_RADIUS_CHUNKS"] !== undefined) result.mapExploreRadiusChunks = parseInt(parsedMap["MAP_EXPLORE_RADIUS_CHUNKS"], 10) || 8;

  return result;
}
