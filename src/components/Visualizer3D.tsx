import React, { useRef, useEffect, useState } from "react";
import { PlayerState, RaycastTarget, SchematicDiffItem, EntityState, AgentInstance, TemporaryScaffoldBlock } from "../types";
import { Eye, Compass, Box, RefreshCw, ZoomIn, ZoomOut, RotateCcw, Users } from "lucide-react";

interface Visualizer3DProps {
  player: PlayerState;
  raycast: RaycastTarget;
  schematicDiffs: SchematicDiffItem[];
  entities: EntityState[];
  selectedSlot: number;
  allAgents?: AgentInstance[];
  activeAgentId?: string;
  onSelectAgent?: (id: string) => void;
  temporaryScaffolds?: TemporaryScaffoldBlock[];
}

export const Visualizer3D: React.FC<Visualizer3DProps> = ({
  player,
  raycast,
  schematicDiffs,
  entities,
  allAgents = [],
  activeAgentId,
  onSelectAgent,
  temporaryScaffolds = [],
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 400 });
  const [viewAngle, setViewAngle] = useState({ yaw: 45, pitch: 30 });
  const [zoom, setZoom] = useState(24);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [cameraMode, setCameraMode] = useState<"isometric" | "topdown" | "follow">("isometric");

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setDimensions({
            width: Math.floor(entry.contentRect.width),
            height: Math.floor(entry.contentRect.height) || 400,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    setViewAngle((prev) => ({
      yaw: (prev.yaw + dx * 0.5) % 360,
      pitch: Math.max(5, Math.min(85, prev.pitch + dy * 0.5)),
    }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = dimensions.width);
    let height = (canvas.height = dimensions.height);

    // Clear canvas
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2 + 30;

    // View rotation math
    const curPitch = cameraMode === "topdown" ? 89 : viewAngle.pitch;
    const curYaw = cameraMode === "follow" ? player.yaw : viewAngle.yaw;

    const radYaw = (curYaw * Math.PI) / 180;
    const radPitch = (curPitch * Math.PI) / 180;

    const cosY = Math.cos(radYaw);
    const sinY = Math.sin(radYaw);
    const cosP = Math.cos(radPitch);
    const sinP = Math.sin(radPitch);

    // 3D projection function relative to player center
    const project = (x: number, y: number, z: number) => {
      const relX = x - player.x;
      const relY = y - player.y;
      const relZ = z - player.z;

      // Rotate around Y
      const rx = relX * cosY - relZ * sinY;
      const rz = relX * sinY + relZ * cosY;

      // Rotate around X (pitch)
      const ry = relY * cosP - rz * sinP;
      const depth = relY * sinP + rz * cosP;

      const scale = zoom;
      const screenX = centerX + rx * scale;
      const screenY = centerY - ry * scale;

      return { x: screenX, y: screenY, depth };
    };

    // Draw grid plane at player base Y
    ctx.strokeStyle = "rgba(30, 41, 59, 0.6)";
    ctx.lineWidth = 1;
    const gridSize = 10;
    for (let gx = -gridSize; gx <= gridSize; gx++) {
      const p1 = project(player.x + gx, player.y, player.z - gridSize);
      const p2 = project(player.x + gx, player.y, player.z + gridSize);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let gz = -gridSize; gz <= gridSize; gz++) {
      const p1 = project(player.x - gridSize, player.y, player.z + gz);
      const p2 = project(player.x + gridSize, player.y, player.z + gz);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Helper to get real visual material appearance
    const getMaterialStyle = (blockId: string) => {
      const b = (blockId || "").toLowerCase().replace(/^minecraft:/, "");
      if (b.includes("log") || b.includes("wood")) return { fill: "#78350f", stroke: "#451a03", label: "LOG" };
      if (b.includes("plank") || b.includes("stairs") || b.includes("slab")) return { fill: "#b45309", stroke: "#78350f", label: "PLANK" };
      if (b.includes("glass")) return { fill: "rgba(56, 189, 248, 0.35)", stroke: "#38bdf8", label: "GLASS" };
      if (b.includes("stone_brick") || b.includes("brick")) return { fill: "#64748b", stroke: "#334155", label: "BRICK" };
      if (b.includes("cobble") || b.includes("stone")) return { fill: "#94a3b8", stroke: "#475569", label: "STONE" };
      if (b.includes("door") || b.includes("trapdoor")) return { fill: "#92400e", stroke: "#713f12", label: "DOOR" };
      if (b.includes("lantern") || b.includes("torch")) return { fill: "#fde047", stroke: "#ca8a04", label: "LIGHT" };
      if (b.includes("wool") || b.includes("carpet") || b.includes("bed")) return { fill: "#ef4444", stroke: "#991b1b", label: "INTERIOR" };
      return { fill: "#475569", stroke: "#1e293b", label: b.slice(0, 5).toUpperCase() };
    };

    // Draw Litematica Schematic Voxels
    schematicDiffs.forEach((diff) => {
      const p = project(diff.x + 0.5, diff.y + 0.5, diff.z + 0.5);
      const s = zoom * 0.82;
      const mat = getMaterialStyle(diff.expectedBlock);

      if (diff.type === "MISSING") {
        // Holographic missing block outline tinted by expected material
        ctx.strokeStyle = mat.stroke;
        ctx.fillStyle = mat.fill.startsWith("rgba") ? mat.fill : `${mat.fill}22`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        ctx.setLineDash([]);
      } else if (diff.type === "MISPLACED") {
        // Red misplaced block with cross
        ctx.strokeStyle = "rgba(239, 68, 68, 0.95)";
        ctx.fillStyle = "rgba(239, 68, 68, 0.45)";
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        ctx.beginPath();
        ctx.moveTo(p.x - s / 2, p.y - s / 2);
        ctx.lineTo(p.x + s / 2, p.y + s / 2);
        ctx.moveTo(p.x + s / 2, p.y - s / 2);
        ctx.lineTo(p.x - s / 2, p.y + s / 2);
        ctx.stroke();
      } else if (diff.type === "CORRECT") {
        // Real material solid placed block with green verified corner
        ctx.fillStyle = mat.fill;
        ctx.strokeStyle = mat.stroke;
        ctx.lineWidth = 1;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);

        ctx.fillStyle = "#10b981";
        ctx.fillRect(p.x - s / 2, p.y - s / 2, 3, 3);
      }
    });

    // Draw Temporary Scaffolding Blocks (placed dynamically to reach high sections)
    temporaryScaffolds.forEach((scaf) => {
      const p = project(scaf.x + 0.5, scaf.y + 0.5, scaf.z + 0.5);
      const s = zoom * 0.85;

      ctx.fillStyle = "rgba(245, 158, 11, 0.4)";
      ctx.strokeStyle = "rgba(245, 158, 11, 0.95)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 2]);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
      ctx.setLineDash([]);

      // Draw scaffold cross braces
      ctx.beginPath();
      ctx.moveTo(p.x - s / 2, p.y - s / 2);
      ctx.lineTo(p.x + s / 2, p.y + s / 2);
      ctx.moveTo(p.x + s / 2, p.y - s / 2);
      ctx.lineTo(p.x - s / 2, p.y + s / 2);
      ctx.stroke();

      ctx.fillStyle = "#fde68a";
      ctx.font = "9px monospace";
      ctx.fillText("SCAFFOLD", p.x - 22, p.y - s / 2 - 3);
    });

    // Draw Nearby Entities
    entities.forEach((ent) => {
      const ep = project(ent.x, ent.y + 0.9, ent.z);
      ctx.fillStyle = ent.type.includes("zombie") ? "#ef4444" : "#f59e0b";
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "10px monospace";
      ctx.fillText(ent.type.replace("minecraft:", ""), ep.x + 8, ep.y + 3);
    });

    // Draw ALL Agents in the Swarm
    const renderAgents = allAgents.length > 0 ? allAgents : [
      {
        id: "active",
        name: "Agent_1",
        role: "Builder" as const,
        status: "building" as const,
        color: "#10b981",
        port: 8080,
        player,
        raycast,
        currentTask: "Active Focus",
        lastThought: ""
      }
    ];

    renderAgents.forEach((agent) => {
      const pState = agent.player;
      const isFocused = agent.id === activeAgentId || (allAgents.length === 0);
      const agentBase = project(pState.x, pState.y, pState.z);
      const agentEyes = project(pState.x, pState.y + 1.62, pState.z);
      const agentColor = agent.color || "#10b981";

      // Base footprint ring
      ctx.beginPath();
      ctx.arc(agentBase.x, agentBase.y, isFocused ? 10 : 7, 0, Math.PI * 2);
      ctx.fillStyle = isFocused ? "rgba(16, 185, 129, 0.25)" : "rgba(100, 116, 139, 0.2)";
      ctx.fill();
      ctx.strokeStyle = agentColor;
      ctx.lineWidth = isFocused ? 2 : 1;
      ctx.stroke();

      // Agent body column
      ctx.strokeStyle = agentColor;
      ctx.lineWidth = isFocused ? 6 : 4;
      ctx.beginPath();
      ctx.moveTo(agentBase.x, agentBase.y);
      ctx.lineTo(agentEyes.x, agentEyes.y);
      ctx.stroke();

      // Agent Head
      ctx.fillStyle = agentColor;
      ctx.beginPath();
      ctx.arc(agentEyes.x, agentEyes.y, isFocused ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#022c22";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Look Vector
      const pYawRad = (-pState.yaw * Math.PI) / 180 - Math.PI / 2;
      const pPitchRad = (-pState.pitch * Math.PI) / 180;
      const lookDist = isFocused ? 4.5 : 3.0;

      const lookX = pState.x + Math.cos(pPitchRad) * Math.cos(pYawRad) * lookDist;
      const lookY = pState.y + 1.62 + Math.sin(pPitchRad) * lookDist;
      const lookZ = pState.z + Math.cos(pPitchRad) * Math.sin(pYawRad) * lookDist;
      const lookEnd = project(lookX, lookY, lookZ);

      ctx.strokeStyle = isFocused ? "rgba(250, 204, 21, 0.9)" : "rgba(148, 163, 184, 0.6)";
      ctx.lineWidth = isFocused ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(agentEyes.x, agentEyes.y);
      ctx.lineTo(lookEnd.x, lookEnd.y);
      ctx.stroke();

      if (isFocused) {
        // Raycast hit marker for focused agent
        ctx.fillStyle = "#eab308";
        ctx.beginPath();
        ctx.arc(lookEnd.x, lookEnd.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nameplate Billboard (Minecraft style)
      const nameplateY = agentEyes.y - (isFocused ? 18 : 14);
      const label = `${agent.name} [${agent.role}]`;
      ctx.font = "bold 10px monospace";
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(agentEyes.x - textWidth / 2 - 4, nameplateY - 11, textWidth + 8, 14);
      ctx.strokeStyle = isFocused ? agentColor : "rgba(71, 85, 105, 0.8)";
      ctx.lineWidth = 1;
      ctx.strokeRect(agentEyes.x - textWidth / 2 - 4, nameplateY - 11, textWidth + 8, 14);

      ctx.fillStyle = isFocused ? "#34d399" : "#cbd5e1";
      ctx.fillText(label, agentEyes.x - textWidth / 2, nameplateY);
    });

    // HUD overlay inside canvas
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fillRect(10, 10, 220, 80);
    ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
    ctx.strokeRect(10, 10, 220, 80);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "11px monospace";
    ctx.fillText(`XYZ: ${player.x.toFixed(1)}, ${player.y.toFixed(1)}, ${player.z.toFixed(1)}`, 20, 28);
    ctx.fillText(`YAW/PITCH: ${player.yaw.toFixed(1)}° / ${player.pitch.toFixed(1)}°`, 20, 46);
    ctx.fillText(`TARGET: ${raycast.type === "BLOCK" ? raycast.block?.replace("minecraft:", "") : raycast.type}`, 20, 64);
    if (allAgents.length > 1) {
      ctx.fillStyle = "#a7f3d0";
      ctx.fillText(`SWARM: ${allAgents.length} Agents Synchronized`, 20, 80);
    }
  }, [player, raycast, schematicDiffs, entities, viewAngle, zoom, cameraMode, allAgents, activeAgentId]);

  return (
    <div className="relative w-full rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
      {/* Visualizer Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">3D Voxel Stage & Multi-Agent Swarm</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono">Fabric 26.2 (50ms tick)</span>
        </div>

        {/* Camera Modes & Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCameraMode("isometric")}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
              cameraMode === "isometric" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-slate-850 hover:bg-slate-800 text-slate-400"
            }`}
          >
            Iso
          </button>
          <button
            onClick={() => setCameraMode("topdown")}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
              cameraMode === "topdown" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-slate-850 hover:bg-slate-800 text-slate-400"
            }`}
          >
            Top-Down
          </button>
          <button
            onClick={() => setCameraMode("follow")}
            className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
              cameraMode === "follow" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-slate-850 hover:bg-slate-800 text-slate-400"
            }`}
          >
            Follow Cam
          </button>

          <div className="h-3 w-px bg-slate-700 mx-1" />

          <button
            onClick={() => setZoom((z) => Math.min(48, z + 4))}
            className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-300"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(12, z - 4))}
            className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-300"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setViewAngle({ yaw: 45, pitch: 30 });
              setZoom(24);
            }}
            className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-300"
            title="Reset Angle"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div ref={containerRef} className="relative w-full h-[400px]">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-grab active:cursor-grabbing block rounded-b-xl"
        />

        {/* Legend */}
        <div className="absolute bottom-3 right-3 flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            <span>Active Bot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-cyan-400" />
            <span>Swarm Unit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-yellow-400" />
            <span>Raycast Aim</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm border border-dashed border-sky-400 bg-sky-400/20" />
            <span>Schematic Diff</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
            <span>Mob/Target</span>
          </div>
        </div>
      </div>
    </div>
  );
};

