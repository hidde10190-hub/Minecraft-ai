import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  Terminal, 
  Code2, 
  Boxes, 
  Cpu, 
  Download, 
  Activity,
  Layers,
  MessageSquare,
  Users,
  Ear,
  EarOff,
  Zap,
  Shuffle,
  Server,
  Compass,
  BookOpen,
  Crosshair,
  FileJson,
  FileCog,
  Swords,
  ChevronDown,
  LayoutGrid,
  Search,
  Check,
  Trophy,
  Hammer
} from "lucide-react";

export interface NavCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultTab: string;
  tabs: {
    id: string;
    label: string;
    shortLabel: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: "operations",
    label: "Operations",
    icon: Activity,
    defaultTab: "workbench",
    tabs: [
      { id: "workbench", label: "3D Workbench & Controller", shortLabel: "3D Stage", description: "Real-time three.js visualization and virtual key matrix", icon: Activity },
      { id: "inventory", label: "Visual Inventory & Crafting", shortLabel: "Inventory", description: "Slot-verified item transfers, 3x3 table, furnace, and recipe graph", icon: Boxes },
      { id: "worldmap", label: "Live World Map", shortLabel: "World Map", description: "Voxel chunk explorer with fog of war and waypoints", icon: Compass },
      { id: "radar", label: "Player Locator Radar", shortLabel: "Radar HUD", description: "Proximity tracking and spatial vector analysis", icon: Crosshair },
    ],
  },
  {
    id: "perception",
    label: "Perception & PvP",
    icon: MessageSquare,
    defaultTab: "chat",
    tabs: [
      { id: "chat", label: "In-Game Chat & Swarm", shortLabel: "Chat Comms", description: "Bidirectional chat perception and LLM auto-responses", icon: MessageSquare },
      { id: "steer_and_signs", label: "Bot Steering & Signs", shortLabel: "Sign Perception", description: "Sign-reading cognition and fine-grained motor controls", icon: Crosshair },
      { id: "pvp_revanche", label: "1.9+ PvP & Revanche", shortLabel: "Combat Studio", description: "1.9 weapon cooldowns, shield counter-attacks, and slap aggro", icon: Swords },
    ],
  },
  {
    id: "construction",
    label: "Construction",
    icon: Layers,
    defaultTab: "litematica",
    tabs: [
      { id: "litematica", label: "Litematica Auto-Build", shortLabel: "Litematica", description: "Schematic block diffing and autonomous placement pipeline", icon: Layers },
      { id: "jsonmap", label: "JSON Map & Multimodal", shortLabel: "JSON Map", description: "2D chunk matrix, schematic diff inspector, and screenshot analysis", icon: FileJson },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    icon: Bot,
    defaultTab: "brain",
    tabs: [
      { id: "brain", label: "AI Brain & Cognition", shortLabel: "AI Brain", description: "Multi-model reasoning loop, memory steps, and spatial landmarks", icon: Bot },
      { id: "progression", label: "Progression & World Memory", shortLabel: "Progression", description: "5 survival chains, persistent memory, spatial graph, and benchmark replays", icon: Trophy },
      { id: "skills", label: "Skills & Self-Learning", shortLabel: "Skills & Failures", description: "Self-learning engine, editable skills file, and failures memory", icon: Zap },
      { id: "standalone", label: "Standalone 26.2 Client", shortLabel: "Client Runner", description: "Headless client runner with ping diagnostics and Docker controls", icon: Server },
    ],
  },
  {
    id: "system",
    label: "System & Config",
    icon: FileCog,
    defaultTab: "envconfig",
    tabs: [
      { id: "envconfig", label: "Universal .env Config", shortLabel: ".env Setup", description: "Single-file environment variables and live swarm syncing", icon: FileCog },
      { id: "modhub", label: "Mod Knowledge Hub", shortLabel: "Mod Guide", description: "Auto-scanned mod knowledge and slash commands index", icon: BookOpen },
      { id: "code", label: "Source Code & Mixins", shortLabel: "Source Code", description: "Fabric mixin architecture and java source viewer", icon: Code2 },
      { id: "protocol", label: "IPC Protocol & Docs", shortLabel: "IPC Protocol", description: "WebSocket and REST specification with session management", icon: Terminal },
    ],
  },
];

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnected: boolean;
  onExportAll: () => void;
  isExporting?: boolean;
  provider: string;
  activeAgentCount?: number;
  listenToChat?: boolean;
  onToggleListenToChat?: () => void;
  isAutonomousMode?: boolean;
  onToggleAutonomy?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  onExportAll,
  isExporting = false,
  provider,
  activeAgentCount = 3,
  listenToChat = true,
  onToggleListenToChat,
  isAutonomousMode = false,
  onToggleAutonomy,
}) => {
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsQuickMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine current active category
  const activeCategory = NAV_CATEGORIES.find((cat) =>
    cat.tabs.some((t) => t.id === activeTab)
  ) || NAV_CATEGORIES[0];

  const handleSelectCategory = (cat: NavCategory) => {
    if (!cat.tabs.some((t) => t.id === activeTab)) {
      setActiveTab(cat.defaultTab);
    }
  };

  const allTabs = NAV_CATEGORIES.flatMap((c) => c.tabs);
  const filteredTabs = quickFilter.trim()
    ? allTabs.filter((t) =>
        t.label.toLowerCase().includes(quickFilter.toLowerCase()) ||
        t.description.toLowerCase().includes(quickFilter.toLowerCase())
      )
    : allTabs;

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 py-2.5">
          <div className="flex items-center gap-3">
            <div className="h-8.5 w-8.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 tracking-tight text-base">
                  Minecraft AI Bridge
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-750 font-medium">
                  Fabric 26.2
                </span>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
            {NAV_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isCatActive = cat.id === activeCategory.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isCatActive
                      ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/50"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isCatActive ? "text-emerald-400" : "text-slate-400"}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md border transition-all ${
                  isQuickMenuOpen
                    ? "bg-slate-800 text-slate-100 border-slate-700"
                    : "bg-slate-900/90 text-slate-300 border-slate-800 hover:text-slate-100 hover:bg-slate-850"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">Views</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isQuickMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isQuickMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-750 shadow-2xl z-50 p-2 text-left animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 pb-1 border-b border-slate-800 mb-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={quickFilter}
                        onChange={(e) => setQuickFilter(e.target.value)}
                        placeholder="Search all views..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-sans text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto space-y-1 custom-scrollbar px-1">
                    {filteredTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = tab.id === activeTab;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsQuickMenuOpen(false);
                            setQuickFilter("");
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                            isSelected
                              ? "bg-emerald-950/60 border border-emerald-800/60 text-emerald-300"
                              : "hover:bg-slate-800 text-slate-300 hover:text-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-md ${isSelected ? "bg-emerald-900/60 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="font-medium text-slate-200 truncate">{tab.label}</p>
                              <p className="text-[11px] text-slate-400 truncate">{tab.description}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {onToggleListenToChat && (
              <button
                onClick={onToggleListenToChat}
                className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-md border transition-all ${
                  listenToChat
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80 hover:bg-emerald-900/50"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300"
                }`}
                title={listenToChat ? "In-Game Chat Listener Active" : "In-Game Chat Perception Muted"}
              >
                {listenToChat ? <Ear className="h-3.5 w-3.5 text-emerald-400" /> : <EarOff className="h-3.5 w-3.5 text-slate-500" />}
                <span className="hidden lg:inline">Chat: {listenToChat ? "On" : "Off"}</span>
              </button>
            )}

            {onToggleAutonomy && (
              <button
                onClick={onToggleAutonomy}
                className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-md border transition-all ${
                  isAutonomousMode
                    ? "bg-violet-950/60 text-violet-400 border-violet-800/80 hover:bg-violet-900/50"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300"
                }`}
                title={isAutonomousMode ? "Deep Autonomy Active" : "Deep Autonomy Off"}
              >
                <Activity className={`h-3.5 w-3.5 ${isAutonomousMode ? "text-violet-400 animate-pulse" : "text-slate-500"}`} />
                <span className="hidden lg:inline">Autonomy: {isAutonomousMode ? "On" : "Off"}</span>
              </button>
            )}

            <div className={`hidden lg:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-md border ${
              provider === "auto"
                ? "bg-cyan-950/50 border-cyan-800/60 text-cyan-300"
                : provider === "builtin"
                ? "bg-amber-950/50 border-amber-800/60 text-amber-300"
                : "bg-emerald-950/50 border-emerald-800/60 text-emerald-300"
            }`}>
              {provider === "auto" ? <Shuffle className="h-3 w-3 text-cyan-400" /> : provider === "builtin" ? <Zap className="h-3 w-3 text-amber-400" /> : <Cpu className="h-3 w-3 text-emerald-400" />}
              <span className="uppercase">{provider}</span>
            </div>

            <button
              onClick={onExportAll}
              disabled={isExporting}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export"}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 py-1.5 border-t border-slate-850 overflow-x-auto custom-scrollbar">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider pl-1 pr-2 hidden sm:inline">
            {activeCategory.label}:
          </span>
          <div className="flex items-center gap-1">
            {activeCategory.tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
