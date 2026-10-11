import React, { useState } from "react";
import { SchematicDiffItem, MaterialRequirement, PlayerState, ActionPacket } from "../types";
import { 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Square, 
  RotateCw, 
  Boxes, 
  Sparkles, 
  Crosshair,
  PackageCheck
} from "lucide-react";

interface LitematicaStudioProps {
  diffs: SchematicDiffItem[];
  materials: MaterialRequirement[];
  player: PlayerState;
  onExecuteAutoBuildStep: () => void;
  isAutoBuilding: boolean;
  onToggleAutoBuild: () => void;
  onSelectSchematicPreset: (preset: string) => void;
  currentPreset: string;
}

export const LitematicaStudio: React.FC<LitematicaStudioProps> = ({
  diffs,
  materials,
  player,
  onExecuteAutoBuildStep,
  isAutoBuilding,
  onToggleAutoBuild,
  onSelectSchematicPreset,
  currentPreset,
}) => {
  const [filterType, setFilterType] = useState<string>("ALL");

  const filteredDiffs = diffs.filter((d) => {
    if (filterType === "ALL") return true;
    return d.type === filterType;
  });

  const missingCount = diffs.filter((d) => d.type === "MISSING").length;
  const misplacedCount = diffs.filter((d) => d.type === "MISPLACED").length;
  const correctCount = diffs.filter((d) => d.type === "CORRECT").length;
  const totalCount = diffs.length;
  const completionPercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Top Banner: Schematic Placement Status */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-sky-400" />
              <h2 className="text-base font-bold text-slate-100">Litematica & Syncmatica Bridge</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Reflective introspection of <code className="text-sky-300">DataManager</code> & <code className="text-sky-300">SchematicPlacementManager</code>
            </p>
          </div>

          {/* Schematic Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Placement:</span>
            <select
              value={currentPreset}
              onChange={(e) => onSelectSchematicPreset(e.target.value)}
              className="bg-slate-950 border border-slate-750 text-slate-200 text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-sky-400"
            >
              <option value="nether_portal">Nether Portal (5x4 Obsidian)</option>
              <option value="stone_tower">Stone Watchtower (Layer 1)</option>
              <option value="redstone_clock">Redstone Repeater Clock</option>
            </select>
          </div>
        </div>

        {/* Progress & Auto-Build Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-850">
            <span className="text-xs text-slate-400 font-mono">Schematic Progress</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-400">{completionPercentage}%</span>
              <span className="text-xs text-slate-500 font-mono">({correctCount}/{totalCount} blocks)</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-gradient-to-r from-emerald-500 to-sky-400 h-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-850">
            <span className="text-xs text-slate-400 font-mono">Missing Voxels</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-sky-400">{missingCount}</span>
              <span className="text-xs text-slate-500 font-mono">To be placed</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Sorted by distance to player</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-850">
            <span className="text-xs text-slate-400 font-mono">Misplaced / Obstructed</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-red-400">{misplacedCount}</span>
              <span className="text-xs text-slate-500 font-mono">Requires break</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Wrong block state in world</span>
          </div>

          {/* Action Loop Buttons */}
          <div className="flex flex-col justify-center gap-2 p-3 rounded-lg bg-slate-950/70 border border-slate-850">
            <button
              onClick={onExecuteAutoBuildStep}
              disabled={isAutoBuilding || missingCount === 0}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-slate-950 font-semibold text-xs font-mono transition-colors shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Step Auto-Build Once
            </button>
            <button
              onClick={onToggleAutoBuild}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
                isAutoBuilding
                  ? "bg-red-600 hover:bg-red-500 text-slate-100 animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-sm"
              }`}
            >
              {isAutoBuilding ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  Stop Autonomous Loop
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Start Auto-Build Loop
                </>
              )}
            </button>
          </div>
        </div>

        {/* Deterministic Auto-Build State Machine Steps */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <span className="text-xs text-slate-400 font-mono block mb-2">Autonomous Placement Pipeline:</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Step 1</span>
              <span className="text-sky-400 font-semibold">1. Diff Query</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Step 2</span>
              <span className="text-sky-400 font-semibold">2. Target Lock</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Step 3</span>
              <span className="text-sky-400 font-semibold">3. Equip Slot</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Step 4</span>
              <span className="text-sky-400 font-semibold">4. Aim & Place</span>
            </div>
            <div className="p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Step 5</span>
              <span className="text-emerald-400 font-semibold">5. Verify Tick</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Required Materials vs Schematic Voxel Diff */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Required Material Checklist */}
        <div className="lg:col-span-1 rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Material List</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Inventory Sync</span>
          </div>

          <div className="space-y-2">
            {materials.map((mat) => {
              const isSatisfied = mat.missing === 0;
              return (
                <div
                  key={mat.item}
                  className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                    isSatisfied
                      ? "bg-slate-950/70 border-emerald-900/50 text-slate-300"
                      : "bg-slate-950/70 border-amber-900/50 text-amber-200"
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="truncate max-w-[170px]" title={mat.item}>
                      {mat.item.replace("minecraft:", "")}
                    </span>
                    {isSatisfied ? (
                      <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5" /> -{mat.missing}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-850">
                    <span>Required: <strong className="text-slate-200">{mat.required}</strong></span>
                    <span>In Inventory: <strong className={isSatisfied ? "text-emerald-400" : "text-amber-400"}>{mat.available}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schematic Voxel Diff Table */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-slate-200">Voxel Difference Stream</h3>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 text-xs font-mono">
              <button
                onClick={() => setFilterType("ALL")}
                className={`px-2 py-1 rounded text-[11px] ${
                  filterType === "ALL" ? "bg-slate-750 text-slate-100" : "bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                All ({diffs.length})
              </button>
              <button
                onClick={() => setFilterType("MISSING")}
                className={`px-2 py-1 rounded text-[11px] ${
                  filterType === "MISSING" ? "bg-sky-950 text-sky-300 border border-sky-800" : "bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                Missing ({missingCount})
              </button>
              <button
                onClick={() => setFilterType("CORRECT")}
                className={`px-2 py-1 rounded text-[11px] ${
                  filterType === "CORRECT" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                Placed ({correctCount})
              </button>
            </div>
          </div>

          {/* Diff items list */}
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Coordinate [X, Y, Z]</th>
                  <th className="py-2 px-3">Expected Block</th>
                  <th className="py-2 px-3">Current World</th>
                  <th className="py-2 px-3 text-right">Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredDiffs.map((d) => {
                  const dist = Math.sqrt(
                    Math.pow(d.x - player.x, 2) +
                    Math.pow(d.y - player.y, 2) +
                    Math.pow(d.z - player.z, 2)
                  ).toFixed(1);

                  return (
                    <tr key={d.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            d.type === "MISSING"
                              ? "bg-sky-950 text-sky-400 border border-sky-800"
                              : d.type === "CORRECT"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-red-950 text-red-400 border border-red-800"
                          }`}
                        >
                          {d.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        [{d.x}, {d.y}, {d.z}]
                      </td>
                      <td className="py-2 px-3 text-sky-300">
                        {d.expectedBlock.replace("minecraft:", "")}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {d.currentBlock.replace("minecraft:", "")}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">
                        {dist}m
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
