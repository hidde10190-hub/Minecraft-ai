export interface RecipeIngredient {
  item: string;
  count: number;
}

export interface RecipeDef {
  id: string;
  name: string;
  category: "tools" | "weapons" | "armor" | "resources" | "utility" | "smelting" | "food";
  outputItem: string;
  outputCount: number;
  station: "player_2x2" | "crafting_3x3" | "furnace_smelt";
  pattern?: string[][]; // 2x2 or 3x3 matrix of item IDs or ""
  ingredients: RecipeIngredient[];
  description: string;
}

export const MINECRAFT_RECIPES: Record<string, RecipeDef> = {
  planks: {
    id: "planks",
    name: "Oak Planks",
    category: "resources",
    outputItem: "minecraft:oak_planks",
    outputCount: 4,
    station: "player_2x2",
    pattern: [
      ["minecraft:oak_log", ""],
      ["", ""]
    ],
    ingredients: [{ item: "minecraft:oak_log", count: 1 }],
    description: "Break 1 log into 4 wooden planks in any crafting grid."
  },
  stick: {
    id: "stick",
    name: "Sticks",
    category: "resources",
    outputItem: "minecraft:stick",
    outputCount: 4,
    station: "player_2x2",
    pattern: [
      ["minecraft:oak_planks", ""],
      ["minecraft:oak_planks", ""]
    ],
    ingredients: [{ item: "minecraft:oak_planks", count: 2 }],
    description: "Stack 2 planks vertically to produce 4 wooden sticks."
  },
  crafting_table: {
    id: "crafting_table",
    name: "Crafting Table",
    category: "utility",
    outputItem: "minecraft:crafting_table",
    outputCount: 1,
    station: "player_2x2",
    pattern: [
      ["minecraft:oak_planks", "minecraft:oak_planks"],
      ["minecraft:oak_planks", "minecraft:oak_planks"]
    ],
    ingredients: [{ item: "minecraft:oak_planks", count: 4 }],
    description: "Fill all 4 slots of player 2x2 crafting grid with planks."
  },
  chest: {
    id: "chest",
    name: "Storage Chest",
    category: "utility",
    outputItem: "minecraft:chest",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:oak_planks", "minecraft:oak_planks", "minecraft:oak_planks"],
      ["minecraft:oak_planks", "", "minecraft:oak_planks"],
      ["minecraft:oak_planks", "minecraft:oak_planks", "minecraft:oak_planks"]
    ],
    ingredients: [{ item: "minecraft:oak_planks", count: 8 }],
    description: "Ring of 8 planks in a 3x3 crafting table."
  },
  wooden_pickaxe: {
    id: "wooden_pickaxe",
    name: "Wooden Pickaxe",
    category: "tools",
    outputItem: "minecraft:wooden_pickaxe",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:oak_planks", "minecraft:oak_planks", "minecraft:oak_planks"],
      ["", "minecraft:stick", ""],
      ["", "minecraft:stick", ""]
    ],
    ingredients: [
      { item: "minecraft:oak_planks", count: 3 },
      { item: "minecraft:stick", count: 2 }
    ],
    description: "3 planks across top row, 2 sticks down middle column."
  },
  furnace: {
    id: "furnace",
    name: "Cobblestone Furnace",
    category: "utility",
    outputItem: "minecraft:furnace",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:cobblestone", "minecraft:cobblestone", "minecraft:cobblestone"],
      ["minecraft:cobblestone", "", "minecraft:cobblestone"],
      ["minecraft:cobblestone", "minecraft:cobblestone", "minecraft:cobblestone"]
    ],
    ingredients: [{ item: "minecraft:cobblestone", count: 8 }],
    description: "Ring of 8 cobblestone blocks in a 3x3 crafting grid."
  },
  stone_pickaxe: {
    id: "stone_pickaxe",
    name: "Stone Pickaxe",
    category: "tools",
    outputItem: "minecraft:stone_pickaxe",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:cobblestone", "minecraft:cobblestone", "minecraft:cobblestone"],
      ["", "minecraft:stick", ""],
      ["", "minecraft:stick", ""]
    ],
    ingredients: [
      { item: "minecraft:cobblestone", count: 3 },
      { item: "minecraft:stick", count: 2 }
    ],
    description: "3 cobblestone across top row, 2 sticks down center."
  },
  torch: {
    id: "torch",
    name: "Torches",
    category: "utility",
    outputItem: "minecraft:torch",
    outputCount: 4,
    station: "player_2x2",
    pattern: [
      ["minecraft:coal", ""],
      ["minecraft:stick", ""]
    ],
    ingredients: [
      { item: "minecraft:coal", count: 1 },
      { item: "minecraft:stick", count: 1 }
    ],
    description: "Coal above stick in any crafting grid yields 4 torches."
  },
  iron_ingot: {
    id: "iron_ingot",
    name: "Iron Ingot (Smelted)",
    category: "smelting",
    outputItem: "minecraft:iron_ingot",
    outputCount: 1,
    station: "furnace_smelt",
    ingredients: [
      { item: "minecraft:raw_iron", count: 1 },
      { item: "minecraft:coal", count: 1 }
    ],
    description: "Smelt raw iron in a furnace using coal or wood fuel."
  },
  iron_pickaxe: {
    id: "iron_pickaxe",
    name: "Iron Pickaxe",
    category: "tools",
    outputItem: "minecraft:iron_pickaxe",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:iron_ingot", "minecraft:iron_ingot", "minecraft:iron_ingot"],
      ["", "minecraft:stick", ""],
      ["", "minecraft:stick", ""]
    ],
    ingredients: [
      { item: "minecraft:iron_ingot", count: 3 },
      { item: "minecraft:stick", count: 2 }
    ],
    description: "3 iron ingots across top row, 2 sticks down middle in a 3x3 crafting table."
  },
  iron_sword: {
    id: "iron_sword",
    name: "Iron Sword",
    category: "weapons",
    outputItem: "minecraft:iron_sword",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["", "minecraft:iron_ingot", ""],
      ["", "minecraft:iron_ingot", ""],
      ["", "minecraft:stick", ""]
    ],
    ingredients: [
      { item: "minecraft:iron_ingot", count: 2 },
      { item: "minecraft:stick", count: 1 }
    ],
    description: "2 iron ingots vertically over 1 stick in a crafting table."
  },
  shield: {
    id: "shield",
    name: "Combat Shield",
    category: "weapons",
    outputItem: "minecraft:shield",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:oak_planks", "minecraft:iron_ingot", "minecraft:oak_planks"],
      ["minecraft:oak_planks", "minecraft:oak_planks", "minecraft:oak_planks"],
      ["", "minecraft:oak_planks", ""]
    ],
    ingredients: [
      { item: "minecraft:oak_planks", count: 6 },
      { item: "minecraft:iron_ingot", count: 1 }
    ],
    description: "6 planks in a Y shape with 1 iron ingot at top center."
  },
  bucket: {
    id: "bucket",
    name: "Iron Bucket",
    category: "utility",
    outputItem: "minecraft:bucket",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:iron_ingot", "", "minecraft:iron_ingot"],
      ["", "minecraft:iron_ingot", ""],
      ["", "", ""]
    ],
    ingredients: [{ item: "minecraft:iron_ingot", count: 3 }],
    description: "3 iron ingots in a V shape in a crafting table."
  },
  flint_and_steel: {
    id: "flint_and_steel",
    name: "Flint & Steel",
    category: "utility",
    outputItem: "minecraft:flint_and_steel",
    outputCount: 1,
    station: "player_2x2",
    pattern: [
      ["minecraft:iron_ingot", ""],
      ["", "minecraft:flint"]
    ],
    ingredients: [
      { item: "minecraft:iron_ingot", count: 1 },
      { item: "minecraft:flint", count: 1 }
    ],
    description: "1 iron ingot diagonally paired with 1 piece of flint."
  },
  iron_chestplate: {
    id: "iron_chestplate",
    name: "Iron Chestplate",
    category: "armor",
    outputItem: "minecraft:iron_chestplate",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:iron_ingot", "", "minecraft:iron_ingot"],
      ["minecraft:iron_ingot", "minecraft:iron_ingot", "minecraft:iron_ingot"],
      ["minecraft:iron_ingot", "minecraft:iron_ingot", "minecraft:iron_ingot"]
    ],
    ingredients: [{ item: "minecraft:iron_ingot", count: 8 }],
    description: "8 iron ingots in a chestplate layout leaving top middle empty."
  },
  iron_helmet: {
    id: "iron_helmet",
    name: "Iron Helmet",
    category: "armor",
    outputItem: "minecraft:iron_helmet",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:iron_ingot", "minecraft:iron_ingot", "minecraft:iron_ingot"],
      ["minecraft:iron_ingot", "", "minecraft:iron_ingot"],
      ["", "", ""]
    ],
    ingredients: [{ item: "minecraft:iron_ingot", count: 5 }],
    description: "5 iron ingots forming an inverted U shape."
  },
  iron_leggings: {
    id: "iron_leggings",
    name: "Iron Leggings",
    category: "armor",
    outputItem: "minecraft:iron_leggings",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:iron_ingot", "minecraft:iron_ingot", "minecraft:iron_ingot"],
      ["minecraft:iron_ingot", "", "minecraft:iron_ingot"],
      ["minecraft:iron_ingot", "", "minecraft:iron_ingot"]
    ],
    ingredients: [{ item: "minecraft:iron_ingot", count: 7 }],
    description: "7 iron ingots forming pants/leggings."
  },
  iron_boots: {
    id: "iron_boots",
    name: "Iron Boots",
    category: "armor",
    outputItem: "minecraft:iron_boots",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:iron_ingot", "", "minecraft:iron_ingot"],
      ["minecraft:iron_ingot", "", "minecraft:iron_ingot"],
      ["", "", ""]
    ],
    ingredients: [{ item: "minecraft:iron_ingot", count: 4 }],
    description: "4 iron ingots in two vertical pairs."
  },
  bread: {
    id: "bread",
    name: "Bread",
    category: "food",
    outputItem: "minecraft:bread",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:wheat", "minecraft:wheat", "minecraft:wheat"],
      ["", "", ""],
      ["", "", ""]
    ],
    ingredients: [{ item: "minecraft:wheat", count: 3 }],
    description: "3 wheat across any horizontal row."
  },
  diamond_pickaxe: {
    id: "diamond_pickaxe",
    name: "Diamond Pickaxe",
    category: "tools",
    outputItem: "minecraft:diamond_pickaxe",
    outputCount: 1,
    station: "crafting_3x3",
    pattern: [
      ["minecraft:diamond", "minecraft:diamond", "minecraft:diamond"],
      ["", "minecraft:stick", ""],
      ["", "minecraft:stick", ""]
    ],
    ingredients: [
      { item: "minecraft:diamond", count: 3 },
      { item: "minecraft:stick", count: 2 }
    ],
    description: "3 diamonds across top row, 2 sticks down center."
  }
};

export interface PlanStep {
  step: number;
  action: "gather" | "smelt" | "craft" | "place_station";
  targetItem: string;
  count: number;
  station: "player_2x2" | "crafting_3x3" | "furnace_smelt" | "world";
  reason: string;
}

export interface BackwardRecipeResolution {
  goalItem: string;
  canCraftImmediately: boolean;
  rawMissingItems: { item: string; count: number }[];
  steps: PlanStep[];
  requiredStations: string[];
}

export function resolveBackwardRecipePlan(
  goalItemId: string,
  currentInventoryMap: Record<string, number>
): BackwardRecipeResolution {
  const steps: PlanStep[] = [];
  const rawMissing: Record<string, number> = {};
  const stationsNeeded = new Set<string>();

  const getCount = (itemId: string): number => {
    const clean = itemId.replace(/^minecraft:/, "").toLowerCase();
    let total = 0;
    for (const [k, v] of Object.entries(currentInventoryMap)) {
      if (k.replace(/^minecraft:/, "").toLowerCase() === clean) {
        total += v;
      }
    }
    return total;
  };

  const findRecipe = (itemId: string): RecipeDef | null => {
    const clean = itemId.replace(/^minecraft:/, "").toLowerCase();
    for (const r of Object.values(MINECRAFT_RECIPES)) {
      if (r.outputItem.replace(/^minecraft:/, "").toLowerCase() === clean) {
        return r;
      }
    }
    return null;
  };

  const virtualInv = { ...currentInventoryMap };
  const consumeVirtual = (item: string, amount: number): boolean => {
    const clean = item.replace(/^minecraft:/, "").toLowerCase();
    for (const k of Object.keys(virtualInv)) {
      if (k.replace(/^minecraft:/, "").toLowerCase() === clean) {
        if (virtualInv[k] >= amount) {
          virtualInv[k] -= amount;
          return true;
        } else {
          amount -= virtualInv[k];
          virtualInv[k] = 0;
        }
      }
    }
    return false;
  };

  let stepCounter = 1;

  function resolveItem(itemId: string, neededCount: number) {
    const clean = itemId.replace(/^minecraft:/, "").toLowerCase();

    if (consumeVirtual(itemId, neededCount)) {
      return;
    }

    const recipe = findRecipe(itemId);
    if (!recipe) {
      rawMissing[clean] = (rawMissing[clean] || 0) + neededCount;
      steps.push({
        step: stepCounter++,
        action: "gather",
        targetItem: itemId,
        count: neededCount,
        station: "world",
        reason: `Mine or harvest ${neededCount}x ${clean.replace(/_/g, " ")} from the environment.`
      });
      return;
    }

    stationsNeeded.add(recipe.station);

    if (recipe.station === "crafting_3x3" && getCount("crafting_table") === 0) {
      resolveItem("minecraft:crafting_table", 1);
      steps.push({
        step: stepCounter++,
        action: "place_station",
        targetItem: "minecraft:crafting_table",
        count: 1,
        station: "world",
        reason: "Place Crafting Table on ground adjacent to bot for 3x3 grid recipes."
      });
    } else if (recipe.station === "furnace_smelt" && getCount("furnace") === 0) {
      resolveItem("minecraft:furnace", 1);
      steps.push({
        step: stepCounter++,
        action: "place_station",
        targetItem: "minecraft:furnace",
        count: 1,
        station: "world",
        reason: "Place Furnace for smelting raw ores into ingots."
      });
    }

    const craftsNeeded = Math.ceil(neededCount / recipe.outputCount);
    for (const ing of recipe.ingredients) {
      resolveItem(ing.item, ing.count * craftsNeeded);
    }

    steps.push({
      step: stepCounter++,
      action: recipe.station === "furnace_smelt" ? "smelt" : "craft",
      targetItem: recipe.outputItem,
      count: craftsNeeded * recipe.outputCount,
      station: recipe.station,
      reason: `${recipe.station === "furnace_smelt" ? "Smelt" : "Craft"} ${craftsNeeded * recipe.outputCount}x ${recipe.name} (${recipe.description}).`
    });
  }

  resolveItem(goalItemId, 1);

  const rawMissingArray = Object.entries(rawMissing).map(([item, count]) => ({ item, count }));
  const canCraftImmediately = rawMissingArray.length === 0;

  return {
    goalItem: goalItemId,
    canCraftImmediately,
    rawMissingItems: rawMissingArray,
    steps,
    requiredStations: Array.from(stationsNeeded)
  };
}
