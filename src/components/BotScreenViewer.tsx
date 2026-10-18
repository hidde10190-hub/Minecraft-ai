import React, { useState, useEffect, useCallback } from "react";
import { Monitor, RotateCw, ExternalLink, ShieldAlert, Maximize2 } from "lucide-react";

/**
 * BotScreenViewer
 * ----------------
 * Embeds a live noVNC stream of the bot's virtual display (Xvfb :99 inside the
 * standalone container, exported via x11vnc :5900 -> websockify/noVNC on :6080).
 *
 * This gives operators two things:
 *  1. SEE everything the bot sees on its screen in real time (full Minecraft
 *     rendering, GUIs, chat popups, inventory screens, etc.).
 *  2. DIRECTLY CONTROL the bot: the noVNC canvas forwards real mouse clicks and
 *     keyboard events into the X display, so you can click, type, open menus,
 *     or help the bot out of stuck situations — exactly like sitting at the PC.
 *
 * The stream URL is configurable because deployments vary:
 *  - docker-compose: http://localhost:6080/vnc.html (port 6080 published)
 *  - same-host Docker: http://<container-ip>:6080/vnc.html
 */

const DEFAULT_VNC_URL =
  (typeof window !== "undefined" && (window as any).__BOT_VNC_URL__) ||
  localStorage.getItem("botVncUrl") ||
  "http://localhost:6080/vnc.html";

export default function BotScreenViewer() {
  const [vncUrl, setVncUrl] = useState<string>(DEFAULT_VNC_URL);
  const [frameKey, setFrameKey] = useState<number>(0);
  const [probe, setProbe] = useState<"unknown" | "online" | "offline">("unknown");

  // Auto-connect + resize-normal + clipboard forwarding params for the stock noVNC client
  const framedUrl = (() => {
    try {
      const u = new URL(vncUrl);
      u.searchParams.set("autoconnect", "true");
      u.searchParams.set("resize", "scale");
      u.searchParams.set("reconnect", "true");
      u.searchParams.set("clip", "on");
      return u.toString();
    } catch {
      return vncUrl;
    }
  })();

  const checkReachability = useCallback(async () => {
    try {
      const base = new URL(vncUrl);
      const res = await fetch(`${base.origin}/vnc.html`, { mode: "no-cors", signal: AbortSignal.timeout(3000) });
      // no-cors gives an opaque response; reaching it at all means the server answered
      setProbe(res ? "online" : "offline");
    } catch {
      setProbe("offline");
    }
  }, [vncUrl]);

  useEffect(() => {
    checkReachability();
    const t = setInterval(checkReachability, 10000);
    return () => clearInterval(t);
  }, [checkReachability]);

  const save = () => {
    localStorage.setItem("botVncUrl", vncUrl);
    setFrameKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-1">
            <Monitor className="w-4 h-4 text-emerald-400" /> noVNC Stream URL
          </label>
          <input
            type="text"
            value={vncUrl}
            onChange={(e) => setVncUrl(e.target.value)}
            placeholder="http://localhost:6080/vnc.html"
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            Standalone container exposes port <span className="text-gray-300">6080</span> (websockify → x11vnc :5900 → Xvfb :99).
            Mouse &amp; keyboard input in the frame below goes straight to the bot&apos;s display.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={save}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            Connect / Reload <RotateCw className="w-4 h-4" />
          </button>
          <a
            href={framedUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg flex items-center gap-2 border border-gray-700"
            title="Open in a new tab (fullscreen control)"
          >
            <ExternalLink className="w-4 h-4" /> New Tab
          </a>
          <span
            className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase ${
              probe === "online"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : probe === "offline"
                  ? "bg-red-500/15 text-red-400 border border-red-500/30"
                  : "bg-gray-700/40 text-gray-400 border border-gray-700"
            }`}
          >
            {probe === "online" ? "Stream reachable" : probe === "offline" ? "Unreachable" : "Probing…"}
          </span>
        </div>
      </div>

      {probe === "offline" && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3 text-amber-300 text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <b>noVNC endpoint not reachable.</b> Start the standalone container with{" "}
            <code className="bg-black/40 px-1 rounded">docker compose up -d minecraft-standalone-client</code>. Its entrypoint installs
            <code className="bg-black/40 px-1 rounded mx-1">x11vnc</code> +<code className="bg-black/40 px-1 rounded mx-1">websockify/node-novnc</code>,
            attaches them to the bot&apos;s Xvfb display <code className="bg-black/40 px-1 rounded">:99</code>, and publishes port 6080.
          </div>
        </div>
      )}

      <div className="flex-1 min-h-[560px] bg-gray-950 border border-gray-800 rounded-xl overflow-hidden relative shadow-inner">
        <iframe
          key={frameKey}
          src={framedUrl}
          title="Bot Screen noVNC Stream"
          className="w-full h-full absolute inset-0"
          style={{ minHeight: 560 }}
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>

      <div className="text-[11px] text-gray-500 flex items-center gap-2">
        <Maximize2 className="w-3 h-3" />
        Tip: click inside the stream first — noVNC captures your keyboard there, letting you type in chat (/), open the
        inventory (E), or rescue the bot manually while the AI keeps sending IPC actions.
      </div>
    </div>
  );
}
