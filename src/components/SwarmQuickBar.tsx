import React, { useState } from "react";
import { Zap, Bot, Play, Pause, Terminal, Send, Sparkles, Compass, Shield, Radio, Layers, RefreshCw } from "lucide-react";
import { AgentInstance } from "../types";

interface SwarmQuickBarProps {
  agents: AgentInstance[];
  activeAgent: AgentInstance;
  onSelectAgent: (id: string) => void;
  onDispatchGoal: (goal: string) => void;
  aiAutonomyEnabled: boolean;
  onToggleAutonomy: () => void;
  activeTier: string;
  modelUsed: string;
}

export const SwarmQuickBar: React.FC<SwarmQuickBarProps> = ({
  agents,
  activeAgent,
  onSelectAgent,
  onDispatchGoal,
  aiAutonomyEnabled,
  onToggleAutonomy,
  activeTier,
  modelUsed,
}) => {
  const [quickInput, setQuickInput] = useState("");

  const quickCommands = [
    "Mine nearby oak log and store in chest",
    "Explore caves and scan for diamond ore",
    "Build a defensive cobblestone wall around spawn",
    "Standby and guard current position",
    "Follow player Hidde closely",
  ];

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onDispatchGoal(quickInput.trim());
    setQuickInput("");
  };

  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg backdrop-blur-md">
      {/* Left: Swarm Bot Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0">
        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
          <Bot className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> Swarm:
        </span>
        {agents.map((ag) => (
          <button
            key={ag.id}
            type="button"
            onClick={() => onSelectAgent(ag.id)}
            className={`text-xs font-mono px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 shrink-0 ${
              activeAgent.id === ag.id
                ? "bg-purple-950/80 text-purple-200 border-purple-500 shadow-sm shadow-purple-500/20 font-bold"
                : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: ag.color || "#10b981" }}
            />
            {ag.name} <span className="text-[10px] text-slate-500">({ag.role})</span>
          </button>
        ))}
      </div>

      {/* Center: Quick Command Input */}
      <form onSubmit={handleQuickSubmit} className="flex-1 max-w-xl w-full flex items-center gap-1.5">
        <div className="relative flex-1">
          <Terminal className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder={`Command ${activeAgent.name} (e.g. "Mine oak log", "Gather iron ore")...`}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-purple-200 focus:outline-none focus:border-purple-500 shadow-inner"
          />
        </div>
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition-all shadow-sm shrink-0"
        >
          <Send className="w-3 h-3" /> Dispatch
        </button>
      </form>

      {/* Right: Autonomy Toggle & Routing Badge */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleAutonomy}
          className={`text-xs font-mono px-3 py-1 rounded-xl border flex items-center gap-1.5 transition-all ${
            aiAutonomyEnabled
              ? "bg-emerald-950/80 text-emerald-300 border-emerald-600/60 shadow-sm shadow-emerald-500/20"
              : "bg-amber-950/80 text-amber-300 border-amber-600/60"
          }`}
        >
          {aiAutonomyEnabled ? (
            <>
              <Play className="w-3 h-3 text-emerald-400 fill-emerald-400 animate-pulse" /> Autonomy Active
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 text-amber-400" /> Autonomy Paused
            </>
          )}
        </button>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span className="text-cyan-200 font-bold uppercase">{activeTier}:</span>
          <span className="text-slate-300 truncate max-w-[120px]" title={modelUsed}>{modelUsed}</span>
        </div>
      </div>
    </div>
  );
};
