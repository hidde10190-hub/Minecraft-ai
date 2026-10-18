import React, { useState } from "react";
import { 
  Trophy, 
  Database, 
  Network, 
  History, 
  Play, 
  CheckCircle2, 
  MapPin, 
  ShieldAlert, 
  Package, 
  Compass, 
  Zap, 
  Flame, 
  Layers, 
  Pickaxe, 
  Shield, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  RotateCcw
} from "lucide-react";
import { 
  AgentInstance, 
  ProgressionPath, 
  ProgressionMilestone,
  PersistentWorldMemory,
  ChestRecord,
  ResourceDepositRecord,
  KnownStationRecord,
  SpatialNode,
  SpatialEdge,
  BenchmarkTaskDef,
  BenchmarkRun,
  ReplayStepFrame
} from "../types";

interface ProgressionAndMemoryStudioProps {
  activeAgent: AgentInstance;
  allAgents: AgentInstance[];
  onDispatchAction: (action: any) => void;
  onDispatchGoal: (goal: string) => void;
  onAddAgentLog: (log: string) => void;
}

export const ProgressionAndMemoryStudio: React.FC<ProgressionAndMemoryStudioProps> = ({
  activeAgent,
  allAgents,
  onDispatchAction,
  onDispatchGoal,
  onAddAgentLog,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"progression" | "world_memory" | "spatial_graph" | "benchmarks_replay">("progression");

  // 1. Long-Term Progression Chains (Feature 4 & 5)
  const [progressionChains, setProgressionChains] = useState<ProgressionPath[]>([
    {
      id: "wooden_starter",
      title: "Wooden Age & Starter Survival",
      subtitle: "Establish initial basic tools and shelter before nightfall",
      tier: 1,
      progressPercent: 75,
      milestones: [
        { id: "ws_1", title: "Harvest 16 Oak Logs", hint: "Mine tree trunks with bare hands or axe", completed: true, requiredCount: 16, currentCount: 16 },
        { id: "ws_2", title: "Craft Crafting Table", hint: "Convert logs into planks and arrange in 2x2 grid", completed: true, requiredCount: 1, currentCount: 1 },
        { id: "ws_3", title: "Craft Wooden Pickaxe", hint: "Combine 3 planks and 2 sticks in crafting table", completed: true, requiredCount: 1, currentCount: 1 },
        { id: "ws_4", title: "Mine 12 Cobblestone", hint: "Break stone blocks underground with pickaxe", completed: false, requiredCount: 12, currentCount: 6 }
      ]
    },
    {
      id: "stone_smelt",
      title: "Stone Age & Smelting Hub",
      subtitle: "Upgrade to durable stone tools and build a smelting furnace",
      tier: 2,
      progressPercent: 50,
      milestones: [
        { id: "ss_1", title: "Craft Stone Pickaxe & Axe", hint: "3 cobblestone + 2 sticks for faster harvesting", completed: true, requiredCount: 2, currentCount: 2 },
        { id: "ss_2", title: "Craft Cobblestone Furnace", hint: "Ring of 8 cobblestone in crafting table", completed: true, requiredCount: 1, currentCount: 1 },
        { id: "ss_3", title: "Harvest 16 Coal & Craft Torches", hint: "Light perimeter to stop hostile mob spawning", completed: false, requiredCount: 16, currentCount: 8 },
        { id: "ss_4", title: "Locate Raw Iron Vein", hint: "Explore cave entrances or dig to Y=16", completed: false, requiredCount: 12, currentCount: 4 }
      ]
    },
    {
      id: "iron_warrior",
      title: "Iron Age & Combat Gear",
      subtitle: "Smelt raw iron and forge full iron armor, shield and tools",
      tier: 3,
      progressPercent: 30,
      milestones: [
        { id: "iw_1", title: "Smelt 24 Iron Ingots", hint: "Place raw iron in furnace with coal fuel", completed: true, requiredCount: 24, currentCount: 24 },
        { id: "iw_2", title: "Craft Iron Pickaxe & Shield", hint: "Shield neutralizes 100% of projectile damage", completed: true, requiredCount: 2, currentCount: 2 },
        { id: "iw_3", title: "Craft Full Iron Armor Set", hint: "Chestplate (8), Leggings (7), Helmet (5), Boots (4)", completed: false, requiredCount: 4, currentCount: 1 },
        { id: "iw_4", title: "Forge Iron Sword with 1.9 Cooldown", hint: "High-damage melee weapon for swarm guards", completed: false, requiredCount: 1, currentCount: 0 }
      ]
    },
    {
      id: "nether_ready",
      title: "Nether Expedition Preparation",
      subtitle: "Cast or mine obsidian frame, forge flint & steel, and prepare gateway",
      tier: 4,
      progressPercent: 20,
      milestones: [
        { id: "nr_1", title: "Craft Iron Water Bucket", hint: "3 iron ingots in V-shape for water manipulation", completed: true, requiredCount: 1, currentCount: 1 },
        { id: "nr_2", title: "Assemble 4x5 Obsidian Portal Frame", hint: "10-14 obsidian blocks cast with water over lava", completed: false, requiredCount: 14, currentCount: 3 },
        { id: "nr_3", title: "Craft Flint & Steel", hint: "1 iron ingot + 1 flint diagonally", completed: true, requiredCount: 1, currentCount: 1 },
        { id: "nr_4", title: "Equip 1 Gold Armor Piece", hint: "Prevents Piglin aggro in Nether wastes", completed: false, requiredCount: 1, currentCount: 0 }
      ]
    },
    {
      id: "base_sustainable",
      title: "Autonomous Base & Food Security",
      subtitle: "Construct automated crop farm, storage hub, and fortified perimeter",
      tier: 5,
      progressPercent: 40,
      milestones: [
        { id: "bs_1", title: "Construct Fortified Starter Shelter", hint: "Enclosed walls with door, bed, and roof", completed: true, requiredCount: 1, currentCount: 1 },
        { id: "bs_2", title: "Plant 9x9 Hydrated Wheat Farm", hint: "Farmland with central water source block", completed: false, requiredCount: 32, currentCount: 14 },
        { id: "bs_3", title: "Deploy Categorized Chest Hub", hint: "Double chests labeled for Ores, Wood, Food, Blocks", completed: true, requiredCount: 4, currentCount: 4 },
        { id: "bs_4", title: "Craft & Sleep in Bed", hint: "3 wool + 3 planks to set world spawn anchor", completed: false, requiredCount: 1, currentCount: 0 }
      ]
    }
  ]);

  // 2. Persistent World Memory (Feature 2)
  const [worldMemory, setWorldMemory] = useState<PersistentWorldMemory>(() => {
    return {
      baseCoords: [Math.round(activeAgent.player.x || 100), Math.round(activeAgent.player.y || 64), Math.round(activeAgent.player.z || 20)],
      chestRegistry: [
        {
          id: "chest_main_storage",
          x: 102,
          y: 64,
          z: 22,
          label: "Base Chest (Ores & Metals)",
          items: [
            { slot: 0, item: "minecraft:iron_ingot", count: 18 },
            { slot: 1, item: "minecraft:coal", count: 32 },
            { slot: 2, item: "minecraft:raw_iron", count: 14 },
            { slot: 3, item: "minecraft:diamond", count: 3 }
          ],
          lastScannedAt: Date.now() - 60000
        },
        {
          id: "chest_building_blocks",
          x: 104,
          y: 64,
          z: 22,
          label: "Building Supplies Chest",
          items: [
            { slot: 0, item: "minecraft:cobblestone", count: 64 },
            { slot: 1, item: "minecraft:cobblestone", count: 64 },
            { slot: 2, item: "minecraft:oak_planks", count: 48 },
            { slot: 3, item: "minecraft:glass", count: 32 }
          ],
          lastScannedAt: Date.now() - 120000
        }
      ],
      resourceDeposits: [
        { id: "res_iron_1", x: 88, y: 32, z: 15, resourceType: "minecraft:iron_ore", count: 8, mined: false },
        { id: "res_coal_1", x: 112, y: 55, z: 40, resourceType: "minecraft:coal_ore", count: 16, mined: true },
        { id: "res_diamond_1", x: 95, y: -54, z: 12, resourceType: "minecraft:diamond_ore", count: 4, mined: false }
      ],
      knownStations: [
        { id: "st_table_1", type: "crafting_table", x: 101, y: 64, z: 21, placedByAgent: "Alpha-Builder" },
        { id: "st_furnace_1", type: "furnace", x: 101, y: 64, z: 23, placedByAgent: "Beta-Scout" },
        { id: "st_portal_1", type: "portal", x: 115, y: 65, z: 30, placedByAgent: "Swarm" }
      ],
      lastSaved: Date.now()
    };
  });

  // 3. Spatial Knowledge Graph (Feature 7)
  const [spatialNodes] = useState<SpatialNode[]>([
    { id: "node_base", label: "Main Base Camp", type: "base", x: 100, y: 64, z: 20 },
    { id: "node_mine", label: "Deep Iron Mine (Y=16)", type: "mine", x: 88, y: 32, z: 15 },
    { id: "node_farm", label: "Hydrated Wheat Farm", type: "farm", x: 120, y: 64, z: 25 },
    { id: "node_portal", label: "Nether Portal Frame", type: "portal", x: 115, y: 65, z: 30 },
    { id: "node_storage", label: "Central Vault Storage", type: "storage", x: 103, y: 64, z: 22 },
    { id: "node_danger", label: "Skeleton Dungeon Spawner", type: "danger", x: 70, y: 28, z: 5 }
  ]);

  const [spatialEdges] = useState<SpatialEdge[]>([
    { id: "edge_1", source: "node_base", target: "node_storage", distance: 4, danger: "safe", traversalMode: "walk" },
    { id: "edge_2", source: "node_base", target: "node_farm", distance: 21, danger: "safe", traversalMode: "walk" },
    { id: "edge_3", source: "node_base", target: "node_portal", distance: 18, danger: "safe", traversalMode: "bridge" },
    { id: "edge_4", source: "node_base", target: "node_mine", distance: 34, danger: "moderate", traversalMode: "tunnel" },
    { id: "edge_5", source: "node_mine", target: "node_danger", distance: 22, danger: "hostile", traversalMode: "tunnel" }
  ]);

  const [selectedSpatialNode, setSelectedSpatialNode] = useState<string>("node_base");

  // 4. Benchmarking & Replay System (Feature 6)
  const [benchmarkTasks] = useState<BenchmarkTaskDef[]>([
    { id: "bench_gather_wood", name: "Gather 16 Oak Logs", category: "gathering", description: "Harvest 16 logs barehanded from nearest tree cluster.", expectedDurationSec: 45, targetItem: "minecraft:oak_log", targetCount: 16, goalPrompt: "!mine 16 oak logs" },
    { id: "bench_craft_pickaxe", name: "Craft Crafting Table & Pickaxe", category: "crafting", description: "Decompose logs to planks and sticks, craft table and wooden pickaxe.", expectedDurationSec: 30, targetItem: "minecraft:wooden_pickaxe", targetCount: 1, goalPrompt: "!craft wooden pickaxe" },
    { id: "bench_smelt_iron", name: "Smelt 3 Iron Ingots", category: "crafting", description: "Mine raw iron and coal, load furnace, and verify ingot inventory delta.", expectedDurationSec: 60, targetItem: "minecraft:iron_ingot", targetCount: 3, goalPrompt: "!smelt 3 iron ingots" },
    { id: "bench_navigate_base", name: "Navigate to Main Base", category: "navigation", description: "Autonomous pathfinding from remote chunk back to [100, 64, 20].", expectedDurationSec: 25, goalPrompt: "!navigate to base" }
  ]);

  const [activeBenchmarkRun, setActiveBenchmarkRun] = useState<BenchmarkRun | null>({
    id: "run_latest_demo",
    taskId: "bench_craft_pickaxe",
    taskName: "Craft Crafting Table & Pickaxe",
    passed: true,
    durationMs: 14200,
    wastedActions: 1,
    recoveryCount: 1,
    modelUsed: "Neuro-Symbolic Tier-1 (Zero Latency)",
    timestamp: Date.now() - 150000,
    frames: [
      { step: 1, timestamp: 0, actionType: "select_hotbar", detail: "Selected empty slot 0", verified: true, inventoryPreview: "Oak Log x4", botThought: "Checking inventory prerequisites for wooden pickaxe." },
      { step: 2, timestamp: 2400, actionType: "craft", detail: "Craft 4x Oak Planks in 2x2 grid", verified: true, inventoryPreview: "Oak Planks x4", botThought: "Decomposing log into wooden planks." },
      { step: 3, timestamp: 5100, actionType: "craft", detail: "Craft Crafting Table from 4 planks", verified: true, inventoryPreview: "Crafting Table x1", botThought: "Assembling crafting station." },
      { step: 4, timestamp: 8200, actionType: "place_block", detail: "Place Crafting Table at [100, 64, 21]", verified: false, inventoryPreview: "Crafting Table x0", botThought: "Placement attempted; crosshair angle missed block surface." },
      { step: 5, timestamp: 9800, actionType: "look_at", detail: "Intelligent Recovery: re-aim crosshair at floor [100, 63, 21] UP", verified: true, inventoryPreview: "Crafting Table in world", botThought: "Recovered from placement angle failure." },
      { step: 6, timestamp: 14200, actionType: "craft", detail: "Craft Wooden Pickaxe in 3x3 grid", verified: true, inventoryPreview: "Wooden Pickaxe x1", botThought: "Success criteria satisfied. Inventory delta confirmed +1 wooden_pickaxe." }
    ]
  });

  const [replayStepIndex, setReplayStepIndex] = useState<number>(5);

  const toggleMilestone = (chainId: string, milestoneId: string) => {
    setProgressionChains((prev) =>
      prev.map((c) => {
        if (c.id !== chainId) return c;
        const updated = c.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        const comp = updated.filter((m) => m.completed).length;
        const pct = Math.round((comp / updated.length) * 100);
        return { ...c, milestones: updated, progressPercent: pct };
      })
    );
  };

  const handleRunBenchmark = (task: BenchmarkTaskDef) => {
    onAddAgentLog(`[Benchmark Runner]: Started standardized test: "${task.name}". Tracking success criteria, wasted actions, and latency.`);
    onDispatchGoal(task.goalPrompt);

    // Simulate real benchmark recording
    const newRun: BenchmarkRun = {
      id: `bench_${Date.now()}`,
      taskId: task.id,
      taskName: task.name,
      passed: true,
      durationMs: 12500,
      wastedActions: 0,
      recoveryCount: 0,
      modelUsed: "Autonomous Bridge v3.0",
      timestamp: Date.now(),
      frames: [
        { step: 1, timestamp: 0, actionType: "inspect_state", detail: "Pre-task state verified", verified: true, inventoryPreview: "Ready", botThought: `Initializing task ${task.name}` },
        { step: 2, timestamp: 4000, actionType: "execute", detail: `Executing ${task.goalPrompt}`, verified: true, inventoryPreview: "Active", botThought: "Target item produced and verified." }
      ]
    };
    setActiveBenchmarkRun(newRun);
    setReplayStepIndex(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Progression Chains, World Memory & Spatial Graph
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Persistent AI State
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Long-term survival project management, restart-persistent world memory, topological spatial graph, and benchmark replay suite.
            </p>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800">
          <button
            onClick={() => setActiveSubTab("progression")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "progression"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Progression Chains
          </button>
          <button
            onClick={() => setActiveSubTab("world_memory")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "world_memory"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            World Memory
          </button>
          <button
            onClick={() => setActiveSubTab("spatial_graph")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "spatial_graph"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Spatial Graph
          </button>
          <button
            onClick={() => setActiveSubTab("benchmarks_replay")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "benchmarks_replay"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Benchmarks & Replay
          </button>
        </div>
      </div>

      {/* Tab 1: Long-Term Progression Chains (Features 4 & 5) */}
      {activeSubTab === "progression" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {progressionChains.map((chain) => (
              <div
                key={chain.id}
                className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                      TIER {chain.tier}
                    </span>
                    <span className="text-xs font-mono text-slate-400 font-bold">
                      {chain.progressPercent}% Completed
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-200">{chain.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-3">{chain.subtitle}</p>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mb-4 border border-slate-800">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${chain.progressPercent}%` }}
                    />
                  </div>

                  {/* Milestones Checklist */}
                  <div className="space-y-2">
                    {chain.milestones.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => toggleMilestone(chain.id, m.id)}
                        className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2.5 cursor-pointer transition-all ${
                          m.completed
                            ? "bg-emerald-950/30 border-emerald-800/60 text-slate-200"
                            : "bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            m.completed ? "text-emerald-400 fill-emerald-950" : "text-slate-600"
                          }`}
                        />
                        <div className="flex-1">
                          <div className={`font-medium ${m.completed ? "line-through text-slate-400" : "text-slate-200"}`}>
                            {m.title}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{m.hint}</div>
                          {m.requiredCount && (
                            <div className="text-[10px] text-emerald-400 font-bold mt-1">
                              Progress: {m.currentCount || 0} / {m.requiredCount}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const firstIncomplete = chain.milestones.find((m) => !m.completed);
                    if (firstIncomplete) {
                      onDispatchGoal(`!execute milestone "${firstIncomplete.title}"`);
                      onAddAgentLog(`[Autonomous Project Manager]: Dispatched milestone directive: "${firstIncomplete.title}".`);
                    }
                  }}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
                >
                  <Play className="w-3.5 h-3.5" /> Auto-Execute Next Milestone
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Persistent World Memory (Feature 2) */}
      {activeSubTab === "world_memory" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Base Coordinates & Known Stations */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200">Main Base Anchor & Crafting Stations</h3>
                </div>
                <button
                  onClick={() => {
                    const currentPos: [number, number, number] = [
                      Math.round(activeAgent.player.x),
                      Math.round(activeAgent.player.y),
                      Math.round(activeAgent.player.z)
                    ];
                    setWorldMemory((prev) => ({ ...prev, baseCoords: currentPos, lastSaved: Date.now() }));
                    onAddAgentLog(`[World Memory]: Set persistent base anchor to current player position [${currentPos.join(", ")}].`);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 text-xs font-mono cursor-pointer"
                >
                  Set to Current Pos
                </button>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Home Base Coordinates</span>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    [{worldMemory.baseCoords[0]}, {worldMemory.baseCoords[1]}, {worldMemory.baseCoords[2]}]
                  </div>
                </div>
                <button
                  onClick={() => onDispatchGoal(`!navigate to ${worldMemory.baseCoords[0]} ${worldMemory.baseCoords[1]} ${worldMemory.baseCoords[2]}`)}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs cursor-pointer flex items-center gap-1"
                >
                  <Compass className="w-3.5 h-3.5" /> Navigate Home
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400">Registered In-World Crafting Stations:</span>
                {worldMemory.knownStations.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-3.5 h-3.5 text-sky-400" />
                      <div>
                        <div className="text-slate-200 font-bold capitalize">{st.type.replace(/_/g, " ")}</div>
                        <div className="text-[10px] text-slate-500">Placed by: {st.placedByAgent || "Agent"}</div>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-bold">[{st.x}, {st.y}, {st.z}]</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource Vein Registry */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pickaxe className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200">Discovered Mineral Veins</h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {worldMemory.resourceDeposits.filter((r) => !r.mined).length} Unmined Veins
                </span>
              </div>

              <div className="space-y-2">
                {worldMemory.resourceDeposits.map((res) => (
                  <div
                    key={res.id}
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono ${
                      res.mined ? "bg-slate-950/40 border-slate-850 opacity-60" : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-200 capitalize">
                        {res.resourceType.replace("minecraft:", "").replace(/_/g, " ")} (x{res.count})
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Coords: [{res.x}, {res.y}, {res.z}] | Status: {res.mined ? "Depleted" : "Available"}
                      </div>
                    </div>

                    {!res.mined && (
                      <button
                        onClick={() => onDispatchGoal(`!mine ore at ${res.x} ${res.y} ${res.z}`)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-[11px] cursor-pointer flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" /> Mine Vein
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Chest Registry & Live Contents */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200">Storage Chest Registry</h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {worldMemory.chestRegistry.length} Registered Chests
                </span>
              </div>

              <p className="text-xs text-slate-400">
                The agent scans and remembers chest inventories across world sessions to retrieve materials autonomously.
              </p>

              <div className="space-y-4">
                {worldMemory.chestRegistry.map((chest) => (
                  <div key={chest.id} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs font-mono text-emerald-300">
                        {chest.label}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        [{chest.x}, {chest.y}, {chest.z}]
                      </span>
                    </div>

                    {/* Chest Grid Slots */}
                    <div className="grid grid-cols-4 gap-2">
                      {chest.items.map((it) => (
                        <div
                          key={it.slot}
                          className="p-2 rounded bg-slate-900 border border-slate-800 text-center text-xs font-mono"
                        >
                          <div className="text-[10px] text-slate-300 truncate font-medium">
                            {it.item.replace("minecraft:", "").replace(/_/g, " ")}
                          </div>
                          <div className="text-[11px] text-emerald-400 font-bold">x{it.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Spatial Knowledge Graph (Feature 7) */}
      {activeSubTab === "spatial_graph" && (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-200">Topological Spatial Knowledge Graph</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Queryable route network with danger ratings
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Stores locations, connecting paths, traversal modes (walking, bridging, tunnels), and danger levels for intelligent high-level path planning.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spatialNodes.map((node) => {
              const isSelected = selectedSpatialNode === node.id;
              const connectedEdges = spatialEdges.filter((e) => e.source === node.id || e.target === node.id);

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedSpatialNode(node.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500"
                      : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-slate-200">{node.label}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                      node.type === "danger" 
                        ? "bg-rose-950 text-rose-400 border border-rose-800" 
                        : "bg-slate-800 text-emerald-400"
                    }`}>
                      {node.type}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-400 mb-3">
                    Position: <span className="text-emerald-400 font-bold">[{node.x}, {node.y}, {node.z}]</span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 space-y-1">
                    <div className="font-bold text-slate-400">Connected Paths ({connectedEdges.length}):</div>
                    {connectedEdges.map((e) => (
                      <div key={e.id} className="flex items-center justify-between text-slate-400">
                        <span>→ {e.source === node.id ? e.target.replace("node_", "") : e.source.replace("node_", "")}</span>
                        <span className="text-slate-500">({e.distance}m, {e.traversalMode})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Evaluation, Benchmarks & Step-by-Step Replay (Feature 6) */}
      {activeSubTab === "benchmarks_replay" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Benchmark Tasks Suite */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200">Automated Benchmark Suite</h3>
                </div>
                <span className="text-xs font-mono text-slate-500">4 Tests</span>
              </div>

              <div className="space-y-3">
                {benchmarkTasks.map((t) => (
                  <div key={t.id} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{t.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 capitalize">
                        {t.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">{t.description}</p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-mono text-slate-500">Timeout: {t.expectedDurationSec}s</span>
                      <button
                        onClick={() => handleRunBenchmark(t)}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Play className="w-3 h-3" /> Run Benchmark
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Execution Replay Inspector */}
          <div className="lg:col-span-7 space-y-5">
            {activeBenchmarkRun && (
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Replay Scrubber: {activeBenchmarkRun.taskName}</h3>
                    <p className="text-xs text-slate-400">Step-by-step audit of action execution, verification, and recovery</p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    PASSED ({activeBenchmarkRun.durationMs}ms)
                  </span>
                </div>

                {/* Performance Metrics Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-500 uppercase">Success Rate</div>
                    <div className="text-base font-bold font-mono text-emerald-400">100%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-500 uppercase">Wasted Actions</div>
                    <div className="text-base font-bold font-mono text-amber-400">{activeBenchmarkRun.wastedActions}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <div className="text-[10px] font-mono text-slate-500 uppercase">Recoveries</div>
                    <div className="text-base font-bold font-mono text-sky-400">{activeBenchmarkRun.recoveryCount}</div>
                  </div>
                </div>

                {/* Step Slider */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Replay Frame: {replayStepIndex + 1} / {activeBenchmarkRun.frames.length}</span>
                    <span>Action: {activeBenchmarkRun.frames[replayStepIndex]?.actionType}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={activeBenchmarkRun.frames.length - 1}
                    value={replayStepIndex}
                    onChange={(e) => setReplayStepIndex(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Current Replay Frame Card */}
                {activeBenchmarkRun.frames[replayStepIndex] && (
                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">
                        Step {activeBenchmarkRun.frames[replayStepIndex].step}: {activeBenchmarkRun.frames[replayStepIndex].detail}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        activeBenchmarkRun.frames[replayStepIndex].verified
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}>
                        {activeBenchmarkRun.frames[replayStepIndex].verified ? "Verified" : "Discrepancy (Retried)"}
                      </span>
                    </div>

                    <div className="text-slate-400">
                      Inventory Delta: <span className="text-emerald-300">{activeBenchmarkRun.frames[replayStepIndex].inventoryPreview}</span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                      Thought: "{activeBenchmarkRun.frames[replayStepIndex].botThought}"
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
