package com.minecraft.ai.mixin;

import net.minecraft.client.KeyMapping;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * Accessor mixin allowing the AI controller to mutate key mapping pressed states
 * and simulation counters directly in memory without hardware mouse/keyboard emulation.
 */
@Mixin(KeyMapping.class)
public interface KeyBindingAccessor {

    @Accessor("isDown")
    void ai$setDown(boolean isDown);

    @Accessor("isDown")
    boolean ai$isDown();

    @Accessor("clickCount")
    int ai$getClickCount();

    @Accessor("clickCount")
    void ai$setClickCount(int clickCount);
}
