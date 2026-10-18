import React, { useState, useEffect } from "react";
import {
  Activity,
  Play,
  Square,
  Sparkles,
  Zap,
  Cpu,
  Radio,
  Shield,
  Compass,
  Pickaxe,
  Swords,
  Layers,
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Send,
  Eye,
  Bot
} from "lucide-react";
import { AiProvider, AgentInstance, PlayerState, RaycastTarget, EntityState, SchematicDiffItem, CognitiveFeedbackState } from "../types";

interface AutonomousAgentControlHubProps {
  isAutonomousMode: boolean;
  onToggleAutonomy: () => void;
  autonomyIntervalSeconds: number;
  onChangeIntervalSeconds: (sec: number) => void;
  activeGoal: string;
  onSetActiveGoal: (goal: string) => void;
  onForceStep: (goal: string) => void;
  onEmergencyHalt: () => void;
  provider: AiProvider;
  activeAgent: AgentInstance;
  player: PlayerState;
  raycast?: RaycastTarget;
  entities?: EntityState[];
  diffs?: SchematicDiffItem[];
  cognitiveFeedback?: CognitiveFeedbackState;
  routerMetrics?: {
    activeTier: string;
    modelUsed: string;
    latencyMs: number;
    routingPath: string;
  } | null;
  isLoading: boolean;
}

export const AutonomousAgentControlHub: React.FC<AutonomousAgentControlHubProps> = ({
  isAutonomousMode,
  onToggleAutonomy,
  autonomyIntervalSeconds,
  onChangeIntervalSeconds,
  activeGoal,
  onSetActiveGoal,
  onForceStep,
  onEmergencyHalt,
  provider,
  activeAgent,
  player,
  raycast,
  entities = [],
  diffs = [],
  cognitiveFeedback,
  routerMetrics,
  isLoading,
}) => {
  const [customGoalInput, setCustomGoalInput] = useState("");
  const [countdown, setCountdown] = useState<number>(autonomyIntervalSeconds);

  // Interval countdown animation
  useEffect(() => {
    if (!isAutonomousMode) {
      setCountdown(autonomyIntervalSeconds);
      return;
    }

    setCountdown(autonomyIntervalSeconds);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? autonomyIntervalSeconds : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutonomousMode, autonomyIntervalSeconds]);

  const missionPresets = [
    {
      id: "survival",
      name: "Autonomous Survival & Gathering",
      desc: "Gather logs, mine ores, and maintain health & hunger levels.",
      icon: Pickaxe,
      color: "text-amber-400 bg-amber-950/60 border-amber-800/80",
      directive: "Autonomous survival mode: gather nearby wood or ores, keep health > 16, eat food if hunger drops, scan for resources."
    },
    {
      id: "defense",
      name: "Perimeter Defense & Sentinel",
      desc: "Scan 360° radar for hostile mobs, engage with weapon, and shield.",
      icon: Swords,
      color: "text-rose-400 bg-rose-950/60 border-rose-800/80",
      directive: "Autonomous perimeter defense: scan 360 degrees for hostile mobs within 16 blocks, approach and attack with sword, equip shield."
    },
    {
      id: "builder",
      name: "Schematic Reconstruction",
      desc: "Detect missing schematic voxels and assemble block-by-block.",
      icon: Layers,
      color: "text-purple-400 bg-purple-950/60 border-purple-800/80",
      directive: "Autonomous schematic builder: inspect Litematica diffs, select required block in hotbar, navigate to missing voxel, and place block."
    },
    {
      id: "scout",
      name: "Frontier Exploration & Mapping",
      desc: "Wander unmapped chunks, observe terrain, and place torches in darkness.",
      icon: Compass,
      color: "text-cyan-400 bg-cyan-950/60 border-cyan-800/80",
      directive: "Autonomous exploration: traverse unmapped terrain chunks, record landmarks, avoid fall damage/lava, place torches in dark areas."
    },
    {
      id: "assistant",
      name: "Universal Swarm Logistician",
      desc: "Follow nearby players, manage inventories, and coordinate swarm tasks.",
      icon: Bot,
      color: "text-emerald-400 bg-emerald-950/60 border-emerald-800/80",
      directive: "Universal assistant directive: stay within 8 blocks of player, monitor chat directives, coordinate swarm logistics, and report status."
    }
  ];

  const speedOptions = [
    { label: "1.5s (Ultra-Fast • NVIDIA / Local)", val: 1.5 },
    { label: "3.0s (Fast • Recommended)", val: 3 },
    { label: "6.0s (Balanced)", val: 6 },
    { label: "15.0s (Conservative • Gemini Free Tier)", val: 15 }
  ];

  const handleSelectPreset = (presetDirective: string) => {
    onSetActiveGoal(presetDirective);
  };

  const handleApplyCustomGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoalInput.trim()) return;
    onSetActiveGoal(customGoalInput.trim());
    setCustomGoalInput("");
  };

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${
            isAutonomousMode
              ? "bg-violet-950/80 border-violet-700/80 text-violet-300 shadow-lg shadow-violet-950/50 animate-pulse"
              : "bg-slate-950 border-slate-800 text-slate-400"
          }`}>
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 font-sans">
                Deep Autonomous Agent Engine
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                isAutonomousMode
                  ? "bg-violet-950 text-violet-300 border-violet-700 animate-pulse"
                  : "bg-slate-950 text-slate-400 border-slate-800"
              }`}>
                {isAutonomousMode ? `ACTIVE (Loop: ${autonomyIntervalSeconds}s)` : "STANDBY"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous perception-cognition-action loop with zero forced latency on NVIDIA NIM &amp; Ollama
            </p>
          </div>
        </div>

        {/* Master Control Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAutonomy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all shadow-md ${
              isAutonomousMode
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50 ring-1 ring-rose-400"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-950/50 ring-1 ring-violet-400"
            }`}
          >
            {isAutonomousMode ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>HALT AUTONOMY</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>START AUTONOMOUS AGENT</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onForceStep(activeGoal || "Execute continuous tactical perception step")}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 font-mono text-xs font-semibold border border-slate-700 transition-colors"
            title="Trigger immediate cognition step without waiting for ticker countdown"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Force Step Now</span>
          </button>

          <button
            type="button"
            onClick={onEmergencyHalt}
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 font-mono text-xs border border-slate-800 hover:border-rose-800 transition-colors"
            title="Emergency Release All Keys and Stop Motor Activity"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Live Status HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
        {/* Heartbeat Countdown */}
        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-850 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>TICKER HEARTBEAT</span>
            <Clock className="h-3 w-3 text-violet-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-lg font-bold ${isAutonomousMode ? "text-violet-300" : "text-slate-500"}`}>
              {isAutonomousMode ? `${countdown}s` : "Paused"}
            </span>
            <span className="text-[10px] text-slate-500">/ {autonomyIntervalSeconds}s loop</span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-1000 rounded-full"
              style={{ width: isAutonomousMode ? `${(countdown / autonomyIntervalSeconds) * 100}%` : "0%" }}
            />
          </div>
        </div>

        {/* Active Engine */}
        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-850 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>ROUTING ENGINE</span>
            {provider === "nvidia" ? <Cpu className="h-3 w-3 text-emerald-400" /> : provider === "ollama" ? <Radio className="h-3 w-3 text-orange-400" /> : provider === "builtin" ? <Zap className="h-3 w-3 text-amber-400" /> : <Sparkles className="h-3 w-3 text-cyan-400" />}
          </div>
          <div className="font-bold text-slate-200 truncate">
            {routerMetrics?.routingPath || (provider === "nvidia" ? "NVIDIA NIM Cloud" : provider === "ollama" ? "Local Ollama" : provider === "builtin" ? "Built-in Solver" : provider === "auto" ? "Auto Multi-Tier Router" : "Gemini Cloud")}
          </div>
          <span className="text-[10px] text-emerald-400 block truncate">
            Latency: {routerMetrics?.latencyMs ?? "—"}ms{routerMetrics ? "" : " (idle)"}
          </span>
        </div>

        {/* Active Swarm Bot & Live Hotbar */}
        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-850 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>ACTIVE UNIT & LIVE HOTBAR</span>
            <Bot className="h-3 w-3 text-emerald-400" />
          </div>
          <div className="font-bold text-slate-200 truncate">
            {activeAgent.name} • Slot {player.selectedSlot} ({player.hotbar[player.selectedSlot]?.item?.replace("minecraft:", "") || "Empty"})
          </div>
          <span className="text-[10px] text-cyan-400 block truncate">
            Pos: [{player.x.toFixed(1)}, {player.y.toFixed(1)}, {player.z.toFixed(1)}] • HP {player.health.toFixed(0)}/20
          </span>
        </div>

        {/* Kinematic Feedback */}
        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-850 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>MISTAKE LEARNING</span>
            <Shield className="h-3 w-3 text-indigo-400" />
          </div>
          <div className={`font-bold truncate ${
            (cognitiveFeedback?.stuckCycles || 0) > 0 ? "text-rose-400" : "text-emerald-400"
          }`}>
            {(cognitiveFeedback?.stuckCycles || 0) > 0 ? `Obstacle (${cognitiveFeedback?.stuckCycles} stuck)` : "Kinematics Clear"}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {cognitiveFeedback?.suggestedCorrection || "Kinematics nominal"}
          </span>
        </div>
      </div>

      {/* Speed & Interval Configurator */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-violet-400" />
          <span className="font-bold text-slate-300">Autonomy Loop Speed:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {speedOptions.map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => onChangeIntervalSeconds(opt.val)}
              className={`px-2.5 py-1 rounded text-[11px] border transition-all ${
                autonomyIntervalSeconds === opt.val
                  ? "bg-violet-950 text-violet-300 border-violet-600 font-bold shadow-sm"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mission Directive Selector Deck */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
            <span>Select Autonomous Mission:</span>
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            Current: <strong className="text-emerald-400 truncate max-w-[200px] inline-block align-bottom">{activeGoal || "Standard Perimeter Observation"}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {missionPresets.map((preset) => {
            const Icon = preset.icon;
            const isSelected = activeGoal === preset.directive;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.directive)}
                className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? "bg-slate-900 border-violet-600 shadow-md ring-1 ring-violet-500/50"
                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-md border shrink-0 ${preset.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{preset.name}</h4>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-violet-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{preset.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Mission Form */}
      <form onSubmit={handleApplyCustomGoal} className="flex gap-2 pt-1 border-t border-slate-800">
        <input
          type="text"
          value={customGoalInput}
          onChange={(e) => setCustomGoalInput(e.target.value)}
          placeholder="Set custom autonomous directive (e.g. Guard portal at [104, 64, 21] and defeat blazes)..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          disabled={!customGoalInput.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-mono text-xs font-bold transition-all"
        >
          <Send className="h-3 w-3" />
          <span>Set Directive</span>
        </button>
      </form>
    </div>
  );
};
