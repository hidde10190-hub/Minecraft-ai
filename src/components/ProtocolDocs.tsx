import React, { useState } from "react";
import { Terminal, Send, Check, ShieldCheck, Zap, Globe, Key } from "lucide-react";
import { ActionPacket } from "../types";

interface ProtocolDocsProps {
  onDispatchAction: (action: ActionPacket) => void;
  onSetSession: (username: string, isMsa: boolean) => void;
  currentUsername: string;
}

export const ProtocolDocs: React.FC<ProtocolDocsProps> = ({
  onDispatchAction,
  onSetSession,
  currentUsername,
}) => {
  const [testUsername, setTestUsername] = useState("Agent_007");
  const [isMsa, setIsMsa] = useState(false);
  const [customJson, setCustomJson] = useState(`{
  "type": "look_at",
  "x": 105.5,
  "y": 65.0,
  "z": 22.5,
  "ticks": 5
}`);
  const [jsonStatus, setJsonStatus] = useState<string | null>(null);

  const handleSendCustomJson = () => {
    try {
      const parsed = JSON.parse(customJson);
      onDispatchAction(parsed);
      setJsonStatus("Packet dispatched successfully to virtual input queue!");
      setTimeout(() => setJsonStatus(null), 3000);
    } catch (e: any) {
      setJsonStatus(`JSON Parse Error: ${e.message}`);
    }
  };

  const handleSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUsername.trim()) return;
    onSetSession(testUsername.trim(), isMsa);
  };

  return (
    <div className="space-y-6">
      {/* IPC Protocol Architecture Overview */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
          <Terminal className="h-5 w-5 text-emerald-400" />
          <h2 className="text-base font-bold text-slate-100">IPC Protocol & Session Auth Specification</h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          The Minecraft-AI-Bridge exposes a low-latency bi-directional WebSocket interface (<code className="text-emerald-400">ws://localhost:8080/ws</code>) and companion REST API (<code className="text-emerald-400">http://localhost:8080/api</code>). Telemetry frames are streamed at 20Hz (tick-rate synchronized).
        </p>

        {/* Endpoints Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Protocol</th>
                <th className="py-2.5 px-3">Endpoint</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              <tr>
                <td className="py-2 px-3 text-sky-400 font-bold">WS</td>
                <td className="py-2 px-3 text-slate-100 font-semibold">/ws</td>
                <td className="py-2 px-3 text-amber-400">Bi-directional</td>
                <td className="py-2 px-3">Streams 20Hz telemetry JSON to Python; accepts input action packets.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                <td className="py-2 px-3 text-slate-100 font-semibold">/api/telemetry</td>
                <td className="py-2 px-3 text-emerald-400">Java &rarr; Client</td>
                <td className="py-2 px-3">Instant snapshot of player coordinates, health, hotbar, and raycast.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                <td className="py-2 px-3 text-slate-100 font-semibold">/api/litematica/diff</td>
                <td className="py-2 px-3 text-emerald-400">Java &rarr; Client</td>
                <td className="py-2 px-3">Missing & misplaced schematic voxels sorted by distance to player.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-emerald-400 font-bold">GET</td>
                <td className="py-2 px-3 text-slate-100 font-semibold">/api/recipes</td>
                <td className="py-2 px-3 text-emerald-400">Java &rarr; Client</td>
                <td className="py-2 px-3">Every built-in crafting recipe from the game's own RecipeManager (id, result item/count, grid ingredients).</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-purple-400 font-bold">POST</td>
                <td className="py-2 px-3 text-slate-100 font-semibold">/api/action</td>
                <td className="py-2 px-3 text-purple-400">Client &rarr; Java</td>
                <td className="py-2 px-3">Enqueues virtual keybinding or camera rotation packet onto game thread.</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-purple-400 font-bold">WS</td>
                <td className="py-2 px-3 text-slate-100 font-semibold">move_slot / move_to_hotbar</td>
                <td className="py-2 px-3 text-purple-400">Client &rarr; Java</td>
                <td className="py-2 px-3">
                  Move a real ItemStack between player inventory slots. Vanilla slot ids: 0&ndash;8 hotbar, 9&ndash;35 main, 36&ndash;39 armor, 40 offhand.{" "}
                  <span className="font-mono text-[10px]">{`{"type":"move_slot","from_slot":12,"to_slot":0,"swap":true}`}</span>{" "}
                  or <span className="font-mono text-[10px]">{`{"type":"move_to_hotbar","item":"minecraft:diamond_pickaxe","slot":3}`}</span>.
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-purple-400 font-bold">WS</td>
                <td className="py-2 px-3 text-slate-100 font-semibold">equip_item</td>
                <td className="py-2 px-3 text-purple-400">Client &rarr; Java</td>
                <td className="py-2 px-3">Equips an armor item by id into the correct armor slot, swapping the old piece back into the inventory. <span className="font-mono text-[10px]">{`{"type":"equip_item","item":"minecraft:diamond_chestplate"}`}</span></td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-purple-400 font-bold">WS</td>
                <td className="py-2 px-3 text-slate-100 font-semibold">craft</td>
                <td className="py-2 px-3 text-purple-400">Client &rarr; Java</td>
                <td className="py-2 px-3">
                  Crafts any recipe using the game's BUILT-IN recipe book. Accepts a recipe id or a result item id; the MOD locates a crafting table if needed, fills the grid from inventory and collects the output.{" "}
                  <span className="font-mono text-[10px]">{`{"type":"craft","recipe":"minecraft:chest"}`}</span>
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-purple-400 font-bold">POST</td>
                <td className="py-2 px-3 text-slate-100 font-semibold">/api/auth/session</td>
                <td className="py-2 px-3 text-purple-400">Client &rarr; Java</td>
                <td className="py-2 px-3">Dynamically swaps Session object (Offline UUID or MSA token).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Grid: Interactive Packet Dispatcher & Session Switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raw JSON Packet Tester */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">Raw Packet Dispatcher</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Direct IPC Simulation</span>
            </div>

            <p className="text-xs text-slate-400 mb-2 font-mono">
              Send raw action JSON over the bridge to test player reaction:
            </p>

            <textarea
              rows={8}
              value={customJson}
              onChange={(e) => setCustomJson(e.target.value)}
              className="w-full bg-[#090d16] border border-slate-750 rounded-lg p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-400 scrollbar-thin"
            />

            {jsonStatus && (
              <div className={`mt-2 p-2 rounded text-xs font-mono ${
                jsonStatus.includes("Error") ? "bg-red-950 text-red-300 border border-red-800" : "bg-emerald-950 text-emerald-300 border border-emerald-800"
              }`}>
                {jsonStatus}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setCustomJson(`{\n  "type": "look_at",\n  "x": 102.5,\n  "y": 64.5,\n  "z": 24.5,\n  "ticks": 5\n}`)}
                className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300"
              >
                look_at
              </button>
              <button
                type="button"
                onClick={() => setCustomJson(`{\n  "type": "press_key",\n  "key": "w",\n  "duration_ms": 500\n}`)}
                className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300"
              >
                press_key
              </button>
              <button
                type="button"
                onClick={() => setCustomJson(`{\n  "type": "select_hotbar",\n  "slot": 1\n}`)}
                className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300"
              >
                select_hotbar
              </button>
              <button
                type="button"
                onClick={() => setCustomJson(`{\n  "type": "move_slot",\n  "from_slot": 12,\n  "to_slot": 0,\n  "swap": true\n}`)}
                className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-amber-300"
              >
                move_slot
              </button>
              <button
                type="button"
                onClick={() => setCustomJson(`{\n  "type": "move_to_hotbar",\n  "item": "minecraft:diamond_pickaxe",\n  "slot": 0\n}`)}
                className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-amber-300"
              >
                move_to_hotbar
              </button>
              <button
                type="button"
                onClick={() => setCustomJson(`{\n  "type": "craft",\n  "recipe": "minecraft:chest"\n}`)}
                className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-emerald-300"
              >
                craft
              </button>
            </div>

            <button
              onClick={handleSendCustomJson}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs font-mono transition-colors shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              Dispatch Packet
            </button>
          </div>
        </div>

        {/* Multi-Auth & Session Switcher */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-slate-200">Multi-Auth & Session Switcher</h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                SessionManager.java
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Mutates <code className="text-sky-300">MinecraftClient.session</code> dynamically via Mixin, supporting both cracked/unauthenticated offline servers and MSA authenticated OAuth sessions without relaunching Minecraft.
            </p>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-850 text-xs font-mono mb-4">
              <div className="text-slate-400">Current Injected Identity:</div>
              <div className="text-emerald-400 font-bold text-sm mt-0.5">{currentUsername}</div>
              <div className="text-slate-500 text-[11px] mt-1">
                UUID: OfflinePlayer:{currentUsername} (Type: {isMsa ? "MSA" : "OFFLINE/MOJANG"})
              </div>
            </div>

            <form onSubmit={handleSessionSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Target Username:
                </label>
                <input
                  type="text"
                  value={testUsername}
                  onChange={(e) => setTestUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-750 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="msaCheck"
                  checked={isMsa}
                  onChange={(e) => setIsMsa(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-750 text-sky-500 focus:ring-0"
                />
                <label htmlFor="msaCheck" className="text-xs font-mono text-slate-300 cursor-pointer">
                  Simulate Microsoft Account (MSA OAuth) Session Token
                </label>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-slate-950 font-semibold text-xs font-mono transition-colors shadow-sm"
              >
                <ShieldCheck className="h-4 w-4" />
                Inject Session into MinecraftClient
              </button>
            </form>
          </div>

          <div className="text-[11px] text-slate-500 font-mono mt-3 pt-3 border-t border-slate-800">
            * Session mutation is performed on the game thread to avoid network race conditions.
          </div>
        </div>
      </div>
    </div>
  );
};
