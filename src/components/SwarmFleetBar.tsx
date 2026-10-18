import React, { useState } from "react";
import { 
  Users, 
  Bot, 
  Plus, 
  Radio, 
  Heart, 
  Shield, 
  Hammer, 
  Pickaxe, 
  Eye, 
  Sparkles,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { AgentInstance, AgentRole } from "../types";

interface SwarmFleetBarProps {
  agents: AgentInstance[];
  activeAgentId: string;
  onSelectAgent: (id: string) => void;
  onAddAgent: (customName?: string, customRole?: AgentRole) => void;
  onRemoveAgent: (agentId: string) => void;
  onRenameAgent: (agentId: string, newName: string) => void;
  onBroadcastDirective: (directive: string) => void;
  onUpdateAgentRole: (agentId: string, role: AgentRole) => void;
}

export const SwarmFleetBar: React.FC<SwarmFleetBarProps> = ({
  agents,
  activeAgentId,
  onSelectAgent,
  onAddAgent,
  onRemoveAgent,
  onRenameAgent,
  onBroadcastDirective,
  onUpdateAgentRole,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDirectiveOpen, setIsDirectiveOpen] = useState(false);
  const [broadcastInput, setBroadcastInput] = useState("Synchronized objective: Assist active unit in base construction and defensive perimeter");

  // Add Agent Form state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentRole, setNewAgentRole] = useState<AgentRole>("Builder");

  // Inline rename state
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  const getRoleIcon = (role: AgentRole) => {
    switch (role) {
      case "Assistant": return Sparkles;
      case "Builder": return Hammer;
      case "Scout": return Eye;
      case "Miner": return Pickaxe;
      case "Guard": return Shield;
      default: return Bot;
    }
  };

  const getRoleBadgeStyle = (role: AgentRole) => {
    switch (role) {
      case "Assistant": return "bg-indigo-950/70 text-indigo-300 border-indigo-800/60";
      case "Builder": return "bg-emerald-950/70 text-emerald-400 border-emerald-800/60";
      case "Scout": return "bg-cyan-950/70 text-cyan-400 border-cyan-800/60";
      case "Miner": return "bg-amber-950/70 text-amber-400 border-amber-800/60";
      case "Guard": return "bg-purple-950/70 text-purple-400 border-purple-800/60";
      default: return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim()) return;
    onBroadcastDirective(broadcastInput.trim());
    setIsDirectiveOpen(false);
  };

  const handleStartRename = (e: React.MouseEvent, agent: AgentInstance) => {
    e.stopPropagation();
    setEditingAgentId(agent.id);
    setEditingNameValue(agent.name);
  };

  const handleSaveRename = (e: React.MouseEvent | React.FormEvent, agentId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (editingNameValue.trim()) {
      onRenameAgent(agentId, editingNameValue.trim());
    }
    setEditingAgentId(null);
  };

  const handleConfirmAddAgent = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAgent(newAgentName.trim() || undefined, newAgentRole);
    setNewAgentName("");
    setIsAddModalOpen(false);
  };

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 shadow-md backdrop-blur-sm transition-all">
      {/* Sleek Compact Bar */}
      <div className="p-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Swarm Fleet Pills */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono pr-1">
            <Users className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Fleet ({agents.length}):</span>
          </div>

          {agents.map((agent) => {
            const isActive = agent.id === activeAgentId;
            const RoleIcon = getRoleIcon(agent.role);
            return (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap border ${
                  isActive
                    ? "bg-slate-800 text-emerald-300 border-emerald-500/80 shadow-sm font-semibold ring-1 ring-emerald-500/20"
                    : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850"
                }`}
                title={`Switch active unit to ${agent.name} (${agent.role})`}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: agent.color || "#10b981" }}
                />
                <RoleIcon className="h-3 w-3 text-slate-400" />
                <span>{agent.name}</span>
                <span className="text-[10px] text-slate-500 hidden md:inline">({agent.role})</span>
              </button>
            );
          })}

          <button
            onClick={() => setIsAddModalOpen(!isAddModalOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors"
            title="Add a new bot to the swarm"
          >
            <Plus className="h-3 w-3 text-emerald-400" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Right: Actions and Expand Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDirectiveOpen(!isDirectiveOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors border ${
              isDirectiveOpen
                ? "bg-amber-950/80 text-amber-300 border-amber-700/80"
                : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-850"
            }`}
            title="Broadcast objective across all units"
          >
            <Radio className="h-3 w-3 text-amber-400" />
            <span className="hidden sm:inline">Broadcast</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-850 text-xs font-mono transition-colors"
            title={isExpanded ? "Collapse Swarm Fleet details" : "Expand Swarm Fleet management cards"}
          >
            <span>{isExpanded ? "Less" : "Details"}</span>
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Add Agent Popout Form */}
      {isAddModalOpen && (
        <form onSubmit={handleConfirmAddAgent} className="p-3 m-2.5 rounded-lg bg-slate-950 border border-emerald-800/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-300 flex items-center gap-1.5 font-mono">
              <Plus className="h-3.5 w-3.5 text-emerald-400" />
              Spawn Swarm Agent:
            </span>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-6">
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Agent Callsign:</label>
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder={`e.g. Echo-Harvester or Unit-${agents.length + 1}`}
                className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[10px] font-mono text-slate-400 mb-1">Assigned Role:</label>
              <select
                value={newAgentRole}
                onChange={(e) => setNewAgentRole(e.target.value as AgentRole)}
                className="w-full bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="Assistant">Assistant (Omni-Support)</option>
                <option value="Builder">Builder (Construction)</option>
                <option value="Scout">Scout (Reconnaissance)</option>
                <option value="Miner">Miner (Excavation)</option>
                <option value="Guard">Guard (Combat Defense)</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Swarm Directive Broadcast Form */}
      {isDirectiveOpen && (
        <form onSubmit={handleSendBroadcast} className="p-3 m-2.5 rounded-lg bg-slate-950 border border-amber-900/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5 font-mono">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Global Swarm Directive:
            </span>
            <span className="text-[10px] font-mono text-slate-500">Affects all {agents.length} units</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={broadcastInput}
              onChange={(e) => setBroadcastInput(e.target.value)}
              placeholder="e.g. Swarm Directive: Guard base perimeter and relay obsidian to builder..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-colors"
            >
              Broadcast
            </button>
          </div>
        </form>
      )}

      {/* Expanded Management Grid */}
      {isExpanded && (
        <div className="p-3 border-t border-slate-800/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent) => {
              const isActive = agent.id === activeAgentId;
              const RoleIcon = getRoleIcon(agent.role);
              const isEditing = editingAgentId === agent.id;

              return (
                <div
                  key={agent.id}
                  onClick={() => onSelectAgent(agent.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all border text-left ${
                    isActive
                      ? "bg-slate-850 border-emerald-500/80 shadow-md"
                      : "bg-slate-950/70 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-750"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: agent.color || "#10b981" }}
                      />

                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(e, agent.id);
                              if (e.key === "Escape") setEditingAgentId(null);
                            }}
                            className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 w-full"
                            autoFocus
                          />
                          <button
                            onClick={(e) => handleSaveRename(e, agent.id)}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-xs text-slate-100 font-mono truncate">
                            {agent.name}
                          </span>
                          <button
                            onClick={(e) => handleStartRename(e, agent)}
                            className="text-slate-500 hover:text-slate-300 p-0.5"
                            title="Rename agent"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <select
                        value={agent.role}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateAgentRole(agent.id, e.target.value as AgentRole);
                        }}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(agent.role)} focus:outline-none`}
                      >
                        <option value="Assistant">Assistant</option>
                        <option value="Builder">Builder</option>
                        <option value="Scout">Scout</option>
                        <option value="Miner">Miner</option>
                        <option value="Guard">Guard</option>
                      </select>

                      {agents.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveAgent(agent.id);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                          title="Remove unit"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
                      <span>{agent.player.health.toFixed(0)}/20 HP</span>
                    </span>
                    <span className="text-slate-500">
                      [{agent.player.x.toFixed(0)}, {agent.player.y.toFixed(0)}, {agent.player.z.toFixed(0)}]
                    </span>
                  </div>

                  <div className="mt-1.5 text-[10px] text-slate-500 truncate">
                    {agent.currentTask || "Idle / Ready"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
