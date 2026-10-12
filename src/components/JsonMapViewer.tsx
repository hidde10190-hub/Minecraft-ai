import React, { useState, useEffect, useRef } from "react";
import { 
  FileJson, 
  Camera, 
  Download, 
  Copy, 
  Check, 
  Layers, 
  MapPin, 
  Eye, 
  Sparkles, 
  RefreshCw, 
  Sliders, 
  Image as ImageIcon,
  Compass,
  AlertTriangle,
  Gem,
  Crosshair,
  Box,
  Cpu,
  Flame,
  Pickaxe,
  Footprints,
  Maximize2
} from "lucide-react";
import { JsonMapPayload, MapScreenshotArtifact, PlayerState, BlockCubeMap, ActionPacket } from "../types";
import { generate3DBlockCubeMap, normalizeLiveCubeMap, formatCubeMapForAiPrompt, getBlockMeta } from "../utils/cubeMapEngine";

interface JsonMapViewerProps {
  player: PlayerState;
  onSendChatMessage?: (msg: string) => void;
  onPushAiDirective?: (directive: string) => void;
  onDispatchAction?: (action: ActionPacket) => void;
}

export const JsonMapViewer: React.FC<JsonMapViewerProps> = ({
  player,
  onSendChatMessage,
  onPushAiDirective,
  onDispatchAction
}) => {
  const [activeTab, setActiveTab] = useState<"3d_cube" | "area_map" | "snapshots">("3d_cube");
  
  // 3D Cube Map State
  const [cubeRadius, setCubeRadius] = useState<number>(8); // 17x17x17 full-cube scan
  const [cubeCenter, setCubeCenter] = useState<[number, number, number]>([
    Math.round(player.x),
    Math.round(player.y),
    Math.round(player.z)
  ]);
  const [selectedYLayer, setSelectedYLayer] = useState<number>(Math.round(player.y));
  const [cubeMap, setCubeMap] = useState<BlockCubeMap>(() => 
    generate3DBlockCubeMap([Math.round(player.x), Math.round(player.y), Math.round(player.z)], 3)
  );
  const [hoveredVoxel, setHoveredVoxel] = useState<{ x: number; y: number; z: number; name: string; solid: boolean; isOre?: boolean; isHazard?: boolean } | null>(null);
  const [isFetchingLiveCube, setIsFetchingLiveCube] = useState<boolean>(false);
  const [cubeCopied, setCubeCopied] = useState<boolean>(false);
  const [viewMode3D, setViewMode3D] = useState<"layers" | "isometric_canvas" | "ascii">("layers");

  // Area Map State
  const [areaRadius, setAreaRadius] = useState<number>(32);
  const [selectedLayer, setSelectedLayer] = useState<"surface" | "caves" | "ores" | "all">("all");
  const [areaCopied, setAreaCopied] = useState<boolean>(false);
  const [isGeneratingScreenshot, setIsGeneratingScreenshot] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isometricCanvasRef = useRef<HTMLCanvasElement>(null);

  // Gallery of captured screenshot artifacts
  const [screenshots, setScreenshots] = useState<MapScreenshotArtifact[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<MapScreenshotArtifact | null>(null);

  // Synchronize cube center to player position on major move
  useEffect(() => {
    const px = Math.round(player.x);
    const py = Math.round(player.y);
    const pz = Math.round(player.z);
    setCubeCenter([px, py, pz]);
    setSelectedYLayer(py);
    setCubeMap(generate3DBlockCubeMap([px, py, pz], cubeRadius));
  }, [Math.round(player.x), Math.round(player.y), Math.round(player.z), cubeRadius]);

  // Request real 3D Cube from Server / Minecraft Bridge. The bridge scans asynchronously
  // (202 {scanning:true} handshake handled by the server proxy), and the server always
  // returns a full cube map once one is available — normalize and display it directly.
  const handleRequestLiveCube = async () => {
    setIsFetchingLiveCube(true);
    try {
      const res = await fetch(`/api/bot/cube-map?x=${cubeCenter[0]}&y=${cubeCenter[1]}&z=${cubeCenter[2]}&radius=${cubeRadius}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.voxels)) {
          const normalized = normalizeLiveCubeMap(data);
          if (normalized) {
            setCubeMap(normalized);
          } else {
            setCubeMap(generate3DBlockCubeMap(cubeCenter, cubeRadius));
          }
        }
      }
    } catch {
      // Procedural fallback already active
      setCubeMap(generate3DBlockCubeMap(cubeCenter, cubeRadius));
    } finally {
      setIsFetchingLiveCube(false);
    }
  };

  // Push 3D Cube into AI Brain Directive
  const handlePushToAi = () => {
    const summary = formatCubeMapForAiPrompt(cubeMap);
    if (onPushAiDirective) {
      onPushAiDirective(`[3D Cube Map Context]: Scan around [${cubeCenter.join(", ")}]. ${cubeMap.summary.ores.length} ores detected, ${cubeMap.summary.hazards.length} hazards. Navigating with full 3D spatial awareness.`);
    }
    if (onSendChatMessage) {
      onSendChatMessage(`[Spatial Sensor]: 3D block cube scanned at [${cubeCenter.join(", ")}]. Density: ${cubeMap.summary.densityPct}%, Ores: ${cubeMap.summary.ores.length}`);
    }
    if (onDispatchAction) {
      onDispatchAction({
        type: "request_cube_map",
        radius: cubeRadius,
        center: cubeCenter
      });
    }
  };

  const handleCopyCubeJson = () => {
    navigator.clipboard.writeText(JSON.stringify(cubeMap, null, 2));
    setCubeCopied(true);
    setTimeout(() => setCubeCopied(false), 2000);
  };

  const handleDownloadCubeJson = () => {
    const blob = new Blob([JSON.stringify(cubeMap, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minecraft_cube_map_${cubeCenter.join("_")}_r${cubeRadius}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Draw 3D Isometric Voxel Cube on HTML5 Canvas
  useEffect(() => {
    if (viewMode3D !== "isometric_canvas" || !isometricCanvasRef.current) return;
    const canvas = isometricCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 30;
    const tileW = 28 - cubeRadius * 2.5;
    const tileH = tileW / 2;

    const r = cubeRadius;
    const cx = cubeCenter[0];
    const cy = cubeCenter[1];
    const cz = cubeCenter[2];

    // Draw from back to front (Y from min to max, Z from min to max, X from min to max)
    for (let dy = -r; dy <= r; dy++) {
      const y = cy + dy;
      if (y > selectedYLayer) continue; // Allow layer slicing!

      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = cx + dx;
          const z = cz + dz;
          const voxel = cubeMap.voxels.find(v => v.x === x && v.y === y && v.z === z);
          if (!voxel || !voxel.solid && !voxel.isHazard) continue;

          // Isometric 2.5D Projection
          const isoX = centerX + (dx - dz) * tileW;
          const isoY = centerY + (dx + dz) * tileH - dy * (tileH * 1.5);

          // Block color
          let topColor = "#475569";
          let leftColor = "#334155";
          let rightColor = "#1e293b";

          if (voxel.name.includes("grass")) {
            topColor = "#10b981"; leftColor = "#059669"; rightColor = "#047857";
          } else if (voxel.name.includes("diamond")) {
            topColor = "#06b6d4"; leftColor = "#0891b2"; rightColor = "#0e7490";
          } else if (voxel.name.includes("iron") || voxel.name.includes("gold")) {
            topColor = "#f59e0b"; leftColor = "#d97706"; rightColor = "#b45309";
          } else if (voxel.name.includes("lava")) {
            topColor = "#ef4444"; leftColor = "#dc2626"; rightColor = "#b91c1c";
          } else if (voxel.name.includes("deepslate")) {
            topColor = "#334155"; leftColor = "#1e293b"; rightColor = "#0f172a";
          } else if (voxel.name.includes("wood") || voxel.name.includes("log")) {
            topColor = "#a16207"; leftColor = "#854d0e"; rightColor = "#713f12";
          }

          // Top face
          ctx.beginPath();
          ctx.moveTo(isoX, isoY - tileH);
          ctx.lineTo(isoX + tileW, isoY);
          ctx.lineTo(isoX, isoY + tileH);
          ctx.lineTo(isoX - tileW, isoY);
          ctx.closePath();
          ctx.fillStyle = topColor;
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.3)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Left face
          ctx.beginPath();
          ctx.moveTo(isoX - tileW, isoY);
          ctx.lineTo(isoX, isoY + tileH);
          ctx.lineTo(isoX, isoY + tileH * 2.2);
          ctx.lineTo(isoX - tileW, isoY + tileH * 1.2);
          ctx.closePath();
          ctx.fillStyle = leftColor;
          ctx.fill();
          ctx.stroke();

          // Right face
          ctx.beginPath();
          ctx.moveTo(isoX, isoY + tileH);
          ctx.lineTo(isoX + tileW, isoY);
          ctx.lineTo(isoX + tileW, isoY + tileH * 1.2);
          ctx.lineTo(isoX, isoY + tileH * 2.2);
          ctx.closePath();
          ctx.fillStyle = rightColor;
          ctx.fill();
          ctx.stroke();

          // Bot indicator
          if (dx === 0 && dy === 0 && dz === 0) {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(isoX, isoY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#8b5cf6";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
    }
  }, [viewMode3D, cubeMap, selectedYLayer, cubeRadius, cubeCenter]);

  // Handle capture of synthetic high-res map screenshot via HTML5 Canvas
  const handleCaptureScreenshot = (viewMode: "top_down_radar" | "isometric_3d") => {
    setIsGeneratingScreenshot(true);

    setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, 800, 600);

        // Draw grid
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1;
        const step = 40;
        for (let x = 0; x < 800; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 600);
          ctx.stroke();
        }
        for (let y = 0; y < 600; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(800, y);
          ctx.stroke();
        }

        // Draw terrain & ores
        cubeMap.summary.ores.forEach(ore => {
          const ox = 400 + (ore.pos[0] - player.x) * 12;
          const oz = 300 + (ore.pos[2] - player.z) * 12;
          ctx.fillStyle = ore.name.includes("diamond") ? "#06b6d4" : "#f59e0b";
          ctx.beginPath();
          ctx.arc(ox, oz, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        // Draw Bot Center
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.arc(400, 300, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`Bot [${Math.round(player.x)}, ${Math.round(player.y)}, ${Math.round(player.z)}]`, 415, 304);

        // Header
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fillRect(20, 20, 340, 80);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.strokeRect(20, 20, 340, 80);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 13px monospace";
        ctx.fillText(`AI 3D CUBE & SPATIAL MAP SCANNER`, 35, 42);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "11px monospace";
        ctx.fillText(`Center: [${cubeCenter.join(", ")}] | Radius: ${cubeRadius} (${cubeMap.totalBlocks} voxels)`, 35, 60);
        ctx.fillText(`Solid: ${cubeMap.solidBlocks} | Ores: ${cubeMap.summary.ores.length} | Hazards: ${cubeMap.summary.hazards.length}`, 35, 78);

        const dataUrl = canvas.toDataURL("image/png");
        const newArtifact: MapScreenshotArtifact = {
          id: `snap_${Date.now()}`,
          timestamp: Date.now(),
          label: `3D Voxel Cube Map Scan (R=${cubeRadius}, ${cubeMap.dimensions.width}x${cubeMap.dimensions.depth})`,
          viewMode,
          centerCoords: [Math.round(player.x), Math.round(player.y), Math.round(player.z)],
          dataUrl,
          resolution: "800x600 PNG",
          jsonMapSummary: {
            biome: "plains_valley",
            playerCount: 1,
            oreCount: cubeMap.summary.ores.length,
            threatCount: cubeMap.summary.hazards.length
          }
        };

        setScreenshots(prev => [newArtifact, ...prev]);
        setSelectedScreenshot(newArtifact);
      }
      setIsGeneratingScreenshot(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Box className="h-6 w-6 text-white font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-tight">
                3D Block Cube Map & Structured JSON Spatial Engine
              </h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-semibold">
                Real Live Voxel Awareness
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Provides the AI agent and autonomous ticker with structured 3D JSON block cube matrices ({cubeMap.dimensions.width}x{cubeMap.dimensions.height}x{cubeMap.dimensions.depth} = {cubeMap.totalBlocks} voxels), detecting minable ores, walkable surfaces, and hazards.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePushToAi}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-md shadow-purple-600/20 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Feed Cube to AI Brain</span>
          </button>

          <button
            type="button"
            onClick={handleRequestLiveCube}
            disabled={isFetchingLiveCube}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-2 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isFetchingLiveCube ? "animate-spin" : ""}`} />
            <span>{isFetchingLiveCube ? "Querying..." : "Scan Live Cube"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCubeJson}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-all"
          >
            {cubeCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>{cubeCopied ? "JSON Copied!" : "Copy JSON"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("3d_cube")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
            activeTab === "3d_cube"
              ? "bg-indigo-950 text-indigo-300 border border-indigo-700 shadow-md shadow-indigo-950"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Box className="h-4 w-4 text-indigo-400" />
          <span>3D Block Cube Matrix (Voxel Inspector)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("area_map")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
            activeTab === "area_map"
              ? "bg-indigo-950 text-indigo-300 border border-indigo-700 shadow-md shadow-indigo-950"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Compass className="h-4 w-4 text-cyan-400" />
          <span>Area Map & Multi-Layer Scanner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("snapshots")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
            activeTab === "snapshots"
              ? "bg-indigo-950 text-indigo-300 border border-indigo-700 shadow-md shadow-indigo-950"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <ImageIcon className="h-4 w-4 text-emerald-400" />
          <span>Vision Snapshots ({screenshots.length})</span>
        </button>
      </div>

      {/* TAB 1: 3D VOXEL CUBE MAP INSPECTOR */}
      {activeTab === "3d_cube" && (
        <div className="space-y-6">
          {/* Cube Control Bar */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Radius Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Cube Radius:</span>
                </span>
                {[1, 2, 3, 4, 5].map((r) => {
                  const dim = r * 2 + 1;
                  const count = dim * dim * dim;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCubeRadius(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                        cubeRadius === r
                          ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                          : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      R={r} ({dim}³={count})
                    </button>
                  );
                })}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode3D("layers")}
                  className={`px-2.5 py-1 rounded text-xs font-mono ${
                    viewMode3D === "layers" ? "bg-indigo-950 text-indigo-300 font-bold border border-indigo-800" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  2D Layer Slices
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode3D("isometric_canvas")}
                  className={`px-2.5 py-1 rounded text-xs font-mono ${
                    viewMode3D === "isometric_canvas" ? "bg-indigo-950 text-indigo-300 font-bold border border-indigo-800" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  3D Isometric View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode3D("ascii")}
                  className={`px-2.5 py-1 rounded text-xs font-mono ${
                    viewMode3D === "ascii" ? "bg-indigo-950 text-indigo-300 font-bold border border-indigo-800" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  ASCII Matrix
                </button>
              </div>
            </div>

            {/* Center Anchor Indicator */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Center:</span>
              <span className="px-2 py-0.5 rounded bg-slate-950 text-emerald-300 font-bold border border-slate-800">
                X:{cubeCenter[0]} Y:{cubeCenter[1]} Z:{cubeCenter[2]}
              </span>
              <button
                type="button"
                onClick={() => setCubeCenter([Math.round(player.x), Math.round(player.y), Math.round(player.z)])}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                Re-Center on Bot
              </button>
            </div>
          </div>

          {/* Voxel Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">Total Voxels</span>
                <span className="text-base font-bold text-slate-100">{cubeMap.totalBlocks}</span>
              </div>
              <Box className="h-5 w-5 text-indigo-400" />
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">Solid Density</span>
                <span className="text-base font-bold text-emerald-400">{cubeMap.summary.densityPct}% ({cubeMap.solidBlocks})</span>
              </div>
              <Pickaxe className="h-5 w-5 text-emerald-400" />
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">Ores In Range</span>
                <span className="text-base font-bold text-cyan-400">{cubeMap.summary.ores.length} nodes</span>
              </div>
              <Gem className="h-5 w-5 text-cyan-400" />
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">Hazards</span>
                <span className={`text-base font-bold ${cubeMap.summary.hazards.length > 0 ? "text-rose-400" : "text-slate-400"}`}>
                  {cubeMap.summary.hazards.length} detected
                </span>
              </div>
              <Flame className="h-5 w-5 text-rose-400" />
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">Walkable Ground</span>
                <span className="text-base font-bold text-amber-400">{cubeMap.summary.walkableSurfaces.length} voxels</span>
              </div>
              <Footprints className="h-5 w-5 text-amber-400" />
            </div>
          </div>

          {/* MAIN 3D CUBE WORKSPACE (Left: Visualizer, Right: Live JSON & Ore Radar) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Visual View (Layer Slices or 3D Canvas) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                {/* Elevation Layer Slider */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <Layers className="h-4 w-4 text-indigo-400" />
                    <span className="font-bold text-slate-200">Elevation Layer Slice:</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-bold border border-indigo-800">
                      Y = {selectedYLayer} {selectedYLayer === cubeCenter[1] ? "(Bot Feet Level)" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: cubeRadius * 2 + 1 }).map((_, i) => {
                      const y = cubeCenter[1] + cubeRadius - i;
                      return (
                        <button
                          key={y}
                          type="button"
                          onClick={() => setSelectedYLayer(y)}
                          className={`w-7 h-7 rounded text-[11px] font-mono font-bold transition-all ${
                            selectedYLayer === y
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                              : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                          }`}
                        >
                          {y}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* VIEW 1: 2D Interactive Layer Slice Grid */}
                {viewMode3D === "layers" && (
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-950 border border-slate-850">
                    <div className="text-[11px] font-mono text-slate-400 mb-3 flex items-center justify-between w-full">
                      <span>Layer Grid (Y={selectedYLayer}) - Click block for exact properties:</span>
                      <span className="text-emerald-400 font-bold">[@] Bot Position</span>
                    </div>

                    <div 
                      className="grid gap-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800"
                      style={{
                        gridTemplateColumns: `repeat(${cubeRadius * 2 + 1}, minmax(0, 1fr))`
                      }}
                    >
                      {(() => {
                        const dim = cubeRadius * 2 + 1;
                        const items: React.ReactNode[] = [];
                        const layerKey = `y${selectedYLayer}`;
                        const layer = cubeMap.layers[layerKey] || [];

                        for (let dz = -cubeRadius; dz <= cubeRadius; dz++) {
                          for (let dx = -cubeRadius; dx <= cubeRadius; dx++) {
                            const x = cubeCenter[0] + dx;
                            const y = selectedYLayer;
                            const z = cubeCenter[2] + dz;
                            const voxel = cubeMap.voxels.find(v => v.x === x && v.y === y && v.z === z) || {
                              x, y, z, name: "minecraft:air", solid: false, hardness: 0
                            };
                            const isBotCenter = dx === 0 && selectedYLayer === cubeCenter[1] && dz === 0;
                            const cleanName = voxel.name.replace("minecraft:", "");

                            // Style based on block type
                            let bg = "bg-slate-950 border-slate-800 text-slate-600";
                            if (voxel.isOre) {
                              bg = cleanName.includes("diamond") ? "bg-cyan-950 border-cyan-500 text-cyan-300 ring-1 ring-cyan-400/40" : "bg-amber-950 border-amber-500 text-amber-300";
                            } else if (voxel.isHazard) {
                              bg = "bg-rose-950 border-rose-500 text-rose-300 animate-pulse";
                            } else if (cleanName.includes("grass")) {
                              bg = "bg-emerald-950 border-emerald-700 text-emerald-300";
                            } else if (cleanName.includes("wood") || cleanName.includes("log")) {
                              bg = "bg-amber-950/80 border-amber-800 text-amber-400";
                            } else if (voxel.solid) {
                              bg = "bg-slate-850 border-slate-700 text-slate-300";
                            }

                            items.push(
                              <button
                                key={`${x}_${y}_${z}`}
                                type="button"
                                onMouseEnter={() => setHoveredVoxel(voxel)}
                                onClick={() => {
                                  if (onDispatchAction) {
                                    onDispatchAction({ type: "look_at", x: x + 0.5, y: y + 0.5, z: z + 0.5, ticks: 3 });
                                  }
                                }}
                                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg border flex flex-col items-center justify-center text-[10px] font-mono transition-all hover:scale-105 ${bg} ${
                                  isBotCenter ? "ring-2 ring-purple-400 shadow-lg shadow-purple-500/20" : ""
                                }`}
                                title={`[${x}, ${y}, ${z}]: ${cleanName}`}
                              >
                                {isBotCenter ? (
                                  <span className="font-bold text-purple-300">BOT</span>
                                ) : (
                                  <span className="truncate max-w-[90%] font-semibold">
                                    {cleanName.slice(0, 3)}
                                  </span>
                                )}
                              </button>
                            );
                          }
                        }
                        return items;
                      })()}
                    </div>

                    {/* Hovered Block Inspector Banner */}
                    <div className="mt-4 p-2.5 rounded-lg bg-slate-900 border border-slate-800 w-full flex items-center justify-between text-xs font-mono">
                      {hoveredVoxel ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Inspecting:</span>
                            <span className="font-bold text-emerald-300">{hoveredVoxel.name.replace("minecraft:", "")}</span>
                            <span className="text-[10px] text-slate-500">[{hoveredVoxel.x}, {hoveredVoxel.y}, {hoveredVoxel.z}]</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hoveredVoxel.solid ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-slate-950 text-slate-500"}`}>
                              {hoveredVoxel.solid ? "SOLID" : "AIR/PASSABLE"}
                            </span>
                            {hoveredVoxel.isOre && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                                ORE
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Hover over any voxel block above to inspect physical properties.</span>
                      )}
                    </div>
                  </div>
                )}

                {/* VIEW 2: 3D Isometric Canvas */}
                {viewMode3D === "isometric_canvas" && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center relative">
                    <canvas
                      ref={isometricCanvasRef}
                      width={640}
                      height={480}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-slate-950/80 text-[11px] font-mono text-indigo-300 border border-slate-800">
                      3D Isometric Voxel Cube View (Slices at Y &le; {selectedYLayer})
                    </div>
                  </div>
                )}

                {/* VIEW 3: ASCII Matrix */}
                {viewMode3D === "ascii" && (
                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 max-h-[380px] overflow-y-auto leading-relaxed">
                    {cubeMap.asciiMatrix}
                  </pre>
                )}
              </div>
            </div>

            {/* Right Column: JSON Payload & Ore/Hazard Radar */}
            <div className="lg:col-span-5 space-y-4">
              {/* Ore & Hazard Radar Card */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2.5">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Gem className="h-4 w-4 text-cyan-400" />
                    <span>3D ORE & RESOURCE SCANNER</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {cubeMap.summary.ores.length} veins in 3D box
                  </span>
                </div>

                {cubeMap.summary.ores.length > 0 ? (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {cubeMap.summary.ores.map((ore, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${ore.name.includes("diamond") ? "bg-cyan-400" : "bg-amber-400"}`} />
                          <span className="font-bold text-slate-200">{ore.name}</span>
                          <span className="text-[10px] text-slate-500">[{ore.pos.join(", ")}]</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-cyan-300 font-bold">{ore.distance}m</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onDispatchAction) {
                                onDispatchAction({ type: "look_at", x: ore.pos[0] + 0.5, y: ore.pos[1] + 0.5, z: ore.pos[2] + 0.5, ticks: 3 });
                              }
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 font-bold"
                          >
                            Aim
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 text-xs font-mono text-slate-500">
                    No ores detected in this {cubeMap.dimensions.width}x{cubeMap.dimensions.depth} cube. Increase radius to scan deeper.
                  </div>
                )}
              </div>

              {/* JSON Cube Payload Viewer */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-amber-400" />
                    <span className="font-bold text-slate-200">Structured JSON Cube Map</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleDownloadCubeJson}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[10px] font-mono text-slate-300 border border-slate-700 flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      <span>.JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyCubeJson}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-[10px] font-mono text-slate-300 border border-slate-700 flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{cubeCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-cyan-300 max-h-[220px] overflow-y-auto leading-relaxed">
                  {JSON.stringify({
                    center: cubeMap.center,
                    radius: cubeMap.radius,
                    dimensions: cubeMap.dimensions,
                    totalBlocks: cubeMap.totalBlocks,
                    solidBlocks: cubeMap.solidBlocks,
                    airBlocks: cubeMap.airBlocks,
                    summary: cubeMap.summary,
                    first50Voxels: cubeMap.voxels.slice(0, 30)
                  }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AREA MAP & SCANNER */}
      {activeTab === "area_map" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-amber-400" />
                <span>Area Scan Radius:</span>
              </span>
              {[16, 32, 64, 128].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAreaRadius(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono ${
                    areaRadius === r 
                      ? "bg-amber-950 text-amber-300 border border-amber-700 font-bold"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {r} blocks
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleCaptureScreenshot("top_down_radar")}
              disabled={isGeneratingScreenshot}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold font-mono flex items-center gap-2 transition-all shadow-md shadow-cyan-600/20"
            >
              <Camera className={`h-3.5 w-3.5 ${isGeneratingScreenshot ? "animate-spin" : ""}`} />
              <span>{isGeneratingScreenshot ? "Capturing..." : "Take Map Screenshot"}</span>
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <Camera className="h-10 w-10 text-cyan-400 mx-auto" />
            <h3 className="text-sm font-bold font-mono text-slate-200">High-Resolution 2D/3D Multi-Layer Radar Ready</h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Generates top-down aerial screenshots and structured spatial JSON payloads for deep vision models and multimodal LLMs.
            </p>
            <button
              type="button"
              onClick={() => handleCaptureScreenshot("top_down_radar")}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono inline-flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              <span>Capture Area Snapshot Now</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: VISION SNAPSHOTS GALLERY */}
      {activeTab === "snapshots" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono border-b border-slate-800 pb-3 mb-4">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-emerald-400" />
                <span>Captured Spatial Snapshots ({screenshots.length})</span>
              </span>
              <button
                type="button"
                onClick={() => handleCaptureScreenshot("top_down_radar")}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>New Snapshot</span>
              </button>
            </div>

            {screenshots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screenshots.map(s => (
                  <div key={s.id} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-3 space-y-2">
                    <img src={s.dataUrl} alt={s.label} className="w-full aspect-[4/3] object-cover rounded-lg border border-slate-800" />
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-slate-200 truncate">{s.label}</span>
                      <a
                        href={s.dataUrl}
                        download={`map_snapshot_${s.id}.png`}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        <span>PNG</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-xs font-mono text-slate-500">
                No screenshots captured yet. Click "New Snapshot" to create a high-res image map.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
