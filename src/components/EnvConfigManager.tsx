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
  Radio
} from "lucide-react";
import { UnifiedEnvConfig, AgentRole } from "../types";
import { 
  DEFAULT_ENV_CONFIG, 
  generateDotEnvString, 
  parseDotEnvString, 
  persistEnvConfig 
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
  const [rawEnvText, setRawEnvText] = useState<string>(() => generateDotEnvString(currentConfig));
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

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

  const handleSaveAndApply = () => {
    onSaveConfig(config);
    onApplySwarmToLive(config);
    persistEnvConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
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
            onClick={handleSaveAndApply}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {savedSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            <span>{savedSuccess ? "Saved & Applied to Swarm!" : "Save & Apply to Swarm"}</span>
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
            </div>
          </div>

          {/* SECTION 3: AI PROVIDERS & API KEYS */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold text-slate-100 border-b border-slate-800 pb-2.5">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>3. AI Providers, API Keys & Inference</span>
            </div>

            <div className="space-y-3">
              {/* Active AI Provider Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400">Active AI Routing Provider</label>
                <select
                  value={config.aiProvider}
                  onChange={(e) => handleChange("aiProvider", e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                >
                  <option value="auto">Auto Multi-Tier Router (NVIDIA → Gemini → Built-in)</option>
                  <option value="gemini">Google Gemini (DeepMind API)</option>
                  <option value="nvidia">NVIDIA NIM (TensorRT Cloud / NVAPI)</option>
                  <option value="builtin">Built-in Neuro-Symbolic Engine (0ms Offline)</option>
                  <option value="ollama">Local Ollama (Self-Hosted)</option>
                </select>
              </div>

              {/* Gemini API Key & Model */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Key className="h-3 w-3 text-cyan-400" />
                    <span>Gemini API Key</span>
                  </label>
                  <input
                    type="password"
                    value={config.geminiApiKey}
                    onChange={(e) => handleChange("geminiApiKey", e.target.value)}
                    placeholder="AI Studio / Cloud Key"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Gemini Model</label>
                  <input
                    type="text"
                    value={config.geminiModel}
                    onChange={(e) => handleChange("geminiModel", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* NVIDIA API Key & Model */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Key className="h-3 w-3 text-emerald-400" />
                    <span>NVIDIA API Key</span>
                  </label>
                  <input
                    type="password"
                    value={config.nvidiaApiKey}
                    onChange={(e) => handleChange("nvidiaApiKey", e.target.value)}
                    placeholder="nvapi-xxxxxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">NVIDIA Model</label>
                  <input
                    type="text"
                    value={config.nvidiaModel}
                    onChange={(e) => handleChange("nvidiaModel", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* NVIDIA Base URL */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Globe className="h-3 w-3 text-emerald-400" />
                  <span>NVIDIA Base URL (OpenAI Compatible)</span>
                </label>
                <input
                  type="text"
                  value={config.nvidiaBaseUrl}
                  onChange={(e) => handleChange("nvidiaBaseUrl", e.target.value)}
                  placeholder="https://integrate.api.nvidia.com/v1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-medium text-slate-200">Zero-Latency Heuristic Fallback</span>
                  <p className="text-[10px] text-slate-400">Falls back to deterministic offline tactical solver if APIs fail</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableBuiltinOfflineFallback}
                  onChange={(e) => handleChange("enableBuiltinOfflineFallback", e.target.checked)}
                  className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Ollama (Local/Web) Configuration */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/50 space-y-3 pt-3">
                <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-amber-200/80 uppercase tracking-wider">
                  <Radio className="h-3 w-3" />
                  <span>Ollama (Local or Web-Exposed)</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500">Ollama Model</label>
                    <input
                      type="text"
                      value={config.ollamaModel}
                      onChange={(e) => handleChange("ollamaModel", e.target.value)}
                      placeholder="qwen2.5:3b"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500">Ollama Base URL</label>
                    <input
                      type="text"
                      value={config.ollamaBaseUrl}
                      onChange={(e) => handleChange("ollamaBaseUrl", e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 leading-tight italic">
                  Tip: Ollama supports exposing models to the web. Enter a public URL or tunnel address here.
                </p>
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
