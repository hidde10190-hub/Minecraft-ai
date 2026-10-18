import React, { useState, useEffect, useRef } from "react";
import { 
  Compass, 
  Move, 
  MousePointer, 
  RotateCw, 
  ShieldAlert, 
  Zap, 
  Send, 
  Check, 
  Sparkles, 
  Users, 
  Bot, 
  FileText, 
  Eye, 
  Pickaxe, 
  Hammer, 
  Shield, 
  Layers, 
  Radio, 
  Crosshair, 
  Play, 
  Pause, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  Tag,
  Info,
  MapPin,
  RefreshCw,
  Sliders,
  Maximize2
} from "lucide-react";
import { 
  AgentInstance, 
  AgentRole, 
  SignData, 
  WoodType, 
  ActionPacket, 
  ChatMessage, 
  MessageEvaluationRecord,
  BotCognitiveMessageEvaluation 
} from "../types";
import { 
  evaluateMessageForSwarm, 
  evaluateSignForSwarm, 
  parseSignText, 
  INITIAL_WORLD_SIGNS 
} from "../utils/signAndMessageIntelligence";
import { playChatChime } from "../utils/audioChime";

interface SignPerceptionAndSteeringStudioProps {
  agents: AgentInstance[];
  activeAgentId: string;
  onSelectAgent: (agentId: string) => void;
  onDispatchAction: (action: ActionPacket) => void;
  heldKeys: Set<string>;
  chatMessages: ChatMessage[];
  onSendChatMessage: (text: string, sender?: string) => void;
  onAddAgentLog: (logText: string) => void;
}

export const SignPerceptionAndSteeringStudio: React.FC<SignPerceptionAndSteeringStudioProps> = ({
  agents,
  activeAgentId,
  onSelectAgent,
  onDispatchAction,
  heldKeys,
  chatMessages,
  onSendChatMessage,
  onAddAgentLog
}) => {
  // Tabs: Steering Cockpit vs Sign Perception Studio vs Multi-Bot Message Matrix
  const [activeSubTab, setActiveSubTab] = useState<"steering" | "signs" | "cognitive_matrix">("steering");

  // Selected agent for manual steering & inspection
  const activeAgent = agents.find(a => a.id === activeAgentId) || agents[0];

  // ---------------------------------------------------------------------------
  // 1. Steering & Pathfinding State
  // ---------------------------------------------------------------------------
  const [targetCoords, setTargetCoords] = useState<{ x: number; y: number; z: number }>({
    x: Math.round(activeAgent?.player.x || 100) + 5,
    y: Math.round(activeAgent?.player.y || 64),
    z: Math.round(activeAgent?.player.z || 20) + 5
  });
  const [keyDuration, setKeyDuration] = useState<number>(250);
  const [isKeyboardCaptureActive, setIsKeyboardCaptureActive] = useState<boolean>(false);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [isSneaking, setIsSneaking] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // 2. Sign Perception & World Signs State
  // ---------------------------------------------------------------------------
  const [worldSigns, setWorldSigns] = useState<SignData[]>(() => INITIAL_WORLD_SIGNS);
  const [selectedSignId, setSelectedSignId] = useState<string>(INITIAL_WORLD_SIGNS[0]?.id || "");
  
  // Sign Authoring Form
  const [authorWood, setAuthorWood] = useState<WoodType>("oak");
  const [authorFront, setAuthorFront] = useState<[string, string, string, string]>([
    `[${activeAgent?.name || "Gemini"}]`,
    "STATUS: OPERATIONAL",
    "SECTOR: BASE ALPHA",
    "SWARM: ACTIVE"
  ]);
  const [authorBack, setAuthorBack] = useState<[string, string, string, string]>([
    "AUTONOMOUS BOT",
    "IPC PORT: 8080",
    "SECURE PERIMETER",
    "DO NOT REMOVE"
  ]);
  const [authorIsWallSign, setAuthorIsWallSign] = useState<boolean>(false);
  const [authorIsWaxed, setAuthorIsWaxed] = useState<boolean>(false);
  const [authorHasGlowing, setAuthorHasGlowing] = useState<boolean>(true);
  const [authorColor, setAuthorColor] = useState<string>("cyan");
  const [authorFacing, setAuthorFacing] = useState<"north" | "south" | "east" | "west">("north");
  const [authorTargetPos, setAuthorTargetPos] = useState<{ x: number; y: number; z: number }>({
    x: Math.round(activeAgent?.player.x || 100) + 1,
    y: Math.round(activeAgent?.player.y || 64),
    z: Math.round(activeAgent?.player.z || 20) + 1
  });
  const [signPlacedAlert, setSignPlacedAlert] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 3. Cognitive Message Matrix State
  // ---------------------------------------------------------------------------
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number>(0);
  const [simulatedChatInput, setSimulatedChatInput] = useState<string>("Hey Builder-Bot, assemble a nether portal at 100 64 20!");
  const [testSender, setTestSender] = useState<string>("Steve");

  // Keep coords synced when switching agent
  useEffect(() => {
    if (activeAgent) {
      setAuthorFront(prev => {
        const next = [...prev] as [string, string, string, string];
        next[0] = `[${activeAgent.name}]`;
        return next;
      });
      setAuthorTargetPos({
        x: Math.round(activeAgent.player.x) + 1,
        y: Math.round(activeAgent.player.y),
        z: Math.round(activeAgent.player.z) + 1
      });
    }
  }, [activeAgentId, activeAgent?.name]);

  // Handle WASD & Key Pressing
  const triggerMovementKey = (key: string, durationMs: number = keyDuration) => {
    onDispatchAction({
      type: "press_key",
      key,
      durationMs,
      durationTicks: Math.max(1, Math.round(durationMs / 50)),
      agentId: activeAgent?.id
    });
  };

  // Quick look angles
  const handleQuickRotate = (yaw: number, pitch: number) => {
    onDispatchAction({
      type: "set_rotation",
      yaw,
      pitch,
      agentId: activeAgent?.id
    });
  };

  // Pathfind
  const handleDispatchPathfind = (e: React.FormEvent) => {
    e.preventDefault();
    onDispatchAction({
      type: "look_at",
      x: targetCoords.x,
      y: targetCoords.y,
      z: targetCoords.z,
      ticks: 10,
      agentId: activeAgent?.id
    });
    triggerMovementKey("w", 1200);
    onAddAgentLog(`[Steering]: ${activeAgent.name} pathfinding toward [${targetCoords.x}, ${targetCoords.y}, ${targetCoords.z}].`);
  };

  // Keyboard Capture Listener for WASD when active
  useEffect(() => {
    if (!isKeyboardCaptureActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;

      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", " ", "shift", "control"].includes(key)) {
        e.preventDefault();
        const mappedKey = key === " " ? "space" : key === "control" ? "ctrl" : key;
        triggerMovementKey(mappedKey, 150);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isKeyboardCaptureActive, activeAgent?.id]);

  // ---------------------------------------------------------------------------
  // Sign Actions
  // ---------------------------------------------------------------------------
  const handlePlaceNewSign = (e: React.FormEvent) => {
    e.preventDefault();
    const newSignId = `sign_${Date.now()}`;
    const parsed = parseSignText(authorFront, authorBack);

    const newSign: SignData = {
      id: newSignId,
      x: authorTargetPos.x,
      y: authorTargetPos.y,
      z: authorTargetPos.z,
      blockType: authorIsWallSign ? `minecraft:${authorWood}_wall_sign` : `minecraft:${authorWood}_sign`,
      wood: authorWood,
      isWallSign: authorIsWallSign,
      facing: authorFacing,
      isWaxed: authorIsWaxed,
      front: {
        messages: authorFront,
        hasGlowingText: authorHasGlowing,
        color: authorColor
      },
      back: {
        messages: authorBack
      },
      placedBy: `${activeAgent?.name || "Gemini"} (Agent)`,
      timestamp: Date.now(),
      targetRecipient: parsed.targetRecipient,
      parsedInstruction: parsed.parsedInstruction,
      reactionStatus: "unprocessed"
    };

    setWorldSigns(prev => [newSign, ...prev]);
    setSelectedSignId(newSignId);

    // Dispatch in-game action packet
    onDispatchAction({
      type: "place_block",
      x: authorTargetPos.x,
      y: authorTargetPos.y,
      z: authorTargetPos.z,
      side: "up",
      agentId: activeAgent?.id
    });

    onAddAgentLog(`[Sign Placed]: ${activeAgent?.name} placed a ${authorWood.toUpperCase()} sign at [${authorTargetPos.x}, ${authorTargetPos.y}, ${authorTargetPos.z}] with text: "${authorFront.filter(Boolean).join(" | ")}".`);
    
    setSignPlacedAlert(`Placed sign successfully at [${authorTargetPos.x}, ${authorTargetPos.y}, ${authorTargetPos.z}]!`);
    setTimeout(() => setSignPlacedAlert(null), 3000);
  };

  // Bot reacts to an existing sign by reading it & placing a response sign
  const handleTriggerSignReaction = (sign: SignData) => {
    const { selectedAgent, actionPlan, responseSignText, chatReply } = evaluateSignForSwarm(sign, agents);

    // Update sign status
    setWorldSigns(prev => prev.map(s => {
      if (s.id === sign.id) {
        return {
          ...s,
          reactionStatus: "executing",
          reactingAgentId: selectedAgent.id,
          reactionLog: `Assigned to ${selectedAgent.name} (${selectedAgent.role}): ${actionPlan}`
        };
      }
      return s;
    }));

    // In-Game Chat acknowledgment
    onSendChatMessage(chatReply, selectedAgent.name);
    playChatChime("agent_reply");

    onAddAgentLog(`[Sign Perception]: ${selectedAgent.name} read sign @ [${sign.x}, ${sign.y}, ${sign.z}] targeting "${sign.targetRecipient}". Plan: ${actionPlan}`);

    // Auto-place response sign beside target sign after small delay
    setTimeout(() => {
      const replySignId = `reply_sign_${Date.now()}`;
      const replySign: SignData = {
        id: replySignId,
        x: sign.x + 1,
        y: sign.y,
        z: sign.z,
        blockType: "minecraft:oak_sign",
        wood: "oak",
        isWallSign: false,
        facing: sign.facing,
        isWaxed: true,
        front: {
          messages: responseSignText,
          hasGlowingText: true,
          color: "emerald"
        },
        back: {
          messages: ["RESPONSE SIGN", `REPLY TO #${sign.id.slice(-4)}`, "BOT AUTONOMOUS", "CONFIRMED"]
        },
        placedBy: `${selectedAgent.name} (Agent Response)`,
        timestamp: Date.now(),
        targetRecipient: sign.placedBy,
        parsedInstruction: responseSignText.join(" "),
        reactionStatus: "reacted"
      };

      setWorldSigns(prev => [replySign, ...prev]);
      onAddAgentLog(`[Response Sign Placed]: ${selectedAgent.name} placed confirmation sign at [${replySign.x}, ${replySign.y}, ${replySign.z}].`);
    }, 1200);
  };

  // Preset Template loader
  const handleLoadSignPreset = (presetType: "command" | "status" | "base" | "quarry" | "danger") => {
    if (presetType === "command") {
      setAuthorWood("oak");
      setAuthorFront(["[TO: ALL BOTS]", "REGROUP AT SPAWN", "DEPOSIT RESOURCES", "PRIORITY: HIGH"]);
      setAuthorBack(["COMMAND POST", "ISSUED BY STEVE", "ZONE: CLEAR", "STANDBY"]);
      setAuthorHasGlowing(true);
      setAuthorColor("gold");
    } else if (presetType === "status") {
      setAuthorWood("spruce");
      setAuthorFront([`[${activeAgent?.name || "Builder"}]`, "PORTAL COMPLETE", "100% ASSEMBLED", "TIME: SYNCHRONIZED"]);
      setAuthorBack(["SCHEMATIC DONE", "OBSIDIAN: 14", "LIGHT STATUS: LIT", "READY"]);
      setAuthorHasGlowing(true);
      setAuthorColor("emerald");
    } else if (presetType === "base") {
      setAuthorWood("cherry");
      setAuthorFront(["[AI-SWARM HQ]", "BASE SECTOR 1", "COORDS: 100 64 20", "SECURITY: ACTIVE"]);
      setAuthorBack(["CHESTS ORGANIZED", "BEDS: 4", "FARM: EXPANDING", "WELCOME"]);
      setAuthorHasGlowing(true);
      setAuthorColor("purple");
    } else if (presetType === "quarry") {
      setAuthorWood("dark_oak");
      setAuthorFront(["[MINING DEPOT]", "IRON QUARRY", "Y-LEVEL: 16", "DEPOSIT IN CHEST"]);
      setAuthorBack(["SHAFT: WEST", "TORCHES: PLACED", "MINE CARTS: ON", "KEEP SAFE"]);
      setAuthorHasGlowing(false);
      setAuthorColor("cyan");
    } else if (presetType === "danger") {
      setAuthorWood("crimson");
      setAuthorFront(["[DANGER ZONE]", "LAVA & MOBS", "KEEP SHIELD UP", "PATROL: Guard-Bot"]);
      setAuthorBack(["HOSTILES: ZOMBIE", "SENTRY: ON", "RECON: FREQUENT", "STAY BACK"]);
      setAuthorHasGlowing(true);
      setAuthorColor("red");
    }
  };

  // Cognitive Message Matrix evaluation for current messages
  const currentEvaluatedMessages: MessageEvaluationRecord[] = chatMessages.slice(0, 10).map(msg => 
    evaluateMessageForSwarm(msg, agents)
  );

  const activeEvaluatedRecord = currentEvaluatedMessages[selectedMessageIndex] || currentEvaluatedMessages[0] || evaluateMessageForSwarm({
    id: "demo_msg",
    sender: "Steve",
    text: simulatedChatInput,
    timestamp: Date.now()
  }, agents);

  const selectedSign = worldSigns.find(s => s.id === selectedSignId) || worldSigns[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Crosshair className="h-6 w-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-tight">
                Individual Bot Teleoperation, Sign Perception & Cognitive Message Matrix
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-semibold">
                Universal Autonomy
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Steer any bot individually with precise WASD & rotation controls, let every bot independently decide if incoming chat messages are for them, and perceive, read, and autonomously place in-game signs.
            </p>
          </div>
        </div>

        {/* Global Active Bot Quick Selector */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 pl-2">Steering Target:</span>
          <div className="flex gap-1">
            {agents.map(ag => (
              <button
                key={ag.id}
                type="button"
                onClick={() => onSelectAgent(ag.id)}
                className={`px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  ag.id === activeAgentId
                    ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                    : "bg-slate-900 text-slate-300 hover:text-slate-100 border border-slate-800"
                }`}
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ag.color }} />
                <span>{ag.name}</span>
                <span className="text-[10px] opacity-75">({ag.role})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("steering")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "steering"
                ? "bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Move className="h-3.5 w-3.5 text-emerald-400" />
            <span>1. Individual Bot Steering Cockpit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("signs")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "signs"
                ? "bg-amber-950 text-amber-300 border border-amber-700 font-bold"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>2. Sign Perception & Auto-Placement Studio</span>
            <span className="text-[10px] bg-amber-900/80 text-amber-300 px-1.5 py-0.2 rounded font-bold">
              {worldSigns.length} Signs
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("cognitive_matrix")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "cognitive_matrix"
                ? "bg-purple-950 text-purple-300 border border-purple-700 font-bold"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Users className="h-3.5 w-3.5 text-purple-400" />
            <span>3. Multi-Bot Cognitive Message Filter</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Active Bot:</span>
          <span className="text-emerald-400 font-bold">{activeAgent?.name}</span>
          <span className="text-slate-600">|</span>
          <span>Pos:</span>
          <span className="text-slate-200 font-bold">
            [{Math.round(activeAgent?.player.x || 0)}, {Math.round(activeAgent?.player.y || 0)}, {Math.round(activeAgent?.player.z || 0)}]
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: INDIVIDUAL BOT STEERING COCKPIT */}
      {/* ========================================================================= */}
      {activeSubTab === "steering" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Direct WASD & Movement Controls */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-100">
                <Move className="h-4 w-4 text-emerald-400" />
                <span>Steering: {activeAgent?.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsKeyboardCaptureActive(!isKeyboardCaptureActive)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                  isKeyboardCaptureActive
                    ? "bg-emerald-500 text-slate-950 font-bold ring-2 ring-emerald-400/40"
                    : "bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700"
                }`}
              >
                <span>{isKeyboardCaptureActive ? "● Keyboard WASD Live" : "○ Click to Enable Live WASD"}</span>
              </button>
            </div>

            {/* Virtual WASD Pad */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
              <span className="text-[11px] font-mono text-slate-400">Directional Thrusters</span>
              
              {/* W */}
              <button
                type="button"
                onClick={() => triggerMovementKey("w")}
                className={`w-14 h-12 rounded-xl font-mono font-bold text-sm transition-all border flex flex-col items-center justify-center ${
                  heldKeys.has("w")
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-400/30"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95"
                }`}
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span className="text-xs">W</span>
              </button>

              {/* A S D */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => triggerMovementKey("a")}
                  className={`w-14 h-12 rounded-xl font-mono font-bold text-sm transition-all border flex flex-col items-center justify-center ${
                    heldKeys.has("a")
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-400/30"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95"
                  }`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="text-xs">A</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerMovementKey("s")}
                  className={`w-14 h-12 rounded-xl font-mono font-bold text-sm transition-all border flex flex-col items-center justify-center ${
                    heldKeys.has("s")
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-400/30"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95"
                  }`}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  <span className="text-xs">S</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerMovementKey("d")}
                  className={`w-14 h-12 rounded-xl font-mono font-bold text-sm transition-all border flex flex-col items-center justify-center ${
                    heldKeys.has("d")
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-400/30"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95"
                  }`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span className="text-xs">D</span>
                </button>
              </div>

              {/* Modifiers: Jump, Sneak, Sprint, Stop */}
              <div className="grid grid-cols-3 gap-2 w-full pt-2">
                <button
                  type="button"
                  onClick={() => triggerMovementKey("space")}
                  className={`py-2 rounded-lg font-mono text-xs border font-medium ${
                    heldKeys.has("space")
                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  Jump (Space)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSneaking(!isSneaking);
                    triggerMovementKey("shift", 500);
                  }}
                  className={`py-2 rounded-lg font-mono text-xs border font-medium ${
                    isSneaking ? "bg-amber-600 text-slate-950 border-amber-400 font-bold" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  {isSneaking ? "Sneaking" : "Sneak (Shift)"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSprinting(!isSprinting);
                    triggerMovementKey("ctrl", 500);
                  }}
                  className={`py-2 rounded-lg font-mono text-xs border font-medium ${
                    isSprinting ? "bg-cyan-600 text-slate-950 border-cyan-400 font-bold" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  {isSprinting ? "Sprinting" : "Sprint (Ctrl)"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => onDispatchAction({ type: "release_all_keys", agentId: activeAgent?.id })}
                className="w-full py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] font-mono flex items-center justify-center gap-1 mt-1 cursor-pointer"
              >
                <span>Halt & Release All Movement Keys</span>
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-mono text-slate-400">Direct Bot Interaction Actions</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDispatchAction({
                      type: "attack_entity",
                      entityId: activeAgent?.raycast.id || 102,
                      agentId: activeAgent?.id
                    });
                    onAddAgentLog(`[Action]: ${activeAgent?.name} executed attack swing on target entity.`);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-rose-300 flex items-center gap-1.5"
                >
                  <Shield className="h-3.5 w-3.5 text-rose-400" />
                  <span>Attack Crosshair</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDispatchAction({
                      type: "place_block",
                      x: activeAgent?.raycast.x || 103,
                      y: activeAgent?.raycast.y || 64,
                      z: activeAgent?.raycast.z || 20,
                      agentId: activeAgent?.id
                    });
                    onAddAgentLog(`[Action]: ${activeAgent?.name} placed block from hotbar slot ${activeAgent?.player.selectedSlot}.`);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-emerald-300 flex items-center gap-1.5"
                >
                  <Hammer className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Place Block</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDispatchAction({
                      type: "press_key",
                      key: "left_click",
                      durationMs: 800,
                      agentId: activeAgent?.id
                    });
                    onAddAgentLog(`[Action]: ${activeAgent?.name} mining block at crosshair.`);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-amber-300 flex items-center gap-1.5"
                >
                  <Pickaxe className="h-3.5 w-3.5 text-amber-400" />
                  <span>Mine Target</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSubTab("signs");
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-indigo-300 flex items-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Place / Read Sign</span>
                </button>
              </div>
            </div>
          </div>

          {/* Middle Column: Orientation, Rotation & Pathfinding */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-100 border-b border-slate-800 pb-2.5">
              <RotateCw className="h-4 w-4 text-cyan-400" />
              <span>Rotation & Coordinate Pathfinding</span>
            </div>

            {/* Quick Cardinal Angles */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400">Cardinal Heading Presets</span>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickRotate(180, 0)}
                  className="px-2 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 text-center"
                >
                  North (180°)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRotate(0, 0)}
                  className="px-2 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 text-center"
                >
                  South (0°)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRotate(270, 0)}
                  className="px-2 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 text-center"
                >
                  East (270°)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRotate(90, 0)}
                  className="px-2 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 text-center"
                >
                  West (90°)
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickRotate(activeAgent?.player.yaw || 0, -45)}
                  className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-300"
                >
                  Look Up (-45°)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRotate(activeAgent?.player.yaw || 0, 0)}
                  className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-300"
                >
                  Level Horizon (0°)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRotate(activeAgent?.player.yaw || 0, 45)}
                  className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-300"
                >
                  Look Down (+45°)
                </button>
              </div>
            </div>

            {/* Coordinate Pathfind Form */}
            <form onSubmit={handleDispatchPathfind} className="space-y-3 pt-2">
              <span className="text-[11px] font-mono text-slate-400">Pathfind to Coordinates</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500">Target X</label>
                  <input
                    type="number"
                    value={targetCoords.x}
                    onChange={(e) => setTargetCoords(prev => ({ ...prev, x: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500">Target Y</label>
                  <input
                    type="number"
                    value={targetCoords.y}
                    onChange={(e) => setTargetCoords(prev => ({ ...prev, y: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500">Target Z</label>
                  <input
                    type="number"
                    value={targetCoords.z}
                    onChange={(e) => setTargetCoords(prev => ({ ...prev, z: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/20 cursor-pointer"
              >
                <Compass className="h-4 w-4" />
                <span>Execute Pathfind to [{targetCoords.x}, {targetCoords.y}, {targetCoords.z}]</span>
              </button>
            </form>

            {/* Follow Player / Orbit Preset */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onDispatchAction({
                    type: "send_chat",
                    message: `!follow Steve`,
                    agentId: activeAgent?.id
                  });
                  onAddAgentLog(`[Steering]: ${activeAgent?.name} switched to Follow Mode (targeting player Steve).`);
                }}
                className="flex-1 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300"
              >
                Follow Player Steve
              </button>
              <button
                type="button"
                onClick={() => {
                  onDispatchAction({
                    type: "send_chat",
                    message: `!guard spawn`,
                    agentId: activeAgent?.id
                  });
                  onAddAgentLog(`[Steering]: ${activeAgent?.name} switched to Perimeter Guard Mode.`);
                }}
                className="flex-1 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300"
              >
                Guard Perimeter
              </button>
            </div>
          </div>

          {/* Right Column: Selected Bot Live Telemetry & POV Status */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: activeAgent?.color }} />
                <span className="text-xs font-mono font-bold text-slate-100">{activeAgent?.name} Live POV</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                Port {activeAgent?.port || 8080}
              </span>
            </div>

            {/* Health / Food / Air */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Health:</span>
                <span className="text-rose-400 font-bold">{activeAgent?.player.health.toFixed(1)} / 20.0</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all" 
                  style={{ width: `${(activeAgent?.player.health / 20) * 100}%` }} 
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <span className="text-slate-400">Food Saturation:</span>
                <span className="text-amber-400 font-bold">{activeAgent?.player.food} / 20</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all" 
                  style={{ width: `${(activeAgent?.player.food / 20) * 100}%` }} 
                />
              </div>
            </div>

            {/* Crosshair Target */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-xs font-mono">
              <span className="text-[10px] text-slate-500">Crosshair Raycast Target</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">{activeAgent?.raycast.type}</span>
                <span className="text-cyan-400">
                  {activeAgent?.raycast.block || activeAgent?.raycast.entityType || "Nothing in range"}
                </span>
              </div>
              {activeAgent?.raycast.x !== undefined && (
                <span className="text-[10px] text-slate-400 block">
                  Block Coords: [{activeAgent.raycast.x}, {activeAgent.raycast.y}, {activeAgent.raycast.z}] ({activeAgent.raycast.side || "face"})
                </span>
              )}
            </div>

            {/* Active Directive */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 text-xs font-mono">
              <span className="text-[10px] text-slate-500">Current Task Directive</span>
              <p className="text-slate-200 leading-relaxed">{activeAgent?.currentTask}</p>
              <p className="text-[10px] text-slate-400 italic pt-1">Thought: {activeAgent?.lastThought}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: SIGN PERCEPTION, REACTION & AUTO-PLACEMENT STUDIO */}
      {/* ========================================================================= */}
      {activeSubTab === "signs" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Discovered World Signs List & Autonomous Reaction */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-100">
                <FileText className="h-4 w-4 text-amber-400" />
                <span>World Signs Radar ({worldSigns.length} Discovered)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-semibold">
                Auto-Perceived via Block Entities
              </span>
            </div>

            {signPlacedAlert && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{signPlacedAlert}</span>
              </div>
            )}

            {/* List of Signs */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {worldSigns.map((sign) => {
                const isSelected = sign.id === selectedSignId;
                const parsed = parseSignText(sign.front.messages, sign.back.messages);

                return (
                  <div
                    key={sign.id}
                    onClick={() => setSelectedSignId(sign.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? "bg-slate-950 border-amber-500 shadow-md ring-1 ring-amber-500/30"
                        : "bg-slate-950/60 hover:bg-slate-950/90 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-amber-300 uppercase font-bold">
                          {sign.wood}
                        </span>
                        <span className="font-bold text-slate-200">
                          Sign @ [{sign.x}, {sign.y}, {sign.z}]
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        sign.reactionStatus === "reacted" 
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : sign.reactionStatus === "executing"
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {sign.reactionStatus || "unprocessed"}
                      </span>
                    </div>

                    {/* Sign Wooden Board Visual Preview */}
                    <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-900/60 font-mono text-center space-y-0.5 shadow-inner">
                      {sign.front.messages.map((line, idx) => (
                        <div 
                          key={idx} 
                          className={`text-xs ${
                            sign.front.hasGlowingText 
                              ? "text-amber-200 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                              : "text-amber-100"
                          }`}
                        >
                          {line || <span className="opacity-25">-</span>}
                        </div>
                      ))}
                    </div>

                    {/* Target & Placed By Info */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                      <span>Target: <strong className="text-cyan-300">{parsed.targetRecipient}</strong></span>
                      <span>By: <strong className="text-slate-300">{sign.placedBy}</strong></span>
                    </div>

                    {sign.reactionLog && (
                      <p className="text-[10px] font-mono text-emerald-400/90 bg-emerald-950/40 p-2 rounded border border-emerald-900/40">
                        {sign.reactionLog}
                      </p>
                    )}

                    {/* Trigger Reaction Button */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTriggerSignReaction(sign);
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Read Sign & Place Response Sign</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Sign Authoring & Manual/Autonomous Placement Tool */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-100">
                <Hammer className="h-4 w-4 text-emerald-400" />
                <span>Sign Placement & Authoring Tool</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Placing with: <strong className="text-emerald-400">{activeAgent?.name}</strong>
              </span>
            </div>

            {/* Presets Row */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400">Load Template Preset:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLoadSignPreset("command")}
                  className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-amber-300 cursor-pointer"
                >
                  Player Command
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSignPreset("status")}
                  className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-emerald-300 cursor-pointer"
                >
                  Task Completion
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSignPreset("base")}
                  className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-purple-300 cursor-pointer"
                >
                  Base Marker
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSignPreset("quarry")}
                  className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-cyan-300 cursor-pointer"
                >
                  Quarry Depot
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSignPreset("danger")}
                  className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-rose-300 cursor-pointer"
                >
                  Danger Warning
                </button>
              </div>
            </div>

            <form onSubmit={handlePlaceNewSign} className="space-y-4">
              {/* Wood Type Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Wood Species</label>
                  <select
                    value={authorWood}
                    onChange={(e) => setAuthorWood(e.target.value as WoodType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-200"
                  >
                    <option value="oak">Oak Wood</option>
                    <option value="spruce">Spruce Wood</option>
                    <option value="birch">Birch Wood</option>
                    <option value="dark_oak">Dark Oak Wood</option>
                    <option value="cherry">Cherry Wood</option>
                    <option value="mangrove">Mangrove Wood</option>
                    <option value="bamboo">Bamboo Wood</option>
                    <option value="crimson">Crimson Stem</option>
                    <option value="warped">Warped Stem</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Facing Direction</label>
                  <select
                    value={authorFacing}
                    onChange={(e) => setAuthorFacing(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-200"
                  >
                    <option value="north">North (Facing South)</option>
                    <option value="south">South (Facing North)</option>
                    <option value="east">East (Facing West)</option>
                    <option value="west">West (Facing East)</option>
                  </select>
                </div>
              </div>

              {/* 4 Lines Front */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400">Front Text (4 Lines, max 15 chars/line):</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[0, 1, 2, 3].map((lineIdx) => (
                    <input
                      key={lineIdx}
                      type="text"
                      maxLength={16}
                      value={authorFront[lineIdx]}
                      onChange={(e) => {
                        const updated = [...authorFront] as [string, string, string, string];
                        updated[lineIdx] = e.target.value;
                        setAuthorFront(updated);
                      }}
                      placeholder={`Line ${lineIdx + 1}`}
                      className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-500"
                    />
                  ))}
                </div>
              </div>

              {/* Target Coordinates */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500">Sign X</label>
                  <input
                    type="number"
                    value={authorTargetPos.x}
                    onChange={(e) => setAuthorTargetPos(prev => ({ ...prev, x: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500">Sign Y</label>
                  <input
                    type="number"
                    value={authorTargetPos.y}
                    onChange={(e) => setAuthorTargetPos(prev => ({ ...prev, y: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500">Sign Z</label>
                  <input
                    type="number"
                    value={authorTargetPos.z}
                    onChange={(e) => setAuthorTargetPos(prev => ({ ...prev, z: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              {/* Toggles: Glowing Ink & Wax */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-mono text-slate-300">Glow Ink Sac</span>
                  <input
                    type="checkbox"
                    checked={authorHasGlowing}
                    onChange={(e) => setAuthorHasGlowing(e.target.checked)}
                    className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-amber-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-mono text-slate-300">Wax with Honeycomb</span>
                  <input
                    type="checkbox"
                    checked={authorIsWaxed}
                    onChange={(e) => setAuthorIsWaxed(e.target.checked)}
                    className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Hammer className="h-4 w-4" />
                <span>Place Sign at [{authorTargetPos.x}, {authorTargetPos.y}, {authorTargetPos.z}] with {activeAgent?.name}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: MULTI-BOT COGNITIVE MESSAGE FILTER MATRIX */}
      {/* ========================================================================= */}
      {activeSubTab === "cognitive_matrix" && (
        <div className="space-y-6">
          {/* Test Chat Simulation Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-100">
                <Users className="h-4 w-4 text-purple-400" />
                <span>Live Swarm Cognitive Message Evaluator</span>
              </div>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                Every bot parses all messages & decides individual ownership
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testSender}
                onChange={(e) => setTestSender(e.target.value)}
                placeholder="Sender"
                className="w-28 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
              />
              <input
                type="text"
                value={simulatedChatInput}
                onChange={(e) => setSimulatedChatInput(e.target.value)}
                placeholder="Type a chat message to see how each bot decides (e.g. '@Miner-Bot mine iron' or 'all builders assemble portal')"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-purple-200 focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!simulatedChatInput.trim()) return;
                  onSendChatMessage(simulatedChatInput.trim(), testSender);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold font-mono text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/20 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send to Game</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side Breakdown of how EACH bot evaluates the message */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span>Active Evaluated Message:</span>
                <strong className="text-purple-300">"{activeEvaluatedRecord.rawText}"</strong>
                <span className="text-slate-500">by {activeEvaluatedRecord.sender}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Winning Agent: <strong className="text-emerald-400">{agents.find(a => a.id === activeEvaluatedRecord.winningAgentId)?.name || "None / Collective"}</strong>
              </span>
            </div>

            {/* Grid of All Bots and their Independent Decision */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {agents.map((agent) => {
                const evalData: BotCognitiveMessageEvaluation = activeEvaluatedRecord.evaluations[agent.id] || {
                  agentId: agent.id,
                  agentName: agent.name,
                  agentRole: agent.role,
                  isForMe: false,
                  confidence: 0.1,
                  matchType: "unrelated",
                  reason: "Not addressed to this bot",
                  formulatedAction: undefined,
                  replyIntent: undefined,
                  status: "standby"
                };

                return (
                  <div
                    key={agent.id}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      evalData.isForMe
                        ? "bg-slate-950 border-emerald-500/80 ring-1 ring-emerald-500/20 shadow-lg"
                        : "bg-slate-950/60 border-slate-800/80 opacity-80"
                    }`}
                  >
                    {/* Bot Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: agent.color }} />
                        <span className="font-bold text-xs font-mono text-slate-100">{agent.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {agent.role}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {evalData.isForMe ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            <Check className="h-3 w-3" />
                            <span>IS FOR ME</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                            STANDBY
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Confidence Meter */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Confidence:</span>
                        <span className={evalData.isForMe ? "text-emerald-400 font-bold" : "text-slate-500"}>
                          {Math.round(evalData.confidence * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${evalData.isForMe ? "bg-emerald-500" : "bg-slate-700"}`}
                          style={{ width: `${Math.round(evalData.confidence * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Match Type Badge & Reason */}
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Match Pattern:</span>
                        <span className="text-cyan-400 font-medium capitalize">
                          {evalData.matchType.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/80 p-2.5 rounded-lg border border-slate-850">
                        {evalData.reason}
                      </p>
                    </div>

                    {/* Formulated Plan / Reply Intent */}
                    {evalData.formulatedAction && (
                      <div className="text-[10px] font-mono text-emerald-300 bg-emerald-950/40 p-2 rounded border border-emerald-900/50 space-y-0.5">
                        <strong className="text-emerald-400 block">Formulated Plan:</strong>
                        <span>{evalData.formulatedAction}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
