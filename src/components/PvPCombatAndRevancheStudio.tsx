import React, { useState, useEffect } from "react";
import { 
  Swords, 
  Shield, 
  Zap, 
  Flame, 
  Skull, 
  Crosshair, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  ChevronRight, 
  Bot, 
  User, 
  Sliders, 
  Target, 
  Play, 
  Pause, 
  Clock, 
  Fish, 
  Hammer, 
  Cpu, 
  Gauge, 
  Radio, 
  SlidersHorizontal 
} from "lucide-react";
import { 
  AgentInstance, 
  CombatTelemetry, 
  CombatWeaponType, 
  PvPStance, 
  PvPTacticsSettings, 
  RevancheLevel, 
  ServerCooldownDiagnostics, 
  ServerCooldownProfile, 
  SlapEvent 
} from "../types";
import { 
  DEFAULT_PVP_SETTINGS, 
  INITIAL_COMBAT_TELEMETRY, 
  INITIAL_SLAP_EVENTS, 
  analyzeServerCooldownMod, 
  getWeaponCombatProfile, 
  processIncomingSlap, 
  generateRevancheDialogue 
} from "../utils/pvpRevancheEngine";
import { playChatChime } from "../utils/audioChime";

interface PvPCombatAndRevancheStudioProps {
  agents: AgentInstance[];
  activeAgentId: string;
  onSelectAgent: (id: string) => void;
  onDispatchAction: (action: any) => void;
  onSendChatMessage: (text: string, senderName?: string) => void;
  onAddAgentLog: (logText: string) => void;
}

export const PvPCombatAndRevancheStudio: React.FC<PvPCombatAndRevancheStudioProps> = ({
  agents,
  activeAgentId,
  onSelectAgent,
  onDispatchAction,
  onSendChatMessage,
  onAddAgentLog
}) => {
  const activeAgent = agents.find((a) => a.id === activeAgentId) || agents[0];

  // Tactics Settings
  const [tactics, setTactics] = useState<PvPTacticsSettings>(DEFAULT_PVP_SETTINGS);

  // Slap & Vendetta Ledger
  const [slapLedger, setSlapLedger] = useState<SlapEvent[]>(INITIAL_SLAP_EVENTS);
  const [selectedSlapId, setSelectedSlapId] = useState<string>(INITIAL_SLAP_EVENTS[0]?.id || "");

  // Combat Telemetry
  const [combatState, setCombatState] = useState<CombatTelemetry>(INITIAL_COMBAT_TELEMETRY);

  // Slap Simulator Inputs
  const [slapperName, setSlapperName] = useState<string>("Player_Steve");
  const [slapWeapon, setSlapWeapon] = useState<string>("raw_cod");
  const [slapDamage, setSlapDamage] = useState<number>(1.5);
  const [isSimulatingDuel, setIsSimulatingDuel] = useState<boolean>(false);
  const [isScanningServer, setIsScanningServer] = useState<boolean>(false);
  const [duelCombatLog, setDuelCombatLog] = useState<string[]>([
    "PvP Combat Engine ready on Minecraft 26.2 client.",
    "Dynamic Server Cooldown Scanner initialized. Probing generic.attack_speed...",
    "Auto-adaptive swing rate calibrated to server rules."
  ]);

  // Visual effects
  const [lastDamagePop, setLastDamagePop] = useState<{ text: string; x: number; y: number; isCrit: boolean } | null>(null);
  const [screenFlashRed, setScreenFlashRed] = useState<boolean>(false);

  // Weapon profile
  const weaponProfile = getWeaponCombatProfile(combatState.selectedWeapon);

  // Analyze server cooldown profile dynamically
  const cooldownDiagnostics: ServerCooldownDiagnostics = analyzeServerCooldownMod(
    combatState.selectedWeapon,
    tactics.cooldownDetectionMode,
    tactics.customAttackSpeedModifier
  );

  // Sync diagnostics into combat state
  useEffect(() => {
    setCombatState((prev) => ({
      ...prev,
      cooldownDiagnostics
    }));
  }, [tactics.cooldownDetectionMode, tactics.customAttackSpeedModifier, combatState.selectedWeapon]);

  // Attack cooldown animation ticker — auto adapts to detected server speed!
  useEffect(() => {
    const timer = setInterval(() => {
      setCombatState((prev) => {
        if (cooldownDiagnostics.hasCooldownDisabled) {
          // Instant 1.8 click spam: permanently ready
          return { ...prev, attackCooldown: 1.0 };
        }

        if (prev.attackCooldown < 1.0) {
          // Speed step proportional to effective attack speed
          const increment = 0.05 * (cooldownDiagnostics.effectiveAttackSpeed / 1.6);
          const nextVal = Math.min(1.0, prev.attackCooldown + increment);
          return { ...prev, attackCooldown: Math.round(nextVal * 100) / 100 };
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [cooldownDiagnostics.effectiveAttackSpeed, cooldownDiagnostics.hasCooldownDisabled]);

  // Automated duel simulation loop — adapts cadence based on server cooldown
  useEffect(() => {
    if (!isSimulatingDuel) return;

    // Fast step for 1.8 instant spam, timed step for 1.9+
    const intervalMs = cooldownDiagnostics.hasCooldownDisabled 
      ? 120 // ~8.3 CPS rapid clicks
      : Math.max(250, cooldownDiagnostics.effectiveCycleMs + 50);

    const interval = setInterval(() => {
      setCombatState((prev) => {
        if (prev.targetHealth <= 0) {
          setIsSimulatingDuel(false);
          const victoryLog = `[DUEL FINISHED]: ${prev.targetName} defeated by ${activeAgent.name}! Revanche resolved.`;
          setDuelCombatLog((l) => [victoryLog, ...l.slice(0, 30)]);
          onSendChatMessage(generateRevancheDialogue(activeAgent.name, prev.targetName, "avenged"), activeAgent.name);
          playChatChime("command");

          // Update slap ledger
          setSlapLedger((list) =>
            list.map((item) =>
              item.attackerName === prev.targetName
                ? { ...item, status: "avenged", hitsReturned: item.targetHits }
                : item
            )
          );

          return { ...prev, targetHealth: 0, comboCounter: 0 };
        }

        // Check if swing is ready according to auto-adjusted threshold
        const isReady = prev.attackCooldown >= (cooldownDiagnostics.hasCooldownDisabled ? 0.1 : tactics.attackCooldownThreshold);
        if (!isReady) return prev;

        const isCrit = Math.random() > 0.35;
        const dmgMultiplier = isCrit ? weaponProfile.critMultiplier : 1.0;
        const dmg = (weaponProfile.baseDamage * dmgMultiplier) + (Math.random() * 1.5 - 0.75);
        const roundedDmg = Math.max(1, Math.round(dmg * 10) / 10);
        const newTargetHp = Math.max(0, Math.round((prev.targetHealth - roundedDmg) * 10) / 10);
        const nextCombo = prev.comboCounter + 1;

        // Visual pop
        setLastDamagePop({
          text: `-${roundedDmg} HP ${isCrit ? "⚡CRIT!" : ""}`,
          x: Math.random() * 60 + 20,
          y: Math.random() * 40 + 30,
          isCrit
        });

        // Add combat log
        const strikeLog = `[${new Date().toLocaleTimeString()}] ${activeAgent.name} landed ${isCrit ? "JUMP CRIT" : "STRIKE"} (${cooldownDiagnostics.detectedModName}): -${roundedDmg} HP (Enemy: ${newTargetHp}/${prev.targetMaxHealth} HP) [Combo x${nextCombo}]`;
        setDuelCombatLog((l) => [strikeLog, ...l.slice(0, 30)]);

        // Voice taunt on combo 3
        if (nextCombo === 3) {
          onSendChatMessage(generateRevancheDialogue(activeAgent.name, prev.targetName, "combo"), activeAgent.name);
        }

        return {
          ...prev,
          targetHealth: newTargetHp,
          attackCooldown: cooldownDiagnostics.hasCooldownDisabled ? 1.0 : 0.0,
          comboCounter: nextCombo,
          lastHitType: isCrit ? "CRITICAL" : "STANDARD"
        };
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isSimulatingDuel, activeAgent.name, weaponProfile, cooldownDiagnostics, tactics.attackCooldownThreshold, onSendChatMessage]);

  // Handler: Probe Server Cooldown
  const handleScanServerCooldown = () => {
    setIsScanningServer(true);
    playChatChime("command");
    onAddAgentLog(`[Cooldown Scanner]: Probing server EntityAttributes.GENERIC_ATTACK_SPEED and attack cooldown ticks on current world...`);

    setTimeout(() => {
      setIsScanningServer(false);
      const log = `[Cooldown Scanner]: Detected ${cooldownDiagnostics.detectedModName} | Attack Speed: ${cooldownDiagnostics.effectiveAttackSpeed}/s | Cycle: ${cooldownDiagnostics.effectiveCycleMs}ms (Confidence: ${(cooldownDiagnostics.detectionConfidence * 100).toFixed(0)}%)`;
      setDuelCombatLog((l) => [log, ...l.slice(0, 30)]);
      onAddAgentLog(log);
    }, 600);
  };

  // Handler: Slap Bot Trigger
  const handleTriggerSlap = () => {
    // Flash UI red
    setScreenFlashRed(true);
    setTimeout(() => setScreenFlashRed(false), 300);

    // Audio chime
    playChatChime("incoming");

    // Process slap in Revanche Engine
    const { newSlapEvent, tauntMessage, recommendedWeapon } = processIncomingSlap(
      activeAgent,
      slapperName,
      slapWeapon,
      slapDamage,
      tactics,
      agents
    );

    // Update Slap Ledger
    setSlapLedger((prev) => [newSlapEvent, ...prev]);
    setSelectedSlapId(newSlapEvent.id);

    // Send In-Game Chat Revanche Taunt
    onSendChatMessage(tauntMessage, activeAgent.name);

    // Add agent activity log
    onAddAgentLog(`[SLAP VENDETTA]: ${activeAgent.name} slapped by ${slapperName} with ${slapWeapon} (-${slapDamage} HP). Retaliation level: ${newSlapEvent.revancheLevel}.`);

    // Update combat telemetry to target this attacker
    setCombatState((prev) => ({
      ...prev,
      targetName: slapperName,
      targetEntityId: newSlapEvent.attackerId || 101,
      targetDistance: 2.5,
      targetHealth: 20.0,
      targetMaxHealth: 20.0,
      selectedWeapon: recommendedWeapon,
      currentStance: "vendetta_chase",
      activeRevancheTarget: slapperName,
      revancheGrudgeScore: 100,
      comboCounter: 0
    }));

    // Start auto duel simulation
    setIsSimulatingDuel(true);

    const logEntry = `[${new Date().toLocaleTimeString()}] ⚠️ SLAP DETECTED: ${slapperName} hit ${activeAgent.name} with ${slapWeapon}! Auto-Revanche engaged!`;
    setDuelCombatLog((l) => [logEntry, ...l.slice(0, 30)]);
  };

  // Handler: Manual Strike / Jump Crit
  const handleManualStrike = (isCrit: boolean) => {
    const minThreshold = cooldownDiagnostics.hasCooldownDisabled ? 0.1 : tactics.attackCooldownThreshold;
    if (combatState.attackCooldown < minThreshold) {
      onAddAgentLog(`[PvP Engine]: Attack cooldown not ready (${Math.round(combatState.attackCooldown * 100)}%). Swing delayed for max damage.`);
      return;
    }

    const dmg = (weaponProfile.baseDamage * (isCrit ? weaponProfile.critMultiplier : 1.0));
    const roundedDmg = Math.round(dmg * 10) / 10;
    const newTargetHp = Math.max(0, Math.round((combatState.targetHealth - roundedDmg) * 10) / 10);
    const nextCombo = combatState.comboCounter + 1;

    setLastDamagePop({
      text: `-${roundedDmg} HP ${isCrit ? "⚡JUMP CRIT!" : "STRIKE"}`,
      x: Math.random() * 50 + 25,
      y: Math.random() * 30 + 35,
      isCrit
    });

    setCombatState((prev) => ({
      ...prev,
      targetHealth: newTargetHp,
      attackCooldown: cooldownDiagnostics.hasCooldownDisabled ? 1.0 : 0.0,
      comboCounter: nextCombo,
      lastHitType: isCrit ? "CRITICAL" : "STANDARD"
    }));

    const strikeLog = `[${new Date().toLocaleTimeString()}] Manual ${isCrit ? "JUMP CRIT" : "STRIKE"} with ${weaponProfile.name} on ${combatState.targetName}: -${roundedDmg} HP (Target: ${newTargetHp}/${combatState.targetMaxHealth} HP) [Combo x${nextCombo}]`;
    setDuelCombatLog((l) => [strikeLog, ...l.slice(0, 30)]);

    if (newTargetHp === 0) {
      onSendChatMessage(generateRevancheDialogue(activeAgent.name, combatState.targetName, "avenged"), activeAgent.name);
      setSlapLedger((list) =>
        list.map((item) =>
          item.attackerName === combatState.targetName
            ? { ...item, status: "avenged", hitsReturned: item.targetHits }
            : item
        )
      );
    }
  };

  // Handler: Axe Shield Break
  const handleAxeShieldBreak = () => {
    setCombatState((prev) => ({
      ...prev,
      selectedWeapon: "netherite_axe",
      attackCooldown: cooldownDiagnostics.hasCooldownDisabled ? 1.0 : 0.0,
      lastHitType: "SHIELD_BREAK",
      comboCounter: prev.comboCounter + 1
    }));

    const axeLog = `[${new Date().toLocaleTimeString()}] 🪓 AXE SHIELD BREAK: Disabled ${combatState.targetName}'s shield for 5.0s! Enemy exposed!`;
    setDuelCombatLog((l) => [axeLog, ...l.slice(0, 30)]);
    onAddAgentLog(`[Combat Mixin]: ${activeAgent.name} disabled enemy shield with Netherite Axe.`);
  };

  // Handler: W-Tap Sprint Reset
  const handleWTapSprintReset = () => {
    onDispatchAction({ type: "press_key", key: "w", durationMs: 80 });
    setCombatState((prev) => ({
      ...prev,
      wTapResetReady: true,
      lastHitType: "KNOCKBACK"
    }));

    const wTapLog = `[${new Date().toLocaleTimeString()}] 💨 W-TAP SPRINT RESET: Reset sprint velocity packet. Inflicted maximum knockback on ${combatState.targetName}!`;
    setDuelCombatLog((l) => [wTapLog, ...l.slice(0, 30)]);
  };

  const selectedSlap = slapLedger.find((s) => s.id === selectedSlapId) || slapLedger[0];

  return (
    <div className={`p-4 md:p-6 max-w-7xl mx-auto space-y-6 transition-colors duration-200 ${screenFlashRed ? "bg-rose-950/20" : ""}`}>
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                <Swords className="h-3 w-3" />
                <span>PvP & Revanche Engine</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                <Cpu className="h-3 w-3 text-cyan-400" />
                <span>Auto-Detect Server Cooldown Mod</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                1.9+ & 1.8 Instant Support
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                Auto-Retaliation on Slap
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Adaptive PvP Combat & Autonomous Revanche Cockpit</span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-3xl">
              Equipped with an automatic server combat scanner that dynamically inspects weapon speed attributes, custom server cooldown mods, 1.8 instant spam click mechanics, jump critical frames, and instant swarm retaliation.
            </p>
          </div>

          {/* Active Bot Switcher */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800 self-start lg:self-auto">
            <span className="text-xs font-mono text-slate-400">Target Bot:</span>
            <div className="flex items-center gap-1">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => onSelectAgent(agent.id)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    agent.id === activeAgent.id
                      ? "bg-rose-600 text-white shadow-md shadow-rose-900/30"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  <Bot className="h-3 w-3" />
                  <span>{agent.name.split("-")[0]}</span>
                  <span className="text-[10px] opacity-75 font-normal">({agent.role})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Server Cooldown Auto-Detection Monitor & Mod Profiler */}
      <div className="bg-slate-900 border border-cyan-900/50 rounded-xl p-4 md:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-cyan-400 animate-pulse" />
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <span>Auto-Detected Server Cooldown Mod Scanner</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-normal bg-emerald-950 text-emerald-300 border border-emerald-800">
                  LIVE CALIBRATION
                </span>
              </h2>
            </div>
            <p className="text-slate-400 text-xs">
              Automatically probes <code className="text-cyan-300 font-mono">EntityAttributes.GENERIC_ATTACK_SPEED</code> and server packets to detect if the server has custom weapon cooldown mods, OldCombat 1.8 instant clicking, or modified tick rates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScanServerCooldown}
              disabled={isScanningServer}
              className="px-3 py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md shadow-cyan-950/50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScanningServer ? "animate-spin text-cyan-300" : "text-cyan-400"}`} />
              <span>{isScanningServer ? "Scanning Packets..." : "Probe Server Cooldown"}</span>
            </button>
          </div>
        </div>

        {/* Server Cooldown Diagnostics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          
          {/* Diagnostic 1: Detected Profile */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">Server Combat Profile</span>
            <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-cyan-400 shrink-0" />
              <span className="truncate">{cooldownDiagnostics.detectedModName}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block">
              Confidence: {(cooldownDiagnostics.detectionConfidence * 100).toFixed(0)}% | TPS: {cooldownDiagnostics.serverTickRateTps}
            </span>
          </div>

          {/* Diagnostic 2: Effective Attack Speed */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">Effective Attack Rate</span>
            <div className="text-sm font-mono font-black text-amber-300 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{cooldownDiagnostics.effectiveAttackSpeed} swings/sec</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block">
              Cycle Period: <strong className="text-slate-200">{cooldownDiagnostics.effectiveCycleMs}ms</strong>
            </span>
          </div>

          {/* Diagnostic 3: Attribute Probe */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">Generic Attack Speed Attr</span>
            <div className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{cooldownDiagnostics.attributeGenericAttackSpeed.toFixed(1)} Base Points</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block">
              {cooldownDiagnostics.hasCooldownDisabled ? "🚀 ZERO DELAY / 1.8 SPAM" : "🛡️ 1.9+ TIMED RECOVERY"}
            </span>
          </div>

          {/* Diagnostic 4: Bot Reaction Strategy */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">Bot Attack Behavior</span>
            <div className="text-xs font-mono font-bold text-rose-300 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-rose-400 shrink-0" />
              <span>
                {cooldownDiagnostics.hasCooldownDisabled 
                  ? `Spam Click (${cooldownDiagnostics.autoSpamClickCPS} CPS)` 
                  : `Timed Hits (>=${Math.round(cooldownDiagnostics.autoAdjustedThreshold * 100)}% Charge)`}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block">
              Threshold: {Math.round(cooldownDiagnostics.autoAdjustedThreshold * 100)}% charge required
            </span>
          </div>
        </div>

        {/* Server Cooldown Profile Override & Multiplier Controls */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs font-mono">
          <div className="md:col-span-3 text-slate-300 flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
            <span>Server Mode Simulation:</span>
          </div>
          
          <div className="md:col-span-5">
            <select
              value={tactics.cooldownDetectionMode}
              onChange={(e) => setTactics({ ...tactics, cooldownDetectionMode: e.target.value as ServerCooldownProfile })}
              className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="auto_detect">⚡ Auto-Detect (Continuous Attribute & Cooldown Scan)</option>
              <option value="vanilla_1_9">⚔️ Vanilla 1.9+ Standard Cooldown (1.6/s Sword, 1.0/s Axe)</option>
              <option value="old_combat_1_8">🔥 OldCombatMod / 1.8 Server (Zero Cooldown, Instant Click Spam)</option>
              <option value="fast_attack_mod">⚡ Fast Attack Cooldown Mod (3.0x Velocity)</option>
              <option value="slow_tactical_mod">🛡️ Slow Tactical Combat Mod (0.5x Slow Rate)</option>
              <option value="custom_override">⚙️ Custom Server Attack Speed Multiplier</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-slate-400 text-[11px] whitespace-nowrap">Multiplier: {tactics.customAttackSpeedModifier.toFixed(1)}x</span>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={tactics.customAttackSpeedModifier}
              onChange={(e) => setTactics({ ...tactics, customAttackSpeedModifier: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Interactive Slap Bot & Revanche Trigger Bar */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/40 border border-rose-900/50 rounded-xl p-4 md:p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Fish className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                Interactive Slap Trigger & Revanche Simulator
              </h2>
            </div>
            <p className="text-slate-400 text-xs">
              Simulate an unprovoked slap or hit on <span className="text-rose-300 font-bold font-mono">{activeAgent.name}</span> to observe instant Vendetta lock-on, chat taunts, and relentless retaliation!
            </p>
          </div>

          {/* Slap Inputs & Trigger Button */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Attacker Name */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-slate-400">Attacker:</span>
              <input
                type="text"
                value={slapperName}
                onChange={(e) => setSlapperName(e.target.value)}
                className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-amber-300 w-28 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Weapon */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-slate-400">Slap Weapon:</span>
              <select
                value={slapWeapon}
                onChange={(e) => setSlapWeapon(e.target.value)}
                className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="raw_cod">🐟 Raw Cod (Fish Slap)</option>
                <option value="fist">👊 Bare Fist</option>
                <option value="wooden_sword">🗡️ Wooden Sword</option>
                <option value="diamond_sword">💎 Diamond Sword</option>
                <option value="knockback_stick">🪄 Knockback Stick</option>
              </select>
            </div>

            {/* Damage Slider */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-slate-400">Dmg: {slapDamage} HP</span>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.5"
                value={slapDamage}
                onChange={(e) => setSlapDamage(parseFloat(e.target.value))}
                className="w-20 accent-rose-500"
              />
            </div>

            {/* SLAP BUTTON */}
            <div className="flex flex-col gap-1 self-end">
              <span className="text-[10px] font-mono opacity-0">Action</span>
              <button
                onClick={handleTriggerSlap}
                className="px-4 py-1.5 rounded bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white text-xs font-mono font-bold tracking-wider shadow-lg shadow-rose-950/60 border border-rose-400/40 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Flame className="h-4 w-4 text-amber-300 animate-pulse" />
                <span>SLAP BOT NOW!</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Combat Cockpit & 2D Tactical Duel Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Columns: Active Combat Cockpit */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1.9+ Weapon Selection & Attack Cooldown Gauge */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">Weapon Kit & Adaptive Recovery Timing</h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Charge:</span>
                <span className={`font-bold ${combatState.attackCooldown >= 0.95 || cooldownDiagnostics.hasCooldownDisabled ? "text-emerald-400" : "text-amber-400"}`}>
                  {cooldownDiagnostics.hasCooldownDisabled ? "INSTANT (100%)" : `${Math.round(combatState.attackCooldown * 100)}%`}
                </span>
              </div>
            </div>

            {/* Weapon Select Buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { id: "netherite_sword", label: "Netherite Sword", icon: "🗡️" },
                { id: "diamond_sword", label: "Diamond Sword", icon: "💎" },
                { id: "netherite_axe", label: "Netherite Axe", icon: "🪓" },
                { id: "mace", label: "Heavy Mace", icon: "🔨" },
                { id: "bow", label: "Power V Bow", icon: "🏹" },
                { id: "crossbow", label: "Crossbow", icon: "🎯" },
                { id: "end_crystal", label: "End Crystal", icon: "🔮" },
                { id: "anchor", label: "Respawn Anchor", icon: "💥" },
              ].map((w) => {
                const isSelected = combatState.selectedWeapon === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      setCombatState((prev) => ({
                        ...prev,
                        selectedWeapon: w.id as CombatWeaponType,
                        attackCooldown: cooldownDiagnostics.hasCooldownDisabled ? 1.0 : 0.2 // reset on weapon swap
                      }));
                    }}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? "bg-rose-950/60 border-rose-500 text-white shadow-md shadow-rose-950/50"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-base mb-1">{w.icon}</span>
                    <span className="text-[11px] font-mono font-bold leading-tight truncate">{w.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Attack Cooldown Bar */}
            <div className="space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-cyan-400" />
                  <span>
                    {cooldownDiagnostics.hasCooldownDisabled 
                      ? "Zero Cooldown Mode (Instant Hit Velocity):" 
                      : `Swing Recovery (${cooldownDiagnostics.effectiveCycleMs}ms cycle, ${cooldownDiagnostics.effectiveAttackSpeed}/s):`}
                  </span>
                </span>
                <span className={`font-bold ${combatState.attackCooldown >= 0.95 || cooldownDiagnostics.hasCooldownDisabled ? "text-emerald-400" : "text-amber-400"}`}>
                  {cooldownDiagnostics.hasCooldownDisabled 
                    ? "READY (1.8 Instant Click Spam)" 
                    : combatState.attackCooldown >= 0.95 
                      ? "READY (100% Full Dmg)" 
                      : "Charging..."}
                </span>
              </div>
              
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 relative">
                {/* 95% threshold indicator line for 1.9+ combat */}
                {!cooldownDiagnostics.hasCooldownDisabled && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10" 
                    style={{ left: `${tactics.attackCooldownThreshold * 100}%` }}
                    title={`Optimal Hit Threshold (${Math.round(tactics.attackCooldownThreshold * 100)}%)`}
                  />
                )}
                <div 
                  className={`h-full rounded-full transition-all duration-75 ${
                    cooldownDiagnostics.hasCooldownDisabled || combatState.attackCooldown >= 0.95 
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-sm shadow-emerald-400/50" 
                      : "bg-gradient-to-r from-amber-500 to-rose-500"
                  }`}
                  style={{ width: cooldownDiagnostics.hasCooldownDisabled ? "100%" : `${combatState.attackCooldown * 100}%` }}
                />
              </div>

              {/* Weapon Stats Readout */}
              <div className="grid grid-cols-4 gap-2 pt-2 text-[11px] font-mono border-t border-slate-900">
                <div>
                  <span className="text-slate-500 block">Base Damage</span>
                  <span className="text-slate-200 font-bold">{weaponProfile.baseDamage} HP</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Effective Speed</span>
                  <span className="text-cyan-300 font-bold">{cooldownDiagnostics.effectiveAttackSpeed} /s</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Crit Mult</span>
                  <span className="text-amber-300 font-bold">{weaponProfile.critMultiplier}x</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Shield Breaker</span>
                  <span className={weaponProfile.shieldBreaker ? "text-emerald-400 font-bold" : "text-slate-600"}>
                    {weaponProfile.shieldBreaker ? "YES (5s)" : "NO"}
                  </span>
                </div>
              </div>
            </div>

            {/* Combat Tactical Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => handleManualStrike(true)}
                disabled={!cooldownDiagnostics.hasCooldownDisabled && combatState.attackCooldown < tactics.attackCooldownThreshold}
                className="p-2.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Zap className="h-4 w-4 text-emerald-400" />
                <span>Jump Crit Strike</span>
                <span className="text-[10px] text-emerald-400/70 font-normal">
                  {cooldownDiagnostics.hasCooldownDisabled ? "Instant Crit" : "1.5x Dmg Frame"}
                </span>
              </button>

              <button
                onClick={handleAxeShieldBreak}
                className="p-2.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-200 text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all"
              >
                <Hammer className="h-4 w-4 text-amber-400" />
                <span>Axe Shield Break</span>
                <span className="text-[10px] text-amber-400/70 font-normal">5.0s Disabler</span>
              </button>

              <button
                onClick={handleWTapSprintReset}
                className="p-2.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-200 text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all"
              >
                <WindIcon />
                <span>W-Tap Sprint Reset</span>
                <span className="text-[10px] text-cyan-400/70 font-normal">Max Knockback</span>
              </button>

              <button
                onClick={() => setIsSimulatingDuel(!isSimulatingDuel)}
                className={`p-2.5 rounded-lg border text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                  isSimulatingDuel
                    ? "bg-rose-950 border-rose-500 text-rose-200 animate-pulse"
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                }`}
              >
                {isSimulatingDuel ? <Pause className="h-4 w-4 text-rose-400" /> : <Play className="h-4 w-4 text-emerald-400" />}
                <span>{isSimulatingDuel ? "Pause Duel" : "Auto Duel Sim"}</span>
                <span className="text-[10px] opacity-70 font-normal">
                  {cooldownDiagnostics.hasCooldownDisabled ? "Rapid 1.8 CPS" : "1.9+ Timed"}
                </span>
              </button>
            </div>
          </div>

          {/* Vendetta & Revenge Memory Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Skull className="h-4 w-4 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">Slap & Vendetta Memory Ledger</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                {slapLedger.filter(s => s.status !== "avenged").length} Active Grudges
              </span>
            </div>

            {/* List of Slap Incidents */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {slapLedger.map((slap) => {
                const isSelected = slap.id === selectedSlapId;
                const isAvenged = slap.status === "avenged";

                return (
                  <div
                    key={slap.id}
                    onClick={() => setSelectedSlapId(slap.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-rose-950/40 border-rose-600/80"
                        : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isAvenged ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-rose-950 text-rose-400 border border-rose-800 animate-pulse"}`}>
                        {isAvenged ? <CheckCircle2 className="h-4 w-4" /> : <Skull className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200 font-mono">{slap.attackerName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">slapped</span>
                          <span className="text-xs font-bold text-amber-300 font-mono">{slap.victimName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Weapon: <span className="text-slate-300">{slap.weapon}</span> (-{slap.damage} HP) | Level: <span className="text-rose-300 font-bold uppercase">{slap.revancheLevel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase block mb-0.5 ${
                        isAvenged 
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800" 
                          : "bg-rose-950 text-rose-300 border border-rose-800"
                      }`}>
                        {slap.status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {slap.hitsReturned}/{slap.targetHits} Hits
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Slap Details & Retaliation Log */}
            {selectedSlap && (
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Target Attacker: <strong className="text-rose-300">{selectedSlap.attackerName}</strong></span>
                  <button
                    onClick={() => {
                      setSlapLedger(list => list.map(item => item.id === selectedSlap.id ? { ...item, status: "avenged", hitsReturned: item.targetHits } : item));
                      onAddAgentLog(`[Revanche Ledger]: Grudge on ${selectedSlap.attackerName} marked as AVENGED / FORGIVEN.`);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Clear Grudge / Forgive
                  </button>
                </div>
                <div className="text-[11px] font-mono text-slate-400 space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                  {selectedSlap.retaliationLog.map((line, idx) => (
                    <div key={idx} className="leading-relaxed">{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: 2D Tactical Duel Simulation & PvP Tactics Settings */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 2D Combat Arena Simulation */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">Real-Time Combat Duel Arena</h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                {cooldownDiagnostics.hasCooldownDisabled ? "Mode: 1.8 Instant Click" : "Mode: 1.9+ Timed Crit"}
              </span>
            </div>

            {/* Visual 2D Radar Canvas */}
            <div className="relative bg-slate-950 border border-slate-800 rounded-xl h-64 overflow-hidden flex items-center justify-center">
              {/* Grid Lines */}
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
              
              {/* Reach Radius Circle */}
              <div className="absolute w-44 h-44 rounded-full border border-dashed border-cyan-500/20 pointer-events-none flex items-center justify-center">
                <span className="text-[9px] font-mono text-cyan-500/40 absolute -top-3">3.0m Reach</span>
              </div>

              {/* Bot (Left Side) */}
              <div className="absolute left-16 flex flex-col items-center">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-cyan-950 border-2 border-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-950/80">
                    <Bot className="h-6 w-6 text-cyan-400" />
                  </div>
                  {/* Equipped Weapon Badge */}
                  <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-slate-700 text-xs p-1 rounded shadow">
                    🗡️
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-cyan-300 mt-2">{activeAgent.name.split("-")[0]}</span>
                <span className="text-[10px] font-mono text-emerald-400">{activeAgent.player.health} HP</span>
              </div>

              {/* Target Beam / Crosshair */}
              <div className="w-24 h-0.5 bg-gradient-to-r from-cyan-500 to-rose-500 relative flex items-center justify-center">
                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono text-slate-300 -mt-6">
                  {combatState.targetDistance}m
                </span>
                {combatState.lastHitType === "CRITICAL" && (
                  <Sparkles className="h-4 w-4 text-amber-400 absolute animate-spin" />
                )}
              </div>

              {/* Damage Pop Visual */}
              {lastDamagePop && (
                <div 
                  className={`absolute font-mono font-black text-sm pointer-events-none animate-bounce z-20 ${
                    lastDamagePop.isCrit ? "text-amber-300 text-base" : "text-rose-400"
                  }`}
                  style={{ right: `${lastDamagePop.x}px`, top: `${lastDamagePop.y}px` }}
                >
                  {lastDamagePop.text}
                </div>
              )}

              {/* Enemy Attacker (Right Side) */}
              <div className="absolute right-16 flex flex-col items-center">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center shadow-lg transition-all ${
                    combatState.targetHealth === 0 
                      ? "bg-slate-900 border-slate-700 opacity-40" 
                      : "bg-rose-950 border-rose-500 shadow-rose-950/80"
                  }`}>
                    {combatState.targetHealth === 0 ? <Skull className="h-6 w-6 text-slate-500" /> : <User className="h-6 w-6 text-rose-400" />}
                  </div>
                  {/* Status Badge */}
                  <div className="absolute -bottom-2 -right-2 bg-rose-900 border border-rose-600 text-[10px] font-mono font-bold text-white px-1 rounded shadow">
                    AGGRO
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-rose-300 mt-2">{combatState.targetName}</span>
                <span className="text-[10px] font-mono text-rose-400">{combatState.targetHealth} / {combatState.targetMaxHealth} HP</span>
              </div>

              {/* Target Health Bar Bottom */}
              <div className="absolute bottom-2 left-4 right-4 bg-slate-900/90 border border-slate-800 p-2 rounded-lg flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">{combatState.targetName} Health:</span>
                <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 transition-all duration-150"
                    style={{ width: `${(combatState.targetHealth / combatState.targetMaxHealth) * 100}%` }}
                  />
                </div>
                <span className="font-bold text-rose-300">{combatState.targetHealth} HP</span>
              </div>
            </div>

            {/* Duel Combat Logs */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Live Combat Logs</span>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                {duelCombatLog.map((log, idx) => (
                  <div key={idx} className="text-slate-300 leading-tight truncate" title={log}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PvP Tactics & Retaliation Behavior Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">PvP Tactics & Revanche Tweaker</h3>
              </div>
            </div>

            {/* Retaliation Strategy Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 block">Revanche Mode on Slap:</label>
              <select
                value={tactics.revancheMode}
                onChange={(e) => setTactics({ ...tactics, revancheMode: e.target.value as any })}
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="swarm_retaliation">🐝 Swarm Retaliation (All 4 Bots converge with pincer attack)</option>
                <option value="full_vendetta">💀 Full Vendetta (Relentless chase until target eliminated)</option>
                <option value="proportional_revenge">⚖️ Proportional Revenge (3-5 hits back then disengage)</option>
                <option value="pacifist">🕊️ Pacifist (Log slap without physical retaliation)</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-2 text-xs font-mono">
              <label className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-300">Auto-Revanche on Slap / Hit</span>
                <input
                  type="checkbox"
                  checked={tactics.autoRevancheOnSlap}
                  onChange={(e) => setTactics({ ...tactics, autoRevancheOnSlap: e.target.checked })}
                  className="rounded accent-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-300">Auto-Spam Click if Cooldown Mod Disabled</span>
                <input
                  type="checkbox"
                  checked={tactics.enableAutoSpamClickOnInstant}
                  onChange={(e) => setTactics({ ...tactics, enableAutoSpamClickOnInstant: e.target.checked })}
                  className="rounded accent-cyan-400"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-300">Jump Crit Strike Optimization</span>
                <input
                  type="checkbox"
                  checked={tactics.jumpCritOptimization}
                  onChange={(e) => setTactics({ ...tactics, jumpCritOptimization: e.target.checked })}
                  className="rounded accent-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-300">Axe Shield Break on Guard</span>
                <input
                  type="checkbox"
                  checked={tactics.autoAxeShieldBreak}
                  onChange={(e) => setTactics({ ...tactics, autoAxeShieldBreak: e.target.checked })}
                  className="rounded accent-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-300">W-Tap / S-Tap Sprint Reset</span>
                <input
                  type="checkbox"
                  checked={tactics.wTapSprintReset}
                  onChange={(e) => setTactics({ ...tactics, wTapSprintReset: e.target.checked })}
                  className="rounded accent-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <span className="text-slate-300">Taunt in Chat on Avenged</span>
                <input
                  type="checkbox"
                  checked={tactics.tauntOnAvenged}
                  onChange={(e) => setTactics({ ...tactics, tauntOnAvenged: e.target.checked })}
                  className="rounded accent-rose-500"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wind icon helper
function WindIcon() {
  return (
    <svg className="h-4 w-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}

