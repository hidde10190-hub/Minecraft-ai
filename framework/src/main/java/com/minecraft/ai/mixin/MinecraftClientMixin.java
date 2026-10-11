package com.minecraft.ai.mixin;

import com.minecraft.ai.auth.SessionManager;
import com.minecraft.ai.input.AiInputController;
import net.minecraft.client.Minecraft;
import net.minecraft.client.User;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Mixin into Minecraft to hook into client render/engine ticks for deterministic input interpolation
 * and dynamic session identity resolution.
 */
@Mixin(Minecraft.class)
public class MinecraftClientMixin {

    @Inject(method = "tick", at = @At("HEAD"))
    private void onClientTickHead(CallbackInfo ci) {
        Minecraft client = (Minecraft) (Object) this;
        if (client.player != null && client.level != null) {
            AiInputController.getInstance().onClientTick(client);
        }
    }

    @Inject(method = "getUser", at = @At("HEAD"), cancellable = true)
    private void onGetUser(CallbackInfoReturnable<User> cir) {
        User custom = SessionManager.getInstance().getCurrentSession();
        if (custom != null) {
            cir.setReturnValue(custom);
        }
    }
}
