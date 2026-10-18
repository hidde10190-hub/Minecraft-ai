import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Compass, 
  Layers, 
  MapPin, 
  Plus, 
  Minus, 
  Maximize2, 
  Crosshair, 
  Download, 
  Play, 
  Pause, 
  Radio, 
  ShieldAlert, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Grid, 
  RotateCcw, 
  Navigation,
  Check,
  Building,
  Flag,
  Trash2,
  Share2
} from "lucide-react";
import { 
  PlayerState, 
  EntityState, 
  DiscoveredChunk, 
  MapWaypoint, 
  AgentInstance,
  BiomeType
} from "../types";
import { BIOME_COLORS } from "../utils/worldMapGenerator";

interface LiveWorldMapProps {
  player: PlayerState;
  entities: EntityState[];
  allAgents: AgentInstance[];
  activeAgentId: string;
  discoveredChunks: Map<string, DiscoveredChunk>;
  waypoints: MapWaypoint[];
  onAddWaypoint: (waypoint: MapWaypoint) => void;
  onRemoveWaypoint: (id: string) => void;
  onDispatchGoal: (goal: string) => void;
  isAutoScouting: boolean;
  onToggleAutoScout: () => void;
  onExpandExplorationRadius: (radius: number) => void;
}

export const LiveWorldMap: React.FC<LiveWorldMapProps> = ({
  player,
  entities,
  allAgents,
  activeAgentId,
  discoveredChunks,
  waypoints,
  onAddWaypoint,
  onRemoveWaypoint,
  onDispatchGoal,
  isAutoScouting,
  onToggleAutoScout,
  onExpandExplorationRadius,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Map viewport states
  const [zoom, setZoom] = useState<number>(2.0); // Pixels per block
  const [cameraOffset, setCameraOffset] = useState<{ x: number; z: number }>({ x: player.x, z: player.z });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [followPlayer, setFollowPlayer] = useState<boolean>(true);

  // Layer Toggles
  const [showChunkGrid, setShowChunkGrid] = useState<boolean>(true);
  const [showEntities, setShowEntities] = useState<boolean>(true);
  const [showWaypoints, setShowWaypoints] = useState<boolean>(true);
  const [showElevationShading, setShowElevationShading] = useState<boolean>(true);
  const [showVisionCone, setShowVisionCone] = useState<boolean>(true);

  // Selected Map Point (for inspect/waypoint modal)
  const [selectedCoord, setSelectedCoord] = useState<{ x: number; z: number } | null>(null);
  const [newWaypointName, setNewWaypointName] = useState<string>("");
  const [newWaypointColor, setNewWaypointColor] = useState<string>("#10b981");
  const [newWaypointIcon, setNewWaypointIcon] = useState<MapWaypoint["icon"]>("target");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Follow player camera centering
  useEffect(() => {
    if (followPlayer) {
      setCameraOffset({ x: player.x, z: player.z });
    }
  }, [player.x, player.z, followPlayer]);

  // Statistics calculation
  const stats = useMemo(() => {
    const chunkCount = discoveredChunks.size;
    const totalAreaM2 = chunkCount * 256;
    let biomeCounts: Record<string, number> = {};
    let structuresFound: Array<{ name: string; pos: [number, number]; type: string }> = [];

    discoveredChunks.forEach((chunk) => {
      biomeCounts[chunk.biome] = (biomeCounts[chunk.biome] || 0) + 1;
      if (chunk.hasStructure && chunk.structurePos) {
        structuresFound.push({
          name: chunk.hasStructure.replace("_", " ").toUpperCase(),
          pos: chunk.structurePos,
          type: chunk.hasStructure,
        });
      }
    });

    const dominantBiome = Object.entries(biomeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "plains";

    return {
      chunkCount,
      totalAreaM2,
      dominantBiome,
      structuresFound,
    };
  }, [discoveredChunks]);

  // Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas to container
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 560;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const centerX = width / 2;
    const centerY = height / 2;

    // Helper: World Coord -> Screen Coord
    const worldToScreen = (wx: number, wz: number) => ({
      x: centerX + (wx - cameraOffset.x) * zoom,
      y: centerY + (wz - cameraOffset.z) * zoom,
    });

    // Clear background (Deep void color)
    ctx.fillStyle = "#070b12";
    ctx.fillRect(0, 0, width, height);

    // 1. Render Discovered Chunks
    discoveredChunks.forEach((chunk) => {
      const chunkWorldX = chunk.cx * 16;
      const chunkWorldZ = chunk.cz * 16;
      const screenPos = worldToScreen(chunkWorldX, chunkWorldZ);
      const chunkSizeScreen = 16 * zoom;

      // Cull chunks outside visible viewport
      if (
        screenPos.x + chunkSizeScreen < 0 ||
        screenPos.x > width ||
        screenPos.y + chunkSizeScreen < 0 ||
        screenPos.y > height
      ) {
        return;
      }

      const biomeColor = BIOME_COLORS[chunk.biome] || BIOME_COLORS.plains;

      // Render 16x16 blocks within chunk or solid block if zoomed out
      if (zoom >= 1.5) {
        const blockSize = zoom;
        for (let lz = 0; lz < 16; lz++) {
          for (let lx = 0; lx < 16; lx++) {
            const idx = lz * 16 + lx;
            const h = chunk.heights[idx] || 64;
            const blockType = chunk.blocks[idx] || "minecraft:grass_block";

            // Elevation shading calculation
            let fill = biomeColor.base;
            if (showElevationShading) {
              const heightOffset = (h - 64) * 0.02;
              if (blockType === "minecraft:water") {
                fill = biomeColor.dark;
              } else if (blockType === "minecraft:sand") {
                fill = "#cfb56c";
              } else if (blockType === "minecraft:snow_block") {
                fill = "#edf4f7";
              } else if (heightOffset > 0.1) {
                fill = biomeColor.light;
              } else if (heightOffset < -0.1) {
                fill = biomeColor.dark;
              }
            }

            ctx.fillStyle = fill;
            ctx.fillRect(
              screenPos.x + lx * blockSize,
              screenPos.y + lz * blockSize,
              blockSize + 0.5,
              blockSize + 0.5
            );
          }
        }
      } else {
        // Fast LOD solid chunk color
        ctx.fillStyle = biomeColor.base;
        ctx.fillRect(screenPos.x, screenPos.y, chunkSizeScreen, chunkSizeScreen);
      }

      // Chunk Border Grid
      if (showChunkGrid) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.strokeRect(screenPos.x, screenPos.y, chunkSizeScreen, chunkSizeScreen);
      }

      // Structure Marker inside chunk
      if (chunk.hasStructure && chunk.structurePos) {
        const structPos = worldToScreen(chunk.structurePos[0], chunk.structurePos[1]);
        ctx.save();
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(structPos.x, structPos.y, 4 * Math.max(1, zoom * 0.8), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        if (zoom >= 1.2) {
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 9px monospace";
          ctx.fillText(chunk.hasStructure.toUpperCase(), structPos.x + 6, structPos.y + 3);
        }
        ctx.restore();
      }
    });

    // 2. Render Path Trail & Waypoints
    if (showWaypoints) {
      waypoints.forEach((wp) => {
        const wpScreen = worldToScreen(wp.x, wp.z);
        if (wpScreen.x < -20 || wpScreen.x > width + 20 || wpScreen.y < -20 || wpScreen.y > height + 20) return;

        ctx.save();
        // Pulsing radar ring
        ctx.strokeStyle = wp.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(wpScreen.x, wpScreen.y, 7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = wp.color;
        ctx.beginPath();
        ctx.arc(wpScreen.x, wpScreen.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Waypoint name tag
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.fillText(wp.name, wpScreen.x + 9, wpScreen.y + 3);
        ctx.restore();
      });
    }

    // 3. Render Nearby Entities (Radar)
    if (showEntities && entities.length > 0) {
      entities.forEach((ent) => {
        const entScreen = worldToScreen(ent.x, ent.z);
        if (entScreen.x < 0 || entScreen.x > width || entScreen.y < 0 || entScreen.y > height) return;

        const isHostile = ["zombie", "skeleton", "creeper", "spider", "enderman"].includes(
          ent.type.toLowerCase().replace("minecraft:", "")
        );

        ctx.save();
        ctx.fillStyle = isHostile ? "#ef4444" : "#3b82f6";
        ctx.beginPath();
        ctx.arc(entScreen.x, entScreen.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // 4. Render Swarm Fleet Agents
    allAgents.forEach((agent) => {
      const isMainPlayer = agent.id === activeAgentId;
      const ax = isMainPlayer ? player.x : agent.targetPosition ? agent.targetPosition[0] : player.x + (agent.id === "builder-01" ? 8 : -8);
      const az = isMainPlayer ? player.z : agent.targetPosition ? agent.targetPosition[2] : player.z + (agent.id === "builder-01" ? -6 : 10);
      const agentScreen = worldToScreen(ax, az);

      ctx.save();
      // Agent marker pin
      ctx.fillStyle = isMainPlayer ? "#10b981" : "#06b6d4";
      ctx.beginPath();
      ctx.arc(agentScreen.x, agentScreen.y, isMainPlayer ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Vision cone for main player
      if (isMainPlayer && showVisionCone) {
        const yawRad = ((player.yaw - 90) * Math.PI) / 180;
        const fov = (65 * Math.PI) / 180;
        const coneDist = 35 * zoom;

        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
        ctx.beginPath();
        ctx.moveTo(agentScreen.x, agentScreen.y);
        ctx.arc(agentScreen.x, agentScreen.y, coneDist, yawRad - fov / 2, yawRad + fov / 2);
        ctx.closePath();
        ctx.fill();

        // Heading arrow
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(agentScreen.x, agentScreen.y);
        ctx.lineTo(
          agentScreen.x + Math.cos(yawRad) * 16,
          agentScreen.y + Math.sin(yawRad) * 16
        );
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = isMainPlayer ? "#34d399" : "#67e8f9";
      ctx.font = "bold 10px monospace";
      ctx.fillText(agent.name, agentScreen.x + 8, agentScreen.y - 4);
      ctx.restore();
    });

    // 5. Selected Coordinate Crosshair
    if (selectedCoord) {
      const selScreen = worldToScreen(selectedCoord.x, selectedCoord.z);
      ctx.save();
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(selScreen.x - 8, selScreen.y - 8, 16, 16);
      ctx.beginPath();
      ctx.arc(selScreen.x, selScreen.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#f43f5e";
      ctx.fill();
      ctx.restore();
    }
  }, [
    discoveredChunks,
    cameraOffset,
    zoom,
    player,
    entities,
    allAgents,
    activeAgentId,
    waypoints,
    showChunkGrid,
    showEntities,
    showWaypoints,
    showElevationShading,
    showVisionCone,
    selectedCoord,
  ]);

  // Mouse Interaction Handlers for Drag, Pan & Click
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setFollowPlayer(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) / zoom;
    const dz = (e.clientY - dragStart.y) / zoom;
    setCameraOffset((prev) => ({ x: prev.x - dx, z: prev.z - dz }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.83;
    setZoom((prev) => Math.min(8.0, Math.max(0.4, prev * zoomFactor)));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickScreenX = e.clientX - rect.left;
    const clickScreenY = e.clientY - rect.top;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    const worldX = Math.round(cameraOffset.x + (clickScreenX - centerX) / zoom);
    const worldZ = Math.round(cameraOffset.z + (clickScreenY - centerY) / zoom);

    setSelectedCoord({ x: worldX, z: worldZ });
    setNewWaypointName(`Waypoint (${worldX}, ${worldZ})`);
  };

  const handleAddCustomWaypoint = () => {
    if (!selectedCoord) return;
    const wp: MapWaypoint = {
      id: `wp-${Date.now()}`,
      name: newWaypointName.trim() || `Waypoint (${selectedCoord.x}, ${selectedCoord.z})`,
      x: selectedCoord.x,
      y: 65,
      z: selectedCoord.z,
      color: newWaypointColor,
      icon: newWaypointIcon,
    };
    onAddWaypoint(wp);
    showToast(`Waypoint "${wp.name}" saved on map!`);
    setSelectedCoord(null);
  };

  const handleDispatchNavigate = () => {
    if (!selectedCoord) return;
    onDispatchGoal(`Navigate directly to coordinates X:${selectedCoord.x}, Z:${selectedCoord.z} and survey area.`);
    showToast(`Dispatched navigation goal -> [${selectedCoord.x}, ${selectedCoord.z}]`);
  };

  const handleExportMapImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `minecraft-live-world-map-${Date.now()}.png`;
    a.click();
    showToast("World map image exported!");
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Exploration Telemetry */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Live World Explorer Map
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 animate-pulse">
                  Real-Time Fog of War
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Expands dynamically as the bot moves. Uncovers biomes, terrain heightmaps, villages, and coordinates.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Explored Area: </span>
              <strong className="text-emerald-400">{stats.totalAreaM2.toLocaleString()} m²</strong>
              <span className="text-slate-500 ml-1">({stats.chunkCount} chunks)</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Position: </span>
              <strong className="text-cyan-400">
                X:{Math.round(player.x)} Y:{Math.round(player.y)} Z:{Math.round(player.z)}
              </strong>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Biome: </span>
              <strong className="text-amber-300 capitalize">{stats.dominantBiome.replace("_", " ")}</strong>
            </div>

            {/* Auto-Scout Toggle */}
            <button
              type="button"
              onClick={onToggleAutoScout}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border transition-all ${
                isAutoScouting
                  ? "bg-emerald-600 text-slate-950 border-emerald-400 shadow-md shadow-emerald-600/30"
                  : "bg-slate-800 hover:bg-slate-750 text-emerald-400 border-slate-700"
              }`}
            >
              {isAutoScouting ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isAutoScouting ? "Scout Active (Mapping...)" : "Start Auto-Explorer"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Viewport and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left / Center: Interactive Canvas */}
        <div className="lg:col-span-8 rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-lg relative flex flex-col">
          {/* Map Toolbar Overlay */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(8.0, z * 1.3))}
                className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
                title="Zoom In (+)"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.4, z * 0.77))}
                className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
                title="Zoom Out (-)"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraOffset({ x: player.x, z: player.z });
                  setFollowPlayer(true);
                }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded border ${
                  followPlayer
                    ? "bg-emerald-950/80 border-emerald-700 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Center and follow player position"
              >
                <Crosshair className="h-3.5 w-3.5" />
                <span>Follow Bot</span>
              </button>

              <button
                type="button"
                onClick={() => onExpandExplorationRadius(4)}
                className="flex items-center gap-1 px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
                title="Discover surrounding chunks immediately"
              >
                <Radio className="h-3.5 w-3.5 text-cyan-400" />
                <span>+Explore Radius</span>
              </button>
            </div>

            {/* Layer Toggles */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowChunkGrid(!showChunkGrid)}
                className={`p-1.5 rounded border ${
                  showChunkGrid ? "bg-slate-800 border-emerald-500/60 text-emerald-400" : "bg-slate-950 border-slate-800 text-slate-500"
                }`}
                title="Toggle Chunk Grid (16x16)"
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowEntities(!showEntities)}
                className={`p-1.5 rounded border ${
                  showEntities ? "bg-slate-800 border-cyan-500/60 text-cyan-400" : "bg-slate-950 border-slate-800 text-slate-500"
                }`}
                title="Toggle Entities / Mobs Radar"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowWaypoints(!showWaypoints)}
                className={`p-1.5 rounded border ${
                  showWaypoints ? "bg-slate-800 border-amber-500/60 text-amber-400" : "bg-slate-950 border-slate-800 text-slate-500"
                }`}
                title="Toggle Waypoint Markers"
              >
                <MapPin className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowElevationShading(!showElevationShading)}
                className={`p-1.5 rounded border ${
                  showElevationShading ? "bg-slate-800 border-slate-600 text-slate-200" : "bg-slate-950 border-slate-800 text-slate-500"
                }`}
                title="Toggle Height Elevation Shading"
              >
                <Layers className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExportMapImage}
                className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300"
                title="Export Map as PNG"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div 
            ref={containerRef} 
            className="relative w-full h-[520px] rounded-lg bg-slate-950 overflow-hidden cursor-crosshair select-none border border-slate-800"
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onClick={handleCanvasClick}
            />

            {/* Bottom Left Coordinate Tooltip */}
            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-slate-950/90 border border-slate-800 text-[11px] font-mono text-slate-300 backdrop-blur-sm pointer-events-none">
              Zoom: {zoom.toFixed(1)}x | Center: X:{Math.round(cameraOffset.x)} Z:{Math.round(cameraOffset.z)}
            </div>

            {/* Toast feedback */}
            {toastMessage && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-700 text-emerald-300 font-mono text-xs shadow-lg backdrop-blur-sm flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                <span>{toastMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Coordinates Inspector, Waypoints & Discovered Structures */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selected Coordinate Inspector */}
          {selectedCoord ? (
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-rose-400" />
                  <h3 className="text-xs font-bold font-mono text-slate-200">
                    Map Coordinate Inspector
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCoord(null)}
                  className="text-xs font-mono text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
                <div className="text-slate-400">
                  Target: <strong className="text-slate-100">X: {selectedCoord.x}, Z: {selectedCoord.z}</strong>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Chunk: [{Math.floor(selectedCoord.x / 16)}, {Math.floor(selectedCoord.z / 16)}]
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={handleDispatchNavigate}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition-colors"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Navigate Here</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddCustomWaypoint}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Save Pin</span>
                </button>
              </div>

              {/* Waypoint Customization Input */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <input
                  type="text"
                  value={newWaypointName}
                  onChange={(e) => setNewWaypointName(e.target.value)}
                  placeholder="Waypoint label..."
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">Color:</span>
                  {["#10b981", "#06b6d4", "#f59e0b", "#f43f5e", "#8b5cf6"].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewWaypointColor(color)}
                      style={{ backgroundColor: color }}
                      className={`h-4 w-4 rounded-full transition-transform ${
                        newWaypointColor === color ? "scale-125 ring-2 ring-white" : "opacity-70 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg text-center space-y-2">
              <Crosshair className="h-6 w-6 text-slate-500 mx-auto" />
              <h3 className="text-xs font-bold font-mono text-slate-300">Click Map to Inspect & Drop Waypoints</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Click anywhere on the revealed terrain to measure distance, dispatch navigation paths, or mark bases.
              </p>
            </div>
          )}

          {/* Discovered Structures & Points of Interest */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-bold font-mono text-slate-200">
                  Discovered Landmarks ({stats.structuresFound.length})
                </h3>
              </div>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {stats.structuresFound.length === 0 ? (
                <p className="text-xs font-mono text-slate-500 italic">
                  Explore further to discover Villages, Pyramids, and Ruined Portals...
                </p>
              ) : (
                stats.structuresFound.map((struct, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <div>
                        <span className="text-slate-200 font-bold block">{struct.name}</span>
                        <span className="text-[10px] text-slate-500">
                          X:{struct.pos[0]}, Z:{struct.pos[1]}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraOffset({ x: struct.pos[0], z: struct.pos[1] });
                        setFollowPlayer(false);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Saved Waypoints List */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold font-mono text-slate-200">
                  Saved Waypoints ({waypoints.length})
                </h3>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {waypoints.map((wp) => (
                <div
                  key={wp.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: wp.color }} />
                    <div>
                      <span className="text-slate-200 font-bold block">{wp.name}</span>
                      <span className="text-[10px] text-slate-500">
                        X:{wp.x} Y:{wp.y} Z:{wp.z}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraOffset({ x: wp.x, z: wp.z });
                        setFollowPlayer(false);
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      Focus
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveWaypoint(wp.id)}
                      className="p-1 rounded bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400"
                      title="Delete Waypoint"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
