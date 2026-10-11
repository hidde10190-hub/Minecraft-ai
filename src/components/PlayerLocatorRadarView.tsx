import React, { useState, useEffect } from "react";
import { 
  Compass, 
  Eye, 
  Users, 
  Target, 
  Shield, 
  Activity, 
  Heart, 
  Navigation, 
  Maximize2, 
  Zap,
  Radio,
  Crosshair,
  Lock,
  Unlock,
  Sparkles,
  Info
} from "lucide-react";
import { LocatorDot, PlayerState } from "../types";

interface PlayerLocatorRadarViewProps {
  player: PlayerState;
  onLockOnPlayer?: (playerName: string) => void;
  onSendChatMessage?: (msg: string) => void;
}

export const PlayerLocatorRadarView: React.FC<PlayerLocatorRadarViewProps> = ({
  player,
  onLockOnPlayer,
  onSendChatMessage
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<LocatorDot | null>(null);
  const [radarZoom, setRadarZoom] = useState<number>(50); // radius in blocks
  const [lockedTarget, setLockedTarget] = useState<string | null>("Hidde");
  const [showFovCone, setShowFovCone] = useState<boolean>(true);

  // Simulated live nearby players with realistic Minecraft coordinate offsets
  const [players, setPlayers] = useState<LocatorDot[]>([
    {
      id: "p_hidde",
      playerName: "Hidde",
      dotColor: "#06b6d4", // Cyan
      relativeBearingDeg: 24, // 24 deg to the right of bot's gaze
      compassHeading: "NE",
      distanceBlocks: 14.2,
      deltaY: 1.0,
      isHostileOrFriend: "ally",
      health: 20,
      maxHealth: 20,
      heldItem: "diamond_sword",
      isSneaking: false,
      isSprinting: false,
      isGliding: false,
      teamName: "Team Alpha",
      lineOfSight: true
    },
    {
      id: "p_miner_bob",
      playerName: "Miner_Bob",
      dotColor: "#f59e0b", // Amber
      relativeBearingDeg: -78,
      compassHeading: "NW",
      distanceBlocks: 28.5,
      deltaY: -12.0, // down in cave
      isHostileOrFriend: "ally",
      health: 18,
      maxHealth: 20,
      heldItem: "netherite_pickaxe",
      isSneaking: true,
      isSprinting: false,
      isGliding: false,
      teamName: "Mining Guild",
      lineOfSight: false
    },
    {
      id: "p_scout_elytra",
      playerName: "Valkyrie_Flyer",
      dotColor: "#a855f7", // Purple
      relativeBearingDeg: 142, // Behind
      compassHeading: "S",
      distanceBlocks: 45.0,
      deltaY: 34.0, // High in air
      isHostileOrFriend: "neutral",
      health: 20,
      maxHealth: 20,
      heldItem: "firework_rocket",
      isSneaking: false,
      isSprinting: false,
      isGliding: true,
      teamName: "Scouts",
      lineOfSight: true
    },
    {
      id: "p_bot_beta",
      playerName: "Beta-Guard",
      dotColor: "#10b981", // Emerald
      relativeBearingDeg: -12,
      compassHeading: "N",
      distanceBlocks: 6.8,
      deltaY: 0.0,
      isHostileOrFriend: "bot",
      health: 20,
      maxHealth: 20,
      heldItem: "shield",
      isSneaking: false,
      isSprinting: true,
      isGliding: false,
      teamName: "AI Swarm",
      lineOfSight: true
    }
  ]);

  // Periodic subtle drift for live simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setPlayers(prev => prev.map(p => {
        const driftAngle = (Math.random() - 0.5) * 2;
        const driftDist = (Math.random() - 0.5) * 0.4;
        let newAngle = p.relativeBearingDeg + driftAngle;
        if (newAngle > 180) newAngle -= 360;
        if (newAngle < -180) newAngle += 360;

        return {
          ...p,
          relativeBearingDeg: Math.round(newAngle * 10) / 10,
          distanceBlocks: Math.max(2, Math.round((p.distanceBlocks + driftDist) * 10) / 10)
        };
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentBearingToHeading = (yaw: number): string => {
    const normalized = ((yaw % 360) + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return "South (+Z)";
    if (normalized >= 22.5 && normalized < 67.5) return "South-West";
    if (normalized >= 67.5 && normalized < 112.5) return "West (-X)";
    if (normalized >= 112.5 && normalized < 157.5) return "North-West";
    if (normalized >= 157.5 && normalized < 202.5) return "North (-Z)";
    if (normalized >= 202.5 && normalized < 247.5) return "North-East";
    if (normalized >= 247.5 && normalized < 292.5) return "East (+X)";
    return "South-East";
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/70 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <Crosshair className="h-6 w-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-tight">
                Player Locator Bar & 360° Radar Decoder
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                Dot-to-Player AI Resolver
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Decodes the horizontal Minecraft Locator Bar and Compass blips into exact named players. The AI cross-references relative bearing, elevation ($\Delta Y$), distance, and line-of-sight to know which dot represents which human player.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            Bot Heading: <strong className="text-cyan-400">{Math.round(player.yaw)}° ({currentBearingToHeading(player.yaw)})</strong>
          </div>
        </div>
      </div>

      {/* HORIZONTAL LOCATOR COMPASS BAR (HUD RECREATION) */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-900/60 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 text-xs font-mono">
          <span className="text-cyan-400 font-bold flex items-center gap-1.5">
            <Radio className="h-4 w-4 animate-pulse text-cyan-400" />
            <span>HUD LOCATOR BAR STREAM (FOV: 90° Viewport)</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Dots inside viewport: <strong className="text-emerald-400">{players.filter(p => Math.abs(p.relativeBearingDeg) <= 45).length} visible</strong>
          </span>
        </div>

        {/* The Bar Track */}
        <div className="relative h-14 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden">
          {/* Degree Tick Marks */}
          <div className="absolute inset-0 flex justify-between px-6 items-center text-[10px] font-mono text-slate-600 select-none pointer-events-none">
            <span>-45° (Left)</span>
            <span>-30°</span>
            <span>-15°</span>
            <span className="text-cyan-400 font-bold text-xs">▲ CENTER (0° Reticle)</span>
            <span>+15°</span>
            <span>+30°</span>
            <span>+45° (Right)</span>
          </div>

          {/* Center Reticle Line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-cyan-500/60 shadow-md shadow-cyan-500/50" />

          {/* Rendered Player Dots on the Bar */}
          {players.map((p) => {
            // Check if within +/- 45 deg FOV
            const inFov = Math.abs(p.relativeBearingDeg) <= 45;
            // Map -45..+45 to 5%..95% left
            const percentX = inFov 
              ? 50 + (p.relativeBearingDeg / 45) * 45 
              : p.relativeBearingDeg > 0 ? 98 : 2;

            const isLocked = lockedTarget === p.playerName;
            const isSelected = selectedPlayer?.id === p.id;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlayer(p)}
                style={{ left: `${percentX}%` }}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer transition-all duration-300 group z-20 ${
                  !inFov ? "opacity-40 hover:opacity-100" : "opacity-100"
                }`}
              >
                {/* Dot Pip */}
                <div 
                  style={{ backgroundColor: p.dotColor, borderColor: isLocked ? "#ffffff" : p.dotColor }}
                  className={`h-4 w-4 rounded-full border-2 shadow-lg flex items-center justify-center transition-transform ${
                    isLocked ? "scale-125 ring-2 ring-cyan-400 animate-pulse" : "group-hover:scale-125"
                  }`}
                >
                  {isLocked && <Crosshair className="h-2.5 w-2.5 text-slate-950 stroke-[3]" />}
                </div>

                {/* Player Tag Bubble */}
                <div className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-md transition-all ${
                  isSelected || isLocked 
                    ? "bg-cyan-950 text-cyan-200 border border-cyan-500 scale-105" 
                    : "bg-slate-950/90 text-slate-300 border border-slate-700 group-hover:border-slate-500"
                }`}>
                  {p.playerName} ({Math.round(p.distanceBlocks)}m)
                  {p.deltaY !== 0 && (
                    <span className={`ml-1 text-[9px] ${p.deltaY > 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {p.deltaY > 0 ? `+${p.deltaY}Y` : `${p.deltaY}Y`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>Click any dot to inspect entity details or lock AI auto-tracking.</span>
          </span>
          <span>{players.length} total players tracked in chunk radius</span>
        </div>
      </div>

      {/* 2-COLUMN RADAR HUD & PLAYER INTELLIGENCE BENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 360° Circular Tactical Radar */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center relative">
          <div className="w-full flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-cyan-400" />
              <span>360° CIRCULAR RADAR SCOPE</span>
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500">Range:</span>
              {[25, 50, 100].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadarZoom(r)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                    radarZoom === r 
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold" 
                      : "bg-slate-950 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {r}m
                </button>
              ))}
            </div>
          </div>

          {/* Circular Radar Canvas Area */}
          <div className="relative h-72 w-72 sm:h-80 sm:w-80 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center overflow-hidden my-2 shadow-inner">
            {/* Range Rings */}
            <div className="absolute h-3/4 w-3/4 rounded-full border border-slate-800/80" />
            <div className="absolute h-1/2 w-1/2 rounded-full border border-slate-800/80" />
            <div className="absolute h-1/4 w-1/4 rounded-full border border-slate-800/80" />

            {/* Crosshair Grids */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-[1px] bg-slate-800/80" />
              <div className="w-full h-[1px] bg-slate-800/80 absolute" />
            </div>

            {/* FOV Vision Cone */}
            {showFovCone && (
              <div 
                className="absolute w-0 h-0 border-l-[120px] border-l-transparent border-r-[120px] border-r-transparent border-t-[140px] border-t-cyan-500/10 pointer-events-none top-4"
                style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
              />
            )}

            {/* Rotating Radar Sweep Line */}
            <div className="absolute inset-0 rounded-full animate-spin [animation-duration:4s] pointer-events-none bg-gradient-to-tr from-cyan-500/10 via-transparent to-transparent" />

            {/* Bot Center Icon */}
            <div className="absolute z-20 h-4 w-4 rounded-full bg-cyan-400 border-2 border-slate-950 flex items-center justify-center shadow-lg shadow-cyan-400/50">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
            </div>

            {/* Render Players on Circular Radar */}
            {players.map((p) => {
              // Convert bearing & distance to (x, y) coordinates relative to center
              const angleRad = ((p.relativeBearingDeg - 90) * Math.PI) / 180;
              const radiusNormalized = Math.min(1, p.distanceBlocks / radarZoom);
              // Max radius inside radar is ~120px
              const maxRadiusPx = 130;
              const px = Math.cos(angleRad) * radiusNormalized * maxRadiusPx;
              const py = Math.sin(angleRad) * radiusNormalized * maxRadiusPx;

              const isLocked = lockedTarget === p.playerName;
              const isSelected = selectedPlayer?.id === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlayer(p)}
                  style={{
                    transform: `translate(${px}px, ${py}px)`
                  }}
                  className="absolute cursor-pointer flex flex-col items-center group z-30"
                >
                  <div 
                    style={{ backgroundColor: p.dotColor }}
                    className={`h-3.5 w-3.5 rounded-full border-2 border-slate-950 shadow-md transition-transform ${
                      isLocked ? "scale-150 ring-2 ring-white animate-bounce" : "group-hover:scale-125"
                    }`}
                  />
                  <span className={`text-[9px] font-mono px-1 py-0.2 rounded mt-0.5 whitespace-nowrap ${
                    isSelected ? "bg-cyan-950 text-cyan-200 border border-cyan-600 font-bold" : "bg-slate-950/80 text-slate-300"
                  }`}>
                    {p.playerName}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2 px-2">
            <span>Center: Bot at ({Math.round(player.x)}, {Math.round(player.z)})</span>
            <button
              type="button"
              onClick={() => setShowFovCone(!showFovCone)}
              className="text-cyan-400 hover:underline"
            >
              {showFovCone ? "Hide FOV Cone" : "Show 90° FOV Cone"}
            </button>
          </div>
        </div>

        {/* Right: Selected Player Telemetry & Tactical Actions */}
        <div className="lg:col-span-6 space-y-4">
          {/* Player Selector List */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-200 font-bold flex items-center gap-1.5">
                <Users className="h-4 w-4 text-cyan-400" />
                <span>IDENTIFIED PLAYERS IN LOCATOR RADAR</span>
              </span>
              <span className="text-[10px] text-slate-500">Live 20 Hz sync</span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {players.map((p) => {
                const isSelected = (selectedPlayer?.id || players[0].id) === p.id;
                const isLocked = lockedTarget === p.playerName;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlayer(p)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-slate-950 border-cyan-500 shadow-md shadow-cyan-950/40"
                        : "bg-slate-950/50 hover:bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        style={{ backgroundColor: p.dotColor }}
                        className="h-4 w-4 rounded-full border-2 border-slate-900 shadow-sm shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100 font-mono">
                            {p.playerName}
                          </span>
                          {p.teamName && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                              {p.teamName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400">
                          <span>Bearing: <strong className="text-slate-200">{p.relativeBearingDeg > 0 ? `+${p.relativeBearingDeg}°` : `${p.relativeBearingDeg}°`} ({p.compassHeading})</strong></span>
                          <span>•</span>
                          <span>Dist: <strong className="text-cyan-300">{p.distanceBlocks}m</strong></span>
                          <span>•</span>
                          <span>{p.lineOfSight ? "👁 Visible" : "🧱 Occluded"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (lockedTarget === p.playerName) {
                            setLockedTarget(null);
                          } else {
                            setLockedTarget(p.playerName);
                            if (onLockOnPlayer) onLockOnPlayer(p.playerName);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
                          isLocked
                            ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        }`}
                      >
                        {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        <span>{isLocked ? "Locked" : "Lock"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Target Tactical Card */}
          {(() => {
            const active = selectedPlayer || players[0];
            return (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-cyan-800/60 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div 
                      style={{ backgroundColor: active.dotColor }}
                      className="h-3.5 w-3.5 rounded-full"
                    />
                    <span className="text-xs font-bold text-slate-100 font-mono">
                      Target Intelligence: {active.playerName}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                    {active.heldItem}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Distance</span>
                    <span className="text-cyan-300 font-bold">{active.distanceBlocks} blocks</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Delta Y (Elevation)</span>
                    <span className={active.deltaY >= 0 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                      {active.deltaY > 0 ? `+${active.deltaY}` : active.deltaY} blocks
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Health</span>
                    <span className="text-rose-400 font-bold">{active.health} / {active.maxHealth} HP</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Line of Sight</span>
                    <span className={active.lineOfSight ? "text-emerald-400 font-bold" : "text-slate-400"}>
                      {active.lineOfSight ? "Clear View" : "Behind Blocks"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSendChatMessage) onSendChatMessage(`Gemini follow ${active.playerName}`);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>Follow {active.playerName}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onSendChatMessage) onSendChatMessage(`Gemini greet ${active.playerName}`);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all"
                  >
                    Say Hello in Chat
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
