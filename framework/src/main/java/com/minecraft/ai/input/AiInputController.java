package com.minecraft.ai.input;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.minecraft.ai.mixin.KeyBindingAccessor;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.inventory.AbstractContainerScreen;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.Holder;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.core.HolderLookup;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.inventory.ContainerInput;
import net.minecraft.world.item.crafting.RecipeHolder;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.crafting.CraftingRecipe;
import net.minecraft.world.item.crafting.Ingredient;
import net.minecraft.world.item.crafting.Recipe;
import net.minecraft.world.item.crafting.RecipeManager;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.EntityHitResult;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * High-performance human-like virtual input and locomotion controller.
 * Features:
 * - Minimum-Jerk kinematic gaze model with natural saccadic deceleration
 * - Subtle biometric mouse tremor / micro-jitter (mimics human hand on desk)
 * - Attack cooldown synchronization (full 1.9+ weapon damage optimization)
 * - Human-like W-tap cadence, sprint-hop timing, and organic strafe variation
 * - Edge-detection sneak assistance for ledge navigation
 * - Idle glancing and ambient head sway
 */
public class AiInputController {

    private static final Logger LOGGER = LoggerFactory.getLogger(AiInputController.class);
    private static final AiInputController INSTANCE = new AiInputController();
    private static final Random RANDOM = new Random();
    private static final Gson GSON = new Gson();

    // Map of active virtual keys and remaining ticks to hold them
    private final Map<String, Integer> activeKeyHoldTicks = new ConcurrentHashMap<>();
    
    // Human Kinematics Gaze Model
    private static class LookTarget {
        float targetYaw;
        float targetPitch;
        int totalTicks;
        int remainingTicks;
        float startYaw;
        float startPitch;
        float overshootYaw;
        float overshootPitch;
        boolean enableTremor;
    }
    private volatile LookTarget currentLook = null;

    // Human Locomotion State
    private boolean humanKinematicsEnabled = true;
    private int tickCounter = 0;
    private int lastAttackTick = 0;
    private int strafeSwitchCountdown = 0;
    private boolean currentStrafeDirLeft = false;
    private int idleTicksWithoutInput = 0;

    // Execution queue for actions that must run on the Minecraft client thread
    private final ConcurrentLinkedQueue<Runnable> gameThreadActionQueue = new ConcurrentLinkedQueue<>();

    private AiInputController() {}

    public static AiInputController getInstance() {
        return INSTANCE;
    }

    public void setHumanKinematicsEnabled(boolean enabled) {
        this.humanKinematicsEnabled = enabled;
    }

    public boolean isHumanKinematicsEnabled() {
        return humanKinematicsEnabled;
    }

    /**
     * Called every client tick from MinecraftClientMixin or ClientTickEvents.
     * Decrements held key timers and smoothly steps camera yaw/pitch towards target.
     */
    public void onClientTick(Minecraft client) {
        tickCounter++;

        // 1. Drain pending one-shot actions
        Runnable action;
        while ((action = gameThreadActionQueue.poll()) != null) {
            try {
                action.run();
            } catch (Exception e) {
                LOGGER.error("[AiInputController] Error executing game thread action: ", e);
            }
        }

        LocalPlayer player = client.player;
        if (player == null) return;

        // 2. Step smooth human-like camera interpolation (Minimum-Jerk Kinematics)
        LookTarget look = this.currentLook;
        if (look != null && look.remainingTicks > 0) {
            idleTicksWithoutInput = 0;
            float progress = 1.0f - ((float) look.remainingTicks / (float) look.totalTicks);
            progress = Mth.clamp(progress, 0.0f, 1.0f);

            // Minimum-Jerk polynomial easing: 10*t^3 - 15*t^4 + 6*t^5
            float t = progress * progress * progress * (progress * (progress * 6.0f - 15.0f) + 10.0f);

            float deltaYaw = Mth.wrapDegrees(look.targetYaw - look.startYaw);
            float currentInterpYaw = look.startYaw + deltaYaw * t;

            float deltaPitch = look.targetPitch - look.startPitch;
            float currentInterpPitch = Mth.clamp(look.startPitch + deltaPitch * t, -90.0f, 90.0f);

            // Add subtle biological hand tremor (0.04 - 0.12 degree micro-noise)
            if (look.enableTremor && humanKinematicsEnabled && look.remainingTicks > 1) {
                float tremorYaw = (RANDOM.nextFloat() - 0.5f) * 0.16f;
                float tremorPitch = (RANDOM.nextFloat() - 0.5f) * 0.10f;
                currentInterpYaw += tremorYaw;
                currentInterpPitch += tremorPitch;
            }

            player.setYRot(currentInterpYaw);
            player.setXRot(Mth.clamp(currentInterpPitch, -90.0f, 90.0f));
            player.yRotO = currentInterpYaw;
            player.xRotO = player.getXRot();
            player.yHeadRot = currentInterpYaw;
            player.yHeadRotO = currentInterpYaw;
            player.yBodyRot = currentInterpYaw;
            player.yBodyRotO = currentInterpYaw;

            look.remainingTicks--;
            if (look.remainingTicks <= 0) {
                // Snap cleanly to final target
                player.setYRot(look.targetYaw);
                player.setXRot(look.targetPitch);
                player.yRotO = look.targetYaw;
                player.xRotO = look.targetPitch;
                player.yHeadRot = look.targetYaw;
                player.yHeadRotO = look.targetYaw;
                player.yBodyRot = look.targetYaw;
                player.yBodyRotO = look.targetYaw;
                this.currentLook = null;
            }
        } else {
            idleTicksWithoutInput++;
            // Natural idle micro-glance if completely stationary for > 80 ticks (4 seconds)
            if (humanKinematicsEnabled && idleTicksWithoutInput > 80 && idleTicksWithoutInput % 60 == 0 && activeKeyHoldTicks.isEmpty()) {
                if (RANDOM.nextFloat() < 0.35f) {
                    float subtleYawOffset = (RANDOM.nextFloat() - 0.5f) * 4.0f;
                    float subtlePitchOffset = (RANDOM.nextFloat() - 0.5f) * 2.5f;
                    lookAtRelative(subtleYawOffset, subtlePitchOffset, 8);
                }
            }
        }

        // 3. Process key hold timers with human-like release & press states
        activeKeyHoldTicks.forEach((keyName, remainingTicks) -> {
            KeyMapping kb = resolveKeyBinding(client, keyName);
            if (kb != null) {
                if (remainingTicks < 0) {
                    // Indefinite hold until explicit release
                    setKeyPressed(kb, true);
                } else if (remainingTicks > 0) {
                    setKeyPressed(kb, true);
                    activeKeyHoldTicks.put(keyName, remainingTicks - 1);
                } else {
                    setKeyPressed(kb, false);
                    activeKeyHoldTicks.remove(keyName);
                }
            }
        });

        // 4. Human Locomotion Enhancements (Natural Strafe & W-Tap Resets)
        if (humanKinematicsEnabled && player.isSprinting() && activeKeyHoldTicks.containsKey("forward")) {
            // Rhythmic micro-sprint cadence / hop timing
            if (player.onGround() && !player.horizontalCollision && tickCounter % 28 == 0) {
                // Occasional sprint-jump like human parkour
                if (RANDOM.nextFloat() < 0.25f) {
                    pressKey("jump", 2);
                }
            }
        }
    }

    /**
     * Schedules a natural, human-like camera rotation to look at a 3D coordinate.
     * Uses Minimum-Jerk interpolation and realistic duration scaling based on angular distance.
     */
    public void lookAt(double targetX, double targetY, double targetZ, int suggestedDurationTicks) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            LocalPlayer player = client.player;
            if (player == null) return;

            Vec3 eyePos = player.getEyePosition();
            double dx = targetX - eyePos.x;
            double dy = targetY - eyePos.y;
            double dz = targetZ - eyePos.z;
            double horizontalDistance = Math.sqrt(dx * dx + dz * dz);

            float targetYaw = (float) Mth.wrapDegrees(Math.toDegrees(Math.atan2(-dx, dz)));
            float targetPitch = (float) Mth.clamp(Math.toDegrees(-Math.atan2(dy, horizontalDistance)), -90.0, 90.0);

            float deltaYaw = Math.abs(Mth.wrapDegrees(targetYaw - player.getYRot()));
            float deltaPitch = Math.abs(targetPitch - player.getXRot());
            float totalAngleDelta = (float) Math.sqrt(deltaYaw * deltaYaw + deltaPitch * deltaPitch);

            // Compute human saccade duration (Fitts' Law / angular speed model: ~180-350 deg/sec)
            int calculatedTicks = suggestedDurationTicks;
            if (suggestedDurationTicks <= 2) {
                // Precise block aim / mining target lock: fast snap within 1-2 ticks
                calculatedTicks = Math.max(1, suggestedDurationTicks);
            } else if (humanKinematicsEnabled && totalAngleDelta > 3.0f) {
                // Scale duration naturally: 2 to 6 ticks for larger turns
                calculatedTicks = Mth.clamp((int) (totalAngleDelta / 45.0f) + 1, 2, 6);
            }

            if (calculatedTicks <= 1) {
                player.setYRot(targetYaw);
                player.setXRot(targetPitch);
                player.yRotO = targetYaw;
                player.xRotO = targetPitch;
                player.yHeadRot = targetYaw;
                player.yHeadRotO = targetYaw;
                player.yBodyRot = targetYaw;
                player.yBodyRotO = targetYaw;
                this.currentLook = null;
            } else {
                LookTarget lt = new LookTarget();
                lt.startYaw = player.getYRot();
                lt.startPitch = player.getXRot();
                lt.targetYaw = targetYaw;
                lt.targetPitch = targetPitch;
                lt.totalTicks = calculatedTicks;
                lt.remainingTicks = calculatedTicks;
                lt.enableTremor = totalAngleDelta > 8.0f;
                this.currentLook = lt;
            }
        });
    }

    /**
     * Performs a relative smooth camera adjustment (e.g. for recoil, micro-aiming, or idle glances).
     */
    public void lookAtRelative(float deltaYaw, float deltaPitch, int durationTicks) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            LocalPlayer player = client.player;
            if (player == null) return;

            float targetYaw = Mth.wrapDegrees(player.getYRot() + deltaYaw);
            float targetPitch = Mth.clamp(player.getXRot() + deltaPitch, -90.0f, 90.0f);

            LookTarget lt = new LookTarget();
            lt.startYaw = player.getYRot();
            lt.startPitch = player.getXRot();
            lt.targetYaw = targetYaw;
            lt.targetPitch = targetPitch;
            lt.totalTicks = Math.max(1, durationTicks);
            lt.remainingTicks = lt.totalTicks;
            lt.enableTremor = true;
            this.currentLook = lt;
        });
    }

    /**
     * Directly set camera yaw and pitch.
     */
    public void setRotation(float yaw, float pitch) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            if (client.player != null) {
                client.player.setYRot(yaw);
                client.player.setXRot(Mth.clamp(pitch, -90.0f, 90.0f));
                client.player.yRotO = yaw;
                client.player.xRotO = client.player.getXRot();
                client.player.yHeadRot = yaw;
                client.player.yHeadRotO = yaw;
                client.player.yBodyRot = yaw;
                client.player.yBodyRotO = yaw;
                this.currentLook = null;
            }
        });
    }

    /**
     * Holds a virtual key for a specified tick count. Also mirrors the press into the
     * OS-level uinput device when available (real hardware-grade keyboard events).
     */
    public void pressKey(String keyName, int durationTicks) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            OsInputInjector.getInstance().pressKey(keyName);
            KeyMapping kb = resolveKeyBinding(client, keyName);
            if (kb != null) {
                setKeyPressed(kb, true);
                activeKeyHoldTicks.put(keyName.toLowerCase(), Math.max(1, durationTicks));
            }
        });
    }

    /**
     * Executes a human-like "W-Tap" movement (resets sprint for max combat knockback).
     */
    public void executeWTap() {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            releaseKey("forward");
            gameThreadActionQueue.add(() -> {
                // Re-press after 2 ticks (100ms human tap window)
                pressKey("forward", 10);
            });
        });
    }

    /**
     * Releases a virtual key immediately.
     */
    public void releaseKey(String keyName) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            KeyMapping kb = resolveKeyBinding(client, keyName);
            if (kb != null) {
                setKeyPressed(kb, false);
                activeKeyHoldTicks.remove(keyName.toLowerCase());
            }
        });
    }

    /**
     * Releases all virtual keys currently held.
     */
    public void releaseAllKeys() {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            activeKeyHoldTicks.keySet().forEach(keyName -> {
                KeyMapping kb = resolveKeyBinding(client, keyName);
                if (kb != null) setKeyPressed(kb, false);
            });
            activeKeyHoldTicks.clear();
            this.currentLook = null;
        });
    }

    /**
     * Selects active hotbar slot index (0 - 8).
     */
    public void selectHotbarSlot(int slotIndex) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            if (client.player != null && slotIndex >= 0 && slotIndex <= 8) {
                client.player.getInventory().setSelectedSlot(slotIndex);
            }
        });
    }

    /**
     * Drops the currently held item (simulates the 'Q' key).
     */
    public void dropItem(boolean dropAll) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            if (client.player != null) {
                client.player.drop(dropAll);
            }
        });
    }

    /**
     * Simulates block placement with the specified hand on the raycast target or explicit face.
     */
    public void placeBlock(InteractionHand hand, BlockPos pos, Direction side) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            if (client.gameMode == null || client.player == null) return;

            BlockHitResult hitResult;
            if (pos != null && side != null) {
                Vec3 hitVec = Vec3.atCenterOf(pos).add(side.getStepX() * 0.5, side.getStepY() * 0.5, side.getStepZ() * 0.5);
                hitResult = new BlockHitResult(hitVec, side, pos, false);
            } else if (client.hitResult instanceof BlockHitResult bhr) {
                hitResult = bhr;
            } else {
                LOGGER.warn("[AiInputController] No target block for placement");
                return;
            }

            client.gameMode.useItemOn(client.player, hand, hitResult);
            client.player.swing(hand);
        });
    }

    /**
     * Attacks targeted entity with human-like weapon cooldown synchronization (1.9+ combat mechanics).
     */
    public void attackEntity(int entityId) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            if (client.gameMode == null || client.player == null || client.level == null) return;

            // Attack cooldown check: only strike when attack meter is charged (>= 88%) for full damage
            if (humanKinematicsEnabled) {
                float attackCooldown = client.player.getAttackStrengthScale(0.0f);
                if (attackCooldown < 0.88f) {
                    // Queue attack on the next tick when weapon is fully charged
                    gameThreadActionQueue.add(() -> attackEntity(entityId));
                    return;
                }
            }

            Entity target = null;
            if (entityId >= 0) {
                target = client.level.getEntity(entityId);
            } else if (client.hitResult instanceof EntityHitResult ehr) {
                target = ehr.getEntity();
            }

            if (target != null) {
                client.gameMode.attack(client.player, target);
                client.player.swing(InteractionHand.MAIN_HAND);
                lastAttackTick = tickCounter;

                // Human combat follow-up: subtle W-tap or micro-strafe after hitting
                if (humanKinematicsEnabled && RANDOM.nextFloat() < 0.40f) {
                    executeWTap();
                }
            }
        });
    }

    /**
     * Simulates mouse wheel scrolling. Positive for up, negative for down.
     */
    public void scrollMouse(double amount) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            if (client.player != null) {
                // In modern Minecraft, hotbar scrolling is handled via inventory selected slot or specific events.
                // Here we simulate the effect of scrolling.
                int currentSlot = client.player.getInventory().getSelectedSlot();
                int newSlot = (currentSlot - (int)Math.signum(amount)) % 9;
                if (newSlot < 0) newSlot += 9;
                client.player.getInventory().setSelectedSlot(newSlot);
            }
        });
    }

    /**
     * Mutates KeyMapping state via Mixin Accessor.
     */
    private void setKeyPressed(KeyMapping keyMapping, boolean pressed) {
        KeyBindingAccessor accessor = (KeyBindingAccessor) keyMapping;
        keyMapping.setDown(pressed);
        accessor.ai$setDown(pressed);
        if (pressed) {
            accessor.ai$setClickCount(accessor.ai$getClickCount() + 1);
        }
    }

    // =====================================================================================
    // INVENTORY MANAGEMENT: Slot moves between main inventory <-> hotbar <-> armor/offhand
    // =====================================================================================

    /**
     * Moves an item stack from one player inventory slot to another (e.g. main inventory -> hotbar).
     * Slot numbering matches the exported "inventory" telemetry:
     *   0-8   = hotbar
     *   9-35  = main inventory storage
     *   36-39 = armor (feet, legs, chest, head)
     *   40    = offhand
     * If the destination holds a different item and swapIfOccupied is true, the two stacks are
     * swapped; otherwise the move merges compatible stacks or aborts.
     */
    public void moveInventorySlot(int fromSlot, int toSlot, boolean swapIfOccupied) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            LocalPlayer player = client.player;
            if (player == null) return;
            Inventory inv = player.getInventory();
            if (!isValidInvSlot(fromSlot) || !isValidInvSlot(toSlot) || fromSlot == toSlot) {
                LOGGER.warn("[AiInputController] Invalid slot move {} -> {}", fromSlot, toSlot);
                return;
            }
            ItemStack source = inv.getItem(fromSlot);
            if (source.isEmpty()) {
                LOGGER.warn("[AiInputController] Source slot {} is empty, nothing to move", fromSlot);
                return;
            }
            ItemStack dest = inv.getItem(toSlot);
            if (dest.isEmpty()) {
                inv.setItem(toSlot, source.copy());
                inv.setItem(fromSlot, ItemStack.EMPTY);
            } else if (ItemStack.isSameItemSameComponents(source, dest)) {
                // Merge as much as possible into the destination stack
                int space = dest.getMaxStackSize() - dest.getCount();
                int moving = Math.min(space, source.getCount());
                if (moving > 0) {
                    dest.grow(moving);
                    source.shrink(moving);
                    inv.setItem(toSlot, dest);
                    inv.setItem(fromSlot, source.isEmpty() ? ItemStack.EMPTY : source);
                } else if (swapIfOccupied) {
                    inv.setItem(fromSlot, dest);
                    inv.setItem(toSlot, source);
                }
            } else if (swapIfOccupied) {
                inv.setItem(fromSlot, dest);
                inv.setItem(toSlot, source);
            } else {
                LOGGER.warn("[AiInputController] Destination slot {} occupied with a different item and swap disabled", toSlot);
                return;
            }
            inv.setChanged();
            LOGGER.info("[AiInputController] Moved item from slot {} to slot {}", fromSlot, toSlot);
        });
    }

    /**
     * Finds the first inventory slot containing the given item id and moves it into the
     * requested hotbar slot (0-8). Searches hotbar last so re-fetching the same item works.
     */
    public void moveItemToHotbar(String itemId, int hotbarSlot, boolean swapIfOccupied) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            LocalPlayer player = client.player;
            if (player == null) return;
            if (hotbarSlot < 0 || hotbarSlot > 8) {
                LOGGER.warn("[AiInputController] Hotbar slot must be 0-8, got {}", hotbarSlot);
                return;
            }
            Inventory inv = player.getInventory();
            Item target = BuiltInRegistries.ITEM.getValue(Identifier.parse(itemId));
            if (target == null || target == net.minecraft.world.item.Items.AIR) {
                LOGGER.warn("[AiInputController] Unknown item id '{}'", itemId);
                return;
            }
            for (int i = 9; i < 36; i++) {
                ItemStack stack = inv.getItem(i);
                if (!stack.isEmpty() && stack.is(target)) {
                    moveInventorySlot(i, hotbarSlot, swapIfOccupied);
                    return;
                }
            }
            LOGGER.warn("[AiInputController] Item '{}' not found in main inventory", itemId);
        });
    }

    /**
     * Equips an armor item from the inventory into its matching armor slot.
     */
    public void equipItem(String itemId) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            LocalPlayer player = client.player;
            if (player == null) return;
            Inventory inv = player.getInventory();
            Item target = BuiltInRegistries.ITEM.getValue(Identifier.parse(itemId));
            if (target == null) {
                LOGGER.warn("[AiInputController] Unknown item id '{}'", itemId);
                return;
            }
            // In MC 26.2 armor pieces are items carrying a trim/armor component rather than a
            // dedicated ArmorItem subclass; resolve the target equipment slot from the item id.
            EquipmentSlot eq = resolveArmorSlot(target, itemId);
            if (eq == null) {
                LOGGER.warn("[AiInputController] Item '{}' is not an equippable armor piece", itemId);
                return;
            }
            int armorInvSlot = switch (eq) {
                case FEET -> 36;
                case LEGS -> 37;
                case CHEST -> 38;
                case HEAD -> 39;
                default -> -1;
            };
            if (armorInvSlot < 0) return;
            for (int i = 0; i < 36; i++) {
                ItemStack stack = inv.getItem(i);
                if (!stack.isEmpty() && stack.is(target)) {
                    ItemStack current = inv.getItem(armorInvSlot);
                    inv.setItem(armorInvSlot, stack.split(1));
                    if (!current.isEmpty()) inv.add(current);
                    inv.setChanged();
                    LOGGER.info("[AiInputController] Equipped {} into {}", itemId, eq);
                    return;
                }
            }
            LOGGER.warn("[AiInputController] Armor '{}' not found in inventory", itemId);
        });
    }

    /** Maps an armor item to its EquipmentSlot by inspecting the vanilla item id. */
    private static EquipmentSlot resolveArmorSlot(Item item, String itemId) {
        String path = itemId.contains(":") ? itemId.substring(itemId.indexOf(':') + 1) : itemId;
        if (path.endsWith("_helmet")) return EquipmentSlot.HEAD;
        if (path.endsWith("_chestplate")) return EquipmentSlot.CHEST;
        if (path.endsWith("_leggings")) return EquipmentSlot.LEGS;
        if (path.endsWith("_boots")) return EquipmentSlot.FEET;
        // Elytra-like / generic chest armor fallback
        if (path.equals("elytra")) return EquipmentSlot.CHEST;
        return null;
    }

    private static boolean isValidInvSlot(int slot) {
        return slot >= 0 && slot <= 40;
    }

    // =====================================================================================
    // CRAFTING: Uses the game's BUILT-IN recipe book (RecipeManager) - every vanilla recipe
    // =====================================================================================

    /**
     * Exports every crafting recipe known to the client's RecipeManager as JSON.
     * This is the authoritative source of ALL built-in recipes of the game, keyed by
     * their vanilla ids, with per-grid-slot ingredient options.
     */
    public String exportAllRecipesJson() {
        Minecraft client = Minecraft.getInstance();
        JsonArray arr = new JsonArray();
        try {
            // MC 26.2: recipes live in the dynamic recipe registry, reachable from the
            // client via level.registryAccess().lookupOrThrow(Registries.RECIPE).
            HolderLookup.RegistryLookup<Recipe<?>> rl = null;
            if (client.level != null) {
                rl = client.level.registryAccess().lookupOrThrow(Registries.RECIPE);
            }
            if (rl == null) return "[]";
            for (ResourceKey<Recipe<?>> key : rl.listElementIds().toList()) {
                Recipe<?> recipe = rl.getOrThrow(key).value();
                if (!(recipe instanceof CraftingRecipe craft)) continue;
                Identifier loc = key.identifier();
                JsonObject r = new JsonObject();
                r.addProperty("id", loc.toString());
                r.addProperty("type", BuiltInRegistries.RECIPE_SERIALIZER.getKey(craft.getSerializer()).toString());
                ItemStack result = previewResult(craft, client);
                if (!result.isEmpty()) {
                    r.addProperty("result_item", BuiltInRegistries.ITEM.getKey(result.getItem()).toString());
                    r.addProperty("result_count", result.getCount());
                }
                JsonArray ingredients = new JsonArray();
                List<Ingredient> ingList = craft.placementInfo().ingredients();
                for (int i = 0; i < ingList.size(); i++) {
                    Ingredient ing = ingList.get(i);
                    if (ing.isEmpty()) continue;
                    JsonArray opts = new JsonArray();
                    // MC 26.2: Ingredient.items() returns Stream<Holder<Item>>
                    ing.items().forEach(h -> {
                        Item it = h.value();
                        if (it != null && it != net.minecraft.world.item.Items.AIR) {
                            Identifier k = BuiltInRegistries.ITEM.getKey(it);
                            if (k != null) opts.add(k.toString());
                        }
                    });
                    if (opts.size() > 0) {
                        JsonObject o = new JsonObject();
                        o.addProperty("slot", i);
                        o.add("options", opts);
                        ingredients.add(o);
                    }
                }
                r.add("ingredients", ingredients);
                arr.add(r);
            }
        } catch (Exception e) {
            LOGGER.error("[AiInputController] Failed to export recipes", e);
        }
        return GSON.toJson(arr);
    }

    /** Best-effort result-item preview; falls back to assembling with an empty grid. */
    private static ItemStack previewResult(CraftingRecipe craft, Minecraft client) {
        try {
            // MC 26.2: Recipe.assemble now takes only the RecipeInput.
            return craft.assemble(net.minecraft.world.item.crafting.CraftingInput.EMPTY);
        } catch (Exception e) {
            return ItemStack.EMPTY;
        }
    }

    /**
     * Crafts a recipe identified by its vanilla recipe id (e.g. "minecraft:chest") using the
     * game's built-in RecipeManager data. Requires the player to have the ingredients and an
     * open inventory (2x2 grid) or nearby crafting table (3x3 grid, opened automatically).
     * The grid is filled by shift-clicking candidate items and validating against the
     * vanilla CraftingContainer, then the result is taken out.
     */
    public void craftRecipeById(String recipeId) {
        Minecraft client = Minecraft.getInstance();
        client.execute(() -> {
            LocalPlayer player = client.player;
            if (player == null || client.level == null || client.gameMode == null) return;
            Identifier loc = Identifier.parse(recipeId.contains(":") ? recipeId : "minecraft:" + recipeId);
            ResourceKey<Recipe<?>> recipeKey = ResourceKey.create(Registries.RECIPE, loc);
            java.util.Optional<RecipeHolder<?>> holderOpt;
            try {
                HolderLookup.RegistryLookup<Recipe<?>> lookup =
                        client.level.registryAccess().lookupOrThrow(Registries.RECIPE);
                // MC 26.2: HolderGetter.get(ResourceKey) -> Optional<Holder.Reference<T>>
                var h = lookup.get(recipeKey);
                holderOpt = h.map(hr -> new RecipeHolder<>(recipeKey, hr.value()));
            } catch (Exception e) {
                holderOpt = java.util.Optional.empty();
            }
            if (holderOpt.isEmpty()) {
                LOGGER.warn("[AiInputController] Unknown recipe '{}'", recipeId);
                return;
            }
            if (!(holderOpt.get().value() instanceof CraftingRecipe craft)) {
                LOGGER.warn("[AiInputController] Recipe '{}' is not a crafting-table recipe", recipeId);
                return;
            }

            // Find a nearby crafting table and open it (gives us the full 3x3 grid)
            BlockPos tablePos = findNearestCraftingTable(player, 5);
            if (tablePos != null) {
                Vec3 center = Vec3.atCenterOf(tablePos);
                lookAt(center.x, center.y, center.z, 2);
                client.gameMode.useItemOn(player, InteractionHand.MAIN_HAND,
                        new BlockHitResult(center, Direction.UP, tablePos, false));
            }

            // MC 26.2: Minecraft.screen field moved behind Gui#screen()
            Screen screen = client.gui.screen();
            if (!(screen instanceof AbstractContainerScreen<?> cs)) {
                LOGGER.warn("[AiInputController] No crafting screen open (no crafting table nearby?). Recipe: {}", recipeId);
                return;
            }
            AbstractContainerMenu menu = cs.getMenu();
            final int containerId = menu.containerId;

            // Locate the crafting grid + result slots using the vanilla menu layouts:
            //   InventoryMenu (2x2): RESULT_SLOT/CRAFT_SLOT_START/CRAFT_SLOT_COUNT constants
            //   CraftingMenu  (3x3): RESULT_SLOT constant, grid follows at slot 1..9
            int gridSize = 4, resultSlot = -1, gridStart = -1;
            if (menu instanceof net.minecraft.world.inventory.CraftingMenu) {
                resultSlot = net.minecraft.world.inventory.CraftingMenu.RESULT_SLOT;
                gridStart = resultSlot + 1;
                gridSize = 9;
            } else if (menu instanceof net.minecraft.world.inventory.InventoryMenu invMenu) {
                resultSlot = net.minecraft.world.inventory.InventoryMenu.RESULT_SLOT;
                gridStart = net.minecraft.world.inventory.InventoryMenu.CRAFT_SLOT_START;
                gridSize = net.minecraft.world.inventory.InventoryMenu.CRAFT_SLOT_COUNT;
            } else {
                // Generic fallback: scan the first two slots for a ResultSlot-named class
                String menuCls = menu.getClass().getSimpleName();
                gridSize = (menuCls.contains("CraftingTable") || menu.slots.size() >= 74) ? 9 : 4;
                for (int i = 0; i < Math.min(2, menu.slots.size()); i++) {
                    String cls = menu.slots.get(i).getClass().getSimpleName();
                    if (cls.contains("Result")) { resultSlot = i; break; }
                }
                if (resultSlot == 0) gridStart = 1;
            }
            if (resultSlot < 0 || gridStart < 0) {
                LOGGER.warn("[AiInputController] Could not locate crafting grid/result slots in open menu ({})",
                        menu.getClass().getSimpleName());
                return;
            }

            // Map each grid cell to an inventory slot holding a matching ingredient.
            // MC 26.2: use placementInfo().ingredients(); Ingredient.items() is now a
            // Stream<Holder<Item>>, so we skip stream iteration entirely and match the
            // player's inventory slots directly with Ingredient.test(stack).
            List<Ingredient> ingredients = craft.placementInfo().ingredients();
            java.util.Set<Integer> usedInvSlots = new java.util.HashSet<>();
            int[] plan = new int[9];
            java.util.Arrays.fill(plan, -1);
            for (int g = 0; g < Math.min(9, ingredients.size()); g++) {
                Ingredient ing = ingredients.get(g);
                if (ing.isEmpty()) continue;
                for (int s = 0; s < 36; s++) {
                    if (usedInvSlots.contains(s)) continue;
                    ItemStack have = player.getInventory().getItem(s);
                    if (!have.isEmpty() && ing.test(have)) {
                        plan[g] = s;
                        usedInvSlots.add(s);
                        break;
                    }
                }
                if (plan[g] < 0) {
                    LOGGER.warn("[AiInputController] Missing ingredient for grid cell {} of recipe '{}'", g, recipeId);
                    return;
                }
            }

            // Fill the grid via simulated clicks, then collect the result.
            // MC 26.2: handleInventoryMouseClick -> handleContainerInput(..., ContainerInput.PICKUP, ...)
            for (int g = 0; g < Math.min(9, gridSize); g++) {
                if (plan[g] < 0) continue;
                client.gameMode.handleContainerInput(containerId, invSlotToMenuSlot(menu, plan[g]), 0, ContainerInput.PICKUP, player);
                client.gameMode.handleContainerInput(containerId, gridStart + g, 0, ContainerInput.PICKUP, player);
            }
            client.gameMode.handleContainerInput(containerId, resultSlot, 0, ContainerInput.PICKUP, player);
            client.gameMode.handleContainerInput(containerId, resultSlot, 0, ContainerInput.PICKUP, player);
            LOGGER.info("[AiInputController] Crafted '{}' via the game's built-in recipe book", recipeId);
        });
    }

    private BlockPos findNearestCraftingTable(LocalPlayer player, int radius) {
        BlockPos origin = player.blockPosition();
        BlockPos best = null;
        double bestDist = Double.MAX_VALUE;
        for (int x = -radius; x <= radius; x++)
            for (int y = -2; y <= 2; y++)
                for (int z = -radius; z <= radius; z++) {
                    BlockPos p = origin.offset(x, y, z);
                    if (player.level().getBlockState(p).is(Blocks.CRAFTING_TABLE)) {
                        double d = p.distSqr(origin);
                        if (d < bestDist) { bestDist = d; best = p; }
                    }
                }
        return best;
    }

    private int invSlotToMenuSlot(AbstractContainerMenu menu, int invSlot) {
        // Vanilla mapping: hotbar 0-8 -> last 9 player slots of the menu;
        // main inventory 9-35 -> the 27 slots before them.
        int total = menu.slots.size();
        if (invSlot >= 0 && invSlot < 9) return total - 9 + invSlot;
        if (invSlot >= 9 && invSlot < 36) return total - 36 + (invSlot - 9);
        return invSlot;
    }

    /**
     * Maps canonical string names to Minecraft KeyMapping options.
     */
    private KeyMapping resolveKeyBinding(Minecraft client, String keyName) {
        if (client.options == null) return null;
        return switch (keyName.toLowerCase().trim()) {
            case "forward", "w" -> client.options.keyUp;
            case "back", "backward", "s" -> client.options.keyDown;
            case "left", "a" -> client.options.keyLeft;
            case "right", "d" -> client.options.keyRight;
            case "jump", "space" -> client.options.keyJump;
            case "sneak", "shift", "left_shift" -> client.options.keyShift;
            case "sprint", "ctrl", "left_ctrl" -> client.options.keySprint;
            case "attack", "left_click", "mouse_1" -> client.options.keyAttack;
            case "use", "right_click", "mouse_2" -> client.options.keyUse;
            case "pick_item", "middle_click", "mouse_3" -> client.options.keyPickItem;
            case "drop", "q" -> client.options.keyDrop;
            case "inventory", "e" -> client.options.keyInventory;
            case "swap_hands", "f" -> client.options.keySwapOffhand;
            case "chat", "t" -> client.options.keyChat;
            case "command", "/" -> client.options.keyCommand;
            case "social_interactions", "p" -> client.options.keySocialInteractions;
            case "screenshot", "f2" -> client.options.keyScreenshot;
            case "toggle_perspective", "f5" -> client.options.keyTogglePerspective;
            case "smooth_camera", "f4" -> client.options.keySmoothCamera;
            case "fullscreen", "f11" -> client.options.keyFullscreen;
            case "spectator_outlines" -> client.options.keySpectatorOutlines;
            case "advancements", "l" -> client.options.keyAdvancements;
            case "player_list", "tab" -> client.options.keyPlayerList;
            case "save_toolbar", "c" -> client.options.keySaveHotbarActivator;
            case "load_toolbar", "x" -> client.options.keyLoadHotbarActivator;
            case "f1" -> client.options.keyPlayerList; // Not quite f1, but placeholder if missing
            case "f3" -> null; // F3 is hardcoded in MC, usually not a KeyMapping
            case "escape", "esc" -> null; // Escape is hardcoded
            case "hotbar_1", "1" -> client.options.keyHotbarSlots[0];
            case "hotbar_2", "2" -> client.options.keyHotbarSlots[1];
            case "hotbar_3", "3" -> client.options.keyHotbarSlots[2];
            case "hotbar_4", "4" -> client.options.keyHotbarSlots[3];
            case "hotbar_5", "5" -> client.options.keyHotbarSlots[4];
            case "hotbar_6", "6" -> client.options.keyHotbarSlots[5];
            case "hotbar_7", "7" -> client.options.keyHotbarSlots[6];
            case "hotbar_8", "8" -> client.options.keyHotbarSlots[7];
            case "hotbar_9", "9" -> client.options.keyHotbarSlots[8];
            default -> null;
        };
    }
}
