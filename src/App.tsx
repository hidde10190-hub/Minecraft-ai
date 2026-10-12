import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { Header } from "./components/Header";
import { Visualizer3D } from "./components/Visualizer3D";
import { VirtualController } from "./components/VirtualController";
import { LitematicaStudio } from "./components/LitematicaStudio";
import { AiBrainConsole } from "./components/AiBrainConsole";
import { CodeExplorer } from "./components/CodeExplorer";
import { ProtocolDocs } from "./components/ProtocolDocs";
import { StandaloneClientLauncher } from "./components/StandaloneClientLauncher";
import { LiveWorldMap } from "./components/LiveWorldMap";
import { ChatTerminal } from "./components/ChatTerminal";
import { ChatDashboard } from "./components/ChatDashboard";
import { SwarmFleetBar } from "./components/SwarmFleetBar";
import { ModKnowledgeHub } from "./components/ModKnowledgeHub";
import { PlayerLocatorRadarView } from "./components/PlayerLocatorRadarView";
import { JsonMapViewer } from "./components/JsonMapViewer";
import { EnvConfigManager } from "./components/EnvConfigManager";
import { VoiceCommand } from "./components/VoiceCommand";
import { SignPerceptionAndSteeringStudio } from "./components/SignPerceptionAndSteeringStudio";
import { PvPCombatAndRevancheStudio } from "./components/PvPCombatAndRevancheStudio";
import { SkillsAndFailuresStudio } from "./components/SkillsAndFailuresStudio";
import { SwarmQuickBar } from "./components/SwarmQuickBar";
import { PROJECT_SOURCE_FILES } from "./data/sourceFiles";
import { playChatChime } from "./utils/audioChime";
import { solveBuiltinTacticalPlan } from "./utils/builtinAiEngine";
import { generateChunk } from "./utils/worldMapGenerator";
import { generate3DBlockCubeMap, fetchLiveCubeMap, formatCubeMapForAiPrompt } from "./utils/cubeMapEngine";
import { normalizeLivePlayerState, normalizeLiveHotbar } from "./utils/playerStateNormalizer";
import { loadSavedEnvConfig, persistEnvConfig } from "./utils/envConfigManager";
import { evaluateMessageForSwarm } from "./utils/signAndMessageIntelligence";
import { CognitiveFeedbackEngine } from "./utils/cognitiveFeedbackEngine";
import { 
  PlayerState, 
  RaycastTarget, 
  EntityState, 
  SchematicDiffItem, 
  MaterialRequirement, 
  ActionPacket, 
  MemoryStep, 
  Landmark, 
  AiProvider,
  ChatMessage,
  AgentInstance,
  AgentRole,
  ChatDashboardSettings,
  DiscoveredChunk,
  MapWaypoint,
  UnifiedEnvConfig,
  CognitiveFeedbackState
} from "./types";

import { 
  Heart, 
  Apple, 
  Compass, 
  Eye, 
  Wifi, 
  Cpu, 
  Activity, 
  Play, 
  Square,
  Sparkles,
  MessageSquare,
  Users
} from "lucide-react";

export default function App() {
  const [envConfig, setEnvConfig] = useState<UnifiedEnvConfig>(() => loadSavedEnvConfig());
  const [activeTab, setActiveTab] = useState<string>(() => loadSavedEnvConfig().dashboardDefaultTab || "workbench");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [provider, setProvider] = useState<AiProvider>(() => loadSavedEnvConfig().aiProvider || "auto");
  const [nvidiaModel, setNvidiaModel] = useState<string>(() => loadSavedEnvConfig().nvidiaModel || "meta/llama-3.2-11b-vision-instruct");
  const [routerMetrics, setRouterMetrics] = useState<{
    activeTier: string;
    modelUsed: string;
    latencyMs: number;
    routingPath: string;
    fallbackTriggered: boolean;
    fallbackReason?: string;
  } | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>(() => loadSavedEnvConfig().botPrimaryUsername || "Gemini");
  const [isAutoBuilding, setIsAutoBuilding] = useState<boolean>(false);
  const [isAutonomousMode, setIsAutonomousMode] = useState<boolean>(() => loadSavedEnvConfig().aiAutonomyEnabled || false);
  const [activeGoal, setActiveGoal] = useState<string>("");
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [currentPreset, setCurrentPreset] = useState<string>("nether_portal");
  const [isAiAutoReply, setIsAiAutoReply] = useState<boolean>(true);

  // Dynamic environment configuration updater
  const updateEnvConfig = (patch: Partial<UnifiedEnvConfig>) => {
    setEnvConfig((prev) => {
      const updated = { ...prev, ...patch };
      persistEnvConfig(updated);
      return updated;
    });
  };

  // Continuous Cognitive Feedback & Mistake Learning State
  const [cognitiveFeedback, setCognitiveFeedback] = useState<CognitiveFeedbackState>({
    lastActionOutcome: "Operational standby. Telemetry live.",
    mistakes: [],
    suggestedCorrection: "Kinematics ready. Directives accepted.",
    stuckCycles: 0,
    reachMistakeDetected: false,
    evaluatedAt: Date.now()
  });
  const [chatSettings, setChatSettings] = useState<ChatDashboardSettings>(() => {
    const loaded = loadSavedEnvConfig();
    return {
      listenToChat: loaded.chatListenEnabled,
      autoReply: loaded.chatAutoReply,
      requirePrefix: loaded.chatRequirePrefix,
      prefix: loaded.chatCommandPrefix,
      ignoreBots: loaded.chatIgnoreOtherBots,
      proactiveAnnounce: loaded.chatProactiveAnnounce,
      soundAlerts: loaded.dashboardSoundAlerts,
      humanizeDelay: loaded.chatHumanizeDelay,
      personaTone: loaded.chatPersonaTone,
      channelScope: "all",
    };
  });

  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);

  // Handle voice transcript from dashboard microphone
  const handleVoiceTranscript = (text: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "User (Voice)",
      text: text,
      timestamp: Date.now(),
      channel: "all",
      isAi: false
    };
    
    setChatMessages((prev) => [...prev, newMessage]);
    
    // Auto-forward voice to active agent as a command via WebSocket if available
    // For now, we simulate the cognition bridge
    setThoughtLog(prev => [`[Cognition]: Voice Perception -> "${text}" | Status: Routing to Swarm`, ...prev]);
  };

  const buildDefaultAgents = (conf: UnifiedEnvConfig): AgentInstance[] => {
    const colors = ["#10b981", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6", "#f97316"];
    return Array.from({ length: conf.botCount || 3 }).map((_, i) => {
      const name = conf.botUsernames[i] || (i === 0 ? conf.botPrimaryUsername || "Gemini" : `Unit-${i + 1}`);
      const role = (conf.botRoles[i] as AgentRole) || (i === 0 ? "Assistant" : i === 1 ? "Builder" : "Scout");
      const port = conf.botIpcPorts[i] || 8080 + i;
      const color = colors[i % colors.length];

      return {
        id: `agent_${i}`,
        name,
        role,
        status: "idle",
        color,
        port,
        player: {
          // Sentinel (0,0,0): NO fake coordinates. Real position comes exclusively
          // from live bridge telemetry; UI gates on hasLivePosition to avoid showing
          // hallucinated positions before the first packet arrives.
          x: 0,
          y: 0,
          z: 0,
          yaw: 0.0,
          pitch: 10.0,
          health: 20.0,
          maxHealth: 20.0,
          food: 20,
          saturation: 15.0,
          air: 300,
          onGround: true,
          isSneaking: false,
          isSprinting: false,
          inWater: false,
          selectedSlot: 0,
          hotbar: [
            { slot: 0, item: "minecraft:obsidian", count: 64 },
            { slot: 1, item: "minecraft:diamond_pickaxe", count: 1 },
            { slot: 2, item: "minecraft:diamond_sword", count: 1 },
            { slot: 3, item: "minecraft:cooked_beef", count: 32 },
            { slot: 4, item: "minecraft:flint_and_steel", count: 1 },
            { slot: 5, item: "minecraft:cobblestone", count: 64 },
            { slot: 6, item: "minecraft:torch", count: 64 },
            { slot: 7, item: "minecraft:water_bucket", count: 1 },
            { slot: 8, item: "minecraft:air", count: 0 },
          ],
        },
        raycast: {
          type: "MISS",
        },
        currentTask: `${role} Directive: Active on port ${port}`,
        lastThought: "Initialized and awaiting task allocation.",
      };
    });
  };

  // Multi-Agent Swarm Instances generated dynamically from .env config
  const [agents, setAgents] = useState<AgentInstance[]>(() => buildDefaultAgents(loadSavedEnvConfig()));

  // Apply swarm reconfiguration from .env manager
  const handleApplySwarmFromEnv = (newConf: UnifiedEnvConfig) => {
    setEnvConfig(newConf);
    setProvider(newConf.aiProvider);
    setNvidiaModel(newConf.nvidiaModel);
    setCurrentUsername(newConf.botPrimaryUsername);
    setChatSettings(prev => ({
      ...prev,
      listenToChat: newConf.chatListenEnabled,
      autoReply: newConf.chatAutoReply,
      requirePrefix: newConf.chatRequirePrefix,
      prefix: newConf.chatCommandPrefix,
      ignoreBots: newConf.chatIgnoreOtherBots,
      proactiveAnnounce: newConf.chatProactiveAnnounce,
      soundAlerts: newConf.dashboardSoundAlerts,
      humanizeDelay: newConf.chatHumanizeDelay,
      personaTone: newConf.chatPersonaTone
    }));

    const colors = ["#10b981", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6", "#f97316"];
    const updatedAgents: AgentInstance[] = Array.from({ length: newConf.botCount }).map((_, i) => {
      const name = newConf.botUsernames[i] || `Bot-${i + 1}`;
      const role = newConf.botRoles[i] || (i === 0 ? "Assistant" : "Builder");
      const port = newConf.botIpcPorts[i] || 8080 + i;
      const color = colors[i % colors.length];

      // Retain existing agent if present
      const existing = agents[i];
      if (existing) {
        return {
          ...existing,
          name,
          role,
          port,
          color,
          currentTask: `${role} Directive: Active on port ${port}`,
          lastThought: `Re-anchored from updated .env profile.`
        };
      }

      return {
        id: `agent_${i}`,
        name,
        role,
        status: "idle",
        color,
        port,
        player: {
          // Sentinel (0,0,0): live telemetry will overwrite with real coords.
          x: 0,
          y: 0,
          z: 0,
          yaw: 0.0,
          pitch: 10.0,
          health: 20.0,
          maxHealth: 20.0,
          food: 20,
          saturation: 15.0,
          air: 300,
          onGround: true,
          isSneaking: false,
          isSprinting: false,
          inWater: false,
          selectedSlot: 0,
          hotbar: [
            { slot: 0, item: "minecraft:obsidian", count: 64 },
            { slot: 1, item: "minecraft:diamond_pickaxe", count: 1 },
            { slot: 2, item: "minecraft:diamond_sword", count: 1 },
            { slot: 3, item: "minecraft:cooked_beef", count: 32 },
            { slot: 4, item: "minecraft:flint_and_steel", count: 1 },
            { slot: 5, item: "minecraft:cobblestone", count: 64 },
            { slot: 6, item: "minecraft:torch", count: 64 },
            { slot: 7, item: "minecraft:water_bucket", count: 1 },
            { slot: 8, item: "minecraft:air", count: 0 },
          ],
        },
        raycast: {
          type: "MISS",
        },
        currentTask: `${role} Directive: Active on port ${port}`,
        lastThought: `Spawned from .env update (${newConf.botCount} bots).`,
      };
    });

    setAgents(updatedAgents);
    if (!updatedAgents.some(a => a.id === activeAgentId)) {
      setActiveAgentId(updatedAgents[0]?.id || "agent_0");
    }

    setThoughtLog(prev => [
      `[.env Sync]: Reconfigured swarm with ${newConf.botCount} bots. Primary: "${newConf.botPrimaryUsername}", Server: "${newConf.minecraftServerHost}:${newConf.minecraftServerPort}".`,
      ...prev
    ]);
  };

  const [activeAgentId, setActiveAgentId] = useState<string>("agent_0");

  // In-Game Chat Perception Stream
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "chat_0",
      sender: "Server",
      text: "[Fabric 26.2] Minecraft-AI-Bridge hooked into ChatHud. 4 agents connected (including Universal Assistant).",
      timestamp: Date.now() - 40000,
      channel: "system",
    },
    {
      id: "chat_1",
      sender: "Steve",
      text: "!status Alpha-Builder",
      timestamp: Date.now() - 25000,
      channel: "all",
    },
    {
      id: "chat_2",
      sender: "Alpha-Builder",
      text: "Status: Active. Assembling Nether Portal frame (3/14 obsidian placed).",
      timestamp: Date.now() - 22000,
      channel: "all",
      isAi: true,
    },
    {
      id: "chat_3",
      sender: "Beta-Scout",
      text: "Perimeter report: Hostile zombie spotted at [108, 64, 24]. Distance: 8 blocks.",
      timestamp: Date.now() - 10000,
      channel: "all",
      isAi: true,
    },
  ]);

  // Derive active agent
  
  const activeAgent = agents.find((a) => a.id === activeAgentId) || agents[0];
  const player = activeAgent?.player || { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, health: 0, max_health: 20, food: 20, selectedSlot: 0 };
  const raycast = activeAgent?.raycast || { type: "MISS" };


  // Nearby Mobs
  const [entities, setEntities] = useState<EntityState[]>([]);

  // Active Keys Held
  const [heldKeys, setHeldKeys] = useState<Set<string>>(new Set());

  // Litematica Schematics state
  const [diffs, setDiffs] = useState<SchematicDiffItem[]>([]);
  const [materials, setMaterials] = useState<MaterialRequirement[]>([]);

  // AI Brain State
  const [thoughtLog, setThoughtLog] = useState<string[]>([]);
  const [recentMemory, setRecentMemory] = useState<MemoryStep[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);

  // Live World Map Discovered Chunks & Waypoints
  const [discoveredChunks, setDiscoveredChunks] = useState<Map<string, DiscoveredChunk>>(() => {
    const initialMap = new Map<string, DiscoveredChunk>();
    const centerCx = Math.floor(100.5 / 16);
    const centerCz = Math.floor(20.5 / 16);
    const initialRadius = 4;
    for (let dx = -initialRadius; dx <= initialRadius; dx++) {
      for (let dz = -initialRadius; dz <= initialRadius; dz++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        const key = `${cx},${cz}`;
        initialMap.set(key, generateChunk(cx, cz, 1337, 0));
      }
    }
    return initialMap;
  });

  const [mapWaypoints, setMapWaypoints] = useState<MapWaypoint[]>([
    { id: "wp-base", name: "Main Spawn Base", x: 100, y: 64, z: 20, color: "#10b981", icon: "base" },
    { id: "wp-quarry", name: "Cobblestone Quarry", x: 88, y: 60, z: 36, color: "#06b6d4", icon: "mine" },
    { id: "wp-portal", name: "Nether Portal Site", x: 104, y: 64, z: 21, color: "#8b5cf6", icon: "portal" },
  ]);

  const [isAutoScouting, setIsAutoScouting] = useState<boolean>(false);
  const scoutStateRef = useRef<{ angle: number; radius: number; centerX: number; centerZ: number }>({
    angle: 0,
    radius: 12,
    centerX: 100.5,
    centerZ: 20.5,
  });

  const socketsRef = useRef<Map<number, WebSocket>>(new Map());
  const lastChatReplyTimeRef = useRef<number>(0);
  // Timestamp of the most recent LIVE telemetry packet received from the Fabric bridge.
  // Gates scans/autonomy so the AI never acts on stale or simulated coordinates.
  const lastLiveTelemetryAtRef = useRef<number>(0);

  // Fresh live position (telemetry within the last 15s) — authoritative source for scans.
  const hasLivePosition = Date.now() - lastLiveTelemetryAtRef.current < 15000;

  const sendActionToBridge = (action: ActionPacket, port?: number) => {
    const targetPort = port || activeAgent?.port || 8080;
    const ws = socketsRef.current.get(targetPort);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(action));
    } else {
      fetch(`/api/bridge/${targetPort}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action)
      }).catch(() => {
        fetch(`http://localhost:${targetPort}/api/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action)
        }).catch(() => {});
      });
    }
  };

  // Discover chunks around target coordinates
  const discoverChunksAround = (worldX: number, worldZ: number, radiusChunks: number = 4) => {
    const centerCx = Math.floor(worldX / 16);
    const centerCz = Math.floor(worldZ / 16);
    
    setDiscoveredChunks((prev) => {
      let hasNew = false;
      const next = new Map(prev);
      for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
        for (let dz = -radiusChunks; dz <= radiusChunks; dz++) {
          const cx = centerCx + dx;
          const cz = centerCz + dz;
          const key = `${cx},${cz}`;
          if (!next.has(key)) {
            next.set(key, generateChunk(cx, cz, 1337, 0));
            hasNew = true;
          }
        }
      }
      return hasNew ? next : prev;
    });
  };

  // Discover new chunks as active player moves
  useEffect(() => {
    discoverChunksAround(player.x, player.z, 3);
  }, [Math.floor(player.x / 16), Math.floor(player.z / 16)]);


  // ==========================================
  // REAL-TIME WEBSOCKET TELEMETRY BRIDGE
  // ==========================================
  useEffect(() => {
    const portsToTry = Array.from(new Set([...(envConfig.botIpcPorts || [8080]), 8080, 8079]));
    const socketsMap = new Map<number, WebSocket>();
    const retryTimeouts = new Map<number, any>();

    const connect = (port: number, index: number) => {
      try {
        console.log(`[IPC] Attempting connection to port ${port}...`);
        const ws = new WebSocket(`ws://localhost:${port}/ws`);
        socketsMap.set(port, ws);
        socketsRef.current = socketsMap;

        ws.onopen = () => {
          console.log(`[IPC] WebSocket connected to port ${port}`);
          setIsConnected(true);
          
          setAgents((prev) => {
            if (prev.find(a => a.port === port)) {
              return prev.map(a => a.port === port ? { ...a, status: "connected" as const } : a);
            }
            return [...prev, {
              id: `agent_live_${port}`,
              name: envConfig.botUsernames?.[index] || `Live-Bot-${port}`,
              role: (envConfig.botRoles?.[index] as AgentRole) || (index === 0 ? "Assistant" : "Builder"),
              status: "connected",
              color: index === 0 ? "#8b5cf6" : "#10b981",
              port,
              player: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, health: 20, maxHealth: 20, food: 20, selectedSlot: 0, hotbar: [] },
              raycast: { type: "MISS" },
              currentTask: "Connected to Fabric Bridge",
              lastThought: "Awaiting telemetry data..."
            }];
          });
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "chat") {
              const incomingSender = data.sender || "Player";
              const incomingText = data.text || "";
              if (!agents.some(a => a.name.toLowerCase() === incomingSender.toLowerCase())) {
                handleSendChatMessage(incomingText, incomingSender);
              }
              return;
            }
            if (data.type === "log") {
              setThoughtLog(prev => [`[Bridge Log]: ${data.message}`, ...prev]);
              return;
            }
            if (data.player || data.inventory || data.x !== undefined || data.y !== undefined || data.z !== undefined || data.pos || data.position || data.pose) {
              // Mark live telemetry freshness (authoritative position clock)
              lastLiveTelemetryAtRef.current = Date.now();
              setAgents((prev) =>
                prev.map((a) =>
                  a.port === port
                    ? {
                        ...a,
                        player: normalizeLivePlayerState(data, a.player),
                        raycast: data.raycast || a.raycast || { type: "MISS" },
                        status: "connected"
                      }
                    : a
                )
              );

              // Always update global player state from connected live telemetry stream
              setPlayer((p) => normalizeLivePlayerState(data, p));

              if (data.nearby_entities) {
                setEntities(data.nearby_entities);
              }
            }
          } catch (e) {
            // ignore malformed data
          }
        };

        ws.onclose = () => {
          console.warn(`[IPC] WebSocket on port ${port} closed. Retrying in 3s...`);
          setAgents((prev) => prev.map(a => a.port === port ? { ...a, status: "disconnected" as const } : a));
          
          // Retry logic
          if (retryTimeouts.has(port)) clearTimeout(retryTimeouts.get(port));
          retryTimeouts.set(port, setTimeout(() => connect(port, index), 3000));
        };

        ws.onerror = () => {
          ws.close();
        };

      } catch (err) {
        console.error(`[IPC] WebSocket creation failed for ${port}:`, err);
      }
    };

    portsToTry.forEach((port, i) => connect(port, i));

    return () => {
      socketsMap.forEach((ws) => {
        ws.onclose = null; // Prevent retry on explicit cleanup
        ws.close();
      });
      retryTimeouts.forEach((t) => clearTimeout(t));
    };
  }, [JSON.stringify(envConfig.botIpcPorts), JSON.stringify(envConfig.botUsernames)]);

  // ==========================================
  // HTTP BRIDGE POLLING & FAILOVER SYNC
  // ==========================================
  useEffect(() => {
    let isCancelled = false;
    let lastProcessedChatTimestamp = 0;

    const pollBridgeState = async () => {
      try {
        let activePort = 8080;
        let isBridgeConnected = false;
        let botName = "Gemini";
        let stateUrl = "";

        // Attempt 1: Via dashboard backend proxy
        try {
          const statusRes = await fetch("/api/bridge/status");
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.connected) {
              isBridgeConnected = true;
              activePort = statusData.port || 8080;
              botName = statusData.status?.bot_name || "Gemini";
              stateUrl = `/api/bridge/${activePort}/state`;
            }
          }
        } catch {}

        // Attempt 2: Direct browser-to-host fetch if proxy didn't connect
        if (!isBridgeConnected) {
          for (const port of [8080, 8079]) {
            try {
              const controller = new AbortController();
              const tid = setTimeout(() => controller.abort(), 1000);
              const directRes = await fetch(`http://localhost:${port}/api/status`, { signal: controller.signal });
              clearTimeout(tid);
              if (directRes.ok) {
                const directData = await directRes.json();
                isBridgeConnected = true;
                activePort = port;
                botName = directData.bot_name || "Gemini";
                stateUrl = `http://localhost:${port}/api/state`;
                break;
              }
            } catch {}
          }
        }

        if (isBridgeConnected && stateUrl) {
          setIsConnected(true);
          const stateRes = await fetch(stateUrl);
          if (stateRes.ok) {
            const data = await stateRes.json();
            if ((data.player || data.inventory) && !isCancelled) {
              // Mark live telemetry freshness (authoritative position clock)
              lastLiveTelemetryAtRef.current = Date.now();
              setPlayer(p => normalizeLivePlayerState(data, p));
              setAgents(prev => {
                const exists = prev.find(a => a.port === activePort);
                if (exists) {
                  return prev.map(a =>
                    a.port === activePort
                      ? {
                          ...a,
                          player: normalizeLivePlayerState(data, a.player),
                          raycast: data.raycast || a.raycast,
                          status: "connected" as const
                        }
                      : a
                  );
                }
                return [
                  ...prev,
                  {
                    id: `agent_live_${activePort}`,
                    name: botName,
                    role: "Assistant" as AgentRole,
                    status: "connected" as const,
                    color: "#8b5cf6",
                    port: activePort,
                    player: normalizeLivePlayerState(data),
                    raycast: data.raycast || { type: "MISS" },
                    currentTask: "Live Fabric Client Connected",
                    lastThought: "Operating in live world telemetry mode."
                  }
                ];
              });

              if (data.nearby_entities && !isCancelled) {
                setEntities(data.nearby_entities);
              }

              // Process recent in-game chat messages
              if (data.recent_chat && Array.isArray(data.recent_chat)) {
                for (const chat of data.recent_chat) {
                  if (chat.timestamp > lastProcessedChatTimestamp) {
                    lastProcessedChatTimestamp = chat.timestamp;
                    const sender = chat.sender || "Player";
                    const text = chat.text || "";
                    if (!agents.some(a => a.name.toLowerCase() === sender.toLowerCase())) {
                      handleSendChatMessage(text, sender);
                    }
                  }
                }
              }
            }
          }
        }
      } catch {
        // Polling silent catch
      }
    };

    pollBridgeState();
    const interval = setInterval(pollBridgeState, 1500);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [agents, activeAgentId]);

  // Auto-Scout autonomous spiral exploration loop
  useEffect(() => {
    if (!isAutoScouting) return;
    const interval = setInterval(() => {
      scoutStateRef.current.angle += 0.32;
      scoutStateRef.current.radius += 1.6;
      const nx = scoutStateRef.current.centerX + Math.cos(scoutStateRef.current.angle) * scoutStateRef.current.radius;
      const nz = scoutStateRef.current.centerZ + Math.sin(scoutStateRef.current.angle) * scoutStateRef.current.radius;
      const newYaw = (Math.atan2(Math.sin(scoutStateRef.current.angle), Math.cos(scoutStateRef.current.angle)) * 180) / Math.PI;

      setAgents((prev) =>
        prev.map((a) =>
          a.id === activeAgentId
            ? {
                ...a,
                player: {
                  ...a.player,
                  x: nx,
                  z: nz,
                  yaw: newYaw,
                },
                currentTask: `Auto-Scouting & Mapping world coordinates [${Math.round(nx)}, ${Math.round(nz)}]`,
              }
            : a
        )
      );

      discoverChunksAround(nx, nz, 4);
    }, 1200);

    return () => clearInterval(interval);
  }, [isAutoScouting, activeAgentId]);

  // Synchronize player updates to active agent
  const setPlayer = (updater: (prev: PlayerState) => PlayerState) => {
    setAgents((prevAgents) =>
      prevAgents.map((ag) =>
        ag.id === activeAgentId ? { ...ag, player: updater(ag.player) } : ag
      )
    );
  };

  const setRaycast = (updater: (prev: RaycastTarget) => RaycastTarget) => {
    setAgents((prevAgents) =>
      prevAgents.map((ag) =>
        ag.id === activeAgentId ? { ...ag, raycast: updater(ag.raycast) } : ag
      )
    );
  };

  // Initialize schematic preset
  // useEffect(() => { loadSchematicPreset(currentPreset); }, [currentPreset]); // Disabled fake schematics

  const loadSchematicPreset = (preset: string) => {
    if (preset === "nether_portal") {
      const portalCoords = [
        { x: 103, y: 64, z: 20 }, { x: 104, y: 64, z: 20 }, { x: 105, y: 64, z: 20 }, { x: 106, y: 64, z: 20 },
        { x: 103, y: 65, z: 20 },                                                       { x: 106, y: 65, z: 20 },
        { x: 103, y: 66, z: 20 },                                                       { x: 106, y: 66, z: 20 },
        { x: 103, y: 67, z: 20 },                                                       { x: 106, y: 67, z: 20 },
        { x: 103, y: 68, z: 20 }, { x: 104, y: 68, z: 20 }, { x: 105, y: 68, z: 20 }, { x: 106, y: 68, z: 20 }
      ];

      const newDiffs: SchematicDiffItem[] = portalCoords.map((c, i) => ({
        id: `portal_${i}`,
        type: i < 3 ? "CORRECT" : "MISSING",
        x: c.x,
        y: c.y,
        z: c.z,
        expectedBlock: "minecraft:obsidian",
        currentBlock: i < 3 ? "minecraft:obsidian" : "minecraft:air",
        distanceSq: Math.pow(c.x - player.x, 2) + Math.pow(c.y - player.y, 2) + Math.pow(c.z - player.z, 2),
      }));

      setDiffs(newDiffs);
      setMaterials([
        { item: "minecraft:obsidian", required: 14, available: 64, missing: 0 },
        { item: "minecraft:flint_and_steel", required: 1, available: 1, missing: 0 },
      ]);
    } else if (preset === "stone_tower") {
      const towerCoords: { x: number; y: number; z: number }[] = [];
      for (let x = 103; x <= 106; x++) {
        for (let z = 22; z <= 25; z++) {
          if (x === 103 || x === 106 || z === 22 || z === 25) {
            towerCoords.push({ x, y: 64, z });
            towerCoords.push({ x, y: 65, z });
          }
        }
      }
      const newDiffs: SchematicDiffItem[] = towerCoords.map((c, i) => ({
        id: `tower_${i}`,
        type: i < 4 ? "CORRECT" : "MISSING",
        x: c.x,
        y: c.y,
        z: c.z,
        expectedBlock: "minecraft:stone_bricks",
        currentBlock: i < 4 ? "minecraft:stone_bricks" : "minecraft:air",
        distanceSq: Math.pow(c.x - player.x, 2) + Math.pow(c.y - player.y, 2) + Math.pow(c.z - player.z, 2),
      }));
      setDiffs(newDiffs);
      setMaterials([
        { item: "minecraft:stone_bricks", required: 24, available: 64, missing: 0 },
        { item: "minecraft:ladder", required: 4, available: 0, missing: 4 },
      ]);
    } else if (preset === "redstone_clock") {
      const redstoneCoords = [
        { x: 102, y: 64, z: 20, block: "minecraft:repeater" },
        { x: 103, y: 64, z: 20, block: "minecraft:redstone_wire" },
        { x: 103, y: 64, z: 21, block: "minecraft:repeater" },
        { x: 102, y: 64, z: 21, block: "minecraft:redstone_wire" },
      ];
      const newDiffs: SchematicDiffItem[] = redstoneCoords.map((c, i) => ({
        id: `redstone_${i}`,
        type: "MISSING",
        x: c.x,
        y: c.y,
        z: c.z,
        expectedBlock: c.block,
        currentBlock: "minecraft:air",
        distanceSq: Math.pow(c.x - player.x, 2) + Math.pow(c.y - player.y, 2) + Math.pow(c.z - player.z, 2),
      }));
      setDiffs(newDiffs);
      setMaterials([
        { item: "minecraft:repeater", required: 2, available: 4, missing: 0 },
        { item: "minecraft:redstone_wire", required: 2, available: 16, missing: 0 },
      ]);
    }
  };

  // Dispatch Action Packet from Virtual Controller or AI
  const handleDispatchAction = (action: ActionPacket) => {
    const prevPlayerSnapshot: PlayerState = { ...player };

    // 1. Chat normalization and perception
    const rawActionType = (action.type || (action as any).action || "").toString().toLowerCase().trim();
    if (rawActionType === "send_chat" || rawActionType === "chat" || rawActionType === "say" || rawActionType === "message" || rawActionType === "speak" || rawActionType === "whisper") {
      let cleanMsg = action.message || (action as any).text || (action as any).content || (action as any).chat || (action as any).msg || "";
      // Strip redundant tags like "<Gemini> " or "<Builder-Bot> "
      cleanMsg = cleanMsg.replace(/^<[^>]+>\s*/, "").trim();
      const bridgeAction = { ...action, type: "send_chat" as const, message: cleanMsg };
      sendActionToBridge(bridgeAction);

      if (cleanMsg) {
        if (chatSettings.soundAlerts) {
          playChatChime("agent_reply");
        }
        setChatMessages((prev) => [
          ...prev,
          {
            id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            sender: activeAgent.name,
            text: cleanMsg,
            timestamp: Date.now(),
            channel: "all",
            isAi: true,
          },
        ]);
      }
      return;
    }

    if (action.type === "auto_build_litematica_step") {
      handleExecuteAutoBuildStep();
      return;
    }

    const targetAgentId = action.agentId || activeAgentId;
    const currentAgent = agents.find((ag) => ag.id === targetAgentId) || activeAgent;
    const currentP = currentAgent?.player || player;

    // 2. Move / Walk / Goto / Step (Coordinates navigation or keypress)
    if (rawActionType === "move" || rawActionType === "walk" || rawActionType === "goto" || rawActionType === "step" || rawActionType === "navigate") {
      let targetX: number | undefined = action.x !== undefined ? Number(action.x) : undefined;
      let targetY: number | undefined = action.y !== undefined ? Number(action.y) : undefined;
      let targetZ: number | undefined = action.z !== undefined ? Number(action.z) : undefined;

      const rawTarget = (action as any).target || (action as any).pos || (action as any).position || (action as any).coordinates;
      if (Array.isArray(rawTarget) && rawTarget.length >= 3) {
        targetX = Number(rawTarget[0]);
        targetY = Number(rawTarget[1]);
        targetZ = Number(rawTarget[2]);
      } else if (rawTarget && typeof rawTarget === "object" && rawTarget.x !== undefined) {
        targetX = Number(rawTarget.x);
        targetY = Number(rawTarget.y);
        targetZ = Number(rawTarget.z);
      }

      if (targetX !== undefined && targetZ !== undefined && !isNaN(targetX) && !isNaN(targetZ)) {
        const eyeX = currentP.x;
        const eyeY = currentP.y + 1.62;
        const eyeZ = currentP.z;
        const dx = targetX - eyeX;
        const dy = (targetY !== undefined ? targetY : currentP.y) - eyeY;
        const dz = targetZ - eyeZ;
        const horizDist = Math.sqrt(dx * dx + dz * dz);
        const finalYaw = Math.round((((((Math.atan2(-dx, dz) * 180) / Math.PI) % 360) + 360) % 360) * 10) / 10;
        const finalPitch = Math.max(-90, Math.min(90, Math.round(((-Math.atan2(dy, Math.max(0.001, horizDist)) * 180) / Math.PI) * 10) / 10));

        setPlayer((p) => ({ ...p, yaw: finalYaw, pitch: finalPitch }));
        setAgents((prev) => prev.map((ag) => ag.id === targetAgentId ? { ...ag, player: { ...ag.player, yaw: finalYaw, pitch: finalPitch } } : ag));
        sendActionToBridge({ type: "look_at", x: targetX, y: targetY || currentP.y, z: targetZ, yaw: finalYaw, pitch: finalPitch, ticks: 4, agentId: targetAgentId });

        const stepDist = Math.min(2.0, Math.max(0.4, horizDist));
        if (!isConnected) {
          const moveStep = Math.min(stepDist, 0.7);
          const rad = (finalYaw * Math.PI) / 180;
          setPlayer((p) => ({
            ...p,
            x: Math.round((p.x - Math.sin(rad) * moveStep) * 100) / 100,
            y: Math.round((targetY !== undefined ? targetY : p.y) * 100) / 100,
            z: Math.round((p.z + Math.cos(rad) * moveStep) * 100) / 100,
          }));
        }
        const moveDur = Math.min(2500, Math.max(200, Math.round(stepDist * 500)));
        sendActionToBridge({ type: "press_key", key: "w", durationMs: moveDur, agentId: targetAgentId });
        return;
      }

      const keyToPress = (action as any).key || ((action as any).direction === "back" || (action as any).direction === "backward" ? "s" : (action as any).direction === "left" ? "a" : (action as any).direction === "right" ? "d" : "w");
      const moveDuration = action.durationMs || (action as any).duration_ms || 400;
      setHeldKeys((prev) => new Set(prev).add(keyToPress));
      setTimeout(() => {
        setHeldKeys((prev) => {
          const next = new Set(prev);
          next.delete(keyToPress);
          return next;
        });
      }, moveDuration);
      sendActionToBridge({ type: "press_key", key: keyToPress, durationMs: moveDuration, agentId: targetAgentId });
      return;
    }

    // 3. Mine / Dig / Harvest / Break Block
    if (rawActionType === "mine" || rawActionType === "dig" || rawActionType === "harvest" || rawActionType === "break_block") {
      let targetX = action.x !== undefined ? Number(action.x) : undefined;
      let targetY = action.y !== undefined ? Number(action.y) : undefined;
      let targetZ = action.z !== undefined ? Number(action.z) : undefined;
      const rawTarget = (action as any).target || (action as any).pos || (action as any).position || (action as any).block;
      if (Array.isArray(rawTarget) && rawTarget.length >= 3) {
        targetX = Number(rawTarget[0]);
        targetY = Number(rawTarget[1]);
        targetZ = Number(rawTarget[2]);
      } else if (rawTarget && typeof rawTarget === "object" && rawTarget.x !== undefined) {
        targetX = Number(rawTarget.x);
        targetY = Number(rawTarget.y);
        targetZ = Number(rawTarget.z);
      }

      if (targetX !== undefined && targetY !== undefined && targetZ !== undefined) {
        const eyeX = currentP.x;
        const eyeY = currentP.y + 1.62;
        const eyeZ = currentP.z;
        const dx = targetX + 0.5 - eyeX;
        const dy = targetY + 0.5 - eyeY;
        const dz = targetZ + 0.5 - eyeZ;
        const horizDist = Math.sqrt(dx * dx + dz * dz);
        const finalYaw = Math.round((((((Math.atan2(-dx, dz) * 180) / Math.PI) % 360) + 360) % 360) * 10) / 10;
        const finalPitch = Math.max(-90, Math.min(90, Math.round(((-Math.atan2(dy, Math.max(0.001, horizDist)) * 180) / Math.PI) * 10) / 10));

        setPlayer((p) => ({ ...p, yaw: finalYaw, pitch: finalPitch }));
        sendActionToBridge({ type: "look_at", x: targetX + 0.5, y: targetY + 0.5, z: targetZ + 0.5, yaw: finalYaw, pitch: finalPitch, ticks: 3, agentId: targetAgentId });
      }

      const toolSlot = (action as any).slot !== undefined ? (action as any).slot : (currentP.selectedSlot === 0 ? 0 : 1);
      setPlayer((p) => ({ ...p, selectedSlot: toolSlot }));
      sendActionToBridge({ type: "select_hotbar", slot: toolSlot, agentId: targetAgentId });

      const miningDuration = action.durationMs || (action as any).duration_ms || 3000;
      setHeldKeys((prev) => new Set(prev).add("attack"));
      setTimeout(() => {
        setHeldKeys((prev) => {
          const next = new Set(prev);
          next.delete("attack");
          return next;
        });
      }, miningDuration);
      sendActionToBridge({ type: "press_key", key: "attack", durationMs: miningDuration, agentId: targetAgentId });
      return;
    }

    // 4. Attack / Combat
    if (rawActionType === "attack" || rawActionType === "hit" || rawActionType === "kill" || rawActionType === "strike") {
      const dur = action.durationMs || (action as any).duration_ms || 400;
      setHeldKeys((prev) => new Set(prev).add("attack"));
      setTimeout(() => {
        setHeldKeys((prev) => {
          const next = new Set(prev);
          next.delete("attack");
          return next;
        });
      }, dur);
      sendActionToBridge({ type: "press_key", key: "attack", durationMs: dur, agentId: targetAgentId });
      return;
    }

    // 5. Jump
    if (rawActionType === "jump") {
      if (!isConnected) {
        setPlayer((p) => ({ ...p, y: Math.round((p.y + 0.8) * 100) / 100 }));
      }
      sendActionToBridge({ type: "press_key", key: "space", durationMs: 300, agentId: targetAgentId });
      return;
    }

    // 6. Wait / Sleep
    if (rawActionType === "wait" || rawActionType === "delay" || rawActionType === "sleep") {
      return;
    }

    // 7. Equip / Hotbar
    if (rawActionType === "select_hotbar" || rawActionType === "select_slot" || rawActionType === "equip" || rawActionType === "hold") {
      const rawSlot = action.slot !== undefined ? action.slot : ((action as any).hotbar !== undefined ? (action as any).hotbar : 0);
      const targetSlot = Math.max(0, Math.min(8, Number(rawSlot)));
      setPlayer((p) => ({ ...p, selectedSlot: targetSlot }));
      setAgents((prev) =>
        prev.map((ag) =>
          ag.id === targetAgentId
            ? { ...ag, player: { ...ag.player, selectedSlot: targetSlot } }
            : ag
        )
      );
      sendActionToBridge({ type: "select_hotbar", slot: targetSlot, agentId: targetAgentId });
      return;
    }

    if (action.type === "look_at") {
      let targetX: number | undefined = action.x !== undefined ? Number(action.x) : undefined;
      let targetY: number | undefined = action.y !== undefined ? Number(action.y) : undefined;
      let targetZ: number | undefined = action.z !== undefined ? Number(action.z) : undefined;

      // Support array target/pos: [x, y, z]
      const rawTarget = (action as any).target || (action as any).pos || (action as any).position || (action as any).coordinates;
      if (Array.isArray(rawTarget) && rawTarget.length >= 3) {
        targetX = Number(rawTarget[0]);
        targetY = Number(rawTarget[1]);
        targetZ = Number(rawTarget[2]);
      } else if (rawTarget && typeof rawTarget === "object" && rawTarget.x !== undefined) {
        targetX = Number(rawTarget.x);
        targetY = Number(rawTarget.y);
        targetZ = Number(rawTarget.z);
      }

      // Support block target: { x, y, z }
      if ((action as any).block && typeof (action as any).block === "object") {
        const b = (action as any).block;
        if (b.x !== undefined && b.y !== undefined && b.z !== undefined) {
          targetX = Number(b.x) + 0.5;
          targetY = Number(b.y) + 0.5;
          targetZ = Number(b.z) + 0.5;
        }
      }

      // If targeting a block or coordinates are integer block coords, aim at the exact block center (+0.5)
      const hasBlockHint = !!(action as any).block || !!(action as any).side;
      if (targetX !== undefined && targetY !== undefined && targetZ !== undefined) {
        if (hasBlockHint || (Number.isInteger(targetX) && Number.isInteger(targetZ))) {
          targetX = Math.floor(targetX) + 0.5;
          targetY = Math.floor(targetY) + 0.5;
          targetZ = Math.floor(targetZ) + 0.5;
        }
      }

      // Support entity target: entity_id or entityId or name
      const entId = (action as any).entity_id ?? (action as any).entityId;
      if (entId !== undefined) {
        const foundEnt = entities.find(e => e.id === entId || e.id === Number(entId));
        if (foundEnt) {
          targetX = foundEnt.x;
          targetY = foundEnt.y + 1.2;
          targetZ = foundEnt.z;
        }
      }

      let targetYaw = action.yaw;
      let targetPitch = action.pitch;

      if (targetX !== undefined && targetY !== undefined && targetZ !== undefined && !isNaN(targetX) && !isNaN(targetY) && !isNaN(targetZ)) {
        const eyeX = currentP.x;
        const eyeY = currentP.y + 1.62; // Standard Minecraft eye height
        const eyeZ = currentP.z;

        const dx = targetX - eyeX;
        const dy = targetY - eyeY;
        const dz = targetZ - eyeZ;
        const horizDist = Math.sqrt(dx * dx + dz * dz);

        targetYaw = (Math.atan2(-dx, dz) * 180) / Math.PI;
        targetPitch = (-Math.atan2(dy, Math.max(0.001, horizDist)) * 180) / Math.PI;
      }

      const finalYaw = Math.round(((((targetYaw ?? currentP.yaw) % 360) + 360) % 360) * 10) / 10;
      const finalPitch = Math.max(-90, Math.min(90, Math.round((targetPitch ?? currentP.pitch) * 10) / 10));

      setPlayer((p) => ({
        ...p,
        yaw: finalYaw,
        pitch: finalPitch,
      }));

      setAgents((prev) =>
        prev.map((ag) =>
          ag.id === targetAgentId
            ? {
                ...ag,
                player: {
                  ...ag.player,
                  yaw: finalYaw,
                  pitch: finalPitch,
                },
              }
            : ag
        )
      );

      const ticks = action.ticks || action.durationTicks || 2;
      const enrichedLookAction: ActionPacket = {
        type: "look_at",
        x: targetX !== undefined ? targetX : currentP.x,
        y: targetY !== undefined ? targetY : currentP.y + 1.62,
        z: targetZ !== undefined ? targetZ : currentP.z,
        yaw: finalYaw,
        pitch: finalPitch,
        ticks,
        durationTicks: ticks,
        agentId: targetAgentId,
      };

      sendActionToBridge(enrichedLookAction);

    } else if (action.type === "set_rotation") {
      const yaw = action.yaw !== undefined ? action.yaw : currentP.yaw;
      const pitch = action.pitch !== undefined ? action.pitch : currentP.pitch;
      const finalYaw = Math.round((((yaw % 360) + 360) % 360) * 10) / 10;
      const finalPitch = Math.max(-90, Math.min(90, Math.round(pitch * 10) / 10));

      setPlayer((p) => ({
        ...p,
        yaw: finalYaw,
        pitch: finalPitch,
      }));

      setAgents((prev) =>
        prev.map((ag) =>
          ag.id === targetAgentId
            ? {
                ...ag,
                player: {
                  ...ag.player,
                  yaw: finalYaw,
                  pitch: finalPitch,
                },
              }
            : ag
        )
      );

      sendActionToBridge({
        type: "set_rotation",
        yaw: finalYaw,
        pitch: finalPitch,
        ticks: action.ticks || 4,
        agentId: targetAgentId,
      });

    } else if (action.type === "look_at_relative") {
      const deltaYaw = action.yaw || 0;
      const deltaPitch = action.pitch || 0;
      const finalYaw = Math.round(((((currentP.yaw + deltaYaw) % 360) + 360) % 360) * 10) / 10;
      const finalPitch = Math.max(-90, Math.min(90, Math.round((currentP.pitch + deltaPitch) * 10) / 10));

      setPlayer((p) => ({
        ...p,
        yaw: finalYaw,
        pitch: finalPitch,
      }));

      setAgents((prev) =>
        prev.map((ag) =>
          ag.id === targetAgentId
            ? {
                ...ag,
                player: {
                  ...ag.player,
                  yaw: finalYaw,
                  pitch: finalPitch,
                },
              }
            : ag
        )
      );

      sendActionToBridge({
        type: "set_rotation",
        yaw: finalYaw,
        pitch: finalPitch,
        ticks: action.ticks || 4,
        agentId: targetAgentId,
      });

    } else if (action.type === "select_hotbar") {
      if (action.slot !== undefined) {
        const targetSlot = Math.max(0, Math.min(8, action.slot));
        setPlayer((p) => ({ ...p, selectedSlot: targetSlot }));
        setAgents((prev) =>
          prev.map((ag) =>
            ag.id === targetAgentId
              ? {
                  ...ag,
                  player: {
                    ...ag.player,
                    selectedSlot: targetSlot,
                  },
                }
              : ag
          )
        );
        sendActionToBridge({ type: "select_hotbar", slot: targetSlot, agentId: targetAgentId });
      }

    } else {
      sendActionToBridge(action);
    }

    if (action.type === "press_key") {
      const key = action.key?.toLowerCase() || "";
      setHeldKeys((prev) => new Set(prev).add(key));

      const targetAgentId = action.agentId || activeAgentId;

      // Only perform client-side local kinematics prediction if NOT connected to a live Minecraft bridge
      if (!isConnected) {
        setPlayer((p) => {
          let { x, y, z, yaw } = p;
          const rad = (yaw * Math.PI) / 180;
          const step = 0.35;

          if (key === "w") {
            x -= Math.sin(rad) * step;
            z += Math.cos(rad) * step;
          } else if (key === "s") {
            x += Math.sin(rad) * step;
            z -= Math.cos(rad) * step;
          } else if (key === "a") {
            x -= Math.cos(rad) * step;
            z -= Math.sin(rad) * step;
          } else if (key === "d") {
            x += Math.cos(rad) * step;
            z += Math.sin(rad) * step;
          } else if (key === "space") {
            y += 0.4;
          }
          return { ...p, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, z: Math.round(z * 100) / 100 };
        });

        // Also update target agent in swarm roster if steered individually
        setAgents((prev) =>
          prev.map((ag) => {
            if (ag.id === targetAgentId) {
              let { x, y, z, yaw } = ag.player;
              const rad = (yaw * Math.PI) / 180;
              const step = 0.35;
              if (key === "w") { x -= Math.sin(rad) * step; z += Math.cos(rad) * step; }
              else if (key === "s") { x += Math.sin(rad) * step; z -= Math.cos(rad) * step; }
              else if (key === "a") { x -= Math.cos(rad) * step; z -= Math.sin(rad) * step; }
              else if (key === "d") { x += Math.cos(rad) * step; z += Math.sin(rad) * step; }
              else if (key === "space") { y += 0.4; }
              return {
                ...ag,
                player: {
                  ...ag.player,
                  x: Math.round(x * 100) / 100,
                  y: Math.round(y * 100) / 100,
                  z: Math.round(z * 100) / 100,
                }
              };
            }
            return ag;
          })
        );
      }

      setTimeout(() => {
        setHeldKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, action.durationMs || 200);

    } else if (action.type === "release_all_keys") {
      setHeldKeys(new Set());
    } else if (action.type === "place_block") {
      setDiffs((prev) => {
        const next = [...prev];
        const missingIndex = next.findIndex((d) => d.type === "MISSING");
        if (missingIndex !== -1) {
          next[missingIndex] = {
            ...next[missingIndex],
            type: "CORRECT",
            currentBlock: next[missingIndex].expectedBlock,
          };
        }
        return next;
      });

      setPlayer((p) => {
        const newHotbar = [...p.hotbar];
        const currentStack = newHotbar[p.selectedSlot];
        if (currentStack && currentStack.count > 0) {
          newHotbar[p.selectedSlot] = {
            ...currentStack,
            count: currentStack.count - 1,
          };
        }
        return { ...p, hotbar: newHotbar };
      });
    } else if (action.type === "request_cube_map" || action.type === "scan_3d_cube") {
      const r = action.radius || 8;
      const centerPos: [number, number, number] = action.center || [Math.round(player.x), Math.round(player.y), Math.round(player.z)];
      fetchLiveCubeMap(centerPos, r).then(({ cube, source }) => {
        setThoughtLog((prev) => [
          `[3D Voxel Perception]: ${source === "live_minecraft_world" ? "LIVE WORLD SCAN" : "Simulated scan (bridge offline)"} of ${cube.totalBlocks} blocks (Radius ${r}) at [${centerPos.join(", ")}]. Ores: ${cube.summary.ores.length} (${cube.summary.ores.map(o => o.name).slice(0, 3).join(", ") || "None"}), Hazards: ${cube.summary.hazards.length}, Solid: ${cube.summary.densityPct}%.`,
          ...prev
        ]);
      });
    } else if (action.type === "drop_item") {
      setPlayer((p) => {
        const newHotbar = [...p.hotbar];
        const cur = newHotbar[p.selectedSlot];
        if (cur && cur.count > 0) {
          newHotbar[p.selectedSlot] = action.all || cur.count <= 1
            ? { slot: p.selectedSlot, item: "minecraft:air", count: 0 }
            : { ...cur, count: cur.count - 1 };
        }
        return { ...p, hotbar: newHotbar };
      });
    }

    // Real-Time Cognitive Feedback & Mistake Learning Evaluation
    const evalResult = CognitiveFeedbackEngine.getInstance().evaluateOutcome(
      prevPlayerSnapshot,
      player,
      action,
      raycast
    );
    setCognitiveFeedback(evalResult.feedback);

    if (evalResult.detectedMistake) {
      setThoughtLog((prev) => [
        `[Mistake Learning Feedback]: ${evalResult.detectedMistake}\n-> Corrective Guidance: ${evalResult.feedback.suggestedCorrection}`,
        ...prev,
      ]);
    }

    // Record in memory with feedback
    setRecentMemory((prev) => [
      ...prev.slice(-20),
      {
        tick: Math.floor(Date.now() / 50),
        timestamp: Date.now(),
        playerPos: [player.x, player.y, player.z],
        action,
        result: evalResult.detectedMistake ? "mistake_detected" : "success",
        feedback: evalResult.feedback.suggestedCorrection,
        mistakeDetected: evalResult.detectedMistake || undefined,
      },
    ]);
  };

  // Step Auto-Build Loop
  const handleExecuteAutoBuildStep = () => {
    const missing = diffs.find((d) => d.type === "MISSING");
    if (!missing) {
      setIsAutoBuilding(false);
      return;
    }

    handleDispatchAction({ type: "select_hotbar", slot: 0 });
    handleDispatchAction({
      type: "look_at",
      x: missing.x + 0.5,
      y: missing.y + 0.5,
      z: missing.z + 0.5,
      ticks: 3,
    });
    setTimeout(() => {
      handleDispatchAction({
        type: "place_block",
        hand: "main",
        x: missing.x,
        y: missing.y,
        z: missing.z,
        side: "up",
      });
    }, 150);
  };

  // Cognition Ticker: The heartbeat of Deep Autonomy
  // Periodically triggers the AI to evaluate its situation, environment, and current goal.
  useEffect(() => {
    if (!isAutonomousMode || !isConnected) return;

    // Fast configurable interval (1.5s - 15s, default 3s) without arbitrary 40s delays
    const configuredSec = envConfig.aiAutonomyIntervalSeconds ?? (provider === "builtin" ? 1.5 : provider === "nvidia" || provider === "ollama" ? 3 : 6);
    const intervalMs = Math.max(1000, configuredSec * 1000);

    const cognitionInterval = setInterval(() => {
      if (isLoadingAi) return;

      // Determine directive: user custom goal OR role-specific autonomous directive
      let effectiveDirective = activeGoal;
      if (!effectiveDirective || effectiveDirective.trim().length === 0) {
        if (activeAgent.role === "Builder") {
          effectiveDirective = "Autonomous Builder: Inspect schematic diffs, locate missing blocks, select appropriate hotbar item, and build.";
        } else if (activeAgent.role === "Miner") {
          effectiveDirective = "Autonomous Miner: Scan terrain, approach cobblestone or ores, and mine with pickaxe.";
        } else if (activeAgent.role === "Guard") {
          effectiveDirective = "Autonomous Guard: Scan radar for hostile mobs within 16 blocks, approach and eliminate threat.";
        } else if (activeAgent.role === "Scout") {
          effectiveDirective = "Autonomous Scout: Explore frontier chunks, observe terrain, avoid hazards, place torches.";
        } else {
          effectiveDirective = "Autonomous Assistant: Standby, monitor surroundings, manage inventory, and coordinate swarm.";
        }
      }

      handleDispatchAiGoal(`[Cognitive Ticker]: ${effectiveDirective}`);
    }, intervalMs);

    return () => clearInterval(cognitionInterval);
  }, [isAutonomousMode, isConnected, isLoadingAi, activeGoal, activeAgentId, activeAgent.role, activeAgent.name, envConfig.aiAutonomyIntervalSeconds, provider, player, raycast, entities, diffs, chatMessages, chatSettings.personaTone]);

  useEffect(() => {
    let timer: any = null;
    if (isAutoBuilding) {
      timer = setInterval(() => {
        const stillMissing = diffs.some((d) => d.type === "MISSING");
        if (stillMissing) {
          handleExecuteAutoBuildStep();
        } else {
          setIsAutoBuilding(false);
        }
      }, 500);
    }
    return () => clearInterval(timer);
  }, [isAutoBuilding, diffs]);

  // AI Brain Goal Dispatcher with Chat Perception and Agent Context
  const handleDispatchAiGoal = async (goal: string, customChatTrigger?: string) => {
    setIsLoadingAi(true);
    try {
      let thought = "";
      let actions: ActionPacket[] = [];
      let engineLabel = "";

      // Extract cognitive feedback and mistakes learned
      const feedbackEngine = CognitiveFeedbackEngine.getInstance();
      const executionFeedback = feedbackEngine.generatePromptFeedbackString();
      const detectedMistakes = feedbackEngine.getMistakes();

      // Generate surrounding 3D Block Cube Map — LIVE world blocks when the Fabric bridge is
      // connected (real coordinates, real block identities), procedural only as offline fallback.
      // Fresh live position: refresh telemetry from the bridge right before every scan so
      // the AI's believed coordinates can never drift from the real ones (fixes hallucinated
      // positions like [100, 63, 103] when actually at [-305, 83, 120]).
      let livePlayer = player;
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 1500);
        // Resolve the live bridge port via status first (no hardcoded 8080)
        let stateUrl = "/api/bridge/state";
        try {
          const stStatus = await fetch("/api/bridge/status", { signal: controller.signal });
          if (stStatus.ok) {
            const sd = await stStatus.json();
            if (sd && sd.connected) stateUrl = `/api/bridge/${sd.port || 8080}/state`;
          }
        } catch {}
        const stRes = await fetch(stateUrl, { signal: controller.signal });
        clearTimeout(tid);
        if (stRes.ok) {
          const stData = await stRes.json();
          if (stData && (stData.player || stData.pose || stData.x !== undefined)) {
            lastLiveTelemetryAtRef.current = Date.now();
            livePlayer = normalizeLivePlayerState(stData, player);
            setPlayer(() => livePlayer);
          }
        }
      } catch {
        // Bridge unreachable — fall back to last known state.
      }

      const scanCenter: [number, number, number] = [Math.round(livePlayer.x), Math.round(livePlayer.y), Math.round(livePlayer.z)];
      const { cube: currentCube, source: cubeSource } = await fetchLiveCubeMap(scanCenter, 8);
      const cubeSummary = formatCubeMapForAiPrompt(currentCube);

      // Unified AI Routing Strategy (NVIDIA -> Gemini -> Ollama -> Built-in)
      const payload = {
        telemetry: { player: livePlayer, raycast, nearbyEntities: entities },
        goal,
        cubeMap: currentCube,
        cubeSource,
        cubeSummary,
        executionFeedback,
        detectedMistakes,
        actionHistory: recentMemory.slice(-12).map((m) => ({
          action: m.action.type,
          key: m.action.key,
          result: m.result,
          feedback: m.feedback || m.mistakeDetected,
        })),
        litematicaDiff: diffs.filter((d) => d.type === "MISSING").slice(0, 8),
        memorySummary: recentMemory.slice(-8).map((m) => `${m.action.type}${m.action.key ? `(${m.action.key})` : ""}`).join(", "),
        chatHistory: chatMessages.slice(-10),
        agentContext: {
          id: activeAgent.id,
          name: activeAgent.name,
          role: activeAgent.role,
        },
        preferredModel: envConfig.nvidiaModel,
        apiKeyOverrides: {
          nvidia: envConfig.nvidiaApiKey,
          gemini: envConfig.geminiApiKey,
          nvidiaBaseUrl: envConfig.nvidiaBaseUrl,
          nvidiaModel: envConfig.nvidiaModel,
          ollamaModel: envConfig.ollamaModel,
          ollamaBaseUrl: envConfig.ollamaBaseUrl,
          ollamaNumCtx: envConfig.ollamaNumCtx || 131072,
          ollamaVisionModel: envConfig.ollamaVisionModel || "moondream:1.8b",
        }
      };

      let data: any;
      if (provider === "ollama") {
        const ollamaBase = envConfig.ollamaBaseUrl || "http://127.0.0.1:11434";
        const sanitizedBase = ollamaBase.replace(/\/$/, "");
        try {
          const ollamaSystemInstruction = `You are an Autonomous Robotic Minecraft AI Agent named ${activeAgent.name} (${activeAgent.role}). UNRESTRICTED motor control and full game access.
MISSION: Execute directive autonomously. Do NOT return empty actions []. Always provide a concrete sequence of motor actions in the 'actions' array.

1. FULL KEYBOARD & MOUSE CONTROLS (WHAT KEY DOES WHAT):
- 'w' (KEY): Walk forward. {"type": "press_key", "key": "w", "duration_ms": 1000}
- 's' (KEY): Walk backward. {"type": "press_key", "key": "s", "duration_ms": 500}
- 'a' (KEY): Strafe left. {"type": "press_key", "key": "a", "duration_ms": 500}
- 'd' (KEY): Strafe right. {"type": "press_key", "key": "d", "duration_ms": 500}
- 'space' (KEY): Jump up 1 block or swim up in water. {"type": "press_key", "key": "space", "duration_ms": 250}
- 'sneak' or 'shift' (KEY): Sneak/crouch. Prevents falling off edges. {"type": "press_key", "key": "sneak", "duration_ms": 1500}
- 'sprint' or 'ctrl' (KEY): Sprint forward when combined with 'w'. {"type": "press_key", "key": "sprint", "duration_ms": 2000}
- 'attack' or 'left_click' (MOUSE1): Break blocks or hit hostile mobs.
  * CRITICAL BLOCK HARDNESS RULE:
    Blocks have physical hardness! You MUST hold the attack key continuously for the required duration!
    If you do NOT press attack for long enough, THE BLOCK IS NOT BROKEN, the crack resets, and your action fails!
    - Oak/Birch/Spruce Logs: 1500ms (barehand) or 800ms (wooden axe). Hold for >= 2000ms!
    - Stone/Cobblestone: 7500ms barehand (NO DROP!) or 1150ms with wooden pickaxe.
    - Dirt/Sand: 750ms barehand or 400ms shovel.
    The system will notify you if duration was too short: "The block wasn't broken! You didn't press for long enough."
    You will then log this in failures.json and update your skills.json with the required duration.
- 'use' or 'right_click' (MOUSE2): Place held block, open container (chest/door), eat food. {"type": "press_key", "key": "use", "duration_ms": 200}
- '1' to '9' (SLOTS 0 to 8): Switch active item in live hotbar. {"type": "select_hotbar", "slot": 0}
- 'q' (KEY): Drop selected item. {"type": "press_key", "key": "q", "duration_ms": 100}
- 'e' (KEY): Open/close inventory. {"type": "press_key", "key": "e", "duration_ms": 100}
- 'look_at': Aim crosshairs at 3D block coordinate. {"type": "look_at", "x": X, "y": Y, "z": Z, "ticks": 4}
- 'look_at_relative': Rotate view angle. {"type": "look_at_relative", "yaw": dy, "pitch": dp}
- 'send_chat': Public in-game chat. {"type": "send_chat", "message": "<${activeAgent.name}> ..."}
- 'release_all_keys': Release all keys.

2. SELF-LEARNING (SKILLS & FAILURES FILES):
- Check your skills file ('skills.json') for verified durations before acting.
- When an action fails, inspect 'failures.json' and write the fix in 'skills.json'.

STRICT JSON: {"thought": "...", "actions": [...]}`;

          const directRes = await fetch(`${sanitizedBase}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: envConfig.ollamaModel || "llama3.2:3b",
              format: "json",
              messages: [
                { role: "system", content: ollamaSystemInstruction },
                { role: "user", content: `Directive: ${goal}\nAgent: ${activeAgent.name} [Role: ${activeAgent.role}]\nPosition: [${Math.round(player.x)}, ${Math.round(player.y)}, ${Math.round(player.z)}]\nSelected Slot: ${player.selectedSlot}\nRaycast: ${JSON.stringify(raycast)}\nSurroundings:\n${cubeSummary}` }
              ],
              stream: false,
              options: { temperature: 0.1, num_ctx: envConfig.ollamaNumCtx || 8192 }
            })
          });

          if (directRes.status === 405) {
            setThoughtLog((prev) => [
              `[Ollama 405 Method Not Allowed]: Local Ollama rejected browser CORS preflight. Fix by restarting Ollama with CORS enabled: OLLAMA_ORIGINS="*" ollama serve`,
              ...prev
            ]);
          }

          if (directRes.ok) {
            const ollamaJson = await directRes.json();
            const raw = ollamaJson.message?.content || "";
            
            // Robust Plan Extractor (handles <think> tags, markdown code blocks, and raw JSON)
            let extractedThought = "";
            const thinkMatch = raw.match(/<think>([\s\S]*?)<\/think>/i);
            if (thinkMatch) {
              extractedThought = thinkMatch[1].trim();
            }
            const cleanContent = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

            let parsed: any = null;
            // 1. Try markdown code block
            const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
            let match: RegExpExecArray | null;
            while ((match = codeBlockRegex.exec(cleanContent)) !== null) {
              try {
                const candidate = JSON.parse(match[1].trim());
                if (candidate && (typeof candidate === "object" || Array.isArray(candidate))) {
                  parsed = candidate;
                  break;
                }
              } catch {}
            }

            // 2. Try outer JSON object
            if (!parsed) {
              const firstBrace = cleanContent.indexOf("{");
              const lastBrace = cleanContent.lastIndexOf("}");
              if (firstBrace !== -1 && lastBrace > firstBrace) {
                try {
                  parsed = JSON.parse(cleanContent.substring(firstBrace, lastBrace + 1));
                } catch {}
              }
            }

            // 3. Direct parse
            if (!parsed) {
              try {
                parsed = JSON.parse(cleanContent);
              } catch {}
            }

            if (parsed) {
              let actionsList = Array.isArray(parsed.actions) ? parsed.actions : 
                              (Array.isArray(parsed.plan) ? parsed.plan : 
                              (Array.isArray(parsed.steps) ? parsed.steps :
                              (Array.isArray(parsed.commands) ? parsed.commands :
                              (parsed.action && typeof parsed.action === "object" ? [parsed.action] :
                              (parsed.type ? [parsed] :
                              (Array.isArray(parsed) ? parsed : []))))));
              const thought = parsed.thought || extractedThought || "Executing local Ollama tactical plan.";
              
              const isChat = goal.includes("chat") || goal.includes("say") || goal.includes("received from") || goal.includes("Conversational Tone");
              if (actionsList.length === 0) {
                if (isChat) {
                  let reply = thought.replace(/^\[[^\]]+\]\s*/, "").replace(/^[A-Za-z0-9_-]+:\s*/, "").replace(/^<[^>]+>\s*/, "").trim();
                  if (!reply || reply.includes("Tactical plan") || reply.includes("Executing")) {
                    reply = "Acknowledged! Executing instruction.";
                  }
                  actionsList = [{ type: "send_chat", message: `<${activeAgent.name}> ${reply}` }];
                } else if (goal.toLowerCase().includes("mine") || goal.toLowerCase().includes("log") || goal.toLowerCase().includes("wood") || goal.toLowerCase().includes("ore")) {
                  actionsList = [
                    { type: "select_hotbar", slot: 1 },
                    { type: "press_key", key: "attack", duration_ms: 3000 }
                  ];
                } else {
                  actionsList = [
                    { type: "look_at_relative", yaw: 20, pitch: 0, ticks: 4 },
                    { type: "press_key", key: "w", duration_ms: 600 }
                  ];
                }
              }

              data = {
                thought,
                actions: actionsList,
                routingPath: `Tier 3: Local Ollama (${envConfig.ollamaModel || "qwen2.5-coder:7b"} @ ${sanitizedBase})`,
                activeTier: "ollama",
                latencyMs: 120
              };
            }
          }
        } catch (dirErr: any) {
          console.warn("Browser-direct Ollama fetch encountered issue:", dirErr);
        }
      }

      const endpoint = provider === "builtin" ? null : 
                      (provider === "auto" ? "/api/ai/auto-plan" : 
                      (provider === "nvidia" ? "/api/nvidia/plan" : 
                      (provider === "ollama" ? "/api/ollama/plan" : "/api/gemini/plan")));
      
      if (!data) {
        if (!endpoint) {
          // Direct Built-in fallback with 3D cube map
          const plan = solveBuiltinTacticalPlan(goal, player, raycast, entities, diffs, activeAgent.role, activeAgent.name, chatMessages, chatSettings.personaTone, currentCube);
          data = {
            thought: plan.thought,
            actions: plan.actions,
            routingPath: `Local Built-in AI (${plan.executionTimeMs}ms)`,
            activeTier: "builtin"
          };
        } else {
          try {
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            data = await res.json();
            if (data && data.error) {
              throw new Error(data.error);
            }
          } catch (fetchErr: any) {
            // Clean fallback to builtin AI
            const plan = solveBuiltinTacticalPlan(goal, player, raycast, entities, diffs, activeAgent.role, activeAgent.name, chatMessages, chatSettings.personaTone, currentCube);
            data = {
              thought: `AI provider connection error (${fetchErr?.message || "unreachable"}). Reverted to Built-in Engine.`,
              actions: plan.actions,
              routingPath: `Local Built-in AI (Failover)`,
              activeTier: "builtin"
            };
          }
        }
      }

      thought = data.thought || "Analyzing strategy...";
      actions = data.actions || [];
      engineLabel = `${data.routingPath || "AI Engine"} (${data.latencyMs || 10}ms)`;

      setRouterMetrics({
        activeTier: data.activeTier || "unknown",
        modelUsed: data.modelUsed || "unknown",
        latencyMs: data.latencyMs || 0,
        routingPath: data.routingPath || "Unknown Path",
        fallbackTriggered: !!data.fallbackTriggered,
        fallbackReason: data.fallbackReason || "",
      });

      if (data.fallbackTriggered && data.fallbackReason) {
        setThoughtLog((prev) => [`[Provider Notice]: ${data.fallbackReason}`, ...prev]);
      }

      if (data.selfLearningAlert) {
        setThoughtLog((prev) => [`[Self-Learning Engine]: ${data.selfLearningAlert}`, ...prev]);
      }

      // Update agent thought & status
      setAgents((prev) =>
        prev.map((ag) =>
          ag.id === activeAgentId ? { ...ag, lastThought: thought } : ag
        )
      );

      setThoughtLog((prev) => [
        `[Agent ${activeAgent.name} (${activeAgent.role}) via ${engineLabel}]: Goal "${goal}"\n[Thought]: ${thought}\n[Actions]: ${JSON.stringify(actions, null, 2)}`,
        ...prev,
      ]);

      // Filter out any unwanted error messages in actions
      let safeActions = actions.filter(
        (a) => !a.message?.includes("Error parsing deep neural plan")
      );

      // Ensure in-game chat messages are ALWAYS responded to in the chat channel
      const isChatGoal = goal.includes("In-game chat message received") || goal.includes("Conversational Tone") || goal.includes("Channel:");
      const hasChatAction = safeActions.some((a) => {
        const t = (a.type || (a as any).action || "").toString().toLowerCase();
        return t === "send_chat" || t === "chat" || t === "say" || t === "message";
      });
      if (isChatGoal && !hasChatAction) {
        let replyMsg = thought.replace(/^\[[^\]]+\]\s*/, "").replace(/^[A-Za-z0-9_-]+:\s*/, "").replace(/^<[^>]+>\s*/, "").trim();
        if (!replyMsg || replyMsg.includes("Tactical plan") || replyMsg.includes("Analyzing") || replyMsg.includes("heuristic")) {
          replyMsg = "Acknowledged! Executing instruction.";
        }
        if (replyMsg.length > 120) replyMsg = replyMsg.slice(0, 120);
        safeActions.unshift({
          type: "send_chat",
          message: `<${activeAgent.name}> ${replyMsg}`,
        });
      }

      // Sequentially dispatch actions with smart aiming lock settling
      for (let i = 0; i < safeActions.length; i++) {
        const action = safeActions[i];
        handleDispatchAction(action);
        
        // If this is a look_at or rotation action followed by attack or mine, wait for the aim to lock on!
        const nextAction = safeActions[i + 1];
        const isAimBeforeAttack = (action.type === "look_at" || action.type === "set_rotation") && 
          nextAction && (nextAction.type === "attack" || nextAction.type === "mine" || 
            (nextAction.type === "press_key" && (nextAction.key === "attack" || nextAction.key === "left_click" || nextAction.key === "mouse1")));
            
        const delay = isAimBeforeAttack ? Math.max(300, (action.ticks || 2) * 50 + 150) : 200;
        await new Promise((r) => setTimeout(r, delay));
      }
    } catch (e: any) {
      setThoughtLog((prev) => [
        `[Agent Error]: AI endpoint issue (${e.message}). Reverting to Built-in Neuro-Symbolic Engine.`,
        ...prev,
      ]);
      try {
        const fallbackPlan = solveBuiltinTacticalPlan(
          goal,
          player,
          raycast,
          entities,
          diffs,
          activeAgent.role,
          activeAgent.name,
          chatMessages,
          chatSettings.personaTone
        );
        for (const action of fallbackPlan.actions) {
          handleDispatchAction(action);
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch (err: any) {
        console.error("Built-in fallback failed:", err);
      }
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Send In-Game Chat Message
  const handleSendChatMessage = async (
    text: string, 
    sender: string = "Steve", 
    channel: "all" | "whisper" | "team" = "all"
  ) => {
    const lowerSender = sender.toLowerCase().trim();
    const isSystemSender = 
      lowerSender.includes("not secure") ||
      lowerSender.includes("secure") ||
      lowerSender.includes("system") ||
      lowerSender.includes("server") ||
      lowerSender.includes("broadcast");

    if (isSystemSender) {
      return;
    }

    const isAiSender = 
      agents.some((a) => a.name.toLowerCase() === lowerSender) ||
      lowerSender === currentUsername.toLowerCase().trim() ||
      lowerSender === "gemini" ||
      lowerSender.startsWith("gemini") ||
      lowerSender.startsWith("agent") ||
      lowerSender.startsWith("unit-") ||
      lowerSender.includes("bot");

    const messageTime = Date.now();
    // Deduplicate identical messages arriving within 3 seconds

    const newMsg: ChatMessage = {
      id: `chat_${messageTime}_${Math.random().toString(36).substr(2, 4)}`,
      sender,
      text,
      timestamp: messageTime,
      channel,
      isAi: isAiSender,
    };

    setChatMessages((prev) => {
      const isDuplicate = prev.some(m => m.sender === sender && m.text === text && messageTime - m.timestamp < 3000);
      if (isDuplicate) return prev;
      return [...prev, newMsg];
    });

    // If chat listening is turned OFF, perception is muted
    if (!chatSettings.listenToChat) {
      return;
    }

    // Swarm & Self loop filter: ignore messages sent by bot itself to avoid infinite perception loops
    if (isAiSender) {
      return;
    }

    // Suppress system/error messages from triggering AI repliers
    if (
      text.includes("Error parsing deep neural plan") ||
      text.startsWith("<Gemini>") ||
      text.startsWith(`<${currentUsername}>`) ||
      text.startsWith("[Chat] <Gemini>")
    ) {
      return;
    }

    // Command prefix filter: only trigger if message matches prefix
    if (chatSettings.requirePrefix && !text.startsWith(chatSettings.prefix)) {
      return;
    }

    // Rate-limit automated chat replies (min 2.5 seconds cooldown) to prevent API quota burn
    const now = Date.now();
    if (now - lastChatReplyTimeRef.current < 2500) {
      return;
    }

    // If AI auto-reply is enabled, trigger active agent perception
    if (chatSettings.autoReply) {
      lastChatReplyTimeRef.current = now;
      const delayMs = chatSettings.humanizeDelay === "instant" ? 150 : chatSettings.humanizeDelay === "deliberate" ? 2200 : 850;
      setTimeout(() => {
        handleDispatchAiGoal(
          `In-game chat message received from <${sender}> [Channel: ${channel}]: "${text}". Conversational Tone: ${chatSettings.personaTone}. Formulate tactical reaction or conversational reply for agent role ${activeAgent.role}.`,
          text
        );
      }, delayMs);
    }
  };

  // Add new agent to the swarm cluster
  const handleAddAgent = (customName?: string, customRole?: AgentRole) => {
    const agentRoles: AgentRole[] = ["Assistant", "Builder", "Scout", "Miner", "Guard"];
    const nextIndex = agents.length + 1;
    const assignedRole = customRole || agentRoles[(nextIndex - 1) % agentRoles.length];
    const colors = ["#8b5cf6", "#10b981", "#06b6d4", "#f59e0b", "#ec4899", "#f97316", "#3b82f6", "#14b8a6"];
    const assignedColor = colors[(nextIndex - 1) % colors.length];
    const newName = (customName && customName.trim()) ? customName.trim() : `Agent_${nextIndex}-${assignedRole}`;

    const getHotbarForRole = (role: AgentRole) => {
      if (role === "Assistant") {
        return [
          { slot: 0, item: "minecraft:diamond_sword", count: 1 },
          { slot: 1, item: "minecraft:diamond_pickaxe", count: 1 },
          { slot: 2, item: "minecraft:obsidian", count: 64 },
          { slot: 3, item: "minecraft:cooked_beef", count: 64 },
          { slot: 4, item: "minecraft:shield", count: 1 },
          { slot: 5, item: "minecraft:water_bucket", count: 1 },
          { slot: 6, item: "minecraft:torch", count: 64 },
          { slot: 7, item: "minecraft:bow", count: 1 },
          { slot: 8, item: "minecraft:arrow", count: 64 },
        ];
      }
      if (role === "Builder") {
        return [
          { slot: 0, item: "minecraft:obsidian", count: 64 },
          { slot: 1, item: "minecraft:diamond_pickaxe", count: 1 },
          { slot: 2, item: "minecraft:diamond_sword", count: 1 },
          { slot: 3, item: "minecraft:cooked_beef", count: 32 },
          { slot: 4, item: "minecraft:flint_and_steel", count: 1 },
          { slot: 5, item: "minecraft:cobblestone", count: 64 },
          { slot: 6, item: "minecraft:torch", count: 64 },
          { slot: 7, item: "minecraft:water_bucket", count: 1 },
          { slot: 8, item: "minecraft:air", count: 0 },
        ];
      }
      if (role === "Miner") {
        return [
          { slot: 0, item: "minecraft:cobblestone", count: 64 },
          { slot: 1, item: "minecraft:iron_pickaxe", count: 1 },
          { slot: 2, item: "minecraft:iron_shovel", count: 1 },
          { slot: 3, item: "minecraft:bread", count: 20 },
          { slot: 4, item: "minecraft:torch", count: 64 },
          { slot: 5, item: "minecraft:ladder", count: 16 },
          { slot: 6, item: "minecraft:chest", count: 2 },
          { slot: 7, item: "minecraft:air", count: 0 },
          { slot: 8, item: "minecraft:air", count: 0 },
        ];
      }
      return [
        { slot: 0, item: "minecraft:diamond_sword", count: 1 },
        { slot: 1, item: "minecraft:shield", count: 1 },
        { slot: 2, item: "minecraft:bow", count: 1 },
        { slot: 3, item: "minecraft:arrow", count: 64 },
        { slot: 4, item: "minecraft:golden_carrot", count: 16 },
        { slot: 5, item: "minecraft:spyglass", count: 1 },
        { slot: 6, item: "minecraft:torch", count: 32 },
        { slot: 7, item: "minecraft:air", count: 0 },
        { slot: 8, item: "minecraft:air", count: 0 },
      ];
    };

    const newAgent: AgentInstance = {
      id: `agent_${Date.now()}`,
      name: newName,
      role: assignedRole,
      status: "idle",
      color: assignedColor,
      port: 8080 + nextIndex - 1,
      player: {
        // Sentinel (0,0,0): live telemetry will overwrite with real coords.
        x: 0,
        y: 0,
        z: 0,
        yaw: 0,
        pitch: 0,
        health: 20.0,
        maxHealth: 20.0,
        food: 20,
        saturation: 15.0,
        air: 300,
        onGround: true,
        isSneaking: false,
        isSprinting: false,
        inWater: false,
        selectedSlot: 0,
        hotbar: getHotbarForRole(assignedRole),
      },
      raycast: {
        type: "MISS",
      },
      currentTask: `Synchronizing with Fabric 26.2 cluster as ${assignedRole}`,
      lastThought: assignedRole === "Assistant" 
        ? "Universal omni-assistant initialized: ready for building, mining, combat, scouting, and player support."
        : "Initialized and awaiting task allocation.",
    };

    setAgents((prev) => [...prev, newAgent]);

    // Announce in chat
    setChatMessages((prev) => [
      ...prev,
      {
        id: `chat_${Date.now()}`,
        sender: "Server",
        text: `[Fabric 26.2 Cluster] ${newAgent.name} joined the game on ws://localhost:${newAgent.port}/ws`,
        timestamp: Date.now(),
        channel: "system",
      },
    ]);
  };

  // Remove an agent instance from the cluster
  const handleRemoveAgent = (agentId: string) => {
    if (agents.length <= 1) {
      // Don't remove the last agent to keep the system operable
      return;
    }

    const agentToRemove = agents.find((a) => a.id === agentId);
    const remainingAgents = agents.filter((a) => a.id !== agentId);
    setAgents(remainingAgents);

    // If removing the active agent, switch to another
    if (activeAgentId === agentId) {
      const nextActive = remainingAgents[0];
      if (nextActive) {
        setActiveAgentId(nextActive.id);
        setCurrentUsername(nextActive.name);
      }
    }

    if (agentToRemove) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `chat_${Date.now()}`,
          sender: "Server",
          text: `[Fabric 26.2 Cluster] ${agentToRemove.name} disconnected from socket ws://localhost:${agentToRemove.port}/ws`,
          timestamp: Date.now(),
          channel: "system",
        },
      ]);
    }
  };

  // Rename an agent instance
  const handleRenameAgent = (agentId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setAgents((prev) =>
      prev.map((ag) => {
        if (ag.id === agentId) {
          return { ...ag, name: trimmed };
        }
        return ag;
      })
    );

    if (activeAgentId === agentId) {
      setCurrentUsername(trimmed);
    }
  };

  // Broadcast global directive across the swarm
  const handleBroadcastDirective = (directive: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `chat_${Date.now()}`,
        sender: "Server",
        text: `[SWARM BROADCAST] >> ${directive}`,
        timestamp: Date.now(),
        channel: "system",
      },
    ]);

    // Update each agent's current task
    setAgents((prev) =>
      prev.map((ag) => ({
        ...ag,
        currentTask: directive,
        status: "collaborating",
      }))
    );

    // Each agent acknowledges in-game
    agents.forEach((ag, idx) => {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `chat_${Date.now()}_${idx}`,
            sender: ag.name,
            text: `[Ack - ${ag.role}] Directive accepted. Coordinating actions.`,
            timestamp: Date.now(),
            channel: "all",
            isAi: true,
          },
        ]);
      }, (idx + 1) * 400);
    });
  };

  const handleUpdateAgentRole = (agentId: string, role: AgentRole) => {
    setAgents((prev) =>
      prev.map((ag) => (ag.id === agentId ? { ...ag, role } : ag))
    );
  };

  const handleAddLandmark = (name: string, x: number, y: number, z: number, desc: string) => {
    setLandmarks((prev) => [...prev, { name, x, y, z, description: desc }]);
  };

  const handleSetSession = (username: string, isMsa: boolean) => {
    setCurrentUsername(username);
    setThoughtLog((prev) => [
      `[SessionManager.java]: Injected Session token -> Username: "${username}" | AccountType: ${isMsa ? "MSA" : "OFFLINE/MOJANG"}`,
      ...prev,
    ]);
  };

  // Export all project files as a real ZIP archive with Dockerfile, launchers, package.json, and .env
  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      // 1. First attempt to download the full, complete workspace ZIP from the server backend
      const response = await fetch("/api/export-full-zip");
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "minecraft-ai-controller-framework.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
      throw new Error("Server zip route returned " + response.status);
    } catch (err) {
      console.warn("Server ZIP export failed, falling back to in-browser JSZip bundle:", err);
      // 2. Client-side fallback packaging
      const zip = new JSZip();
      for (const file of PROJECT_SOURCE_FILES) {
        zip.file(file.path, file.content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "minecraft-ai-controller-framework.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        onExportAll={handleExportAll}
        isExporting={isExporting}
        provider={provider}
        activeAgentCount={agents.length}
        listenToChat={chatSettings.listenToChat}
        onToggleListenToChat={() =>
          setChatSettings((prev) => ({ ...prev, listenToChat: !prev.listenToChat }))
        }
        isAutonomousMode={isAutonomousMode}
        onToggleAutonomy={() => {
          const next = !isAutonomousMode;
          setIsAutonomousMode(next);
          setThoughtLog((prev) => [
            `[System]: Deep Autonomy ${next ? "Enabled" : "Disabled"}. AI will ${
              next ? "now" : "no longer"
            } formulate goals independently.`,
            ...prev,
          ]);
        }}
      />

      <SwarmQuickBar
        agents={agents}
        activeAgent={activeAgent}
        onSelectAgent={(id) => {
          setActiveAgentId(id);
          const found = agents.find((a) => a.id === id);
          if (found) setCurrentUsername(found.name);
        }}
        onDispatchGoal={(goal) => handleDispatchAiGoal(goal)}
        aiAutonomyEnabled={isAutonomousMode}
        onToggleAutonomy={() => setIsAutonomousMode(!isAutonomousMode)}
        activeTier={routerMetrics?.activeTier || provider}
        modelUsed={routerMetrics?.modelUsed || (provider === "nvidia" ? nvidiaModel : provider === "ollama" ? envConfig.ollamaModel : "gemini-3.8-flash")}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4">
        {/* Swarm Fleet Overview Bar */}
        <SwarmFleetBar
          agents={agents}
          activeAgentId={activeAgentId}
          onSelectAgent={(id) => {
            setActiveAgentId(id);
            const found = agents.find((a) => a.id === id);
            if (found) setCurrentUsername(found.name);
          }}
          onAddAgent={handleAddAgent}
          onRemoveAgent={handleRemoveAgent}
          onRenameAgent={handleRenameAgent}
          onBroadcastDirective={handleBroadcastDirective}
          onUpdateAgentRole={handleUpdateAgentRole}
        />

        {/* Telemetry Summary Bar */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 sm:px-4 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Active Agent Stats */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Unit:</span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-750">
                  {activeAgent.name} ({activeAgent.role})
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-mono">
                <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                <span className="font-bold text-slate-200">{player.health.toFixed(0)}</span>
                <span className="text-slate-500">/20</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-mono">
                <Apple className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span className="font-bold text-slate-200">{player.food}</span>
                <span className="text-slate-500">/20</span>
              </div>
              <div className="h-3.5 w-px bg-slate-800 hidden sm:block" />
              <div className="flex items-center gap-1 text-xs font-mono text-slate-300">
                <Compass className="h-3.5 w-3.5 text-sky-400" />
                <span>Pos:</span>
                <span className="text-emerald-400 font-bold">
                  [{player.x.toFixed(1)}, {player.y.toFixed(1)}, {player.z.toFixed(1)}]
                </span>
              </div>
              <div className="h-3.5 w-px bg-slate-800 hidden md:block" />
              <div className="hidden md:flex items-center gap-1 text-xs font-mono text-slate-300">
                <Eye className="h-3.5 w-3.5 text-yellow-400" />
                <span>Target:</span>
                <span className="text-yellow-300 font-semibold truncate max-w-[150px]">
                  {raycast.type === "BLOCK" ? raycast.block?.replace("minecraft:", "") : raycast.type}
                </span>
              </div>
            </div>

            {/* Connection & Client Launcher Shortcut */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800/80 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Fabric 26.2 Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                    <Activity className="h-3 w-3 text-amber-400 animate-pulse" />
                    <span className="hidden sm:inline">Bridge Standby</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("standalone")}
                    className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                    title="Open Standalone Client Launcher"
                  >
                    Start Client
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab 1: Workbench & 3D Stage */}
        {activeTab === "workbench" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">
              <Visualizer3D
                player={player}
                raycast={raycast}
                schematicDiffs={diffs}
                entities={entities}
                selectedSlot={player.selectedSlot}
                allAgents={agents}
                activeAgentId={activeAgentId}
                onSelectAgent={setActiveAgentId}
              />
            </div>
            <div className="lg:col-span-5 space-y-6">
              <VirtualController
                player={player}
                onDispatchAction={handleDispatchAction}
                heldKeys={heldKeys}
              />
            </div>
          </div>
        )}

        {/* Tab: Advanced 1.9+ PvP Combat & Slap Revanche Studio */}
        {activeTab === "pvp_revanche" && (
          <PvPCombatAndRevancheStudio
            agents={agents}
            activeAgentId={activeAgentId}
            onSelectAgent={(id) => {
              setActiveAgentId(id);
              const found = agents.find((a) => a.id === id);
              if (found) setCurrentUsername(found.name);
            }}
            onDispatchAction={handleDispatchAction}
            onSendChatMessage={handleSendChatMessage}
            onAddAgentLog={(logText) => {
              setThoughtLog((prev) => [logText, ...prev]);
            }}
          />
        )}

        {/* Tab: Individual Bot Steering, Signs Perception & Cognitive Matrix */}
        {activeTab === "steer_and_signs" && (
          <SignPerceptionAndSteeringStudio
            agents={agents}
            activeAgentId={activeAgentId}
            onSelectAgent={(id) => {
              setActiveAgentId(id);
              const found = agents.find((a) => a.id === id);
              if (found) setCurrentUsername(found.name);
            }}
            onDispatchAction={handleDispatchAction}
            heldKeys={heldKeys}
            chatMessages={chatMessages}
            onSendChatMessage={handleSendChatMessage}
            onAddAgentLog={(logText) => {
              setThoughtLog((prev) => [logText, ...prev]);
            }}
          />
        )}

        {/* Tab: Universal 1-File .env Configuration & Dashboard Sync */}
        {activeTab === "envconfig" && (
          <EnvConfigManager
            currentConfig={envConfig}
            onSaveConfig={(newConf) => {
              setEnvConfig(newConf);
              persistEnvConfig(newConf);
            }}
            onApplySwarmToLive={handleApplySwarmFromEnv}
          />
        )}


        {/* Tab: Universal Mod Knowledge Guide */}
        {activeTab === "modhub" && (
          <ModKnowledgeHub
            onSendCommand={(cmd) => handleSendChatMessage(cmd)}
            serverHost="host.docker.internal:25565"
          />
        )}

        {/* Tab: Player Locator Bar & Radar HUD */}
        {activeTab === "radar" && (
          <PlayerLocatorRadarView
            player={player}
            onLockOnPlayer={(name) => {
              setThoughtLog((prev) => [
                `[RadarLock]: Locked onto player "${name}". Tracking bearing & vector updates.`,
                ...prev
              ]);
            }}
            onSendChatMessage={handleSendChatMessage}
          />
        )}

        {/* Tab: JSON Map Engine & Screenshot Perception */}
        {activeTab === "jsonmap" && (
          <JsonMapViewer
            player={player}
            onSendChatMessage={handleSendChatMessage}
            onPushAiDirective={(directive) => {
              setActiveGoal(directive);
              handleDispatchAiGoal(directive);
            }}
            onDispatchAction={handleDispatchAction}
          />
        )}

        {/* Tab: Live World Explorer Map */}
        {activeTab === "worldmap" && (
          <LiveWorldMap
            player={player}
            entities={entities}
            allAgents={agents}
            activeAgentId={activeAgentId}
            discoveredChunks={discoveredChunks}
            waypoints={mapWaypoints}
            onAddWaypoint={(wp) => setMapWaypoints((prev) => [...prev, wp])}
            onRemoveWaypoint={(id) => setMapWaypoints((prev) => prev.filter((w) => w.id !== id))}
            onDispatchGoal={handleDispatchAiGoal}
            isAutoScouting={isAutoScouting}
            onToggleAutoScout={() => setIsAutoScouting(!isAutoScouting)}
            onExpandExplorationRadius={(radius) => discoverChunksAround(player.x, player.z, radius)}
          />
        )}

        {/* Tab: Standalone 26.2 Client Runner */}
        {activeTab === "standalone" && (
          <StandaloneClientLauncher
            isConnected={isConnected}
            onSetSession={handleSetSession}
            currentUsername={currentUsername}
            onConnectServer={(server, username) => {
              sendActionToBridge({
                type: "connect_server",
                server,
                bot_name: username
              });
              setThoughtLog((prev) => [`[Command]: Connecting bot to server ${server} as ${username}...`, ...prev]);
            }}
          />
        )}

        {/* Tab 2: In-Game Chat & Swarm Perception Dashboard */}
        {activeTab === "chat" && (
          <ChatDashboard
            chatMessages={chatMessages}
            onSendChatMessage={handleSendChatMessage}
            onClearChat={() => setChatMessages([])}
            activeAgent={activeAgent!}
            allAgents={agents}
            settings={chatSettings}
            onUpdateSettings={(newSettings) =>
              setChatSettings((prev) => ({ ...prev, ...newSettings }))
            }
            onSelectAgent={(id) => {
              setActiveAgentId(id);
              const found = agents.find((a) => a.id === id);
              if (found) setCurrentUsername(found.name);
            }}
            isVoiceListening={isVoiceListening}
            setIsVoiceListening={setIsVoiceListening}
            onVoiceTranscript={handleVoiceTranscript}
          />
        )}

        {/* Tab 3: Litematica Auto-Build Studio */}
        {activeTab === "litematica" && (
          <LitematicaStudio
            diffs={diffs}
            materials={materials}
            player={player}
            onExecuteAutoBuildStep={handleExecuteAutoBuildStep}
            isAutoBuilding={isAutoBuilding}
            onToggleAutoBuild={() => setIsAutoBuilding(!isAutoBuilding)}
            onSelectSchematicPreset={setCurrentPreset}
            currentPreset={currentPreset}
          />
        )}

        {/* Tab 4: AI Brain & Memory Console */}
        {activeTab === "brain" && (
          <AiBrainConsole
            provider={provider}
            setProvider={setProvider}
            onDispatchAiGoal={handleDispatchAiGoal}
            isLoading={isLoadingAi}
            thoughtLog={thoughtLog}
            recentMemory={recentMemory}
            landmarks={landmarks}
            onAddLandmark={handleAddLandmark}
            player={player}
            raycast={raycast}
            entities={entities}
            diffs={diffs}
            activeAgent={activeAgent}
            activeAgentRole={activeAgent?.role || "Bot"}
            activeAgentName={activeAgent?.name || "Offline"}
            nvidiaModel={envConfig.nvidiaModel}
            onSelectNvidiaModel={(m) => updateEnvConfig({ nvidiaModel: m })}
            ollamaModel={envConfig.ollamaModel}
            onSelectOllamaModel={(m) => updateEnvConfig({ ollamaModel: m })}
            ollamaBaseUrl={envConfig.ollamaBaseUrl}
            onUpdateOllamaBaseUrl={(u) => updateEnvConfig({ ollamaBaseUrl: u })}
            ollamaNumCtx={envConfig.ollamaNumCtx || 131072}
            onSelectOllamaNumCtx={(ctx) => updateEnvConfig({ ollamaNumCtx: ctx })}
            cognitiveFeedback={cognitiveFeedback}
            routerMetrics={routerMetrics}
            isAutonomousMode={isAutonomousMode}
            onToggleAutonomy={() => setIsAutonomousMode(!isAutonomousMode)}
            autonomyIntervalSeconds={envConfig.aiAutonomyIntervalSeconds || 3}
            onChangeIntervalSeconds={(sec) => updateEnvConfig({ aiAutonomyIntervalSeconds: sec })}
            activeGoal={activeGoal}
            onSetActiveGoal={setActiveGoal}
            onEmergencyHalt={() => handleDispatchAction({ type: "release_all_keys" })}
          />
        )}

        {/* Tab: Self-Learning Skills & Failures Studio */}
        {activeTab === "skills" && (
          <SkillsAndFailuresStudio
            ollamaModel={envConfig.ollamaModel || "llama3.2:3b"}
            onSelectOllamaModel={(m) => updateEnvConfig({ ollamaModel: m })}
            onTriggerGoal={(goalText) => {
              setActiveGoal(goalText);
              handleDispatchAiGoal(goalText);
            }}
          />
        )}

        {/* Tab 5: Source Code & Mixins */}
        {activeTab === "code" && <CodeExplorer />}

        {/* Tab 6: IPC Protocol & Session Switcher */}
        {activeTab === "protocol" && (
          <ProtocolDocs
            onDispatchAction={handleDispatchAction}
            onSetSession={handleSetSession}
            currentUsername={currentUsername}
          />
        )}
      </main>
    </div>
  );
}
