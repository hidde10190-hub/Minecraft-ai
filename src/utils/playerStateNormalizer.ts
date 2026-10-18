import { PlayerState, HotbarSlot, ArmorEquipment } from "../types";

/**
 * Robust normalizer for live Minecraft player state, hotbar, and inventory.
 * Supports:
 * - Fabric Mod IPC telemetry (selected_slot, hotbar/inventory with item IDs, main_hand, off_hand)
 * - Mineflayer bot state (quickBarSlot, inventory slots 36-44, name, type)
 * - Python / REST bridge payloads
 * - Raw item objects or string arrays
 */
// Helper to sanitize Minecraft item identifier
export const sanitizeItemName = (rawName: any): string => {
  if (!rawName) return "minecraft:air";
  const str = String(rawName).trim().toLowerCase();
  if (str === "air" || str === "none" || str === "" || str === "null" || str === "minecraft:air") return "minecraft:air";
  if (str.startsWith("minecraft:")) return str;
  return `minecraft:${str}`;
};

// Helper to detect if an item is an armor piece
export function isArmorItem(item: any): boolean {
  if (!item) return false;
  const str = String(item).toLowerCase().replace(/^minecraft:/, "");
  return (
    str.includes("helmet") ||
    str.includes("chestplate") ||
    str.includes("leggings") ||
    str.includes("boots") ||
    str.includes("elytra") ||
    str.includes("turtle_helmet") ||
    str.includes("cap") ||
    str.includes("tunic") ||
    str.includes("pants")
  );
}

// Helper to categorize item and generate human display name
const enrichItemMetadata = (slotObj: HotbarSlot): HotbarSlot => {
  const clean = slotObj.item.replace("minecraft:", "");
  if (clean === "air" || slotObj.count <= 0) {
    return { slot: slotObj.slot, item: "minecraft:air", count: 0 };
  }
  const isTool = clean.includes("pickaxe") || clean.includes("axe") || clean.includes("shovel") || clean.includes("hoe") || clean.includes("shears") || clean.includes("fishing_rod") || clean.includes("flint_and_steel");
  const isWeapon = clean.includes("sword") || clean.includes("bow") || clean.includes("trident") || clean.includes("mace") || clean.includes("crossbow") || clean.includes("shield");
  const isFood = clean.includes("beef") || clean.includes("porkchop") || clean.includes("bread") || clean.includes("apple") || clean.includes("golden_") || clean.includes("carrot") || clean.includes("potato") || clean.includes("mutton") || clean.includes("chicken") || clean.includes("cookie") || clean.includes("stew") || clean.includes("pie");
  const isBlock = !isTool && !isWeapon && !isFood && (
    clean.includes("stone") || clean.includes("brick") || clean.includes("planks") || 
    clean.includes("log") || clean.includes("wood") || clean.includes("dirt") || 
    clean.includes("sand") || clean.includes("glass") || clean.includes("obsidian") || 
    clean.includes("cobblestone") || clean.includes("terracotta") || clean.includes("concrete") || 
    clean.includes("wool") || clean.includes("ore") || clean.includes("torch") || clean.includes("slab") || clean.includes("stairs")
  );

  return {
    ...slotObj,
    isTool,
    isWeapon,
    isFood,
    isBlock,
    displayName: clean.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  };
};

export function normalizeLiveHotbar(
  rawHotbar: any,
  rawInventory: any,
  rawSelectedSlot: any,
  rawMainHand?: any,
  rawOffHand?: any
): { hotbar: HotbarSlot[]; selectedSlot: number; heldItem: HotbarSlot } {
  // 1. Resolve selected slot index (0 to 8)
  let selectedSlot = 0;
  if (typeof rawSelectedSlot === "number" && !isNaN(rawSelectedSlot)) {
    selectedSlot = Math.max(0, Math.min(8, Math.floor(rawSelectedSlot)));
  } else if (rawSelectedSlot !== undefined && rawSelectedSlot !== null) {
    const parsed = parseInt(String(rawSelectedSlot), 10);
    if (!isNaN(parsed)) selectedSlot = Math.max(0, Math.min(8, parsed));
  }

  // 2. Initialize 9 empty slots
  const slots: HotbarSlot[] = Array.from({ length: 9 }).map((_, i) => ({
    slot: i,
    item: "minecraft:air",
    count: 0
  }));

  // 3. Process hotbar array if provided (array of strings, objects, or indexed map)
  if (Array.isArray(rawHotbar) && rawHotbar.length > 0) {
    rawHotbar.forEach((itemObj: any, index: number) => {
      if (!itemObj) return;
      if (itemObj.region === "armor" || itemObj.region === "equipment" || itemObj.slot_type === "armor") return;

      let slotIdx = index;
      if (typeof itemObj.slot === "number") {
        if (itemObj.slot >= 36 && itemObj.slot <= 44) {
          slotIdx = itemObj.slot - 36; // Mineflayer container offset
        } else if (itemObj.slot >= 0 && itemObj.slot <= 8) {
          slotIdx = itemObj.slot;
        }
      }

      if (slotIdx < 0 || slotIdx > 8) return;

      if (typeof itemObj === "string") {
        const item = sanitizeItemName(itemObj);
        // CRITICAL: Slot 1-4 are armor, not hotbar!
        if (isArmorItem(item)) return;
        slots[slotIdx] = enrichItemMetadata({
          slot: slotIdx,
          item,
          count: item !== "minecraft:air" ? 1 : 0
        });
        return;
      }

      const rawItemName = itemObj.item || itemObj.name || itemObj.id || itemObj.type || itemObj.itemId;
      const item = sanitizeItemName(rawItemName);
      
      // CRITICAL: Slot 1-4 are armor, not hotbar! Skip any armor pieces
      if (isArmorItem(item) || ((slotIdx >= 1 && slotIdx <= 4) && (itemObj.region === "armor" || isArmorItem(item)))) {
        return;
      }

      const count = Math.max(0, parseInt(String(itemObj.count ?? itemObj.amount ?? itemObj.size ?? (item !== "minecraft:air" ? 1 : 0)), 10) || 0);

      slots[slotIdx] = enrichItemMetadata({
        slot: slotIdx,
        item: count > 0 ? item : "minecraft:air",
        count: count,
        damage: itemObj.damage ?? itemObj.durability,
        maxDamage: itemObj.maxDamage,
        enchantments: itemObj.enchantments
      });
    });
  } else if (rawHotbar && typeof rawHotbar === "object") {
    // Key-value hotbar map e.g. { "0": { item: "diamond_sword", count: 1 } }
    Object.entries(rawHotbar).forEach(([key, val]: [string, any]) => {
      const slotIdx = parseInt(key, 10);
      if (isNaN(slotIdx) || slotIdx < 0 || slotIdx > 8 || !val) return;

      if (typeof val === "string") {
        const item = sanitizeItemName(val);
        if (isArmorItem(item)) return;
        slots[slotIdx] = enrichItemMetadata({ slot: slotIdx, item, count: item !== "minecraft:air" ? 1 : 0 });
      } else {
        const rawItemName = val.item || val.name || val.id || val.type;
        const item = sanitizeItemName(rawItemName);
        if (isArmorItem(item) || (slotIdx >= 1 && slotIdx <= 4 && isArmorItem(item))) return;
        const count = Math.max(0, parseInt(String(val.count ?? val.amount ?? 1), 10) || 0);
        slots[slotIdx] = enrichItemMetadata({ slot: slotIdx, item: count > 0 ? item : "minecraft:air", count });
      }
    });
  }

  // 4. Process full inventory array if provided (e.g. Fabric mod / Mineflayer slots)
  if (Array.isArray(rawInventory) && rawInventory.length > 0) {
    rawInventory.forEach((itemObj: any, idx: number) => {
      if (!itemObj) return;

      // Explicitly exclude armor, equipment and offhand from hotbar
      if (itemObj.region === "armor" || itemObj.region === "equipment" || itemObj.slot_type === "armor" || itemObj.region === "offhand" || itemObj.slot === 40) {
        return;
      }

      const rawSlot = typeof itemObj.slot === "number" ? itemObj.slot : idx;
      const rawItemName = itemObj.item || itemObj.name || itemObj.id || itemObj.type;
      const item = sanitizeItemName(rawItemName);

      if (isArmorItem(item)) {
        return;
      }

      let hotbarSlot = -1;

      if (rawSlot >= 36 && rawSlot <= 44) {
        hotbarSlot = rawSlot - 36; // Mineflayer / Minecraft container offset
      } else if (rawSlot >= 0 && rawSlot <= 8 || itemObj.region === "hotbar") {
        const candidateSlot = (rawSlot >= 0 && rawSlot <= 8) ? rawSlot : (typeof itemObj.slot === "number" ? itemObj.slot : -1);
        if (candidateSlot >= 0 && candidateSlot <= 8) {
          hotbarSlot = candidateSlot;
        }
      }

      if (hotbarSlot >= 0 && hotbarSlot <= 8) {
        const count = Math.max(0, parseInt(String(itemObj.count ?? itemObj.amount ?? 1), 10) || 1);

        slots[hotbarSlot] = enrichItemMetadata({
          slot: hotbarSlot,
          item: count > 0 ? item : "minecraft:air",
          count: count,
          damage: itemObj.damage,
          enchantments: itemObj.enchantments
        });
      }
    });
  }

  // 5. Cross-check with mainHand if selected slot is empty or missing
  if (rawMainHand) {
    const mainHandItem = sanitizeItemName(typeof rawMainHand === "string" ? rawMainHand : (rawMainHand.item || rawMainHand.name));
    if (mainHandItem !== "minecraft:air" && !isArmorItem(mainHandItem) && slots[selectedSlot].item === "minecraft:air") {
      slots[selectedSlot] = enrichItemMetadata({
        slot: selectedSlot,
        item: mainHandItem,
        count: typeof rawMainHand === "object" ? (rawMainHand.count || 1) : 1
      });
    }
  }

  // 6. Absolute safeguard: slots 1-4 (and all 9 hotbar slots) must never hold armor pieces
  for (let i = 0; i < 9; i++) {
    if (isArmorItem(slots[i].item)) {
      slots[i] = { slot: i, item: "minecraft:air", count: 0 };
    }
  }

  const heldItem = slots[selectedSlot] || { slot: selectedSlot, item: "minecraft:air", count: 0 };

  return { hotbar: slots, selectedSlot, heldItem };
}

/**
* Normalizes full player state from incoming telemetry packet
*/
export function normalizeLivePlayerState(rawData: any, prevPlayer?: PlayerState): PlayerState {
if (!rawData || typeof rawData !== "object") {
  return prevPlayer || {
    x: 100.5,
    y: 64.0,
    z: 20.5,
    yaw: 0.0,
    pitch: 0.0,
    health: 20.0,
    maxHealth: 20.0,
    food: 20,
    saturation: 15.0,
    air: 300,
    onGround: true,
    isSneaking: false,
    isSprinting: false,
    inWater: false,
    selectedSlot: 0,
    hotbar: Array.from({ length: 9 }).map((_, i) => ({ slot: i, item: "minecraft:air", count: 0 })),
    heldItem: { slot: 0, item: "minecraft:air", count: 0 }
  };
}

// The packet might be either root telemetry { player: {...}, inventory: [...] } or direct player object
const pData = rawData.player && typeof rawData.player === "object" ? rawData.player : rawData;
const invData = rawData.inventory ?? pData.inventory ?? rawData.items ?? pData.items;
const hotbarData = rawData.hotbar ?? pData.hotbar ?? rawData.quickbar ?? pData.quickbar;
const mainHandData = pData.main_hand ?? pData.mainHand ?? rawData.main_hand ?? rawData.mainHand;
const offHandData = pData.off_hand ?? pData.offHand ?? rawData.off_hand ?? rawData.offHand;

const rawSelectedSlot = pData.selected_slot ?? pData.selectedSlot ?? pData.quickBarSlot ?? pData.activeSlot ?? rawData.selected_slot ?? rawData.selectedSlot ?? prevPlayer?.selectedSlot ?? 0;

const { hotbar, selectedSlot, heldItem } = normalizeLiveHotbar(
  hotbarData,
  invData,
  rawSelectedSlot,
  mainHandData,
  offHandData
);

const posObj = pData.pos ?? pData.position ?? pData.pose ?? rawData.pos ?? rawData.position ?? rawData.pose ?? {};
const rawX = pData.x ?? pData.posX ?? pData.pos_x ?? posObj.x ?? posObj.X ?? pData.position?.[0] ?? rawData.x ?? rawData.posX;
const rawY = pData.y ?? pData.posY ?? pData.pos_y ?? posObj.y ?? posObj.Y ?? pData.position?.[1] ?? rawData.y ?? rawData.posY;
const rawZ = pData.z ?? pData.posZ ?? pData.pos_z ?? posObj.z ?? posObj.Z ?? pData.position?.[2] ?? rawData.z ?? rawData.posZ;

const x = Number(rawX !== undefined ? rawX : (prevPlayer?.x ?? 100.5));
const y = Number(rawY !== undefined ? rawY : (prevPlayer?.y ?? 64.0));
const z = Number(rawZ !== undefined ? rawZ : (prevPlayer?.z ?? 20.5));
const yaw = Number(pData.yaw ?? prevPlayer?.yaw ?? 0.0);
const pitch = Number(pData.pitch ?? prevPlayer?.pitch ?? 0.0);
const health = Number(pData.health ?? prevPlayer?.health ?? 20.0);
const maxHealth = Number(pData.maxHealth ?? pData.max_health ?? prevPlayer?.maxHealth ?? 20.0);
const food = Number(pData.food ?? pData.food_level ?? prevPlayer?.food ?? 20);
const saturation = Number(pData.saturation ?? prevPlayer?.saturation ?? 15.0);
const air = Number(pData.air ?? prevPlayer?.air ?? 300);
const onGround = Boolean(pData.onGround ?? pData.on_ground ?? prevPlayer?.onGround ?? true);
const isSneaking = Boolean(pData.isSneaking ?? pData.is_sneaking ?? prevPlayer?.isSneaking ?? false);
const isSprinting = Boolean(pData.isSprinting ?? pData.is_sprinting ?? prevPlayer?.isSprinting ?? false);
const inWater = Boolean(pData.inWater ?? pData.in_water ?? prevPlayer?.inWater ?? false);

// Normalize armor equipment (detects slots 1-4, 5-8, 36-39, and item keywords)
let equipment: ArmorEquipment | undefined = prevPlayer?.equipment;

// Collect all candidate armor sources (inventory, armor array, equipment object, raw hotbar slots 1-4)
const armorCandidates: any[] = [];
if (Array.isArray(rawData.armor)) armorCandidates.push(...rawData.armor);
if (Array.isArray(pData.armor)) armorCandidates.push(...pData.armor);
if (rawData.equipment && typeof rawData.equipment === "object") {
  if (Array.isArray(rawData.equipment)) armorCandidates.push(...rawData.equipment);
  else Object.entries(rawData.equipment).forEach(([k, v]: [string, any]) => {
    if (v) armorCandidates.push(typeof v === "object" ? { ...v, armorSlotKey: k } : { item: v, armorSlotKey: k });
  });
}
if (pData.equipment && typeof pData.equipment === "object") {
  if (Array.isArray(pData.equipment)) armorCandidates.push(...pData.equipment);
  else Object.entries(pData.equipment).forEach(([k, v]: [string, any]) => {
    if (v) armorCandidates.push(typeof v === "object" ? { ...v, armorSlotKey: k } : { item: v, armorSlotKey: k });
  });
}
if (Array.isArray(invData)) armorCandidates.push(...invData);
if (Array.isArray(hotbarData)) armorCandidates.push(...hotbarData);

const isArmorMatch = (item: any, keywords: string[], slots: number[], slotKeyNames: string[]) => {
  if (!item) return false;
  const name = String(item.item || item.name || item.id || "").toLowerCase();
  const slot = typeof item.slot === "number" ? item.slot : -1;
  const key = String(item.armorSlotKey || item.region || item.type || item.slotKey || "").toLowerCase();
  if (keywords.some(k => name.includes(k))) return true;
  if (slotKeyNames.some(sk => key.includes(sk))) return true;
  if (slots.includes(slot) && (item.region === "armor" || isArmorItem(name))) return true;
  if (slots.includes(slot) && (item.region === "armor" || item.slot_type === "armor")) return true;
  return false;
};

const feetItem = armorCandidates.find((i: any) => isArmorMatch(i, ["boots", "shoes"], [1, 8, 36], ["boots", "feet"]));
const legsItem = armorCandidates.find((i: any) => isArmorMatch(i, ["leggings", "pants"], [2, 7, 37], ["leggings", "legs"]));
const chestItem = armorCandidates.find((i: any) => isArmorMatch(i, ["chestplate", "elytra", "tunic"], [3, 6, 38], ["chestplate", "chest", "torso"]));
const headItem = armorCandidates.find((i: any) => isArmorMatch(i, ["helmet", "cap", "turtle_helmet"], [4, 5, 39], ["helmet", "head"]));

equipment = {
  helmet: headItem ? { slot: headItem.slot ?? 4, item: sanitizeItemName(headItem.item || headItem.name || headItem.id), count: headItem.count || 1 } : equipment?.helmet,
  chestplate: chestItem ? { slot: chestItem.slot ?? 3, item: sanitizeItemName(chestItem.item || chestItem.name || chestItem.id), count: chestItem.count || 1 } : equipment?.chestplate,
  leggings: legsItem ? { slot: legsItem.slot ?? 2, item: sanitizeItemName(legsItem.item || legsItem.name || legsItem.id), count: legsItem.count || 1 } : equipment?.leggings,
  boots: feetItem ? { slot: feetItem.slot ?? 1, item: sanitizeItemName(feetItem.item || feetItem.name || feetItem.id), count: feetItem.count || 1 } : equipment?.boots,
  offhand: offHandData ? {
    slot: 40,
    item: sanitizeItemName(typeof offHandData === "string" ? offHandData : (offHandData.item || offHandData.name || "minecraft:air")),
    count: typeof offHandData === "object" ? (offHandData.count || 1) : 1
  } : equipment?.offhand
};

  const normalizedYaw = Math.round((((yaw % 360) + 360) % 360) * 10) / 10;
  const normalizedPitch = Math.max(-90, Math.min(90, Math.round(pitch * 10) / 10));

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    z: Math.round(z * 100) / 100,
    yaw: normalizedYaw,
    pitch: normalizedPitch,
    health,
    maxHealth,
    food,
    saturation,
    air,
    onGround,
    isSneaking,
    isSprinting,
    inWater,
    selectedSlot,
    hotbar,
    heldItem,
    equipment
  };
}
