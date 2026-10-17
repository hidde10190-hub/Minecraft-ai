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

/** Is an item stack placeable as a block (not air/tool/weapon/armor/food)? */
export function isPlaceableBlockItem(itemRaw: any): boolean {
  const s = String(itemRaw?.item ?? itemRaw ?? "").toLowerCase().replace(/^minecraft:/, "");
  if (!s || s === "air") return false;
  if (typeof itemRaw?.isBlock === "boolean") return itemRaw.isBlock;
  if (/pickaxe|sword|shovel|hoe|bow|crossbow|shield|helmet|chestplate|leggings|boots|elytra|apple|bread|meat|cooked|potion|bucket|tnt|flint_and_steel|shears|fishing_rod/.test(s) && !/_planks|_log|_slab|_stairs|torch/.test(s)) return false;
  if (s === "stick" || s.endsWith("_axe") || s.endsWith("_sword")) return false;
  return true;
}
