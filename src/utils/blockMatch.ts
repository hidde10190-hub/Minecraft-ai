// Token-aware Minecraft block/item matching shared by the client-side engines.
// Mirrors the server.ts implementation. Substring matching ("oak_log".includes("log"))
// made DIFFERENT materials look identical: expected 'stone' matched inventory
// 'stone_bricks', and oak logs got counted/placed as stone bricks. These helpers
// match on underscore TOKENS instead, with a family guard (wood/log vs brick vs
// plank vs glass vs ore never bridge across families).

const GENERIC_BLOCK_TOKENS = new Set([
  "oak", "birch", "spruce", "jungle", "acacia", "dark_oak", "mangrove", "cherry",
  "crimson", "warped", "smooth", "polished", "cut", "mossy", "raw", "deepslate",
  "blackstone", "nether", "old", "new", "normal", "block", "blocks", "item", "items",
]);
const FAMILY_BLOCK_TOKENS = new Set([
  "log", "logs", "wood", "plank", "planks", "slab", "stairs", "fence", "fences",
  "fence_gate", "gate", "door", "trapdoor", "button", "pressure_plate", "sign",
  "wall_sign", "beam", "bark", "leaf", "leaves", "brick", "bricks", "ore",
  "glass", "pane", "panes", "tile", "tiles", "pillar", "pilar",
]);

export function blockTokens(name: string): string[] {
  return String(name || "").toLowerCase().replace(/^minecraft:/, "").split(/[^a-z0-9]+/).filter(Boolean);
}

/** Canonicalize a block/item ID for EXACT comparison: strip namespace, block
 *  state suffixes ([...]), trailing "_block", and normalize singular/plural
 *  variants (plank->planks, stone_brick->stone_bricks). Shared by App.tsx so
 *  hotbar matching never depends on cosmetic ID spelling differences. */
export function normalizeBlockId(block: string | undefined | null): string {
  if (!block) return "";
  let b = String(block).toLowerCase().trim().replace(/^minecraft:/, "");
  if (b.includes("[")) b = b.split("[")[0].trim();
  b = b.replace(/_block$/, "");
  if (b === "grass") return "short_grass";
  if (b === "stone_brick") return "stone_bricks";
  if (b === "plank") return "planks";
  if (b === "oak_plank") return "oak_planks";
  if (b === "spruce_plank") return "spruce_planks";
  if (b === "birch_plank") return "birch_planks";
  if (b === "dark_oak_plank") return "dark_oak_planks";
  if (b === "brick") return "bricks";
  return b;
}

/** Strict exact-match check between a held item and an expected block ID.
 *  Returns false for air/empty; otherwise compares canonicalized IDs. */
export function isExactBlockMatch(heldItem: string | undefined | null, expectedBlock: string | undefined | null): boolean {
  const a = normalizeBlockId(heldItem);
  const b = normalizeBlockId(expectedBlock);
  if (!a || !b || a === "air" || b === "air") return false;
  return a === b;
}

/** True if two full block/item IDs refer to the same material family (never across families). */
export function blockNamesCompatible(aRaw: string, bRaw: string): boolean {
  const a = String(aRaw || "").toLowerCase().replace(/^minecraft:/, "");
  const b = String(bRaw || "").toLowerCase().replace(/^minecraft:/, "");
  if (!a || !b) return false;
  if (a === b) return true;
  const at = blockTokens(a), bt = new Set(blockTokens(b));
  const famOf = (name: string): string | null => {
    const t = blockTokens(name);
    if (t.some((x) => /log|wood|stem/.test(x))) return "wood";
    if (t.some((x) => /brick/.test(x))) return "brick";
    if (t.some((x) => /plank/.test(x))) return "plank";
    if (t.some((x) => /glass/.test(x))) return "glass";
    if (t.some((x) => /ore/.test(x))) return "ore";
    return null;
  };
  const fa = famOf(a), fb = famOf(b);
  if (fa && fb && fa !== fb) return false;
  for (const tok of at) {
    if (bt.has(tok) && !GENERIC_BLOCK_TOKENS.has(tok) && !FAMILY_BLOCK_TOKENS.has(tok)) return true;
  }
  // Variant suffixes: mossy_cobblestone ~ cobblestone (base tokens fully contained,
  // extras only generic/family tokens).
  const bAsSet = new Set(at);
  const extraA = at.filter((t) => !bt.has(t));
  const extraB = [...bt].filter((t) => !bAsSet.has(t));
  const shorterFirst = at.length <= bt.size;
  const extras = shorterFirst ? extraB : extraA;
  const base = shorterFirst ? at : [...bt];
  const other = shorterFirst ? bt : bAsSet;
  if (base.every((t) => other.has(t)) && extras.length > 0 &&
      extras.every((t) => GENERIC_BLOCK_TOKENS.has(t) || FAMILY_BLOCK_TOKENS.has(t))) {
    // STRICT VARIANT GUARD: the longer name must be ONE coherent variant of the
    // shorter base - all its non-generic tokens belong to the same material word.
    // Stops 'stone' (vanilla stone) from matching 'stone_bricks': 'brick' is a
    // DIFFERENT material, not a modifier like 'mossy'/'smooth'.
    const specific = shorterFirst ? extraB : extraA;
    const materialToks = specific.filter((t) => !GENERIC_BLOCK_TOKENS.has(t));
    const baseJoined = base.join("_");
    const okVariant = materialToks.every((t) => baseJoined.includes(t) || t.includes(baseJoined) ||
      [...base].some((bTok) => bTok.length >= 4 && (t.includes(bTok) || bTok.includes(t))));
    if (!okVariant) return false;
    return true;
  }
  return false;
}

/** Item IDs that look block-ish but are NOT placeable (substring traps). */
const NON_BLOCK_TRAPS = new Set([
  "redstone", "glowstone_dust", "ender_pearl", "blaze_rod", "breeze_rod", "bone",
  "nether_wart", "wheat", "honey_bottle", "dragon_breath", "fire_charge", "snowball",
]);

/** Is an item stack placeable as a block (not air/tool/weapon/armor/food)?
 *  Token-aware: "oak_log" must NOT be rejected because it contains the letters
 *  "a-x-e"; tools/weapons match only on underscore-delimited tokens or exact
 *  suffixes. Unknown items default to PLACEABLE (the real hotbar telemetry and
 *  the placement material guard provide correctness; over-rejecting here was
 *  why the bot stopped placing valid blocks entirely). */
export function isPlaceableBlockItem(itemRaw: any): boolean {
  const s = String(itemRaw?.item ?? itemRaw ?? "").toLowerCase().replace(/^minecraft:/, "");
  if (!s || s === "air") return false;
  if (NON_BLOCK_TRAPS.has(s)) return false;
  if (typeof itemRaw?.isBlock === "boolean") return itemRaw.isBlock;
  const toks = s.split(/[^a-z0-9]+/).filter(Boolean);
  const toolTok = ["pickaxe", "axe", "shovel", "hoe", "shears", "brush"];
  const weaponTok = ["sword", "bow", "trident", "mace", "crossbow", "shield"];
  const armorTok = ["helmet", "chestplate", "leggings", "boots", "elytra"];
  const foodTok = ["apple", "bread", "beef", "porkchop", "mutton", "chicken", "stew", "soup", "cookie", "cake"];
  const last = toks[toks.length - 1] || "";
  if (toolTok.includes(last) || toolTok.includes(s)) return false;
  if (weaponTok.includes(last) || weaponTok.includes(s)) return false;
  if (armorTok.includes(last) || armorTok.includes(s)) return false;
  if (s === "fishing_rod" || s === "flint_and_steel" || s === "clock" || s === "compass" || s === "map" || s === "stick" || s === "string" || s === "feather") return false;
  if (s.endsWith("_bucket") || s.endsWith("_potion") || s.startsWith("potion") || s.endsWith("_boat") || s.endsWith("_minecart") || s.endsWith("_seeds") || s.endsWith("_spawn_egg") || s.startsWith("music_disc") || s.endsWith("_ingot") || s.endsWith("_shard")) return false;
  // Food heuristic only for clearly-edible names (never matches "_cooked_-anything" blocks)
  if (foodTok.some((t) => toks.includes(t))) return false;
  return true;
}
