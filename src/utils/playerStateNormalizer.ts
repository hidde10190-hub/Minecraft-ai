import { PlayerState, HotbarSlot, ArmorEquipment } from "../types";

/**
 * Robust normalizer for live Minecraft player state, hotbar, and inventory.
 * Supports:
 * - Fabric Mod IPC telemetry (selected_slot, hotbar/inventory with item IDs, main_hand, off_hand)
 * - Mineflayer bot state (quickBarSlot, inventory slots 36-44, name, type)
 * - Python / REST bridge payloads
 * - Raw item objects or string arrays
 */
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

  // Helper to sanitize Minecraft item identifier
  const sanitizeItemName = (rawName: any): string => {
    if (!rawName) return "minecraft:air";
    const str = String(rawName).trim().toLowerCase();
    if (str === "air" || str === "none" || str === "" || str === "null" || str === "minecraft:air") return "minecraft:air";
    if (str.startsWith("minecraft:")) return str;
    return `minecraft:${str}`;
  };

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

  // 3. Process hotbar array if provided (array of strings, objects, or indexed map)
  if (Array.isArray(rawHotbar) && rawHotbar.length > 0) {
    rawHotbar.forEach((itemObj: any, index: number) => {
      if (!itemObj) return;

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
        slots[slotIdx] = enrichItemMetadata({
          slot: slotIdx,
          item,
          count: item !== "minecraft:air" ? 1 : 0
        });
        return;
      }

      const rawItemName = itemObj.item || itemObj.name || itemObj.id || itemObj.type || itemObj.itemId;
      const item = sanitizeItemName(rawItemName);
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
        slots[slotIdx] = enrichItemMetadata({ slot: slotIdx, item, count: item !== "minecraft:air" ? 1 : 0 });
      } else {
        const rawItemName = val.item || val.name || val.id || val.type;
        const item = sanitizeItemName(rawItemName);
        const count = Math.max(0, parseInt(String(val.count ?? val.amount ?? 1), 10) || 0);
        slots[slotIdx] = enrichItemMetadata({ slot: slotIdx, item: count > 0 ? item : "minecraft:air", count });
      }
    });
  }

  // 4. Process full inventory array if provided (e.g. Fabric mod / Mineflayer slots 0-8)
  if (Array.isArray(rawInventory) && rawInventory.length > 0) {
    rawInventory.forEach((itemObj: any, idx: number) => {
      if (!itemObj) return;
      const rawSlot = typeof itemObj.slot === "number" ? itemObj.slot : idx;
      let hotbarSlot = -1;

      // In Fabric mod GameStateExporter: hotbar items are exported with slot 0 to 8
      if (rawSlot >= 0 && rawSlot <= 8) {
        hotbarSlot = rawSlot;
      } else if (rawSlot >= 36 && rawSlot <= 44) {
        hotbarSlot = rawSlot - 36; // Mineflayer container offset
      }

      if (hotbarSlot >= 0 && hotbarSlot <= 8) {
        const rawItemName = itemObj.item || itemObj.name || itemObj.id || itemObj.type;
        const item = sanitizeItemName(rawItemName);
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
    if (mainHandItem !== "minecraft:air" && slots[selectedSlot].item === "minecraft:air") {
      slots[selectedSlot] = enrichItemMetadata({
        slot: selectedSlot,
        item: mainHandItem,
        count: typeof rawMainHand === "object" ? (rawMainHand.count || 1) : 1
      });
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

  // Normalize armor equipment
  let equipment: ArmorEquipment | undefined = prevPlayer?.equipment;
  if (Array.isArray(invData)) {
    const feetItem = invData.find((i: any) => i && (i.slot === 36 || i.slot === "feet" || i.slot === "boots"));
    const legsItem = invData.find((i: any) => i && (i.slot === 37 || i.slot === "legs" || i.slot === "leggings"));
    const chestItem = invData.find((i: any) => i && (i.slot === 38 || i.slot === "chest" || i.slot === "chestplate"));
    const headItem = invData.find((i: any) => i && (i.slot === 39 || i.slot === "head" || i.slot === "helmet"));

    equipment = {
      helmet: headItem ? { slot: 39, item: headItem.item || headItem.name, count: headItem.count || 1 } : undefined,
      chestplate: chestItem ? { slot: 38, item: chestItem.item || chestItem.name, count: chestItem.count || 1 } : undefined,
      leggings: legsItem ? { slot: 37, item: legsItem.item || legsItem.name, count: legsItem.count || 1 } : undefined,
      boots: feetItem ? { slot: 36, item: feetItem.item || feetItem.name, count: feetItem.count || 1 } : undefined,
      offhand: offHandData ? {
        slot: 40,
        item: typeof offHandData === "string" ? offHandData : (offHandData.item || offHandData.name || "minecraft:air"),
        count: typeof offHandData === "object" ? (offHandData.count || 1) : 1
      } : undefined
    };
  }

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
