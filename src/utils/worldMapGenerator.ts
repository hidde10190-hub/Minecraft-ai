import { BiomeType, DiscoveredChunk } from "../types";

// Seeded pseudo-random noise functions for deterministic terrain generation
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function noise2D(x: number, y: number, seed: number = 1337): number {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const fx = x - X;
  const fy = y - Y;

  // Smooth interpolation curve (Hermite / Smoothstep)
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const n00 = pseudoRandom(X * 374761393 + Y * 668265263 + seed);
  const n10 = pseudoRandom((X + 1) * 374761393 + Y * 668265263 + seed);
  const n01 = pseudoRandom(X * 374761393 + (Y + 1) * 668265263 + seed);
  const n11 = pseudoRandom((X + 1) * 374761393 + (Y + 1) * 668265263 + seed);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;

  return nx0 * (1 - v) + nx1 * v;
}

// Multi-octave fractal noise
function fbm2D(x: number, y: number, octaves: number = 4, seed: number = 1337): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let max = 0;

  for (let i = 0; i < octaves; i++) {
    value += noise2D(x * frequency, y * frequency, seed + i * 101) * amplitude;
    max += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / max;
}

export function determineBiome(x: number, z: number, seed: number = 42): BiomeType {
  const temp = fbm2D(x * 0.003, z * 0.003, 3, seed);
  const moisture = fbm2D(x * 0.003 + 500, z * 0.003 + 500, 3, seed + 10);
  const elevation = fbm2D(x * 0.005, z * 0.005, 4, seed + 20);

  // River check (narrow valleys)
  const riverNoise = Math.abs(fbm2D(x * 0.008, z * 0.008, 3, seed + 99) - 0.5);
  if (riverNoise < 0.03 && elevation < 0.65) {
    return "river";
  }

  if (elevation < 0.32) {
    return elevation < 0.22 ? "deep_ocean" : "ocean";
  }

  if (elevation > 0.75) {
    return temp < 0.4 ? "snowy_slopes" : "mountains";
  }

  if (temp > 0.68) {
    return moisture < 0.35 ? "desert" : moisture < 0.6 ? "savanna" : "badlands";
  }

  if (temp < 0.35) {
    return moisture > 0.6 ? "snowy_slopes" : "mountains";
  }

  if (moisture > 0.7) {
    return temp > 0.55 ? "jungle" : "dark_forest";
  }

  if (moisture > 0.45) {
    return temp > 0.5 ? "cherry_grove" : "forest";
  }

  if (moisture < 0.3) {
    return "plains";
  }

  return "plains";
}

// Biome color palette for surface mapping
export const BIOME_COLORS: Record<BiomeType, { base: string; light: string; dark: string; block: string }> = {
  plains: { base: "#618b3d", light: "#72a249", dark: "#4f7231", block: "minecraft:grass_block" },
  forest: { base: "#3f6a27", light: "#4c7d30", dark: "#2f501d", block: "minecraft:oak_leaves" },
  dark_forest: { base: "#244018", light: "#2e511f", dark: "#1a2f11", block: "minecraft:dark_oak_leaves" },
  desert: { base: "#cfb56c", light: "#deca87", dark: "#b59c55", block: "minecraft:sand" },
  mountains: { base: "#686a68", light: "#7a7d7a", dark: "#555755", block: "minecraft:stone" },
  snowy_slopes: { base: "#d8e4e8", light: "#ecf4f7", dark: "#c0cbd0", block: "minecraft:snow_block" },
  ocean: { base: "#255393", light: "#3067b5", dark: "#1c4073", block: "minecraft:water" },
  deep_ocean: { base: "#173461", light: "#1f447d", dark: "#102342", block: "minecraft:water" },
  river: { base: "#2c64aa", light: "#3b7acc", dark: "#224d85", block: "minecraft:water" },
  swamp: { base: "#455938", light: "#536b44", dark: "#36472c", block: "minecraft:mud" },
  savanna: { base: "#85813f", light: "#9a964a", dark: "#6f6c34", block: "minecraft:grass_block" },
  jungle: { base: "#2f721a", light: "#398820", dark: "#245814", block: "minecraft:jungle_leaves" },
  badlands: { base: "#9e5527", light: "#b46430", dark: "#85451e", block: "minecraft:terracotta" },
  cherry_grove: { base: "#c87896", light: "#dc8da9", dark: "#ab617c", block: "minecraft:cherry_leaves" },
};

export function generateChunk(cx: number, cz: number, seed: number = 42, tick: number = 0): DiscoveredChunk {
  const worldX = cx * 16;
  const worldZ = cz * 16;

  const biome = determineBiome(worldX + 8, worldZ + 8, seed);
  const baseElev = fbm2D((worldX + 8) * 0.005, (worldZ + 8) * 0.005, 4, seed + 20);
  const baseHeight = Math.floor(62 + (baseElev - 0.45) * 40);

  const blocks: string[] = [];
  const heights: number[] = [];

  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const bx = worldX + lx;
      const bz = worldZ + lz;
      const localElev = fbm2D(bx * 0.015, bz * 0.015, 3, seed + 50);
      const h = Math.max(30, Math.floor(baseHeight + (localElev - 0.5) * 12));
      heights.push(h);

      if (h <= 62 && (biome === "ocean" || biome === "deep_ocean" || biome === "river")) {
        blocks.push("minecraft:water");
      } else if (biome === "desert") {
        blocks.push("minecraft:sand");
      } else if (biome === "mountains" || biome === "snowy_slopes") {
        blocks.push(h > 85 ? "minecraft:snow_block" : "minecraft:stone");
      } else if (biome === "badlands") {
        blocks.push("minecraft:terracotta");
      } else {
        blocks.push("minecraft:grass_block");
      }
    }
  }

  // Structure discovery chances
  const structRand = pseudoRandom(cx * 9973 + cz * 4657 + seed);
  let hasStructure: DiscoveredChunk["hasStructure"] = undefined;
  let structurePos: [number, number] | undefined = undefined;

  if (structRand < 0.035 && biome === "plains") {
    hasStructure = "village";
    structurePos = [worldX + 8, worldZ + 8];
  } else if (structRand > 0.965 && (biome === "desert" || biome === "badlands")) {
    hasStructure = "desert_pyramid";
    structurePos = [worldX + 8, worldZ + 8];
  } else if (structRand > 0.48 && structRand < 0.51) {
    hasStructure = "ruined_portal";
    structurePos = [worldX + 4, worldZ + 4];
  } else if (structRand > 0.88 && structRand < 0.90) {
    hasStructure = "outpost";
    structurePos = [worldX + 10, worldZ + 10];
  }

  return {
    cx,
    cz,
    biome,
    baseHeight,
    discoveredAtTick: tick,
    blocks,
    heights,
    hasStructure,
    structurePos,
  };
}
