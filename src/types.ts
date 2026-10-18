export interface HotbarSlot {
  slot: number;
  item: string;
  count: number;
  damage?: number;
  maxDamage?: number;
  displayName?: string;
  enchantments?: { name: string; level: number }[];
  isTool?: boolean;
  isFood?: boolean;
  isBlock?: boolean;
  isWeapon?: boolean;
}

export interface ArmorEquipment {
  helmet?: HotbarSlot;
  chestplate?: HotbarSlot;
  leggings?: HotbarSlot;
  boots?: HotbarSlot;
  offhand?: HotbarSlot;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  maxHealth: number;
  food: number;
  saturation: number;
  air: number;
  onGround: boolean;
  isSneaking: boolean;
  isSprinting: boolean;
  inWater: boolean;
  selectedSlot: number;
  hotbar: HotbarSlot[];
  inventory?: HotbarSlot[];
  equipment?: ArmorEquipment;
  heldItem?: HotbarSlot;
  experienceLevel?: number;
  experienceProgress?: number;
  prevX?: number;
  prevZ?: number;
}

export interface VoxelBlock {
  x: number;
  y: number;
  z: number;
  name: string;
  solid: boolean;
  transparent?: boolean;
  hardness?: number;
  light?: number;
  isHazard?: boolean;
  isOre?: boolean;
  isWalkable?: boolean;
}

export interface BlockCubeMap {
  center: [number, number, number];
  radius: number;
  dimensions: { width: number; height: number; depth: number };
  min: [number, number, number];
  max: [number, number, number];
  totalBlocks: number;
  solidBlocks: number;
  airBlocks: number;
  voxels: VoxelBlock[];
  summary: {
    ores: { name: string; pos: [number, number, number]; distance: number }[];
    woodLogs?: { name: string; pos: [number, number, number]; distance: number }[];
    interactives?: { name: string; pos: [number, number, number]; distance: number }[];
    hazards: { name: string; pos: [number, number, number] }[];
    walkableSurfaces: [number, number, number][];
    blockCounts: Record<string, number>;
    highestBlockY: number;
    lowestBlockY: number;
    densityPct: number;
  };
  layers: Record<string, string[][]>;
  asciiMatrix?: string;
}

export interface RaycastTarget {
  type: "BLOCK" | "ENTITY" | "MISS";
  x?: number;
  y?: number;
  z?: number;
  side?: string;
  block?: string;
  id?: number;
  entityType?: string;
  health?: number;
}

export interface EntityState {
  id: number;
  type: string;
  x: number;
  y: number;
  z: number;
  distance: number;
  health: number;
}

export interface TelemetryData {
  type: "telemetry";
  timestamp: number;
  tick: number;
  inGame: boolean;
  player: PlayerState;
  raycast: RaycastTarget;
  nearbyEntities: EntityState[];
}

export type BlockDiffType = "MISSING" | "MISPLACED" | "EXTRA" | "CORRECT";

export interface SchematicDiffItem {
  id: string;
  type: BlockDiffType;
  x: number;
  y: number;
  z: number;
  expectedBlock: string;
  currentBlock: string;
  distanceSq: number;
}

export interface MaterialRequirement {
  item: string;
  required: number;
  available: number;
  missing: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  channel?: "system" | "whisper" | "global" | "all" | "team";
  isAi?: boolean;
  agentId?: string;
  senderPos?: [number, number, number];
}

export interface ChatDashboardSettings {
  listenToChat: boolean;              // Master toggle: Hook into and listen to ChatHud
  autoReply: boolean;                 // Autonomous AI response to chat
  requirePrefix: boolean;             // Only trigger on command prefix (!, /, ?)
  prefix: string;                     // Prefix string (default "!")
  ignoreBots: boolean;                // Prevent bot-to-bot loops
  proactiveAnnounce: boolean;         // Broadcast milestones to game chat
  soundAlerts: boolean;               // 8-bit sound ping on incoming message
  humanizeDelay: "instant" | "natural" | "deliberate"; // Simulated typing latency
  personaTone: "assistant" | "tactical" | "casual" | "roleplay"; // Conversational personality
  channelScope: "all" | "whisper" | "team";
}

export interface ChatPerceptionIntent {
  rawMessage: string;
  sender: string;
  timestamp: number;
  category: "command" | "query" | "alert" | "dialogue" | "ignored";
  intent: string;
  targetRole?: AgentRole | "All";
  targetAgent?: string;
  distanceFromPlayer?: number;
  confidence: number;
  extractedParams?: Record<string, string | number>;
  plannedAction?: string;
}

export type AgentRole = "Assistant" | "Builder" | "Scout" | "Miner" | "Guard";
export type AgentStatus = "idle" | "building" | "moving" | "mining" | "guarding" | "responding" | "patrolling" | "gathering" | "collaborating";

export interface AgentInstance {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  color: string;
  port: number;
  player: PlayerState;
  raycast: RaycastTarget;
  currentTask: string;
  lastThought: string;
  unreadChatCount?: number;
}

export interface SwarmDirective {
  id: string;
  directive: string;
  timestamp: number;
  assignedRoles: AgentRole[];
  status: "active" | "completed";
}

export interface TemporaryScaffoldBlock {
  id: string;
  x: number;
  y: number;
  z: number;
  block: string;
  placedAt: number;
  targetDiffId?: string;
  reason?: string;
}

export interface ActionPacket {
  type: "look_at" | "set_rotation" | "look_at_relative" | "w_tap" | "set_human_kinematics" | "press_key" | "release_key" | "release_all_keys" | "select_hotbar" | "place_block" | "attack_entity" | "drop_item" | "auto_build_litematica_step" | "send_chat" | "connect_server" | "reconnect" | "request_cube_map" | "scan_3d_cube" | "equip_item" | "toss_item" | "swap_hands" | "consume_item" | "mine" | "attack" | "dig" | "break_block" | "syncmatica_download_accept" | "swap_inventory_to_hotbar" | "navigate" | "place_temporary_scaffold" | "break_temporary_scaffold";
  x?: number;
  y?: number;
  z?: number;
  ticks?: number;
  yaw?: number;
  pitch?: number;
  enabled?: boolean;
  key?: string;
  durationMs?: number;
  duration_ms?: number;
  durationTicks?: number;
  slot?: number;
  hand?: "main" | "off";
  side?: string;
  block?: string;
  entityId?: number;
  all?: boolean;
  timestamp?: number;
  message?: string;
  agentId?: string;
  server?: string;
  bot_name?: string;
  radius?: number;
  center?: [number, number, number];
  item?: string;
  count?: number;
  id?: string;
  fromSlot?: number;
  toSlot?: number;
}

export interface MemoryStep {
  tick: number;
  timestamp: number;
  playerPos: [number, number, number];
  action: ActionPacket;
  result: string;
  feedback?: string;
  mistakeDetected?: string;
}

export interface CognitiveFeedbackState {
  lastActionOutcome: string;
  mistakes: string[];
  suggestedCorrection: string;
  stuckCycles: number;
  reachMistakeDetected: boolean;
  lastVerifiedTarget?: string;
  lastDistance?: number;
  evaluatedAt: number;
}

export interface Landmark {
  name: string;
  x: number;
  y: number;
  z: number;
  description: string;
}

export type AiProvider = 
  | "auto" 
  | "builtin" 
  | "nvidia" 
  | "gemini" 
  | "ollama" 
  | "openai" 
  | "anthropic" 
  | "openrouter" 
  | "groq" 
  | "deepseek" 
  | "mistral" 
  | "together" 
  | "xai" 
  | "cerebras" 
  | "fireworks"
  | "perplexity"
  | "sambanova"
  | "deepinfra"
  | "ovhcloud"
  | "custom_openai";

export interface SmartRoutingMetrics {
  activeTier: "nvidia" | "gemini" | "builtin";
  modelUsed: string;
  latencyMs: number;
  routingPath: string;
  fallbackTriggered: boolean;
  fallbackReason?: string;
  tierStatus: {
    nvidia: { name: string; available: boolean; statusText: string };
    gemini: { name: string; available: boolean; statusText: string };
    builtin: { name: string; available: boolean; statusText: string };
  };
}

export interface NvapiTelemetry {
  supported: boolean;
  gpuName: string;
  driverVersion: string;
  cudaVersion: string;
  tensorCoresActive: boolean;
  tensorRtEngine: string;
  vramUsedMb: number;
  vramTotalMb: number;
  gpuTempC: number;
  gpuUtilizationPct: number;
  dlssFrameGen: boolean;
  reflexLatencyMs: number;
  selectedModel: string;
}

export interface BuiltinAiMetrics {
  inferenceTimeMs: number;
  engine: string;
  accuracy: string;
  offlineReady: boolean;
  rulesEvaluated: number;
}

export type BiomeType = 
  | "plains" 
  | "forest" 
  | "dark_forest" 
  | "desert" 
  | "mountains" 
  | "snowy_slopes" 
  | "ocean" 
  | "deep_ocean" 
  | "river" 
  | "swamp" 
  | "savanna" 
  | "jungle" 
  | "badlands" 
  | "cherry_grove";

export interface DiscoveredChunk {
  cx: number;
  cz: number;
  biome: BiomeType;
  baseHeight: number;
  discoveredAtTick: number;
  blocks: string[]; // 16x16 surface block types
  heights: number[]; // 16x16 surface elevation
  hasStructure?: "village" | "ruined_portal" | "desert_pyramid" | "ancient_city" | "mineshaft" | "outpost";
  structurePos?: [number, number]; // block coords within chunk
}

export interface MapWaypoint {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  color: string;
  icon: "base" | "mine" | "portal" | "farm" | "danger" | "target";
}

// Mod Intelligence & Universal Mod Knowledge
export interface ModEntry {
  id: string;
  name: string;
  version: string;
  environment: "client" | "server" | "both";
  description: string;
  authors?: string[];
  homepage?: string;
  category: "Building & Schematics" | "Performance" | "Navigation & Radar" | "Server Utilities" | "Voice & Chat" | "Technology" | "Custom / User Added";
  customCommands: string[];
  keybindings: { key: string; description: string; action: string }[];
  serverSideFeatures: string[];
  aiInstructions: string;
  isServerModDetected?: boolean;
}

export interface ModDirectoryScanResult {
  totalMods: number;
  clientModsCount: number;
  serverModsCount: number;
  activeKnowledgeGuide: string;
  detectedServerAddons: string[];
  mods: ModEntry[];
}

// Player Locator Bar & Radar HUD
export interface LocatorDot {
  id: string;
  playerName: string;
  dotColor: string;
  relativeBearingDeg: number; // -180 to 180 deg relative to bot yaw
  compassHeading: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
  distanceBlocks: number;
  deltaY: number; // vertical difference
  isHostileOrFriend: "ally" | "neutral" | "enemy" | "bot";
  health: number;
  maxHealth: number;
  heldItem: string;
  isSneaking: boolean;
  isSprinting: boolean;
  isGliding: boolean;
  teamName?: string;
  lineOfSight: boolean;
}

export interface LocatorBarState {
  enabled: boolean;
  fovDegrees: number;
  visibleDotsCount: number;
  activeCompassHeading: string;
  dots: LocatorDot[];
  nearestPlayer: LocatorDot | null;
}

// JSON Map & Screenshot Perception
export interface JsonMapBlockLayer {
  y: number;
  blocks: { x: number; z: number; type: string; light: number; isHazard: boolean }[];
}

export interface JsonMapPayload {
  timestamp: number;
  queryCenter: [number, number, number];
  radius: number;
  chunkBounds: { minChunkX: number; maxChunkX: number; minChunkZ: number; maxChunkZ: number };
  biome: string;
  groundElevationAvg: number;
  surfaceLayers: JsonMapBlockLayer[];
  detectedOres: { type: string; count: number; locations: [number, number, number][] }[];
  nearbyPlayers: LocatorDot[];
  hostileThreats: { type: string; x: number; y: number; z: number; distance: number }[];
  poiWaypoints: MapWaypoint[];
}

export interface MapScreenshotArtifact {
  id: string;
  timestamp: number;
  label: string;
  viewMode: "top_down_radar" | "isometric_3d" | "locator_hud" | "chunk_elevation";
  centerCoords: [number, number, number];
  dataUrl: string;
  resolution: string;
  jsonMapSummary: {
    biome: string;
    playerCount: number;
    oreCount: number;
    threatCount: number;
  };
}

// ------------------------------------------------------------------------------
// Unified 1-File .env Configuration Schema for Bot, Swarm, APIs & Dashboard
// ------------------------------------------------------------------------------
export interface UnifiedEnvConfig {
  // 1. Server Connection
  minecraftServerHost: string;
  minecraftServerPort: number;
  minecraftAutoReconnect: boolean;
  minecraftReconnectDelayMs: number;
  minecraftVersion: string;

  // 2. Bot Usernames & Swarm
  botCount: number;
  botPrimaryUsername: string;
  botUsernames: string[];
  botRoles: AgentRole[];
  botIpcPorts: number[];
  botTeamName: string;

  // 3. AI Providers & APIs
  geminiApiKey: string;
  geminiModel: string;
  nvidiaApiKey: string;
  nvidiaModel: string;
  nvidiaBaseUrl: string;
  ollamaModel: string;
  ollamaBaseUrl: string;
  ollamaNumCtx: number;
  ollamaVisionModel?: string;
  aiProvider: AiProvider;
  aiProviderPriority?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  openrouterBaseUrl?: string;
  groqApiKey?: string;
  groqModel?: string;
  groqBaseUrl?: string;
  deepseekApiKey?: string;
  deepseekModel?: string;
  deepseekBaseUrl?: string;
  mistralApiKey?: string;
  mistralModel?: string;
  mistralBaseUrl?: string;
  togetherApiKey?: string;
  togetherModel?: string;
  togetherBaseUrl?: string;
  xaiApiKey?: string;
  xaiModel?: string;
  xaiBaseUrl?: string;
  cerebrasApiKey?: string;
  cerebrasModel?: string;
  cerebrasBaseUrl?: string;
  fireworksApiKey?: string;
  fireworksModel?: string;
  fireworksBaseUrl?: string;
  perplexityApiKey?: string;
  perplexityModel?: string;
  perplexityBaseUrl?: string;
  sambanovaApiKey?: string;
  sambanovaModel?: string;
  sambanovaBaseUrl?: string;
  deepinfraApiKey?: string;
  deepinfraModel?: string;
  deepinfraBaseUrl?: string;
  ovhcloudApiKey?: string;
  ovhcloudModel?: string;
  ovhcloudBaseUrl?: string;
  disableAutonomy?: boolean;
  customOpenaiApiKey?: string;
  customOpenaiModel?: string;
  customOpenaiBaseUrl?: string;
  enableBuiltinOfflineFallback: boolean;
  aiTickRateMs: number;
  aiAutonomyEnabled: boolean;
  aiAutonomyIntervalSeconds: number;

  // 4. In-Game Chat Perception & Radar
  chatListenEnabled: boolean;
  chatAutoReply: boolean;
  chatRequirePrefix: boolean;
  chatCommandPrefix: string;
  chatIgnoreOtherBots: boolean;
  chatProactiveAnnounce: boolean;
  chatHumanizeDelay: "instant" | "natural" | "deliberate";
  chatPersonaTone: "assistant" | "tactical" | "casual" | "roleplay";
  radarScanRadiusBlocks: number;
  radarFovDegrees: number;

  // 5. Dashboard & Web Studio Settings
  dashboardPort: number;
  appUrl: string;
  dashboardTheme: "midnight" | "dark" | "slate";
  dashboardSoundAlerts: boolean;
  dashboardDefaultTab: string;
  litematicaBuildSpeedMs: number;
  litematicaAutoHotbarSwitch: boolean;
  mapExploreRadiusChunks: number;
}

// ------------------------------------------------------------------------------
// Sign Perception, Reaction & Placement Types
// ------------------------------------------------------------------------------
export type WoodType = "oak" | "spruce" | "birch" | "jungle" | "acacia" | "dark_oak" | "mangrove" | "cherry" | "bamboo" | "crimson" | "warped";

export interface SignText {
  messages: [string, string, string, string];
  hasGlowingText?: boolean;
  color?: string;
}

export interface SignData {
  id: string;
  x: number;
  y: number;
  z: number;
  blockType: string;
  wood: WoodType;
  isWallSign: boolean;
  isHangingSign?: boolean;
  facing: "north" | "south" | "east" | "west";
  isWaxed: boolean;
  front: SignText;
  back: SignText;
  placedBy: string; // e.g. "Player (Steve)", "Gemini", "Alpha-Builder"
  timestamp: number;
  targetRecipient?: string; // e.g. "Gemini", "All", "Builder", "Miner", "None"
  parsedInstruction?: string; // e.g. "Mine Iron at [120, 64, 30]"
  reactionStatus?: "unprocessed" | "analyzing" | "executing" | "reacted" | "ignored";
  reactingAgentId?: string;
  reactionLog?: string;
  replySignId?: string;
}

// ------------------------------------------------------------------------------
// Multi-Bot Cognitive Message Filter & Decision Matrix Types
// ------------------------------------------------------------------------------
export interface BotCognitiveMessageEvaluation {
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  isForMe: boolean;
  confidence: number;
  matchType: "direct_name" | "role_match" | "broadcast" | "context_proximity" | "unrelated";
  reason: string;
  formulatedAction?: string;
  replyIntent?: string;
  status: "active" | "standby" | "executing" | "delegated";
}

export interface MessageEvaluationRecord {
  messageId: string;
  rawText: string;
  sender: string;
  timestamp: number;
  channel?: string;
  evaluations: Record<string, BotCognitiveMessageEvaluation>;
  winningAgentId?: string;
}

// ------------------------------------------------------------------------------
// Individual Bot Steering & Direct Teleoperation Types
// ------------------------------------------------------------------------------
export interface IndividualBotSteeringState {
  agentId: string;
  mode: "manual_steer" | "autonomous_ai" | "follow_leader" | "hold_position";
  isSprinting: boolean;
  isSneaking: boolean;
  activePathTarget?: [number, number, number];
  heldKeys: Set<string>;
  steeringSensitivity: number;
  lookTarget?: [number, number, number];
  autoMineTarget?: [number, number, number];
}

// ------------------------------------------------------------------------------
// Advanced PvP Combat Engine & Slap Revanche / Retaliation System
// ------------------------------------------------------------------------------
export type CombatWeaponType = 
  | "netherite_sword" 
  | "diamond_sword" 
  | "netherite_axe" 
  | "diamond_axe" 
  | "mace" 
  | "bow" 
  | "crossbow" 
  | "end_crystal" 
  | "anchor";

export type PvPStance = 
  | "aggressive_rush" 
  | "critical_jumps" 
  | "shield_axe_disabler" 
  | "circle_strafe" 
  | "defensive_parry" 
  | "crystal_pvp" 
  | "vendetta_chase";

export type RevancheLevel = "proportional" | "overkill" | "swarm_jump" | "humiliation";

export interface SlapEvent {
  id: string;
  victimAgentId: string;
  victimName: string;
  attackerName: string;
  attackerId?: number;
  weapon: string; // e.g. "hand", "cod", "wooden_sword", "diamond_sword", "fist"
  damage: number;
  timestamp: number;
  revancheLevel: RevancheLevel;
  status: "hunting" | "engaging" | "avenged" | "forgiven";
  hitsReturned: number;
  targetHits: number;
  retaliationLog: string[];
  victimRole: AgentRole;
}

export type ServerCooldownProfile = 
  | "auto_detect" 
  | "vanilla_1_9" 
  | "old_combat_1_8" 
  | "fast_attack_mod" 
  | "slow_tactical_mod" 
  | "custom_override";

export interface ServerCooldownDiagnostics {
  detectedMode: ServerCooldownProfile;
  detectedModName: string;
  effectiveAttackSpeed: number; // swings per second (e.g., 1.6 for vanilla sword, 20.0 for 1.8 OldCombat)
  effectiveCycleMs: number; // millisecond period before 100% charged swing
  attributeGenericAttackSpeed: number; // raw value from net.minecraft.entity.attribute.EntityAttributes.GENERIC_ATTACK_SPEED
  hasCooldownDisabled: boolean; // true if cooldown progress is permanently 1.0 or tick resets immediately
  autoSpamClickCPS: number; // calculated optimal CPS (Clicks Per Second) if cooldown disabled/instant
  detectionConfidence: number; // 0.0 - 1.0
  lastPacketTimestamp: number;
  serverTickRateTps: number;
  autoAdjustedThreshold: number; // e.g., 0.95 or 0.1 for instant
}

export interface CombatTelemetry {
  targetEntityId: number | null;
  targetName: string;
  targetDistance: number;
  targetHealth: number;
  targetMaxHealth: number;
  attackCooldown: number; // 0.0 - 1.0 (1.0 = 100% full swing charge)
  isCritWindow: boolean; // falling trajectory for vanilla jump crits
  comboCounter: number;
  shieldRaised: boolean;
  axeDisablerReady: boolean;
  wTapResetReady: boolean;
  strafeAngle: number;
  currentStance: PvPStance;
  activeRevancheTarget: string | null;
  revancheGrudgeScore: number;
  selectedWeapon: CombatWeaponType;
  totemsRemaining: number;
  gapplesRemaining: number;
  pingMs: number;
  lastHitType: "CRITICAL" | "SHIELD_BREAK" | "STANDARD" | "SWEEP" | "KNOCKBACK" | "NONE";
  cooldownDiagnostics: ServerCooldownDiagnostics;
}

export interface PvPTacticsSettings {
  autoRevancheOnSlap: boolean;
  revancheMode: "proportional_revenge" | "full_vendetta" | "swarm_retaliation" | "pacifist";
  autoAxeShieldBreak: boolean;
  jumpCritOptimization: boolean;
  wTapSprintReset: boolean;
  autoTotemSwap: boolean;
  autoGappleThreshold: number; // HP threshold (e.g. 10.0 HP)
  hitReachDistance: number; // 3.0 blocks
  autoWebAnchorTactic: boolean;
  tauntOnAvenged: boolean;
  circleStrafeSpeed: number;
  attackCooldownThreshold: number; // 0.95 = swing only when >=95% charged
  cooldownDetectionMode: ServerCooldownProfile;
  customAttackSpeedModifier: number; // 1.0x to 10.0x
  enableAutoSpamClickOnInstant: boolean;
}



