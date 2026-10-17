import { ModEntry } from "../types";

export const DEFAULT_MOD_CATALOG: ModEntry[] = [
  {
    id: "minecraft-ai-bridge",
    name: "Minecraft AI Bridge",
    version: "1.0.0",
    environment: "both",
    category: "Navigation & Radar",
    description: "Core autonomous neuro-symbolic multi-agent AI controller, WebSocket IPC bridge, Locator Bar radar decoder, and virtual input injector.",
    authors: ["Autonomous AI Team"],
    homepage: "https://github.com/minecraft-ai/minecraft-ai-bridge",
    customCommands: ["/ai status", "/ai follow <player>", "/ai scan", "/ai build <schematic>", "/ai radar", "/ai jsonmap <radius>"],
    keybindings: [
      { key: "NUMPAD_0", description: "Toggle AI Autonomous Control", action: "toggle_ai_loop" },
      { key: "NUMPAD_DECIMAL", description: "Emergency Stop All Movement", action: "emergency_stop" },
      { key: "M", description: "Open AI Locator & Map HUD", action: "open_radar_hud" }
    ],
    serverSideFeatures: [
      "Custom IPC Web Server on port 8080",
      "Player locator bar entity broadcaster",
      "Perception telemetry stream at 20 ticks/sec",
      "JSON Map live chunk evaluator"
    ],
    aiInstructions: "Use this bridge to send movement vectors (press_key, look_at), place blocks, read player chat, and query the 3D block environment."
  },
  {
    id: "litematica",
    name: "Litematica",
    version: "0.20.0 (Fabric 26.2)",
    environment: "client",
    category: "Building & Schematics",
    description: "Advanced client-side schematic visualizer, material verifier, holographic blueprint renderer, and EasyPlace placement assist.",
    authors: ["masa"],
    homepage: "https://masa.dy.fi/mcmods/client_mods/?mod=litematica",
    customCommands: ["/litematica load <name>", "/litematica unload", "/litematica paste", "/litematica diff"],
    keybindings: [
      { key: "M", description: "Open Litematica Main Menu", action: "open_menu" },
      { key: "M + C", description: "Open Area Selection Manager", action: "open_selection" },
      { key: "V", description: "EasyPlace Toggle (Fast Placement)", action: "toggle_easy_place" }
    ],
    serverSideFeatures: ["Client-only mod, optionally accelerated by Syncmatica server plugin."],
    aiInstructions: "When tasked with building, query the active schematic bounding box and execute step-by-step holographic block diff resolution."
  },
  {
    id: "syncmatica",
    name: "Syncmatica",
    version: "0.3.11",
    environment: "both",
    category: "Building & Schematics",
    description: "Collaborative multiplayer schematic synchronization. Allows bots and players to share, download, and place identical building blueprints in real-time.",
    authors: ["Kir-Antipov", "Masa"],
    homepage: "https://modrinth.com/mod/syncmatica",
    customCommands: ["/syncmatica share <file>", "/syncmatica list", "/syncmatica download <id>"],
    keybindings: [
      { key: "M + S", description: "Open Syncmatica Server Browser", action: "open_syncmatica_ui" }
    ],
    serverSideFeatures: [
      "Server-side blueprint storage & sync over network channel 'syncmatica:core'",
      "Placement progress tracking per player"
    ],
    aiInstructions: "Listen to server Syncmatica packets to discover structures uploaded by human players and synchronize building progress."
  },
  {
    id: "fabric-api",
    name: "Fabric API",
    version: "0.115.0+26.2",
    environment: "both",
    category: "Server Utilities",
    description: "Essential lifecycle hooks, networking API, entity event handlers, and resource loaders for Minecraft Fabric.",
    authors: ["FabricMC"],
    homepage: "https://fabricmc.net",
    customCommands: [],
    keybindings: [],
    serverSideFeatures: [
      "Custom Payload Networking Channels (C2S & S2C)",
      "Dynamic Registry Sync for items & blocks",
      "Client & Server Tick Lifecycle Dispatchers"
    ],
    aiInstructions: "Core runtime library. All custom packets and networking utilize Fabric API channels."
  },
  {
    id: "carpet",
    name: "Carpet Mod",
    version: "1.4.147",
    environment: "both",
    category: "Server Utilities",
    description: "Computational server tool that allows deep game control, tick freezing, tick warping, spawn monitoring, and automated bot spawning via /player.",
    authors: ["gnembon"],
    homepage: "https://github.com/gnembon/fabric-carpet",
    customCommands: [
      "/carpet tick rate <speed>",
      "/carpet tick warp <ticks>",
      "/player <name> spawn",
      "/player <name> attack continuous",
      "/log mobcaps",
      "/log tps"
    ],
    keybindings: [],
    serverSideFeatures: [
      "Full server tick control (/carpet tick rate)",
      "Server-side fake player spawning (/player <name> spawn)",
      "Real-time TPS and MSPT performance telemetry"
    ],
    aiInstructions: "If Carpet Mod is present on the server, you can spawn sub-agents with '/player BotName spawn' and measure exact server MSPT lag."
  },
  {
    id: "xaeros-minimap",
    name: "Xaero's Minimap & WorldMap",
    version: "24.6.0",
    environment: "both",
    category: "Navigation & Radar",
    description: "Real-time topographic minimap, cave scanner, player locator dots, entity radar, and global waypoint coordinate manager.",
    authors: ["xaero96"],
    homepage: "https://chocolatemint.info",
    customCommands: ["/xaero_waypoint add <name> <x> <y> <z>", "/xaero_waypoint list"],
    keybindings: [
      { key: "Y", description: "Minimap Settings & Radar Config", action: "open_minimap_settings" },
      { key: "M", description: "Open Fullscreen World Map", action: "open_world_map" },
      { key: "B", description: "Create Instant Coordinate Waypoint", action: "create_waypoint" }
    ],
    serverSideFeatures: [
      "Server radar permission packet channel",
      "Player team color propagation to radar dots"
    ],
    aiInstructions: "Use Xaero's waypoints and radar blips to correlate Compass Locator Bar markers with named player teams."
  },
  {
    id: "simple-voice-chat",
    name: "Simple Voice Chat",
    version: "2.5.20",
    environment: "both",
    category: "Voice & Chat",
    description: "Proximity voice audio server & client. Streams 3D spatial directional audio between players in game world.",
    authors: ["henkelmax"],
    homepage: "https://modrinth.com/plugin/simple-voice-chat",
    customCommands: ["/voicechat test", "/voicechat groups", "/voicechat mute"],
    keybindings: [
      { key: "V", description: "Voice Chat Settings & Group Channels", action: "voice_settings" },
      { key: "CAPSLOCK", description: "Push to Talk (PTT)", action: "ptt_activate" }
    ],
    serverSideFeatures: [
      "Dedicated UDP voice stream socket (port 24454 by default)",
      "Proximity distance attenuation algorithm (default 48 blocks)"
    ],
    aiInstructions: "Voice chat mod detected. Audio perception can be routed to Whisper speech-to-text models for real-time auditory commands."
  },
  {
    id: "sodium",
    name: "Sodium & Lithium",
    version: "0.6.2",
    environment: "both",
    category: "Performance",
    description: "Modern OpenGL rendering engine and server physics optimizer. Drastically improves headless framerates and chunk compilation.",
    authors: ["jellysquid", "FlashyReese"],
    homepage: "https://modrinth.com/mod/sodium",
    customCommands: [],
    keybindings: [
      { key: "F3 + S", description: "Sodium Performance Metrics Overlay", action: "toggle_metrics" }
    ],
    serverSideFeatures: [
      "Lithium chunk physics acceleration",
      "Zero-allocation mob pathfinding engine on server side"
    ],
    aiInstructions: "Optimizes chunk mesh serialization so the AI can stream 16x16 chunk JSON data in under 1ms."
  },
  {
    id: "automcs-server-tools",
    name: "AutoMCS Server Integrator",
    version: "3.2.0",
    environment: "server",
    category: "Server Utilities",
    description: "AutoMCS dedicated server environment helper. Manages automated backup archives, player permissions, and RCON administration.",
    authors: ["AutoMCS"],
    homepage: "https://automcs.com",
    customCommands: ["/automcs backup", "/automcs restart", "/automcs info"],
    keybindings: [],
    serverSideFeatures: [
      "Automatic offline-mode compatibility hook",
      "RCON remote execution port",
      "Live server performance & player list API"
    ],
    aiInstructions: "Server host tool for AutoMCS. Allows querying server stats, offline auth bypass, and automatic server health status."
  }
];

export function generateAiModKnowledgeSummary(mods: ModEntry[]): string {
  let summary = "# UNIVERSAL MINECRAFT MOD KNOWLEDGE BASE FOR AI BRAIN\\n";
  summary += `Total Loaded Mods: ${mods.length}\\n\\n`;

  mods.forEach((mod, idx) => {
    summary += `## [${idx + 1}] ${mod.name} (${mod.id}) - v${mod.version}\\n`;
    summary += `- **Category**: ${mod.category} | **Environment**: ${mod.environment.toUpperCase()}\\n`;
    summary += `- **Description**: ${mod.description}\\n`;
    if (mod.customCommands.length > 0) {
      summary += `- **Available Commands**: ${mod.customCommands.join(", ")}\\n`;
    }
    if (mod.keybindings.length > 0) {
      summary += `- **Keybindings**: ${mod.keybindings.map(k => `${k.key} (${k.description})`).join(", ")}\\n`;
    }
    if (mod.serverSideFeatures.length > 0) {
      summary += `- **Server-Side Features**: ${mod.serverSideFeatures.join("; ")}\\n`;
    }
    summary += `- **AI Tactical Usage**: ${mod.aiInstructions}\\n\\n`;
  });

  return summary;
}
