import React, { useState } from "react";
import { 
  Server, 
  Terminal, 
  Copy, 
  Check, 
  Play, 
  Monitor, 
  EyeOff, 
  ShieldCheck, 
  Zap, 
  AlertCircle, 
  Globe, 
  Cpu, 
  CheckCircle2, 
  ExternalLink,
  Activity,
  Wifi,
  RefreshCw,
  Users,
  XCircle,
  Radio,
  Info
} from "lucide-react";

interface StandaloneClientLauncherProps {
  isConnected: boolean;
  onSetSession?: (username: string, isMsa: boolean) => void;
  currentUsername: string;
  onConnectServer?: (server: string, username: string) => void;
}

export const StandaloneClientLauncher: React.FC<StandaloneClientLauncherProps> = ({
  isConnected,
  onSetSession,
  currentUsername,
  onConnectServer,
}) => {
  const [serverHost, setServerHost] = useState<string>("host.docker.internal:25565");
  const [botUsername, setBotUsername] = useState<string>(currentUsername || "Gemini");
  const [displayMode, setDisplayMode] = useState<"windowed" | "headless">("windowed");
  const [platform, setPlatform] = useState<"windows-bat" | "windows-ps1" | "windows-fabric" | "docker" | "bash">("windows-bat");
  const [copied, setCopied] = useState<boolean>(false);

  // Live Minecraft Server Ping & SLP Status
  const [pingLoading, setPingLoading] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<{
    online: boolean;
    host?: string;
    port?: number;
    latencyMs?: number;
    version?: { name: string; protocol: number };
    players?: { max: number; online: number; sample?: Array<{ name: string; id: string }> };
    description?: any;
    favicon?: string;
    error?: string;
    diagnostics?: any;
  } | null>(null);

  const handlePingServer = async (targetToPing?: string) => {
    const hostStr = (targetToPing || serverHost).trim();
    if (!hostStr) return;
    setPingLoading(true);
    setPingResult(null);

    let host = hostStr;
    let port = 25565;
    if (host.includes(":")) {
      const parts = host.split(":");
      host = parts[0];
      port = parseInt(parts[1], 10) || 25565;
    }

    try {
      const res = await fetch(`/api/minecraft/ping?host=${encodeURIComponent(host)}&port=${port}`);
      const data = await res.json();
      setPingResult(data);
    } catch (err: any) {
      setPingResult({
        online: false,
        host,
        port,
        error: `Network request failed: ${err.message}`
      });
    } finally {
      setPingLoading(false);
    }
  };

  // Helper to format MOTD text (strips or cleans Minecraft color codes)
  const formatMotd = (motd: any): string => {
    if (!motd) return "A Minecraft Server";
    if (typeof motd === "string") {
      return motd.replace(/§[0-9a-fk-or]/gi, "").trim();
    }
    if (motd.text) {
      let str = motd.text;
      if (Array.isArray(motd.extra)) {
        str += motd.extra.map((e: any) => typeof e === "string" ? e : (e?.text || "")).join("");
      }
      return str.replace(/§[0-9a-fk-or]/gi, "").trim();
    }
    return JSON.stringify(motd);
  };

  // Generate dynamic command
  const getLaunchCommand = () => {
    switch (platform) {
      case "windows-bat":
        return `.\\start.bat ${serverHost} ${botUsername}`;
      case "windows-ps1":
        return `.\\start.ps1 -Server "${serverHost}" -Username "${botUsername}"`;
      case "windows-fabric":
        return `cd framework && .\\run-standalone-client.bat --server ${serverHost} --username ${botUsername}`;
      case "docker":
        return `docker compose up -d && docker compose logs -f`;
      case "bash":
        return `./start.sh ${serverHost} ${botUsername}`;
    }
  };



  const handleCopyCommand = () => {
    navigator.clipboard.writeText(getLaunchCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Standalone Minecraft 26.2 AI Client Runner
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  Independent Process
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Runs an autonomous, dedicated official Minecraft 26.2 Fabric Client instance. Does not touch or require your gaming client!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-md border ${
              isConnected 
                ? "bg-emerald-950/70 border-emerald-800/70 text-emerald-300"
                : "bg-amber-950/70 border-amber-800/70 text-amber-300"
            }`}>
              <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span>{isConnected ? "Standalone Client Connected (IPC Port 8080)" : "Standalone Client Waiting on localhost:8080"}</span>
            </div>
          </div>
        </div>

        {/* 1-File Super Simple Starter Banner */}
        <div className="mt-4 p-5 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-950 to-cyan-950/80 border-2 border-emerald-500/40 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                  <Play className="h-4 w-4 fill-slate-950" />
                </div>
                <h3 className="text-sm font-bold font-mono text-emerald-400">
                  Super Simple: Run 1 File To Start Everything
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                  Zero Config Needed
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Simply execute this single file. It boots the dedicated 26.2 client and connects straight to <strong className="text-emerald-400">localhost:25565</strong>.
              </p>
            </div>

            {/* Quick Copy Buttons for 1 File */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("start.bat");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg transition-all"
                title="Double click start.bat or run in CMD / PowerShell"
              >
                <Monitor className="h-4 w-4 fill-slate-950" />
                <span>Windows 1-Click: <strong>start.bat</strong></span>
                <Copy className="h-3.5 w-3.5 text-slate-950/70" />
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(".\\start.ps1");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-800/60 text-slate-200 transition-all hover:border-cyan-500"
                title="Run in Windows PowerShell"
              >
                <Terminal className="h-3.5 w-3.5 text-cyan-400" />
                <span>PowerShell: <strong className="text-cyan-400">.\start.ps1</strong></span>
                <Copy className="h-3 w-3 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("docker compose up -d");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-800/60 text-slate-200 transition-all hover:border-cyan-500"
                title="Run in Docker container"
              >
                <Server className="h-3.5 w-3.5 text-cyan-400" />
                <span>Docker: <strong className="text-cyan-400">docker compose up -d</strong></span>
                <Copy className="h-3 w-3 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("./start.sh");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-400 transition-all hover:border-slate-600"
                title="For Linux / Mac / WSL environments"
              >
                <span>Linux/WSL: <strong className="text-slate-300">./start.sh</strong></span>
                <Copy className="h-3 w-3 text-slate-500" />
              </button>
            </div>
          </div>
        </div>


        {/* Why Standalone 26.2 Client vs Wonky Mineflayer */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400">
              <AlertCircle className="h-4 w-4" />
              <span>Why Avoid Wonky Mineflayer:</span>
            </div>
            <ul className="text-xs text-slate-400 space-y-1 font-mono list-disc pl-4">
              <li>Lacks Minecraft 26.2 protocol & packet encryption support</li>
              <li>Cannot execute Litematica schematic block calculations</li>
              <li>Fake simulated physics trigger server anticheat kicks</li>
              <li>Fails modern block states, item tags, and custom entity models</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Our Full Standalone 26.2 Client:</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1 font-mono list-disc pl-4">
              <li>100% Genuine official client running on Fabric 0.16+ / Java 25</li>
              <li>True 26.2 tick physics, native rendering, and raycast hitboxes</li>
              <li>Native Litematica schematic placement & material verification</li>
              <li>Runs completely standalone — you can play separately on your own account!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Configuration & Launch Command Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Target Server & Bot Identity */}
        <div className="lg:col-span-6 rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-bold font-mono text-slate-200 flex items-center gap-2">
            <Globe className="h-4 w-4 text-cyan-400" />
            <span>Target Server & Bot Configuration</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">
                Target Minecraft Java Server (IP : Port)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={serverHost}
                  onChange={(e) => setServerHost(e.target.value)}
                  placeholder="host.docker.internal:25565"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => handlePingServer()}
                  disabled={pingLoading}
                  className="px-3 py-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Test real TCP connection to Minecraft server"
                >
                  <Radio className={`h-3.5 w-3.5 ${pingLoading ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
                  <span>{pingLoading ? "Pinging..." : "Test Connection"}</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setServerHost("host.docker.internal:25565");
                    handlePingServer("host.docker.internal:25565");
                  }}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                    serverHost === "host.docker.internal:25565"
                      ? "bg-emerald-950 border-emerald-600 text-emerald-300 font-bold"
                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  Docker Host (host.docker.internal:25565)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServerHost("localhost:25565");
                    handlePingServer("localhost:25565");
                  }}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                    serverHost === "localhost:25565"
                      ? "bg-emerald-950 border-emerald-600 text-emerald-300 font-bold"
                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  Localhost (25565)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServerHost("fam.com:25565");
                    handlePingServer("fam.com:25565");
                  }}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                    serverHost === "fam.com:25565"
                      ? "bg-emerald-950 border-emerald-600 text-emerald-300 font-bold"
                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  Custom Domain (fam.com:25565)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServerHost("mc.hypixel.net:25565");
                    handlePingServer("mc.hypixel.net:25565");
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border bg-purple-950/60 border-purple-800 text-purple-300 hover:border-purple-600 transition-all"
                  title="Test SLP ping against public Minecraft server"
                >
                  Public Benchmark (Hypixel)
                </button>
              </div>

              {/* Dynamic In-Game Server Switch for Live Client */}
              {isConnected && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-mono text-slate-300 min-w-0">
                    <span className="text-emerald-400 font-bold block">Standalone Bot Connected (Port 8080)</span>
                    <span className="text-slate-400 truncate block">Switch target to <strong className="text-slate-200">{serverHost}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onConnectServer?.(serverHost, botUsername)}
                    className="shrink-0 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    title="Direct the running Fabric client to join this server right now"
                  >
                    <Zap className="h-3.5 w-3.5 fill-slate-950" />
                    <span>Connect Bot Now</span>
                  </button>
                </div>
              )}

              {/* Real Live Server Ping Status Display */}
              {pingResult && (
                <div className={`mt-3 p-3 rounded-lg border text-xs font-mono transition-all ${
                  pingResult.online 
                    ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-200" 
                    : "bg-rose-950/60 border-rose-800/80 text-rose-200"
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {pingResult.online ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="text-emerald-300">Minecraft Server Online</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                          <span className="text-rose-300">Server Unreachable / Offline</span>
                        </>
                      )}
                    </div>
                    {pingResult.latencyMs !== undefined && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/80 border border-emerald-700 text-emerald-300 font-bold">
                        {pingResult.latencyMs} ms
                      </span>
                    )}
                  </div>

                  {pingResult.online ? (
                    <div className="mt-2.5 space-y-1.5 text-[11px] text-slate-300 border-t border-emerald-900/60 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Server Software / Version:</span>
                        <span className="font-bold text-slate-100">{pingResult.version?.name || "Vanilla / Fabric"} (Proto: {pingResult.version?.protocol})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Players Online:</span>
                        <span className="font-bold text-cyan-300">{pingResult.players?.online || 0} / {pingResult.players?.max || 0}</span>
                      </div>
                      {pingResult.description && (
                        <div className="mt-1 p-1.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300 text-[10px] whitespace-pre-wrap">
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">MOTD:</span>
                          {formatMotd(pingResult.description)}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] mt-2">
                        <Check className="h-3 w-3" />
                        <span>Ready! Standalone client will connect automatically.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2.5 space-y-1.5 text-[11px] text-slate-300 border-t border-rose-900/60 pt-2">
                      <p className="text-rose-300 text-[11px] font-bold">{pingResult.error || "Unable to establish TCP handshake."}</p>
                      <div className="text-[10px] text-slate-400 space-y-0.5 mt-1 bg-slate-950/80 p-2 rounded border border-slate-800">
                        <span className="text-slate-300 font-bold block mb-0.5">Quick Checklist:</span>
                        <div>1. Verify your Minecraft Java Server or "Open to LAN" world is currently running.</div>
                        <div>2. Check Windows Firewall: allow Java(TM) Platform SE Binary for Inbound TCP.</div>
                        <div>3. If running inside Docker container, use <code>host.docker.internal:25565</code>.</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                Connects to your Minecraft Java server directly inside or outside Docker.
              </span>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">
                Bot Client Username / Identity
              </label>
              <input
                type="text"
                value={botUsername}
                onChange={(e) => setBotUsername(e.target.value)}
                placeholder="Gemini"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                Injected directly into the standalone Minecraft Session instance on boot.
              </span>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">
                Display & Execution Mode
              </label>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDisplayMode("windowed");
                    if (platform === "headless") setPlatform("bash");
                  }}
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                    displayMode === "windowed"
                      ? "bg-cyan-950/70 border-cyan-700/80 text-cyan-300 shadow-sm"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Monitor className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block">Windowed Client</span>
                    <span className="text-[10px] opacity-80">Full official 26.2 window</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDisplayMode("headless");
                    setPlatform("headless");
                  }}
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                    displayMode === "headless"
                      ? "bg-cyan-950/70 border-cyan-700/80 text-cyan-300 shadow-sm"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <EyeOff className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold block">Headless Server Mode</span>
                    <span className="text-[10px] opacity-80">No display needed (Xvfb)</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form: 1-Click Launch Commands */}
        <div className="lg:col-span-6 rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-slate-200 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>1-Click Launch Command</span>
            </h3>

            {/* Platform Selector Tabs */}
            <div className="flex flex-wrap bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setPlatform("windows-bat")}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                  platform === "windows-bat"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow"
                    : "text-emerald-400 hover:text-emerald-300"
                }`}
              >
                <Monitor className="h-3 w-3" />
                <span>Windows start.bat</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform("windows-ps1")}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                  platform === "windows-ps1"
                    ? "bg-cyan-500 text-slate-950 font-bold shadow"
                    : "text-cyan-400 hover:text-cyan-300"
                }`}
              >
                <Terminal className="h-3 w-3" />
                <span>PowerShell</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform("windows-fabric")}
                className={`px-2.5 py-1 rounded transition-all ${
                  platform === "windows-fabric"
                    ? "bg-slate-700 text-slate-100 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Fabric (BAT)
              </button>
              <button
                type="button"
                onClick={() => setPlatform("docker")}
                className={`px-2.5 py-1 rounded transition-all ${
                  platform === "docker"
                    ? "bg-cyan-600 text-slate-950 font-bold"
                    : "text-cyan-400 hover:text-cyan-300"
                }`}
              >
                Docker Desktop
              </button>
              <button
                type="button"
                onClick={() => setPlatform("bash")}
                className={`px-2.5 py-1 rounded transition-all ${
                  platform === "bash"
                    ? "bg-slate-700 text-slate-100 font-bold"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Linux/WSL
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-mono">
            {platform.startsWith("windows") 
              ? "Native Windows execution (Double-click or run in Command Prompt / PowerShell):"
              : platform === "docker"
              ? "Runs containerized via Docker Desktop for Windows:"
              : "For Linux, macOS, or Windows Subsystem for Linux (WSL):"}
          </p>



          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs relative group">
            <pre className="text-emerald-400 whitespace-pre-wrap break-all pr-12">
              {getLaunchCommand()}
            </pre>
            <button
              type="button"
              onClick={handleCopyCommand}
              className="absolute top-2.5 right-2.5 p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
              title="Copy launch command to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          {copied && (
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              <span>Command copied to clipboard! Paste in your terminal to launch.</span>
            </div>
          )}

          {/* Quick Steps */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2 text-xs font-mono">
            <span className="text-[11px] font-bold text-slate-300 block">How It Works:</span>
            <ol className="list-decimal pl-4 space-y-1 text-slate-400 text-[11px]">
              <li>The launcher boots a clean, standalone instance of Minecraft 26.2 with Fabric Loom.</li>
              <li>The <code className="text-cyan-400">AutoConnectHandler</code> bypasses the main menu and directly connects to <strong className="text-slate-200">{serverHost}</strong>.</li>
              <li>The client starts its IPC server on <strong className="text-emerald-400">localhost:8080</strong>, immediately connecting to this web dashboard and the NVIDIA Llama-3.3-70B AI brain!</li>
            </ol>
          </div>

          {/* Docker 1-Click Action Toolbox */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                <span>Docker 1-Click Toolbox:</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">Click to copy command</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("docker compose up -d && docker compose logs -f");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 text-left text-slate-300 transition-all flex items-center justify-between"
              >
                <span>▶ Start & Logs</span>
                <Copy className="h-3 w-3 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("docker compose logs -f");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 text-left text-slate-300 transition-all flex items-center justify-between"
              >
                <span>📜 View Live Logs</span>
                <Copy className="h-3 w-3 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("docker rm -f minecraft-fabric-standalone minecraft-ai-dashboard && docker compose up -d");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 text-left text-slate-300 transition-all flex items-center justify-between"
              >
                <span>🔄 Clean Rebuild</span>
                <Copy className="h-3 w-3 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("docker compose down");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500 text-left text-slate-300 transition-all flex items-center justify-between"
              >
                <span>⏹ Stop Container</span>
                <Copy className="h-3 w-3 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
