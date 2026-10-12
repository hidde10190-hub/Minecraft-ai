import { BlockCubeMap, VoxelBlock, BiomeType } from "../types";
import { determineBiome } from "./worldMapGenerator";

// Deterministic noise for procedural 3D block distribution
function hashCoords(x: number, y: number, z: number, seed: number = 1337): number {
  let h = seed ^ (Math.floor(x) * 374761393) ^ (Math.floor(y) * 668265263) ^ (Math.floor(z) * 964723943);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Block definitions and physical properties
export interface BlockMetadata {
  name: string;
  solid: boolean;
  transparent: boolean;
  hardness: number;
  isHazard: boolean;
  isOre: boolean;
  lightLevel: number;
  symbol: string;
}

export const BLOCK_METADATA_REGISTRY: Record<string, BlockMetadata> = {
  "minecraft:air": { name: "minecraft:air", solid: false, transparent: true, hardness: 0, isHazard: false, isOre: false, lightLevel: 15, symbol: "." },
  "minecraft:stone": { name: "minecraft:stone", solid: true, transparent: false, hardness: 1.5, isHazard: false, isOre: false, lightLevel: 0, symbol: "#" },
  "minecraft:deepslate": { name: "minecraft:deepslate", solid: true, transparent: false, hardness: 3.0, isHazard: false, isOre: false, lightLevel: 0, symbol: "D" },
  "minecraft:cobblestone": { name: "minecraft:cobblestone", solid: true, transparent: false, hardness: 2.0, isHazard: false, isOre: false, lightLevel: 0, symbol: "C" },
  "minecraft:dirt": { name: "minecraft:dirt", solid: true, transparent: false, hardness: 0.5, isHazard: false, isOre: false, lightLevel: 0, symbol: "d" },
  "minecraft:grass_block": { name: "minecraft:grass_block", solid: true, transparent: false, hardness: 0.6, isHazard: false, isOre: false, lightLevel: 0, symbol: "G" },
  "minecraft:sand": { name: "minecraft:sand", solid: true, transparent: false, hardness: 0.5, isHazard: false, isOre: false, lightLevel: 0, symbol: "s" },
  "minecraft:gravel": { name: "minecraft:gravel", solid: true, transparent: false, hardness: 0.6, isHazard: false, isOre: false, lightLevel: 0, symbol: "g" },
  "minecraft:water": { name: "minecraft:water", solid: false, transparent: true, hardness: 100, isHazard: false, isOre: false, lightLevel: 0, symbol: "~" },
  "minecraft:lava": { name: "minecraft:lava", solid: false, transparent: true, hardness: 100, isHazard: true, isOre: false, lightLevel: 15, symbol: "!" },
  "minecraft:fire": { name: "minecraft:fire", solid: false, transparent: true, hardness: 0, isHazard: true, isOre: false, lightLevel: 15, symbol: "^" },
  "minecraft:magma_block": { name: "minecraft:magma_block", solid: true, transparent: false, hardness: 0.5, isHazard: true, isOre: false, lightLevel: 3, symbol: "M" },
  "minecraft:obsidian": { name: "minecraft:obsidian", solid: true, transparent: false, hardness: 50.0, isHazard: false, isOre: false, lightLevel: 0, symbol: "O" },
  "minecraft:diamond_ore": { name: "minecraft:diamond_ore", solid: true, transparent: false, hardness: 3.0, isOre: true, isHazard: false, lightLevel: 0, symbol: "$" },
  "minecraft:deepslate_diamond_ore": { name: "minecraft:deepslate_diamond_ore", solid: true, transparent: false, hardness: 4.5, isOre: true, isHazard: false, lightLevel: 0, symbol: "$" },
  "minecraft:iron_ore": { name: "minecraft:iron_ore", solid: true, transparent: false, hardness: 3.0, isOre: true, isHazard: false, lightLevel: 0, symbol: "I" },
  "minecraft:deepslate_iron_ore": { name: "minecraft:deepslate_iron_ore", solid: true, transparent: false, hardness: 4.5, isOre: true, isHazard: false, lightLevel: 0, symbol: "I" },
  "minecraft:gold_ore": { name: "minecraft:gold_ore", solid: true, transparent: false, hardness: 3.0, isOre: true, isHazard: false, lightLevel: 0, symbol: "Y" },
  "minecraft:coal_ore": { name: "minecraft:coal_ore", solid: true, transparent: false, hardness: 3.0, isOre: true, isHazard: false, lightLevel: 0, symbol: "o" },
  "minecraft:redstone_ore": { name: "minecraft:redstone_ore", solid: true, transparent: false, hardness: 3.0, isOre: true, isHazard: false, lightLevel: 0, symbol: "R" },
  "minecraft:copper_ore": { name: "minecraft:copper_ore", solid: true, transparent: false, hardness: 3.0, isOre: true, isHazard: false, lightLevel: 0, symbol: "c" },
  "minecraft:oak_log": { name: "minecraft:oak_log", solid: true, transparent: false, hardness: 2.0, isOre: false, isHazard: false, lightLevel: 0, symbol: "W" },
  "minecraft:oak_planks": { name: "minecraft:oak_planks", solid: true, transparent: false, hardness: 2.0, isOre: false, isHazard: false, lightLevel: 0, symbol: "p" },
  "minecraft:oak_leaves": { name: "minecraft:oak_leaves", solid: true, transparent: true, hardness: 0.2, isOre: false, isHazard: false, lightLevel: 0, symbol: "L" },
  "minecraft:torch": { name: "minecraft:torch", solid: false, transparent: true, hardness: 0, isOre: false, isHazard: false, lightLevel: 14, symbol: "t" },
  "minecraft:chest": { name: "minecraft:chest", solid: true, transparent: false, hardness: 2.5, isOre: false, isHazard: false, lightLevel: 0, symbol: "H" },
  "minecraft:crafting_table": { name: "minecraft:crafting_table", solid: true, transparent: false, hardness: 2.5, isOre: false, isHazard: false, lightLevel: 0, symbol: "T" },
  "minecraft:furnace": { name: "minecraft:furnace", solid: true, transparent: false, hardness: 3.5, isOre: false, isHazard: false, lightLevel: 0, symbol: "F" },
  "minecraft:bedrock": { name: "minecraft:bedrock", solid: true, transparent: false, hardness: -1, isOre: false, isHazard: false, lightLevel: 0, symbol: "B" },
};

export function getBlockMeta(blockName: string): BlockMetadata {
  const clean = blockName.startsWith("minecraft:") ? blockName : `minecraft:${blockName}`;
  return (
    BLOCK_METADATA_REGISTRY[clean] || {
      name: clean,
      solid: !clean.includes("air") && !clean.includes("water") && !clean.includes("lava"),
      transparent: clean.includes("air") || clean.includes("glass") || clean.includes("leaves"),
      hardness: 1.5,
      isHazard: clean.includes("lava") || clean.includes("fire") || clean.includes("magma"),
      isOre: clean.includes("ore"),
      lightLevel: clean.includes("torch") || clean.includes("lava") ? 14 : 0,
      symbol: clean.includes("ore") ? "$" : "#",
    }
  );
}

// Procedural 3D Block Query at exact world coordinate
export function getProceduralBlockAt(x: number, y: number, z: number, seed: number = 1337): string {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);

  if (iy <= -64) return "minecraft:bedrock";

  // Base surface height
  const n1 = hashCoords(ix * 0.05, 0, iz * 0.05, seed);
  const n2 = hashCoords(ix * 0.01, 0, iz * 0.01, seed + 100);
  const surfaceY = Math.floor(62 + (n1 - 0.5) * 8 + (n2 - 0.5) * 16);

  // 3D Cave Noise
  const caveNoise = hashCoords(ix * 0.12, iy * 0.12, iz * 0.12, seed + 500);
  const isCave = iy < surfaceY - 2 && caveNoise > 0.78 && iy > -55;

  if (isCave) {
    if (iy < -40 && hashCoords(ix, iy, iz, seed + 999) > 0.85) {
      return "minecraft:lava";
    }
    return "minecraft:air";
  }

  // Air above surface
  if (iy > surfaceY) {
    // Check for trees (trunk / leaves)
    const treeRand = hashCoords(ix, 0, iz, seed + 777);
    if (treeRand > 0.96 && iy <= surfaceY + 5) {
      if (iy === surfaceY + 1 || iy === surfaceY + 2 || iy === surfaceY + 3) {
        return "minecraft:oak_log";
      }
      return "minecraft:oak_leaves";
    }
    return "minecraft:air";
  }

  // Surface top block
  if (iy === surfaceY) {
    if (surfaceY <= 62) return "minecraft:sand";
    return "minecraft:grass_block";
  }

  // Subsurface (1-4 blocks below surface)
  if (iy >= surfaceY - 3) {
    return "minecraft:dirt";
  }

  // Deep underground: Check for Ores
  const oreRand = hashCoords(ix, iy, iz, seed + 333);
  if (iy < 16 && iy > -60 && oreRand > 0.985) {
    return iy < 0 ? "minecraft:deepslate_diamond_ore" : "minecraft:diamond_ore";
  }
  if (iy < 40 && oreRand > 0.96) {
    return iy < 0 ? "minecraft:deepslate_iron_ore" : "minecraft:iron_ore";
  }
  if (iy < 28 && oreRand > 0.975) {
    return "minecraft:gold_ore";
  }
  if (iy < 50 && oreRand > 0.94) {
    return "minecraft:coal_ore";
  }
  if (iy < 12 && oreRand > 0.97) {
    return "minecraft:redstone_ore";
  }

  // Deepslate layer
  if (iy < 0) {
    return "minecraft:deepslate";
  }

  return "minecraft:stone";
}

/**
 * Normalizes a raw live-world cube map payload (from the Fabric bridge /api/cube-map or the
 * server proxy) into the full BlockCubeMap structure used everywhere in the app. Rebuilds the
 * derived fields (min/max, layers, summary extras) from the REAL voxels so no procedural data
 * can leak into AI perception. Returns null if the payload is not a usable live scan.
 */
export function normalizeLiveCubeMap(raw: any): BlockCubeMap | null {
  try {
    if (!raw || !Array.isArray(raw.voxels) || raw.voxels.length === 0) return null;

    const center = (Array.isArray(raw.center) ? raw.center : [0, 64, 0]).map((n: number) => Math.floor(n)) as [number, number, number];
    const r = Math.max(1, Math.min(16, Math.floor(raw.radius ?? 8)));
    const width = r * 2 + 1;

    const voxels: VoxelBlock[] = raw.voxels.map((v: any) => {
      const name = String(v.name).startsWith("minecraft:") ? v.name : `minecraft:${v.name}`;
      const meta = getBlockMeta(name);
      return {
        x: Math.floor(v.x),
        y: Math.floor(v.y),
        z: Math.floor(v.z),
        name,
        solid: typeof v.solid === "boolean" ? v.solid : meta.solid,
        transparent: meta.transparent,
        hardness: meta.hardness,
        light: meta.lightLevel,
        isHazard: !!v.isHazard || meta.isHazard,
        isOre: !!v.isOre || meta.isOre,
      };
    });

    const blockCounts: Record<string, number> = {};
    const ores: { name: string; pos: [number, number, number]; distance: number }[] = [];
    const woodLogs: { name: string; pos: [number, number, number]; distance: number }[] = [];
    const interactives: { name: string; pos: [number, number, number]; distance: number }[] = [];
    const hazards: { name: string; pos: [number, number, number] }[] = [];
    const walkableSurfaces: [number, number, number][] = [];
    let solidCount = 0;
    let airCount = 0;
    let highestBlockY = -999;
    let lowestBlockY = 999;

    for (const v of voxels) {
      const cleanName = v.name.replace(/^minecraft:/, "");
      blockCounts[cleanName] = (blockCounts[cleanName] || 0) + 1;
      if (v.solid) {
        solidCount++;
        highestBlockY = Math.max(highestBlockY, v.y);
        lowestBlockY = Math.min(lowestBlockY, v.y);
      } else {
        airCount++;
      }
      const dx = v.x - center[0], dy = v.y - center[1], dz = v.z - center[2];
      const dist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 10) / 10;
      if (v.isOre) ores.push({ name: cleanName, pos: [v.x, v.y, v.z], distance: dist });
      if (cleanName.includes("log") || cleanName.includes("wood") || cleanName.includes("stem"))
        woodLogs.push({ name: cleanName, pos: [v.x, v.y, v.z], distance: dist });
      if (cleanName.includes("crafting_table") || cleanName.includes("chest") || cleanName.includes("furnace") || cleanName.includes("anvil"))
        interactives.push({ name: cleanName, pos: [v.x, v.y, v.z], distance: dist });
      if (v.isHazard) hazards.push({ name: cleanName, pos: [v.x, v.y, v.z] });
    }

    // Walkable surface detection: air directly above a solid block within scan bounds
    const voxelKey = (x: number, y: number, z: number) => `${x},${y},${z}`;
    const byPos = new Map<string, VoxelBlock>();
    for (const v of voxels) byPos.set(voxelKey(v.x, v.y, v.z), v);
    for (const v of voxels) {
      if (!v.solid) continue;
      const above = byPos.get(voxelKey(v.x, v.y + 1, v.z));
      if (above === undefined || !above.solid) {
        // Above is either outside scan range (assume air) or non-solid → candidate stand spot
        if (highestBlockY > -999 && Math.abs(v.y - center[1]) <= r) {
          walkableSurfaces.push([v.x, v.y + 1, v.z]);
        }
      }
    }

    // Rebuild ASCII layers from real voxels
    const layers: Record<string, string[][]> = {};
    for (let dy = r; dy >= -r; dy--) {
      const y = center[1] + dy;
      const layer2D: string[][] = [];
      for (let dz = -r; dz <= r; dz++) {
        const row: string[] = [];
        for (let dx = -r; dx <= r; dx++) {
          const v = byPos.get(voxelKey(center[0] + dx, y, center[2] + dz));
          row.push(v ? getBlockMeta(v.name).symbol : ".");
        }
        layer2D.push(row);
      }
      layers[`y${y}`] = layer2D;
    }

    ores.sort((a, b) => a.distance - b.distance);
    woodLogs.sort((a, b) => a.distance - b.distance);
    interactives.sort((a, b) => a.distance - b.distance);

    return {
      center,
      radius: r,
      dimensions: { width, height: width, depth: width },
      min: [center[0] - r, center[1] - r, center[2] - r],
      max: [center[0] + r, center[1] + r, center[2] + r],
      totalBlocks: width * width * width,
      solidBlocks: solidCount,
      airBlocks: width * width * width - solidCount,
      voxels,
      summary: {
        ores,
        woodLogs,
        interactives,
        hazards,
        walkableSurfaces: walkableSurfaces.slice(0, 24),
        blockCounts,
        highestBlockY: highestBlockY === -999 ? center[1] : highestBlockY,
        lowestBlockY: lowestBlockY === 999 ? center[1] : lowestBlockY,
        densityPct: Math.round((solidCount / (width * width * width)) * 100),
      },
      layers,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches the LIVE world cube map from the Fabric bridge via the server proxy.
 * Falls back to procedural generation ONLY when no live game connection exists.
 */
export async function fetchLiveCubeMap(
  center: [number, number, number],
  radius: number = 8
): Promise<{ cube: BlockCubeMap; source: "live_minecraft_world" | "procedural_fallback" }> {
  // The server proxy already handles the bridge's async-scan handshake (202 scanning),
  // but give it enough time to complete one full poll cycle before falling back.
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `/api/bot/cube-map?x=${Math.round(center[0])}&y=${Math.round(center[1])}&z=${Math.round(center[2])}&radius=${radius}`,
      { signal: controller.signal }
    );
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      if (data.source === "live_minecraft_bridge" || data.source === "live_minecraft_world") {
        const normalized = normalizeLiveCubeMap(data);
        if (normalized) return { cube: normalized, source: "live_minecraft_world" };
      }
      // Server returned its own procedural map (bridge offline) — accept it but mark fallback
      const normalized = normalizeLiveCubeMap(data);
      if (normalized) return { cube: normalized, source: "procedural_fallback" };
    }
  } catch {
    // Bridge/server unreachable — fall through to local procedural
  }
  return { cube: generate3DBlockCubeMap(center, radius), source: "procedural_fallback" };
}

/**
 * Generates a full 3D Cube Map of blocks centered on a position with specified radius R.
 * Size = (2R + 1) ^ 3 voxels.
 * Example: radius 2 = 5x5x5 = 125 blocks.
 * Example: radius 3 = 7x7x7 = 343 blocks.
 * Example: radius 4 = 9x9x9 = 729 blocks.
 */
export function generate3DBlockCubeMap(
  center: [number, number, number],
  radius: number = 3,
  blockLookupFn?: (x: number, y: number, z: number) => string
): BlockCubeMap {
  const cx = Math.floor(center[0]);
  const cy = Math.floor(center[1]);
  const cz = Math.floor(center[2]);
  const r = Math.max(1, Math.min(10, Math.floor(radius)));

  const width = r * 2 + 1;
  const height = r * 2 + 1;
  const depth = r * 2 + 1;
  const totalBlocks = width * height * depth;

  const min: [number, number, number] = [cx - r, cy - r, cz - r];
  const max: [number, number, number] = [cx + r, cy + r, cz + r];

  const voxels: VoxelBlock[] = [];
  const blockCounts: Record<string, number> = {};
  const ores: { name: string; pos: [number, number, number]; distance: number }[] = [];
  const woodLogs: { name: string; pos: [number, number, number]; distance: number }[] = [];
  const interactives: { name: string; pos: [number, number, number]; distance: number }[] = [];
  const hazards: { name: string; pos: [number, number, number] }[] = [];
  const walkableSurfaces: [number, number, number][] = [];
  const layers: Record<string, string[][]> = {};

  let solidCount = 0;
  let airCount = 0;
  let highestBlockY = -999;
  let lowestBlockY = 999;

  // 3D Voxel Scanning Loop (Y from max to min, Z from min to max, X from min to max)
  for (let dy = r; dy >= -r; dy--) {
    const y = cy + dy;
    const layerKey = `y${y}`;
    const layer2D: string[][] = [];

    for (let dz = -r; dz <= r; dz++) {
      const z = cz + dz;
      const row: string[] = [];

      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const blockName = blockLookupFn
          ? blockLookupFn(x, y, z)
          : getProceduralBlockAt(x, y, z);

        const cleanName = blockName.replace(/^minecraft:/, "");
        const meta = getBlockMeta(blockName);

        // Track counts
        blockCounts[cleanName] = (blockCounts[cleanName] || 0) + 1;

        if (meta.solid) {
          solidCount++;
          if (y > highestBlockY) highestBlockY = y;
          if (y < lowestBlockY) lowestBlockY = y;
        } else {
          airCount++;
        }

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (meta.isOre) {
          ores.push({ name: cleanName, pos: [x, y, z], distance: Math.round(dist * 10) / 10 });
        }

        const isWood = cleanName.includes("log") || cleanName.includes("wood") || cleanName.includes("stem");
        const isInteractive = cleanName.includes("crafting_table") || cleanName.includes("chest") || cleanName.includes("furnace") || cleanName.includes("anvil");
        if (isWood) {
          woodLogs.push({ name: cleanName, pos: [x, y, z], distance: Math.round(dist * 10) / 10 });
        }
        if (isInteractive) {
          interactives.push({ name: cleanName, pos: [x, y, z], distance: Math.round(dist * 10) / 10 });
        }

        if (meta.isHazard) {
          hazards.push({ name: cleanName, pos: [x, y, z] });
        }

        // Check if walkable (solid block, with air at y+1 and y+2)
        const blockAbove = blockLookupFn ? blockLookupFn(x, y + 1, z) : getProceduralBlockAt(x, y + 1, z);
        const isWalkable = meta.solid && getBlockMeta(blockAbove).transparent;
        if (isWalkable) {
          walkableSurfaces.push([x, y, z]);
        }

        voxels.push({
          x,
          y,
          z,
          name: blockName,
          solid: meta.solid,
          transparent: meta.transparent,
          hardness: meta.hardness,
          light: meta.lightLevel,
          isHazard: meta.isHazard,
          isOre: meta.isOre,
          isWalkable,
        });

        row.push(cleanName);
      }
      layer2D.push(row);
    }
    layers[layerKey] = layer2D;
  }

  // Build Compact ASCII View for AI Prompt & Inspection
  const asciiLines: string[] = [];
  asciiLines.push(`3D Cube Map [Radius ${r}, Center (${cx}, ${cy}, ${cz})]:`);
  for (let dy = r; dy >= -r; dy--) {
    const y = cy + dy;
    asciiLines.push(`--- Level Y=${y} ${y === cy ? "[BOT ELEVATION]" : ""} ---`);
    for (let dz = -r; dz <= r; dz++) {
      const z = cz + dz;
      let rowStr = "";
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        if (dx === 0 && dy === 0 && dz === 0) {
          rowStr += "[@]"; // Bot center position
        } else {
          const b = blockLookupFn ? blockLookupFn(x, y, z) : getProceduralBlockAt(x, y, z);
          const meta = getBlockMeta(b);
          rowStr += `[${meta.symbol}]`;
        }
      }
      asciiLines.push(rowStr);
    }
  }

  const densityPct = Math.round((solidCount / totalBlocks) * 100);

  return {
    center: [cx, cy, cz],
    radius: r,
    dimensions: { width, height, depth },
    min,
    max,
    totalBlocks,
    solidBlocks: solidCount,
    airBlocks: airCount,
    voxels,
    summary: {
      ores: ores.sort((a, b) => a.distance - b.distance),
      woodLogs: woodLogs.sort((a, b) => a.distance - b.distance),
      interactives: interactives.sort((a, b) => a.distance - b.distance),
      hazards,
      walkableSurfaces,
      blockCounts,
      highestBlockY: highestBlockY === -999 ? cy : highestBlockY,
      lowestBlockY: lowestBlockY === 999 ? cy : lowestBlockY,
      densityPct,
    },
    layers,
    asciiMatrix: asciiLines.join("\n"),
  };
}

/**
 * Converts a 3D Block Cube Map into a highly informative, compact context string for AI Models
 */
export function formatCubeMapForAiPrompt(cube: BlockCubeMap): string {
  const { center, radius, solidBlocks, airBlocks, summary } = cube;
  const oreStr = summary.ores && summary.ores.length > 0
    ? summary.ores.map(o => `${o.name} at [${o.pos.join(",")}] (dist ${o.distance}m)`).join(", ")
    : "None in range";

  const woodStr = summary.woodLogs && summary.woodLogs.length > 0
    ? summary.woodLogs.map(w => `${w.name} at [${w.pos.join(",")}] (dist ${w.distance}m)`).join(", ")
    : "None in range";

  const interactStr = summary.interactives && summary.interactives.length > 0
    ? summary.interactives.map(i => `${i.name} at [${i.pos.join(",")}] (dist ${i.distance}m)`).join(", ")
    : "None in range";
  
  const hazardStr = summary.hazards.length > 0
    ? summary.hazards.map(h => `DANGER: ${h.name} at [${h.pos.join(",")}]`).join(" | ")
    : "None detected (Clear)";

  const topBlocks = Object.entries(summary.blockCounts)
    .filter(([k]) => k !== "air")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => `${k} (x${v})`)
    .join(", ");

  return `[3D Block Cube Map Perception - Radius ${radius} (${cube.dimensions.width}x${cube.dimensions.height}x${cube.dimensions.depth} = ${cube.totalBlocks} voxels)]:
Center: [${center.join(", ")}] | Solid: ${solidBlocks} | Air: ${airBlocks} (Density: ${summary.densityPct}%)
Primary Blocks: ${topBlocks || "Air"}
Detected Wood/Tree Logs (For Mining): ${woodStr}
Detected Ores: ${oreStr}
Workstations & Containers: ${interactStr}
Environmental Hazards: ${hazardStr}
Walkable Ground Y-Levels: ${Array.from(new Set(summary.walkableSurfaces.map(s => s[1]))).join(", ") || "None"}
Surrounding ASCII Matrix:
${cube.asciiMatrix}
Legend: [@] Bot, [#] Stone/Solid, [D] Deepslate, [$] Ore, [~] Water, [!] Lava (Hazard), [.] Air, [W] Wood, [G] Grass`;
}
