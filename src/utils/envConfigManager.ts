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
  geminiModel: "gemini-2.5-flash",
  nvidiaApiKey: "",
  nvidiaModel: "meta/llama-3.2-11b-vision-instruct",
  nvidiaBaseUrl: "https://integrate.api.nvidia.com/v1",
  ollamaModel: "qwen2.5vl:3b",
  ollamaBaseUrl: "http://127.0.0.1:11434",
  ollamaNumCtx: 131072,
  ollamaVisionModel: "moondream:1.8b",
  aiProvider: "auto",
  aiProviderPriority: "nvidia,gemini,groq,openrouter,ollama",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  anthropicApiKey: "",
  anthropicModel: "claude-3-5-sonnet-20241022",
  openrouterApiKey: "",
  openrouterModel: "nvidia/nemotron-3.5-lightning",
  openrouterBaseUrl: "https://openrouter.ai/api/v1",
  groqApiKey: "",
  groqModel: "openai/gpt-oss-120b",
  groqBaseUrl: "https://api.groq.com/openai/v1",
  deepseekApiKey: "",
  deepseekModel: "deepseek-chat",
  deepseekBaseUrl: "https://api.deepseek.com/v1",
  mistralApiKey: "",
  mistralModel: "mistral-small-latest",
  mistralBaseUrl: "https://api.mistral.ai/v1",
  togetherApiKey: "",
  togetherModel: "",
  togetherBaseUrl: "https://api.together.xyz/v1",
  xaiApiKey: "",
  xaiModel: "grok-2-latest",
  xaiBaseUrl: "https://api.x.ai/v1",
  cerebrasApiKey: "",
  cerebrasModel: "",
  cerebrasBaseUrl: "https://api.cerebras.ai/v1",
  fireworksApiKey: "",
  fireworksModel: "",
  fireworksBaseUrl: "https://api.fireworks.ai/inference/v1",
  perplexityApiKey: "",
  perplexityModel: "",
  perplexityBaseUrl: "https://api.perplexity.ai",
  sambanovaApiKey: "",
  sambanovaModel: "",
  sambanovaBaseUrl: "https://api.sambanova.ai/v1",
  deepinfraApiKey: "",
  deepinfraModel: "",
  deepinfraBaseUrl: "https://api.deepinfra.com/v1/openai",
  ovhcloudApiKey: "",
  ovhcloudModel: "",
  ovhcloudBaseUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
  customOpenaiApiKey: "",
  customOpenaiModel: "",
  customOpenaiBaseUrl: "http://localhost:8000/v1",
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
    if (!parsed.geminiModel || parsed.geminiModel === "gemini-1.5-pro" || parsed.geminiModel === "gemini-1.5-flash" || parsed.geminiModel === "gemini-2.0-flash" || parsed.geminiModel === "gemini-3.8-flash") {
      parsed.geminiModel = "gemini-2.5-flash";
    }
    if (!parsed.ollamaModel || parsed.ollamaModel === "qwen2.5-coder:7b" || parsed.ollamaModel === "llama3.2:3b") parsed.ollamaModel = "qwen2.5vl:3b";
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
 * Fetches the live configuration from the server environment.
 */
export async function fetchServerEnvConfig(): Promise<UnifiedEnvConfig | null> {
  try {
    const res = await fetch("/api/env-config");
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object") {
        // Ensure standard NVIDIA model
        if (!data.nvidiaModel || data.nvidiaModel.includes("405b") || data.nvidiaModel.includes("diffusion") || data.nvidiaModel === "meta/llama-3.1-8b-instruct" || data.nvidiaModel === "meta/llama-3.3-70b-instruct" || data.nvidiaModel === "meta/llama-3.1-70b-instruct") {
          data.nvidiaModel = "meta/llama-3.2-11b-vision-instruct";
        }
        return { ...DEFAULT_ENV_CONFIG, ...data };
      }
    }
  } catch (err) {
    console.warn("[Live Config] Could not fetch server config:", err);
  }
  return null;
}

/**
 * Pushes updated configuration live to the running server (zero-reboot).
 */
export async function saveServerEnvConfig(config: UnifiedEnvConfig): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch("/api/env-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    if (res.ok) {
      const json = await res.json();
      return { success: true, message: json.message || "Live config applied without reboot" };
    }
    const errText = await res.text();
    return { success: false, message: `Server error ${res.status}: ${errText}` };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to reach server" };
  }
}

/**
 * Saves current configuration to browser storage and pushes live to server.
 */
export function persistEnvConfig(config: UnifiedEnvConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error("Failed to persist .env config in localStorage:", err);
  }
  // Asynchronously sync with running server process in background
  saveServerEnvConfig(config).catch(() => {});
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
AI_PROVIDER_PRIORITY="${config.aiProviderPriority || "nvidia,gemini,groq,openrouter,ollama"}"

# Additional API Providers
OPENAI_API_KEY="${config.openaiApiKey || ""}"
OPENAI_MODEL="${config.openaiModel || "gpt-4o-mini"}"
ANTHROPIC_API_KEY="${config.anthropicApiKey || ""}"
ANTHROPIC_MODEL="${config.anthropicModel || "claude-3-5-sonnet-20241022"}"
OPENROUTER_API_KEY="${config.openrouterApiKey || ""}"
OPENROUTER_MODEL="${config.openrouterModel || "nvidia/nemotron-3.5-lightning"}"
OPENROUTER_BASE_URL="${config.openrouterBaseUrl || "https://openrouter.ai/api/v1"}"
GROQ_API_KEY="${config.groqApiKey || ""}"
GROQ_MODEL="${config.groqModel || "openai/gpt-oss-120b"}"
GROQ_BASE_URL="${config.groqBaseUrl || "https://api.groq.com/openai/v1"}"
DEEPSEEK_API_KEY="${config.deepseekApiKey || ""}"
DEEPSEEK_MODEL="${config.deepseekModel || "deepseek-chat"}"
DEEPSEEK_BASE_URL="${config.deepseekBaseUrl || "https://api.deepseek.com/v1"}"
MISTRAL_API_KEY="${config.mistralApiKey || ""}"
MISTRAL_MODEL="${config.mistralModel || "mistral-small-latest"}"
MISTRAL_BASE_URL="${config.mistralBaseUrl || "https://api.mistral.ai/v1"}"
TOGETHER_API_KEY="${config.togetherApiKey || ""}"
TOGETHER_MODEL="${config.togetherModel || ""}"
TOGETHER_BASE_URL="${config.togetherBaseUrl || "https://api.together.xyz/v1"}"
XAI_API_KEY="${config.xaiApiKey || ""}"
XAI_MODEL="${config.xaiModel || "grok-2-latest"}"
XAI_BASE_URL="${config.xaiBaseUrl || "https://api.x.ai/v1"}"
CEREBRAS_API_KEY="${config.cerebrasApiKey || ""}"
CEREBRAS_MODEL="${config.cerebrasModel || ""}"
CEREBRAS_BASE_URL="${config.cerebrasBaseUrl || "https://api.cerebras.ai/v1"}"
FIREWORKS_API_KEY="${config.fireworksApiKey || ""}"
FIREWORKS_MODEL="${config.fireworksModel || ""}"
FIREWORKS_BASE_URL="${config.fireworksBaseUrl || "https://api.fireworks.ai/inference/v1"}"
PERPLEXITY_API_KEY="${config.perplexityApiKey || ""}"
PERPLEXITY_MODEL="${config.perplexityModel || ""}"
PERPLEXITY_BASE_URL="${config.perplexityBaseUrl || "https://api.perplexity.ai"}"
SAMBANOVA_API_KEY="${config.sambanovaApiKey || ""}"
SAMBANOVA_MODEL="${config.sambanovaModel || ""}"
SAMBANOVA_BASE_URL="${config.sambanovaBaseUrl || "https://api.sambanova.ai/v1"}"
DEEPINFRA_API_KEY="${config.deepinfraApiKey || ""}"
DEEPINFRA_MODEL="${config.deepinfraModel || ""}"
DEEPINFRA_BASE_URL="${config.deepinfraBaseUrl || "https://api.deepinfra.com/v1/openai"}"
OVHCLOUD_API_KEY="${config.ovhcloudApiKey || ""}"
OVHCLOUD_MODEL="${config.ovhcloudModel || ""}"
OVHCLOUD_BASE_URL="${config.ovhcloudBaseUrl || "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1"}"
CUSTOM_OPENAI_API_KEY="${config.customOpenaiApiKey || ""}"
CUSTOM_OPENAI_MODEL="${config.customOpenaiModel || ""}"
CUSTOM_OPENAI_BASE_URL="${config.customOpenaiBaseUrl || "http://localhost:8000/v1"}"

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
  if (parsedMap["AI_PROVIDER_PRIORITY"] !== undefined) result.aiProviderPriority = parsedMap["AI_PROVIDER_PRIORITY"];

  if (parsedMap["OPENAI_API_KEY"] !== undefined) result.openaiApiKey = parsedMap["OPENAI_API_KEY"];
  if (parsedMap["OPENAI_MODEL"] !== undefined) result.openaiModel = parsedMap["OPENAI_MODEL"];
  if (parsedMap["ANTHROPIC_API_KEY"] !== undefined) result.anthropicApiKey = parsedMap["ANTHROPIC_API_KEY"];
  if (parsedMap["ANTHROPIC_MODEL"] !== undefined) result.anthropicModel = parsedMap["ANTHROPIC_MODEL"];
  if (parsedMap["OPENROUTER_API_KEY"] !== undefined) result.openrouterApiKey = parsedMap["OPENROUTER_API_KEY"];
  if (parsedMap["OPENROUTER_MODEL"] !== undefined) result.openrouterModel = parsedMap["OPENROUTER_MODEL"];
  if (parsedMap["OPENROUTER_BASE_URL"] !== undefined) result.openrouterBaseUrl = parsedMap["OPENROUTER_BASE_URL"];
  if (parsedMap["GROQ_API_KEY"] !== undefined) result.groqApiKey = parsedMap["GROQ_API_KEY"];
  if (parsedMap["GROQ_MODEL"] !== undefined) result.groqModel = parsedMap["GROQ_MODEL"];
  if (parsedMap["GROQ_BASE_URL"] !== undefined) result.groqBaseUrl = parsedMap["GROQ_BASE_URL"];
  if (parsedMap["DEEPSEEK_API_KEY"] !== undefined) result.deepseekApiKey = parsedMap["DEEPSEEK_API_KEY"];
  if (parsedMap["DEEPSEEK_MODEL"] !== undefined) result.deepseekModel = parsedMap["DEEPSEEK_MODEL"];
  if (parsedMap["DEEPSEEK_BASE_URL"] !== undefined) result.deepseekBaseUrl = parsedMap["DEEPSEEK_BASE_URL"];
  if (parsedMap["MISTRAL_API_KEY"] !== undefined) result.mistralApiKey = parsedMap["MISTRAL_API_KEY"];
  if (parsedMap["MISTRAL_MODEL"] !== undefined) result.mistralModel = parsedMap["MISTRAL_MODEL"];
  if (parsedMap["MISTRAL_BASE_URL"] !== undefined) result.mistralBaseUrl = parsedMap["MISTRAL_BASE_URL"];
  if (parsedMap["TOGETHER_API_KEY"] !== undefined) result.togetherApiKey = parsedMap["TOGETHER_API_KEY"];
  if (parsedMap["TOGETHER_MODEL"] !== undefined) result.togetherModel = parsedMap["TOGETHER_MODEL"];
  if (parsedMap["TOGETHER_BASE_URL"] !== undefined) result.togetherBaseUrl = parsedMap["TOGETHER_BASE_URL"];
  if (parsedMap["XAI_API_KEY"] !== undefined) result.xaiApiKey = parsedMap["XAI_API_KEY"];
  if (parsedMap["XAI_MODEL"] !== undefined) result.xaiModel = parsedMap["XAI_MODEL"];
  if (parsedMap["XAI_BASE_URL"] !== undefined) result.xaiBaseUrl = parsedMap["XAI_BASE_URL"];
  if (parsedMap["CEREBRAS_API_KEY"] !== undefined) result.cerebrasApiKey = parsedMap["CEREBRAS_API_KEY"];
  if (parsedMap["CEREBRAS_MODEL"] !== undefined) result.cerebrasModel = parsedMap["CEREBRAS_MODEL"];
  if (parsedMap["CEREBRAS_BASE_URL"] !== undefined) result.cerebrasBaseUrl = parsedMap["CEREBRAS_BASE_URL"];
  if (parsedMap["FIREWORKS_API_KEY"] !== undefined) result.fireworksApiKey = parsedMap["FIREWORKS_API_KEY"];
  if (parsedMap["FIREWORKS_MODEL"] !== undefined) result.fireworksModel = parsedMap["FIREWORKS_MODEL"];
  if (parsedMap["FIREWORKS_BASE_URL"] !== undefined) result.fireworksBaseUrl = parsedMap["FIREWORKS_BASE_URL"];
  if (parsedMap["PERPLEXITY_API_KEY"] !== undefined) result.perplexityApiKey = parsedMap["PERPLEXITY_API_KEY"];
  if (parsedMap["PERPLEXITY_MODEL"] !== undefined) result.perplexityModel = parsedMap["PERPLEXITY_MODEL"];
  if (parsedMap["PERPLEXITY_BASE_URL"] !== undefined) result.perplexityBaseUrl = parsedMap["PERPLEXITY_BASE_URL"];
  if (parsedMap["SAMBANOVA_API_KEY"] !== undefined) result.sambanovaApiKey = parsedMap["SAMBANOVA_API_KEY"];
  if (parsedMap["SAMBANOVA_MODEL"] !== undefined) result.sambanovaModel = parsedMap["SAMBANOVA_MODEL"];
  if (parsedMap["SAMBANOVA_BASE_URL"] !== undefined) result.sambanovaBaseUrl = parsedMap["SAMBANOVA_BASE_URL"];
  if (parsedMap["DEEPINFRA_API_KEY"] !== undefined) result.deepinfraApiKey = parsedMap["DEEPINFRA_API_KEY"];
  if (parsedMap["DEEPINFRA_MODEL"] !== undefined) result.deepinfraModel = parsedMap["DEEPINFRA_MODEL"];
  if (parsedMap["DEEPINFRA_BASE_URL"] !== undefined) result.deepinfraBaseUrl = parsedMap["DEEPINFRA_BASE_URL"];
  if (parsedMap["OVHCLOUD_API_KEY"] !== undefined) result.ovhcloudApiKey = parsedMap["OVHCLOUD_API_KEY"];
  if (parsedMap["OVHCLOUD_MODEL"] !== undefined) result.ovhcloudModel = parsedMap["OVHCLOUD_MODEL"];
  if (parsedMap["OVHCLOUD_BASE_URL"] !== undefined) result.ovhcloudBaseUrl = parsedMap["OVHCLOUD_BASE_URL"];
  if (parsedMap["CUSTOM_OPENAI_API_KEY"] !== undefined) result.customOpenaiApiKey = parsedMap["CUSTOM_OPENAI_API_KEY"];
  if (parsedMap["CUSTOM_OPENAI_MODEL"] !== undefined) result.customOpenaiModel = parsedMap["CUSTOM_OPENAI_MODEL"];
  if (parsedMap["CUSTOM_OPENAI_BASE_URL"] !== undefined) result.customOpenaiBaseUrl = parsedMap["CUSTOM_OPENAI_BASE_URL"];
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
