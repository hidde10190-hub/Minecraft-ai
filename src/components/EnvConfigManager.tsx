import React, { useState, useEffect } from "react";
import { 
  FileCog, 
  Save, 
  Copy, 
  Check, 
  RefreshCw, 
  Download, 
  Upload, 
  Server, 
  Bot, 
  Sparkles, 
  MessageSquare, 
  LayoutDashboard, 
  Sliders, 
  Key, 
  Users, 
  Play, 
  RotateCcw,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  Cpu
} from "lucide-react";
import { UnifiedEnvConfig, AgentRole } from "../types";
import { 
  DEFAULT_ENV_CONFIG, 
  generateDotEnvString, 
  parseDotEnvString, 
  persistEnvConfig,
  saveServerEnvConfig
} from "../utils/envConfigManager";

interface EnvConfigManagerProps {
  currentConfig: UnifiedEnvConfig;
  onSaveConfig: (newConfig: UnifiedEnvConfig) => void;
  onApplySwarmToLive: (newConfig: UnifiedEnvConfig) => void;
}

export const EnvConfigManager: React.FC<EnvConfigManagerProps> = ({
  currentConfig,
  onSaveConfig,
  onApplySwarmToLive
}) => {
  const [config, setConfig] = useState<UnifiedEnvConfig>(currentConfig);
  const [activeSubTab, setActiveSubTab] = useState<"visual" | "raw_env">("visual");
  const [providerViewCategory, setProviderViewCategory] = useState<"featured" | "cloud" | "speed" | "hub" | "specialized">("featured");
  const [rawEnvText, setRawEnvText] = useState<string>(() => generateDotEnvString(currentConfig));
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [liveFeedback, setLiveFeedback] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);

  // Sync state if parent config updates (e.g. from server fetch)
  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);

  // Sync raw text when config changes
  useEffect(() => {
    setRawEnvText(generateDotEnvString(config));
  }, [config]);

  // Handle direct field edit
  const handleChange = <K extends keyof UnifiedEnvConfig>(key: K, value: UnifiedEnvConfig[K]) => {
    setConfig(prev => {
      const next = { ...prev, [key]: value };
      return next;
    });
  };

  // Quick adjust bot count and sync usernames/roles
  const handleBotCountChange = (count: number) => {
    const clamped = Math.min(8, Math.max(1, count));
    const defaultNames = ["Gemini", "Builder-Bot", "Miner-Bot", "Scout-Bot", "Guard-Bot", "Excavator-Bot", "Sniper-Bot", "Logistics-Bot"];
    const defaultRoles: AgentRole[] = ["Assistant", "Builder", "Miner", "Scout", "Guard", "Miner", "Guard", "Assistant"];
    const defaultPorts = [8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087];

    const newNames = defaultNames.slice(0, clamped);
    // keep primary name as first
    if (config.botPrimaryUsername) {
      newNames[0] = config.botPrimaryUsername;
    }

    setConfig(prev => ({
      ...prev,
      botCount: clamped,
      botUsernames: newNames,
      botRoles: defaultRoles.slice(0, clamped),
      botIpcPorts: defaultPorts.slice(0, clamped)
    }));
  };

  const handleSaveAndApply = async () => {
    setIsApplying(true);
    setLiveFeedback("");
    try {
      onSaveConfig(config);
      onApplySwarmToLive(config);
      persistEnvConfig(config);
      const res = await saveServerEnvConfig(config);
      setSavedSuccess(true);
      setLiveFeedback(res.message || "Live config applied instantly without reboot!");
      setTimeout(() => {
        setSavedSuccess(false);
        setLiveFeedback("");
      }, 3500);
    } catch (err: any) {
      setLiveFeedback(err?.message || "Failed to push live config to server");
    } finally {
      setIsApplying(false);
    }
  };

  const handleRawTextChange = (text: string) => {
    setRawEnvText(text);
    try {
      const parsed = parseDotEnvString(text, config);
      setConfig(parsed);
      setParseError(null);
    } catch (err: any) {
      setParseError(err.message || "Failed to parse .env format");
    }
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(rawEnvText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadEnv = () => {
    const blob = new Blob([rawEnvText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_ENV_CONFIG);
    setRawEnvText(generateDotEnvString(DEFAULT_ENV_CONFIG));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        handleRawTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/70 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <FileCog className="h-6 w-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 font-mono tracking-tight">
                Universal 1-File .env Configuration & Dashboard Sync
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-semibold">
                Single Source of Truth
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Configure your Minecraft server, AI APIs, bot quantities, usernames, roles, chat perception, and web studio settings in <strong>1 simple .env file</strong> or using the interactive dashboard panel below.
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isApplying}
            onClick={handleSaveAndApply}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
              savedSuccess
                ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20"
                : isApplying
                ? "bg-indigo-600 text-white animate-pulse"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
            }`}
          >
            {savedSuccess ? (
              <Check className="h-4 w-4" />
            ) : isApplying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>
              {savedSuccess
                ? "Live Config Applied!"
                : isApplying
                ? "Pushing Live..."
                : "Save & Apply Live Config"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyEnv}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied .env" : "Copy .env"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadEnv}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
            title="Download .env file to disk"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            <span>Export .env</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("visual")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
              activeSubTab === "visual"
                ? "bg-indigo-950 text-indigo-200 border border-indigo-700 font-bold"
                : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Interactive Visual Form</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("raw_env")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all ${
              activeSubTab === "raw_env"
                ? "bg-indigo-950 text-indigo-200 border border-indigo-700 font-bold"
                : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Direct .env Raw Editor</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-mono flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5 text-indigo-400" />
            <span>Import .env</span>
            <input type="file" accept=".env,text/plain" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-mono flex items-center gap-1.5"
            title="Reset all settings to default values"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Defaults</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: VISUAL CONFIGURATION FORM */}
      {activeSubTab === "visual" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION 1: MINECRAFT SERVER CONNECTION */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold text-slate-100 border-b border-slate-800 pb-2.5">
              <Server className="h-4 w-4 text-emerald-400" />
              <span>1. Minecraft Server Connection</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Server Host / IP</label>
                  <input
                    type="text"
                    value={config.minecraftServerHost}
                    onChange={(e) => handleChange("minecraftServerHost", e.target.value)}
                    placeholder="localhost or 192.168.1.50"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Port</label>
                  <input
                    type="number"
                    value={config.minecraftServerPort}
                    onChange={(e) => handleChange("minecraftServerPort", parseInt(e.target.value, 10) || 25565)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Minecraft Version</label>
                  <input
                    type="text"
                    value={config.minecraftVersion}
                    onChange={(e) => handleChange("minecraftVersion", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Reconnect Delay (ms)</label>
                  <input
                    type="number"
                    value={config.minecraftReconnectDelayMs}
                    onChange={(e) => handleChange("minecraftReconnectDelayMs", parseInt(e.target.value, 10) || 3000)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-medium text-slate-200">Auto-Reconnect on Kick / Restart</span>
                  <p className="text-[10px] text-slate-400">Automatically re-establishes bot socket connection</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.minecraftAutoReconnect}
                  onChange={(e) => handleChange("minecraftAutoReconnect", e.target.checked)}
                  className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: BOT USERNAMES & SWARM QUANTITY */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-100 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-cyan-400" />
                <span>2. Bot Amount & Usernames Swarm</span>
              </div>
              <span className="text-cyan-400 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                {config.botCount} Active Bot{config.botCount > 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-4">
              {/* Bot Quantity Slider & Quick Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Total Bots to Spawn:</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 5, 8].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleBotCountChange(n)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                          config.botCount === n 
                            ? "bg-cyan-950 text-cyan-300 border border-cyan-600 font-bold"
                            : "bg-slate-950 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={config.botCount}
                  onChange={(e) => handleBotCountChange(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Primary Leader Bot Username */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400">Primary Leader Bot Username</label>
                <input
                  type="text"
                  value={config.botPrimaryUsername}
                  onChange={(e) => {
                    const newPrimary = e.target.value;
                    handleChange("botPrimaryUsername", newPrimary);
                    const updatedUsernames = [...config.botUsernames];
                    if (updatedUsernames.length > 0) updatedUsernames[0] = newPrimary;
                    handleChange("botUsernames", updatedUsernames);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Individual Bot Roster */}
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-mono text-slate-400">Swarm Member Usernames & Roles</label>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {Array.from({ length: config.botCount }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                      <span className="text-[10px] text-slate-500 font-mono w-5 shrink-0">#{idx + 1}</span>
                      <input
                        type="text"
                        value={config.botUsernames[idx] || `Bot-${idx + 1}`}
                        onChange={(e) => {
                          const updated = [...config.botUsernames];
                          updated[idx] = e.target.value;
                          handleChange("botUsernames", updated);
                          if (idx === 0) handleChange("botPrimaryUsername", e.target.value);
                        }}
                        placeholder="Bot username"
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs flex-1 focus:outline-none focus:border-cyan-500"
                      />
                      <select
                        value={config.botRoles[idx] || "Assistant"}
                        onChange={(e) => {
                          const updatedRoles = [...config.botRoles];
                          updatedRoles[idx] = e.target.value as AgentRole;
                          handleChange("botRoles", updatedRoles);
                        }}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Assistant">Assistant (Omni)</option>
                        <option value="Builder">Builder</option>
                        <option value="Miner">Miner</option>
                        <option value="Scout">Scout</option>
                        <option value="Guard">Guard</option>
                      </select>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        :{config.botIpcPorts[idx] || 8080 + idx}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-mono text-slate-400">In-Game Team Tag / Prefix</label>
                <input
                  type="text"
                  value={config.botTeamName}
                  onChange={(e) => handleChange("botTeamName", e.target.value)}
                  placeholder="e.g. AI-Swarm"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                  <input
                    type="checkbox"
                    checked={!config.aiAutonomyEnabled}
                    onChange={(e) => handleChange("aiAutonomyEnabled", !e.target.checked)}
                    className="accent-cyan-500 h-3.5 w-3.5"
                  />
                  <span>Disable Autonomy</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 3: AI PROVIDERS, API KEYS & INFERENCE */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-100 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>3. AI Providers, API Keys & Multi-Tier Routing</span>
              </div>
              <span className="text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800 text-[10px] uppercase">
                Active: {config.aiProvider}
              </span>
            </div>

            <div className="space-y-4">
              {/* Active AI Provider Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Primary AI Routing Engine</span>
                  <span className="text-amber-400/80 text-[10px] font-mono">Select specific provider or Auto Multi-Tier</span>
                </label>
                <select
                  value={config.aiProvider}
                  onChange={(e) => handleChange("aiProvider", e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="auto">Auto Multi-Tier Router (Dynamic Priority Cascade)</option>
                  <option value="gemini">Google Gemini (DeepMind API)</option>
                  <option value="nvidia">NVIDIA NIM (TensorRT Cloud / NVAPI)</option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  <option value="anthropic">Anthropic Claude (Claude 3.5 Sonnet)</option>
                  <option value="openrouter">OpenRouter (Multi-Model Hub / Nemotron)</option>
                  <option value="groq">Groq (Ultra-Fast LPU Inference / GPT-OSS 120b)</option>
                  <option value="deepseek">DeepSeek (V3 / R1 reasoning)</option>
                  <option value="mistral">Mistral AI (Small / Codestral)</option>
                  <option value="together">Together AI (Fast Open-Source Hub)</option>
                  <option value="xai">xAI Grok (Grok-2)</option>
                  <option value="cerebras">Cerebras (Wafer-Scale Fast Inference)</option>
                  <option value="fireworks">Fireworks AI (High Throughput)</option>
                  <option value="perplexity">Perplexity AI (Sonar Online Search)</option>
                  <option value="sambanova">SambaNova (SN40L RDU Speed)</option>
                  <option value="deepinfra">DeepInfra (Serverless Inference)</option>
                  <option value="ovhcloud">OVHcloud AI Endpoints</option>
                  <option value="custom_openai">Custom OpenAI-Compatible Endpoint</option>
                  <option value="ollama">Local Ollama (Self-Hosted / Web-Exposed)</option>
                  <option value="builtin">Built-in Neuro-Symbolic Tactical AI (0ms Offline)</option>
                </select>
              </div>

              {/* Dynamic Priority Order (AI_PROVIDER_PRIORITY) */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-slate-300 font-medium">
                    Auto-Cascade Fallback Priority (AI_PROVIDER_PRIORITY)
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">Left-to-right priority cascade</span>
                </div>
                <input
                  type="text"
                  value={config.aiProviderPriority || "nvidia,gemini,groq,openrouter,ollama"}
                  onChange={(e) => handleChange("aiProviderPriority", e.target.value)}
                  placeholder="e.g. nvidia,gemini,groq,openrouter,ollama"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-mono text-slate-500">Order:</span>
                  {(config.aiProviderPriority || "nvidia,gemini,groq,openrouter,ollama")
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .map((p, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[10px] font-mono font-medium flex items-center gap-1"
                      >
                        <span className="text-[9px] text-emerald-500">#{idx + 1}</span>
                        {p}
                      </span>
                    ))}
                </div>
              </div>

              {/* Provider Category Switcher Tabs */}
              <div className="flex flex-wrap gap-1 border-b border-slate-800 pb-2">
                {[
                  { id: "featured", label: "Featured Tiers", icon: <Sparkles className="h-3 w-3 text-amber-400" /> },
                  { id: "cloud", label: "OpenAI & Anthropic & xAI", icon: <Globe className="h-3 w-3 text-cyan-400" /> },
                  { id: "speed", label: "Groq & Cerebras & Samba", icon: <Zap className="h-3 w-3 text-emerald-400" /> },
                  { id: "hub", label: "OpenRouter & Together & Fireworks", icon: <Cpu className="h-3 w-3 text-purple-400" /> },
                  { id: "specialized", label: "DeepSeek & Mistral & Custom", icon: <Terminal className="h-3 w-3 text-rose-400" /> },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setProviderViewCategory(cat.id as any)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                      providerViewCategory === cat.id
                        ? "bg-slate-800 text-slate-100 font-bold border border-slate-700"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-950"
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* CATEGORY 1: FEATURED (GEMINI, NVIDIA, OLLAMA) */}
              {providerViewCategory === "featured" && (
                <div className="space-y-3.5">
                  {/* Google Gemini */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        Google Gemini (DeepMind API)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Key className="h-3 w-3 text-cyan-400" />
                          <span>Gemini API Key</span>
                        </label>
                        <input
                          type="password"
                          value={config.geminiApiKey || ""}
                          onChange={(e) => handleChange("geminiApiKey", e.target.value)}
                          placeholder="AI Studio / Cloud Key"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Gemini Model</label>
                        <input
                          type="text"
                          value={config.geminiModel || "gemini-2.5-flash"}
                          onChange={(e) => handleChange("geminiModel", e.target.value)}
                          placeholder="gemini-2.5-flash"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* NVIDIA NIM */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                        NVIDIA NIM (TensorRT Cloud)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Key className="h-3 w-3 text-emerald-400" />
                          <span>NVIDIA API Key</span>
                        </label>
                        <input
                          type="password"
                          value={config.nvidiaApiKey || ""}
                          onChange={(e) => handleChange("nvidiaApiKey", e.target.value)}
                          placeholder="nvapi-xxxxxx"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">NVIDIA Model</label>
                        <input
                          type="text"
                          value={config.nvidiaModel || "meta/llama-3.2-11b-vision-instruct"}
                          onChange={(e) => handleChange("nvidiaModel", e.target.value)}
                          placeholder="meta/llama-3.2-11b-vision-instruct"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Globe className="h-3 w-3 text-emerald-400" />
                        <span>NVIDIA Base URL (OpenAI-Compatible)</span>
                      </label>
                      <input
                        type="text"
                        value={config.nvidiaBaseUrl || "https://integrate.api.nvidia.com/v1"}
                        onChange={(e) => handleChange("nvidiaBaseUrl", e.target.value)}
                        placeholder="https://integrate.api.nvidia.com/v1"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Local Ollama */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Radio className="h-3.5 w-3.5 text-amber-400" />
                        Local Ollama (Self-Hosted / Web-Exposed)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Ollama Base URL</label>
                        <input
                          type="text"
                          value={config.ollamaBaseUrl || "http://127.0.0.1:11434"}
                          onChange={(e) => handleChange("ollamaBaseUrl", e.target.value)}
                          placeholder="http://127.0.0.1:11434"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Ollama Model</label>
                        <input
                          type="text"
                          value={config.ollamaModel || "qwen2.5vl:3b"}
                          onChange={(e) => handleChange("ollamaModel", e.target.value)}
                          placeholder="qwen2.5vl:3b"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY 2: CLOUD (OPENAI, ANTHROPIC, XAI) */}
              {providerViewCategory === "cloud" && (
                <div className="space-y-3.5">
                  {/* OpenAI */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-teal-300">
                      <span className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-teal-400" />
                        OpenAI (Official Endpoint)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">OpenAI API Key</label>
                        <input
                          type="password"
                          value={config.openaiApiKey || ""}
                          onChange={(e) => handleChange("openaiApiKey", e.target.value)}
                          placeholder="sk-proj-xxxxxx"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">OpenAI Model</label>
                        <input
                          type="text"
                          value={config.openaiModel || "gpt-4o-mini"}
                          onChange={(e) => handleChange("openaiModel", e.target.value)}
                          placeholder="gpt-4o-mini"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Anthropic Claude */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-amber-400" />
                        Anthropic Claude
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Anthropic API Key</label>
                        <input
                          type="password"
                          value={config.anthropicApiKey || ""}
                          onChange={(e) => handleChange("anthropicApiKey", e.target.value)}
                          placeholder="sk-ant-xxxxxx"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Claude Model</label>
                        <input
                          type="text"
                          value={config.anthropicModel || "claude-3-5-sonnet-20241022"}
                          onChange={(e) => handleChange("anthropicModel", e.target.value)}
                          placeholder="claude-3-5-sonnet-20241022"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* xAI Grok */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-slate-400" />
                        xAI (Grok)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">xAI API Key</label>
                        <input
                          type="password"
                          value={config.xaiApiKey || ""}
                          onChange={(e) => handleChange("xaiApiKey", e.target.value)}
                          placeholder="xai-xxxxxx"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">xAI Model</label>
                        <input
                          type="text"
                          value={config.xaiModel || "grok-2-latest"}
                          onChange={(e) => handleChange("xaiModel", e.target.value)}
                          placeholder="grok-2-latest"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY 3: ULTRA-FAST INFERENCE (GROQ, CEREBRAS, SAMBANOVA) */}
              {providerViewCategory === "speed" && (
                <div className="space-y-3.5">
                  {/* Groq */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-orange-400">
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-orange-400" />
                        Groq (Ultra-Fast LPU Engine)
                      </span>
                      <span className="text-[10px] font-mono text-orange-400/80">~500 tokens/sec</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Groq API Key</label>
                        <input
                          type="password"
                          value={config.groqApiKey || ""}
                          onChange={(e) => handleChange("groqApiKey", e.target.value)}
                          placeholder="gsk_xxxxxx"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Groq Model</label>
                        <input
                          type="text"
                          value={config.groqModel || "openai/gpt-oss-120b"}
                          onChange={(e) => handleChange("groqModel", e.target.value)}
                          placeholder="openai/gpt-oss-120b or llama-3.3-70b-versatile"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cerebras */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                        Cerebras (Wafer-Scale Inference)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Cerebras API Key</label>
                        <input
                          type="password"
                          value={config.cerebrasApiKey || ""}
                          onChange={(e) => handleChange("cerebrasApiKey", e.target.value)}
                          placeholder="csk-xxxxxx"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Cerebras Model</label>
                        <input
                          type="text"
                          value={config.cerebrasModel || "llama3.1-8b"}
                          onChange={(e) => handleChange("cerebrasModel", e.target.value)}
                          placeholder="llama3.1-8b"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SambaNova */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-400">
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-cyan-400" />
                        SambaNova (SN40L RDU Speed)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">SambaNova API Key</label>
                        <input
                          type="password"
                          value={config.sambanovaApiKey || ""}
                          onChange={(e) => handleChange("sambanovaApiKey", e.target.value)}
                          placeholder="API key"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">SambaNova Model</label>
                        <input
                          type="text"
                          value={config.sambanovaModel || "Meta-Llama-3.1-70B-Instruct"}
                          onChange={(e) => handleChange("sambanovaModel", e.target.value)}
                          placeholder="Meta-Llama-3.1-70B-Instruct"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY 4: AGGREGATORS & HUBS (OPENROUTER, TOGETHER, FIREWORKS) */}
              {providerViewCategory === "hub" && (
                <div className="space-y-3.5">
                  {/* OpenRouter */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-violet-300">
                      <span className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-violet-400" />
                        OpenRouter (Multi-Provider Aggregator)
                      </span>
                      <span className="text-[10px] font-mono text-violet-400/80">Free & Paid Models</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">OpenRouter API Key</label>
                        <input
                          type="password"
                          value={config.openrouterApiKey || ""}
                          onChange={(e) => handleChange("openrouterApiKey", e.target.value)}
                          placeholder="sk-or-v1-xxxxxx"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">OpenRouter Model</label>
                        <input
                          type="text"
                          value={config.openrouterModel || "nvidia/nemotron-3.5-lightning"}
                          onChange={(e) => handleChange("openrouterModel", e.target.value)}
                          placeholder="nvidia/nemotron-3.5-lightning"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Together AI */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-blue-300">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-blue-400" />
                        Together AI
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Together API Key</label>
                        <input
                          type="password"
                          value={config.togetherApiKey || ""}
                          onChange={(e) => handleChange("togetherApiKey", e.target.value)}
                          placeholder="API Key"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Together Model</label>
                        <input
                          type="text"
                          value={config.togetherModel || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"}
                          onChange={(e) => handleChange("togetherModel", e.target.value)}
                          placeholder="meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fireworks AI */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-300">
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-rose-400" />
                        Fireworks AI
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Fireworks API Key</label>
                        <input
                          type="password"
                          value={config.fireworksApiKey || ""}
                          onChange={(e) => handleChange("fireworksApiKey", e.target.value)}
                          placeholder="fw_xxxxxx"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Fireworks Model</label>
                        <input
                          type="text"
                          value={config.fireworksModel || "accounts/fireworks/models/llama-v3p1-70b-instruct"}
                          onChange={(e) => handleChange("fireworksModel", e.target.value)}
                          placeholder="accounts/fireworks/models/llama-v3p1-70b-instruct"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY 5: SPECIALIZED & SELF-HOSTED (DEEPSEEK, MISTRAL, PERPLEXITY, OVH, CUSTOM) */}
              {providerViewCategory === "specialized" && (
                <div className="space-y-3.5">
                  {/* DeepSeek */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-indigo-300">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                        DeepSeek (V3 / R1 Reasoning)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">DeepSeek API Key</label>
                        <input
                          type="password"
                          value={config.deepseekApiKey || ""}
                          onChange={(e) => handleChange("deepseekApiKey", e.target.value)}
                          placeholder="sk-xxxxxx"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">DeepSeek Model</label>
                        <input
                          type="text"
                          value={config.deepseekModel || "deepseek-chat"}
                          onChange={(e) => handleChange("deepseekModel", e.target.value)}
                          placeholder="deepseek-chat"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mistral AI */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-400">
                      <span className="flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5 text-amber-400" />
                        Mistral AI
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Mistral API Key</label>
                        <input
                          type="password"
                          value={config.mistralApiKey || ""}
                          onChange={(e) => handleChange("mistralApiKey", e.target.value)}
                          placeholder="API Key"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Mistral Model</label>
                        <input
                          type="text"
                          value={config.mistralModel || "mistral-small-latest"}
                          onChange={(e) => handleChange("mistralModel", e.target.value)}
                          placeholder="mistral-small-latest"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Perplexity AI */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
                      <span className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-cyan-400" />
                        Perplexity AI
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Perplexity API Key</label>
                        <input
                          type="password"
                          value={config.perplexityApiKey || ""}
                          onChange={(e) => handleChange("perplexityApiKey", e.target.value)}
                          placeholder="pplx-xxxxxx"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Perplexity Model</label>
                        <input
                          type="text"
                          value={config.perplexityModel || "sonar"}
                          onChange={(e) => handleChange("perplexityModel", e.target.value)}
                          placeholder="sonar"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom OpenAI Compatible */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5 text-slate-400" />
                        Custom / Self-Hosted OpenAI-Compatible Endpoint
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-mono text-slate-400">Base URL</label>
                        <input
                          type="text"
                          value={config.customOpenaiBaseUrl || "http://localhost:8000/v1"}
                          onChange={(e) => handleChange("customOpenaiBaseUrl", e.target.value)}
                          placeholder="http://localhost:8000/v1"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400">Model Name</label>
                        <input
                          type="text"
                          value={config.customOpenaiModel || ""}
                          onChange={(e) => handleChange("customOpenaiModel", e.target.value)}
                          placeholder="local-model"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400">API Key (Optional)</label>
                      <input
                        type="password"
                        value={config.customOpenaiApiKey || ""}
                        onChange={(e) => handleChange("customOpenaiApiKey", e.target.value)}
                        placeholder="sk-optional"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Heuristic Offline Fallback Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-medium text-slate-200">Zero-Latency Heuristic Reserve</span>
                  <p className="text-[10px] text-slate-400">Falls back to deterministic offline tactical solver if remote AI providers fail</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableBuiltinOfflineFallback}
                  onChange={(e) => handleChange("enableBuiltinOfflineFallback", e.target.checked)}
                  className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: IN-GAME CHAT & DASHBOARD PREFERENCES */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold text-slate-100 border-b border-slate-800 pb-2.5">
              <LayoutDashboard className="h-4 w-4 text-purple-400" />
              <span>4. In-Game Chat & Dashboard Preferences</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Chat Persona Tone</label>
                  <select
                    value={config.chatPersonaTone}
                    onChange={(e) => handleChange("chatPersonaTone", e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="assistant">Assistant (Friendly & Helpful)</option>
                    <option value="tactical">Tactical (Military & Direct)</option>
                    <option value="casual">Casual (Gamer / Discord style)</option>
                    <option value="roleplay">Roleplay (Medieval / Fantasy)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Typing Latency Humanizer</label>
                  <select
                    value={config.chatHumanizeDelay}
                    onChange={(e) => handleChange("chatHumanizeDelay", e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="instant">Instant (0ms)</option>
                    <option value="natural">Natural (~800ms human delay)</option>
                    <option value="deliberate">Deliberate (~1500ms)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Litematica Build Delay (ms)</label>
                  <input
                    type="number"
                    value={config.litematicaBuildSpeedMs}
                    onChange={(e) => handleChange("litematicaBuildSpeedMs", parseInt(e.target.value, 10) || 150)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Radar Scan Radius (blocks)</label>
                  <input
                    type="number"
                    value={config.radarScanRadiusBlocks}
                    onChange={(e) => handleChange("radarScanRadiusBlocks", parseInt(e.target.value, 10) || 64)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-xs font-mono text-slate-200">Listen & Reply to In-Game Chat</span>
                  <input
                    type="checkbox"
                    checked={config.chatListenEnabled && config.chatAutoReply}
                    onChange={(e) => {
                      handleChange("chatListenEnabled", e.target.checked);
                      handleChange("chatAutoReply", e.target.checked);
                    }}
                    className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-xs font-mono text-slate-200">Real-Time 8-Bit Sound Pings on Alerts</span>
                  <input
                    type="checkbox"
                    checked={config.dashboardSoundAlerts}
                    onChange={(e) => handleChange("dashboardSoundAlerts", e.target.checked)}
                    className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: RAW .ENV FILE EDITOR */}
      {activeSubTab === "raw_env" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-mono text-slate-200 font-bold">
                Direct .env File Content (Changes sync bidirectionally in real-time)
              </span>
            </div>
            {parseError && (
              <span className="text-xs font-mono text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                {parseError}
              </span>
            )}
          </div>

          <textarea
            value={rawEnvText}
            onChange={(e) => handleRawTextChange(e.target.value)}
            rows={22}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y shadow-inner font-mono"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
};
