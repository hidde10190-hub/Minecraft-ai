import { 
  AgentInstance, 
  AgentRole, 
  CombatTelemetry, 
  CombatWeaponType, 
  PvPStance, 
  PvPTacticsSettings, 
  RevancheLevel, 
  ServerCooldownDiagnostics, 
  ServerCooldownProfile, 
  SlapEvent 
} from "../types";

export const DEFAULT_PVP_SETTINGS: PvPTacticsSettings = {
  autoRevancheOnSlap: true,
  revancheMode: "swarm_retaliation",
  autoAxeShieldBreak: true,
  jumpCritOptimization: true,
  wTapSprintReset: true,
  autoTotemSwap: true,
  autoGappleThreshold: 10.0,
  hitReachDistance: 3.0,
  autoWebAnchorTactic: true,
  tauntOnAvenged: true,
  circleStrafeSpeed: 1.2,
  attackCooldownThreshold: 0.92,
  cooldownDetectionMode: "auto_detect",
  customAttackSpeedModifier: 1.0,
  enableAutoSpamClickOnInstant: true
};

export const INITIAL_SLAP_EVENTS: SlapEvent[] = [
  {
    id: "slap_init_01",
    victimAgentId: "agent_alpha",
    victimName: "Alpha-Builder",
    victimRole: "Builder",
    attackerName: "Player_Steve",
    attackerId: 101,
    weapon: "raw_cod",
    damage: 1.0,
    timestamp: Date.now() - 1000 * 60 * 3,
    revancheLevel: "swarm_jump",
    status: "hunting",
    hitsReturned: 2,
    targetHits: 5,
    retaliationLog: [
      "[12:30:14] Steve slapped Alpha-Builder with a Raw Cod (1.0 HP dmg).",
      "[12:30:15] Alpha-Builder registered Vendetta on Player_Steve (Level: Swarm Jump).",
      "[12:30:16] Swarm leader dispatched Gamma-Miner & Beta-Scout as flanking backup.",
      "[12:30:18] Landed 2x Jump Crit with Netherite Axe on Steve (14.5 HP dmg)."
    ]
  },
  {
    id: "slap_init_02",
    victimAgentId: "agent_gamma",
    victimName: "Gamma-Miner",
    victimRole: "Miner",
    attackerName: "Rogue_Zombie",
    attackerId: 204,
    weapon: "fist",
    damage: 3.5,
    timestamp: Date.now() - 1000 * 60 * 15,
    revancheLevel: "overkill",
    status: "avenged",
    hitsReturned: 4,
    targetHits: 4,
    retaliationLog: [
      "[12:18:02] Rogue_Zombie struck Gamma-Miner in quarry Y=32.",
      "[12:18:03] Gamma-Miner auto-swapped to Diamond Sword + Shield.",
      "[12:18:05] Executed 4-hit Sweep Combo. Target eliminated.",
      "[12:18:06] Vendetta cleared. Gamma-Miner resumed iron excavation."
    ]
  }
];

export const INITIAL_COOLDOWN_DIAGNOSTICS: ServerCooldownDiagnostics = {
  detectedMode: "vanilla_1_9",
  detectedModName: "Vanilla 1.9+ Attack Cooldown Engine",
  effectiveAttackSpeed: 1.6,
  effectiveCycleMs: 625,
  attributeGenericAttackSpeed: 4.0,
  hasCooldownDisabled: false,
  autoSpamClickCPS: 1.6,
  detectionConfidence: 0.98,
  lastPacketTimestamp: Date.now(),
  serverTickRateTps: 20.0,
  autoAdjustedThreshold: 0.92
};

export const INITIAL_COMBAT_TELEMETRY: CombatTelemetry = {
  targetEntityId: 101,
  targetName: "Player_Steve",
  targetDistance: 2.4,
  targetHealth: 15.5,
  targetMaxHealth: 20.0,
  attackCooldown: 1.0,
  isCritWindow: true,
  comboCounter: 3,
  shieldRaised: false,
  axeDisablerReady: true,
  wTapResetReady: true,
  strafeAngle: 45,
  currentStance: "critical_jumps",
  activeRevancheTarget: "Player_Steve",
  revancheGrudgeScore: 85,
  selectedWeapon: "netherite_sword",
  totemsRemaining: 3,
  gapplesRemaining: 12,
  pingMs: 14,
  lastHitType: "CRITICAL",
  cooldownDiagnostics: INITIAL_COOLDOWN_DIAGNOSTICS
};

/**
 * Calculate weapon stats and base recovery timing
 */
export function getWeaponCombatProfile(weapon: CombatWeaponType): {
  name: string;
  baseDamage: number;
  attackSpeed: number; // swings per second
  cooldownMs: number;
  shieldBreaker: boolean;
  reachBonus: number;
  critMultiplier: number;
} {
  switch (weapon) {
    case "netherite_sword":
      return { name: "Netherite Sword", baseDamage: 8.0, attackSpeed: 1.6, cooldownMs: 625, shieldBreaker: false, reachBonus: 0.0, critMultiplier: 1.5 };
    case "diamond_sword":
      return { name: "Diamond Sword", baseDamage: 7.0, attackSpeed: 1.6, cooldownMs: 625, shieldBreaker: false, reachBonus: 0.0, critMultiplier: 1.5 };
    case "netherite_axe":
      return { name: "Netherite Axe", baseDamage: 10.0, attackSpeed: 1.0, cooldownMs: 1000, shieldBreaker: true, reachBonus: 0.0, critMultiplier: 1.5 };
    case "diamond_axe":
      return { name: "Diamond Axe", baseDamage: 9.0, attackSpeed: 1.0, cooldownMs: 1000, shieldBreaker: true, reachBonus: 0.0, critMultiplier: 1.5 };
    case "mace":
      return { name: "Heavy Mace", baseDamage: 6.0, attackSpeed: 0.6, cooldownMs: 1660, shieldBreaker: false, reachBonus: 0.2, critMultiplier: 2.5 };
    case "bow":
      return { name: "Power V Bow", baseDamage: 9.0, attackSpeed: 0.8, cooldownMs: 1250, shieldBreaker: false, reachBonus: 24.0, critMultiplier: 1.25 };
    case "crossbow":
      return { name: "Quick Charge Crossbow", baseDamage: 11.0, attackSpeed: 1.2, cooldownMs: 830, shieldBreaker: true, reachBonus: 28.0, critMultiplier: 1.0 };
    case "end_crystal":
      return { name: "End Crystal Blast", baseDamage: 24.0, attackSpeed: 2.0, cooldownMs: 500, shieldBreaker: true, reachBonus: 4.5, critMultiplier: 1.0 };
    case "anchor":
      return { name: "Respawn Anchor", baseDamage: 26.0, attackSpeed: 1.5, cooldownMs: 660, shieldBreaker: true, reachBonus: 4.0, critMultiplier: 1.0 };
    default:
      return { name: "Diamond Sword", baseDamage: 7.0, attackSpeed: 1.6, cooldownMs: 625, shieldBreaker: false, reachBonus: 0.0, critMultiplier: 1.5 };
  }
}

/**
 * Automatically inspects server combat mechanics and weapon attributes:
 * - Detects OldCombatMod / 1.8 instant spam click servers
 * - Detects custom weapon speed modifier mods (e.g., 2.5x or 4.0x attack speed)
 * - Detects vanilla 1.9+ cooldown curve
 * - Dynamically adapts bot's click rate and threshold to match server rules!
 */
export function analyzeServerCooldownMod(
  weapon: CombatWeaponType,
  requestedProfile: ServerCooldownProfile,
  customMultiplier: number = 1.0
): ServerCooldownDiagnostics {
  const baseProfile = getWeaponCombatProfile(weapon);

  if (requestedProfile === "old_combat_1_8") {
    return {
      detectedMode: "old_combat_1_8",
      detectedModName: "OldCombatMod / 1.8 Instant Combat (Zero Delay)",
      effectiveAttackSpeed: 14.0,
      effectiveCycleMs: 70,
      attributeGenericAttackSpeed: 100.0,
      hasCooldownDisabled: true,
      autoSpamClickCPS: 14.0,
      detectionConfidence: 0.99,
      lastPacketTimestamp: Date.now(),
      serverTickRateTps: 20.0,
      autoAdjustedThreshold: 0.1
    };
  }

  if (requestedProfile === "fast_attack_mod") {
    const fastSpeed = baseProfile.attackSpeed * 3.0;
    return {
      detectedMode: "fast_attack_mod",
      detectedModName: "Fast Attack Cooldown Mod (3.0x Velocity)",
      effectiveAttackSpeed: Math.round(fastSpeed * 10) / 10,
      effectiveCycleMs: Math.round(1000 / fastSpeed),
      attributeGenericAttackSpeed: 12.0,
      hasCooldownDisabled: false,
      autoSpamClickCPS: Math.round(fastSpeed * 10) / 10,
      detectionConfidence: 0.95,
      lastPacketTimestamp: Date.now(),
      serverTickRateTps: 20.0,
      autoAdjustedThreshold: 0.85
    };
  }

  if (requestedProfile === "slow_tactical_mod") {
    const slowSpeed = baseProfile.attackSpeed * 0.5;
    return {
      detectedMode: "slow_tactical_mod",
      detectedModName: "Tactical Heavy Combat Mod (0.5x Slow Rate)",
      effectiveAttackSpeed: Math.round(slowSpeed * 10) / 10,
      effectiveCycleMs: Math.round(1000 / slowSpeed),
      attributeGenericAttackSpeed: 2.0,
      hasCooldownDisabled: false,
      autoSpamClickCPS: Math.round(slowSpeed * 10) / 10,
      detectionConfidence: 0.96,
      lastPacketTimestamp: Date.now(),
      serverTickRateTps: 20.0,
      autoAdjustedThreshold: 0.95
    };
  }

  if (requestedProfile === "custom_override") {
    const customSpeed = Math.max(0.2, baseProfile.attackSpeed * customMultiplier);
    return {
      detectedMode: "custom_override",
      detectedModName: `Custom Server Weapon Speed (${customMultiplier.toFixed(1)}x Multiplier)`,
      effectiveAttackSpeed: Math.round(customSpeed * 10) / 10,
      effectiveCycleMs: Math.round(1000 / customSpeed),
      attributeGenericAttackSpeed: 4.0 * customMultiplier,
      hasCooldownDisabled: customSpeed > 10.0,
      autoSpamClickCPS: Math.round(customSpeed * 10) / 10,
      detectionConfidence: 1.0,
      lastPacketTimestamp: Date.now(),
      serverTickRateTps: 20.0,
      autoAdjustedThreshold: customSpeed > 8.0 ? 0.2 : 0.9
    };
  }

  // "auto_detect" - simulated probe of entity attributes & cooldown reset ticks
  // In Minecraft 26.2 Fabric, this queries client.player.getAttributeValue(EntityAttributes.GENERIC_ATTACK_SPEED)
  const isModded = customMultiplier !== 1.0;
  if (isModded) {
    const dynamicSpeed = baseProfile.attackSpeed * customMultiplier;
    return {
      detectedMode: "auto_detect",
      detectedModName: `Auto-Scanned Server Mod: Custom Cooldown Rate (${customMultiplier.toFixed(1)}x speed)`,
      effectiveAttackSpeed: Math.round(dynamicSpeed * 10) / 10,
      effectiveCycleMs: Math.round(1000 / dynamicSpeed),
      attributeGenericAttackSpeed: 4.0 * customMultiplier,
      hasCooldownDisabled: dynamicSpeed >= 12.0,
      autoSpamClickCPS: Math.min(20, Math.round(dynamicSpeed * 10) / 10),
      detectionConfidence: 0.97,
      lastPacketTimestamp: Date.now(),
      serverTickRateTps: 20.0,
      autoAdjustedThreshold: dynamicSpeed >= 10.0 ? 0.15 : 0.92
    };
  }

  return {
    detectedMode: "vanilla_1_9",
    detectedModName: "Auto-Detected: Vanilla 1.9+ Cooldown Curve",
    effectiveAttackSpeed: baseProfile.attackSpeed,
    effectiveCycleMs: baseProfile.cooldownMs,
    attributeGenericAttackSpeed: 4.0,
    hasCooldownDisabled: false,
    autoSpamClickCPS: baseProfile.attackSpeed,
    detectionConfidence: 0.98,
    lastPacketTimestamp: Date.now(),
    serverTickRateTps: 20.0,
    autoAdjustedThreshold: 0.92
  };
}


/**
 * Generates an aggressive, entertaining tactical taunt when initiating or concluding revenge
 */
export function generateRevancheDialogue(
  victimName: string, 
  attackerName: string, 
  phase: "initiate" | "combo" | "avenged" | "swarm_call",
  weapon: string = "Sword"
): string {
  if (phase === "initiate") {
    const lines = [
      `[PVP RETALIATION] ${victimName}: Slap detected from ${attackerName}! Initiating instant Revanche protocol!`,
      `[VENDETTA ACTIVATED] ${victimName}: You dared to slap an autonomous AI, ${attackerName}? Prepare for retaliation!`,
      `[REVENGE ENGAGED] ${victimName}: Slap logged in memory matrix. Locking ${attackerName} into crosshair!`,
      `[PVP COMBAT] ${victimName}: Unprovoked aggression from ${attackerName}. Equipping combat kit!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  } else if (phase === "swarm_call") {
    const lines = [
      `[SWARM ALARM] ALL BOTS: ${victimName} was assaulted by ${attackerName}! Converge on coordinates!`,
      `[FLEET RETALIATION] Swarm dispatch: Protecting teammate ${victimName}. Pincer attack on ${attackerName}!`,
      `[BATTLE STATIONS] ${victimName} calls for swarm backup against ${attackerName}!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  } else if (phase === "combo") {
    const lines = [
      `[PVP COMBO] ${victimName}: W-Tap sprint reset + Jump Crit landed on ${attackerName}!`,
      `[COMBAT STRIKE] ${victimName}: Shield disabled with Axe! Combo x3 on ${attackerName}!`,
      `[TACTICAL HIT] ${victimName}: Circle-strafing ${attackerName} out of reach!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  } else {
    const lines = [
      `[REVENGE COMPLETE] ${victimName}: Vendetta against ${attackerName} fulfilled. Honor restored!`,
      `[AVENGED] ${victimName}: Never slap the swarm again, ${attackerName}. Resuming operations.`,
      `[VICTORY] ${victimName}: 5-hit combo landed on ${attackerName}. Score settled!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
}

/**
 * Evaluates whether an incoming slap warrants immediate retaliation,
 * assigning target hits, weapon choice, and swarm support.
 */
export function processIncomingSlap(
  victim: AgentInstance,
  attackerName: string,
  weapon: string,
  damage: number,
  settings: PvPTacticsSettings,
  swarmAgents: AgentInstance[]
): {
  newSlapEvent: SlapEvent;
  tauntMessage: string;
  recommendedWeapon: CombatWeaponType;
  swarmReinforcements: AgentInstance[];
} {
  const slapId = `slap_${Date.now()}`;
  let targetHits = 3;
  let revancheLevel: RevancheLevel = "proportional";

  if (settings.revancheMode === "full_vendetta") {
    targetHits = 8;
    revancheLevel = "overkill";
  } else if (settings.revancheMode === "swarm_retaliation") {
    targetHits = 5;
    revancheLevel = "swarm_jump";
  } else if (weapon.toLowerCase().includes("fish") || weapon.toLowerCase().includes("hand")) {
    targetHits = 3;
    revancheLevel = "humiliation";
  }

  const newSlapEvent: SlapEvent = {
    id: slapId,
    victimAgentId: victim.id,
    victimName: victim.name,
    victimRole: victim.role,
    attackerName,
    attackerId: Math.floor(Math.random() * 900) + 100,
    weapon,
    damage,
    timestamp: Date.now(),
    revancheLevel,
    status: "hunting",
    hitsReturned: 0,
    targetHits,
    retaliationLog: [
      `[${new Date().toLocaleTimeString()}] ${attackerName} slapped ${victim.name} with ${weapon} (-${damage.toFixed(1)} HP).`,
      `[${new Date().toLocaleTimeString()}] Revanche Mode active: ${settings.revancheMode} (${targetHits} revenge hits required).`,
      `[${new Date().toLocaleTimeString()}] Locking on target ${attackerName}. Optimal weapon selected.`
    ]
  };

  const tauntMessage = generateRevancheDialogue(
    victim.name, 
    attackerName, 
    settings.revancheMode === "swarm_retaliation" ? "swarm_call" : "initiate", 
    weapon
  );

  // Weapon recommendation based on role
  let recommendedWeapon: CombatWeaponType = "netherite_sword";
  if (victim.role === "Guard") {
    recommendedWeapon = "netherite_axe"; // Guard breaks shields
  } else if (victim.role === "Scout") {
    recommendedWeapon = "bow"; // Scout snipes
  } else if (victim.role === "Miner") {
    recommendedWeapon = "diamond_sword";
  }

  const swarmReinforcements = swarmAgents.filter(a => a.id !== victim.id);

  return {
    newSlapEvent,
    tauntMessage,
    recommendedWeapon,
    swarmReinforcements
  };
}
