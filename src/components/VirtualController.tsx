import React, { useState } from "react";
import { PlayerState, ActionPacket } from "../types";
import { 
  Crosshair, 
  Move, 
  ShieldAlert, 
  Zap, 
  Send, 
  MousePointer, 
  Check, 
  RotateCw,
  HandMetal,
  Shield,
  ArrowLeftRight
} from "lucide-react";

interface VirtualControllerProps {
  player: PlayerState;
  onDispatchAction: (action: ActionPacket) => void;
  heldKeys: Set<string>;
}

export const VirtualController: React.FC<VirtualControllerProps> = ({
  player,
  onDispatchAction,
  heldKeys,
}) => {
  const [targetLook, setTargetLook] = useState({ x: 104, y: 64, z: 20, ticks: 5 });
  const [customKeyDuration, setCustomKeyDuration] = useState(250);
  const [moveTargetHotbarSlot, setMoveTargetHotbarSlot] = useState(0);
  const [moveFromRaw, setMoveFromRaw] = useState("9");
  const [moveToRaw, setMoveToRaw] = useState("0");

  const triggerKey = (key: string, durationMs: number = 200) => {
    onDispatchAction({
      type: "press_key",
      key,
      durationMs,
      durationTicks: Math.max(1, Math.round(durationMs / 50)),
    });
  };

  const handleLookAt = (e: React.FormEvent) => {
    e.preventDefault();
    onDispatchAction({
      type: "look_at",
      x: Number(targetLook.x),
      y: Number(targetLook.y),
      z: Number(targetLook.z),
      ticks: Number(targetLook.ticks),
    });
  };

  return (
    <div className="space-y-4">
      {/* Movement & Keypad Card */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Move className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">Virtual Input Engine</h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
            KeyBindingAccessor In-Memory
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* WASD Virtual D-Pad */}
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-950/70 border border-slate-850">
            <span className="text-xs text-slate-400 font-mono mb-2">Movement Matrix</span>
            
            {/* W */}
            <button
              onClick={() => triggerKey("w", customKeyDuration)}
              className={`w-12 h-12 rounded-lg font-mono font-bold text-sm transition-all border shadow-sm ${
                heldKeys.has("w")
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-400/30"
                  : "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 active:scale-95"
              }`}
            >
              W
            </button>

            {/* A S D */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => triggerKey("a", customKeyDuration)}
                className={`w-12 h-12 rounded-lg font-mono font-bold text-sm transition-all border shadow-sm ${
                  heldKeys.has("a")
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-400/30"
                    : "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 active:scale-95"
                }`}
              >
                A
              </button>
              <button
                onClick={() => triggerKey("s", customKeyDuration)}
                className={`w-12 h-12 rounded-lg font-mono font-bold text-sm transition-all border shadow-sm ${
                  heldKeys.has("s")
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-400/30"
                    : "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 active:scale-95"
                }`}
              >
                S
              </button>
              <button
                onClick={() => triggerKey("d", customKeyDuration)}
                className={`w-12 h-12 rounded-lg font-mono font-bold text-sm transition-all border shadow-sm ${
                  heldKeys.has("d")
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-400/30"
                    : "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700 active:scale-95"
                }`}
              >
                D
              </button>
            </div>

            {/* Modifiers: Space, Shift, Ctrl */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => triggerKey("space", 150)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-mono"
              >
                Space (Jump)
              </button>
              <button
                onClick={() => triggerKey("shift", 300)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-mono"
              >
                Shift (Sneak)
              </button>
              <button
                onClick={() => triggerKey("ctrl", 300)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-mono"
              >
                Ctrl (Sprint)
              </button>
            </div>
          </div>

          {/* Mouse Actions & Raycast Solver */}
          <div className="flex flex-col justify-between p-3 rounded-lg bg-slate-950/70 border border-slate-850">
            <div>
              <span className="text-xs text-slate-400 font-mono mb-2 block">Mouse Interaction</span>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => triggerKey("attack", 100)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/80 font-mono text-xs font-semibold"
                >
                  <Zap className="h-3.5 w-3.5 text-red-400" />
                  Attack (Left Click)
                </button>
                <button
                  onClick={() => triggerKey("use", 100)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-800/80 font-mono text-xs font-semibold"
                >
                  <MousePointer className="h-3.5 w-3.5 text-sky-400" />
                  Use (Right Click)
                </button>
              </div>
            </div>

            {/* Look At Coordinate Solver */}
            <form onSubmit={handleLookAt} className="border-t border-slate-850 pt-2.5">
              <span className="text-xs text-slate-400 font-mono mb-1.5 block">Smooth Look Target (Cubic Ease)</span>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                <input
                  type="number"
                  placeholder="X"
                  value={targetLook.x}
                  onChange={(e) => setTargetLook({ ...targetLook, x: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900 border border-slate-750 rounded px-2 py-1 text-xs font-mono text-slate-200"
                />
                <input
                  type="number"
                  placeholder="Y"
                  value={targetLook.y}
                  onChange={(e) => setTargetLook({ ...targetLook, y: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900 border border-slate-750 rounded px-2 py-1 text-xs font-mono text-slate-200"
                />
                <input
                  type="number"
                  placeholder="Z"
                  value={targetLook.z}
                  onChange={(e) => setTargetLook({ ...targetLook, z: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-900 border border-slate-750 rounded px-2 py-1 text-xs font-mono text-slate-200"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <span>Interpolation:</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={targetLook.ticks}
                    onChange={(e) => setTargetLook({ ...targetLook, ticks: parseInt(e.target.value) || 1 })}
                    className="w-12 bg-slate-900 border border-slate-750 rounded px-1.5 py-0.5 text-center text-slate-200"
                  />
                  <span>ticks</span>
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition-colors"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  Look At
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Real Live Armor & Equipment Slots (Slots 1-4 are Armor) */}
        {player.equipment && (player.equipment.helmet || player.equipment.chestplate || player.equipment.leggings || player.equipment.boots || player.equipment.offhand) && (
          <div className="mt-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono font-bold text-slate-400 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-cyan-400" />
                <span>Equipped Armor & Offhand (Slots 1 - 4)</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
                Separated from 9-Slot Hotbar
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: "Helmet", item: player.equipment.helmet, icon: "🪖" },
                { label: "Chestplate", item: player.equipment.chestplate, icon: "🛡️" },
                { label: "Leggings", item: player.equipment.leggings, icon: "👖" },
                { label: "Boots", item: player.equipment.boots, icon: "👢" },
                { label: "Offhand", item: player.equipment.offhand, icon: "🗡️" },
              ].map(({ label, item, icon }) => {
                const itemName = (item?.item || "minecraft:air").replace("minecraft:", "");
                const isEquipped = itemName !== "air" && (item?.count ?? 0) > 0;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-mono ${
                      isEquipped
                        ? "bg-cyan-950/30 border-cyan-700/60 text-cyan-200"
                        : "bg-slate-900/60 border-slate-800 text-slate-500"
                    }`}
                  >
                    <span className="text-sm">{icon}</span>
                    <div className="truncate flex-1">
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{label}</div>
                      <div className={`truncate font-semibold ${isEquipped ? "text-cyan-300" : "text-slate-600"}`}>
                        {isEquipped ? itemName.replace(/_/g, " ") : "Empty"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Real Live 9-Slot Hotbar & Equipment Selector */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-300">Live Hotbar Inventory (Slots 0 - 8)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                Active: Slot {player.selectedSlot} ({player.hotbar[player.selectedSlot]?.item?.replace("minecraft:", "") || "Empty"})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onDispatchAction({ type: "request_cube_map", radius: 3 })}
                className="px-2 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-[10px] font-mono border border-indigo-800 flex items-center gap-1 font-bold"
                title="Scan surrounding 3D block cube"
              >
                <RotateCw className="h-3 w-3 text-indigo-400" />
                <span>Scan 3D Cube</span>
              </button>

              <button
                type="button"
                onClick={() => onDispatchAction({ type: "drop_item", all: false })}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-mono border border-slate-700"
                title="Drop held item (Q)"
              >
                Drop Item (Q)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-9 gap-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
            {player.hotbar.map((slot) => {
              const isSelected = player.selectedSlot === slot.slot;
              const cleanItem = (slot.item || "minecraft:air").replace("minecraft:", "");
              const hasItem = cleanItem !== "air" && slot.count > 0;

              // Categorize item for color badges
              let itemBadgeColor = "text-slate-300";
              if (cleanItem.includes("pickaxe") || cleanItem.includes("axe") || cleanItem.includes("shovel")) {
                itemBadgeColor = "text-amber-400";
              } else if (cleanItem.includes("sword") || cleanItem.includes("bow")) {
                itemBadgeColor = "text-rose-400";
              } else if (cleanItem.includes("beef") || cleanItem.includes("bread") || cleanItem.includes("apple") || cleanItem.includes("food")) {
                itemBadgeColor = "text-emerald-400";
              } else if (cleanItem.includes("bucket") || cleanItem.includes("torch") || cleanItem.includes("flint")) {
                itemBadgeColor = "text-cyan-400";
              }

              return (
                <button
                  key={slot.slot}
                  type="button"
                  onClick={() => onDispatchAction({ type: "select_hotbar", slot: slot.slot })}
                  className={`relative flex flex-col items-center justify-center h-16 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-slate-800/90 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20"
                      : "bg-slate-900 hover:bg-slate-850 border-slate-750"
                  }`}
                  title={`Slot ${slot.slot + 1}: ${cleanItem} (x${slot.count})`}
                >
                  <span className="absolute top-1 left-1 text-[9px] font-mono font-bold text-slate-500">
                    {slot.slot + 1}
                  </span>
                  {hasItem ? (
                    <>
                      <div className={`text-[11px] font-mono truncate max-w-[90%] font-bold ${itemBadgeColor}`}>
                        {cleanItem}
                      </div>
                      <span className="absolute bottom-1 right-1 text-[10px] font-mono font-extrabold text-emerald-300 bg-slate-950/80 px-1 rounded">
                        x{slot.count}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-mono">-</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inventory -> Hotbar Quick Move (move_slot / move_to_hotbar action packets) */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeftRight className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-mono font-bold text-slate-300">Inventory → Hotbar Moves</span>
            <span className="text-[10px] font-mono text-slate-500">(slots 9–35 main storage → hotbar 0–8)</span>
          </div>

          {(player.inventory && player.inventory.length > 0) ? (
            <div className="grid grid-cols-9 gap-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              {player.inventory
                .filter((s) => s.slot >= 9 && s.slot <= 35 && s.item !== "minecraft:air" && s.count > 0)
                .slice(0, 18)
                .map((slot) => (
                  <button
                    key={slot.slot}
                    type="button"
                    onClick={() => {
                      onDispatchAction({
                        type: "move_to_hotbar",
                        item: slot.item,
                        slot: moveTargetHotbarSlot,
                        swap: true,
                      });
                    }}
                    className="relative flex flex-col items-center justify-center h-12 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 transition-all cursor-pointer"
                    title={`Move ${slot.item} (slot ${slot.slot}) to hotbar slot ${moveTargetHotbarSlot}`}
                  >
                    <span className="absolute top-0.5 left-1 text-[8px] font-mono text-slate-500">{slot.slot}</span>
                    <span className="text-[9px] font-mono truncate max-w-[90%] text-slate-200">
                      {slot.item.replace("minecraft:", "")}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-amber-300">x{slot.count}</span>
                  </button>
                ))}
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] font-mono text-slate-500">
              No main-inventory telemetry yet (requires full inventory export from /api/state).
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[10px] font-mono text-slate-400">Destination hotbar slot:</span>
            {Array.from({ length: 9 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setMoveTargetHotbarSlot(i)}
                className={`w-7 h-7 rounded font-mono text-[11px] font-bold border transition-all ${
                  moveTargetHotbarSlot === i
                    ? "bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-400/40"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const from = Number(moveFromRaw);
                const to = Number(moveToRaw);
                if (Number.isFinite(from) && Number.isFinite(to)) {
                  onDispatchAction({ type: "move_slot", from_slot: from, to_slot: to, swap: true });
                }
              }}
              className="ml-auto px-2 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-[10px] font-mono border border-indigo-800 font-bold"
              title="Move any slot to any slot (raw vanilla slot ids)"
            >
              Raw move_slot
            </button>
            <input
              value={moveFromRaw}
              onChange={(e) => setMoveFromRaw(e.target.value)}
              placeholder="from"
              className="w-14 px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-200"
            />
            <input
              value={moveToRaw}
              onChange={(e) => setMoveToRaw(e.target.value)}
              placeholder="to"
              className="w-14 px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
