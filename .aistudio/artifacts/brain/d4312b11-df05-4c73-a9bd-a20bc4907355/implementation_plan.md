# Migration & Dashboard Restoration: Minecraft AI Swarm Studio

Unifies the updated GitHub repository branch (`minecraft-fabric-voice-chat-fix-b526a`) with the AI Studio environment, repairing the broken dashboard serving architecture, aligning AI provider models with real endpoints, and surfacing new Voice Chat & system optimization features.

## User Review & Critical Decisions

> [!IMPORTANT]
> The primary reason the dashboard broke after the other AI's optimization was the complete removal of the Vite development middleware from `server.ts` in favor of an exclusive static `dist/` fallback. In AI Studio's dev server environment, Vite client assets (`/@vite/client`, `/src/main.tsx`) were no longer served dynamically.
> 
> We are implementing a **resilient dual-mode server**: mounting Vite development middlewares in dev mode while retaining the robust static file serving, aggressive cache-busting, and raw-socket WebSocket upgrade tunneling for Docker and production builds.

- **Confirmed Decision**: Replace workspace codebase with the updated GitHub branch (`hidde10190-hub/Minecraft-ai` on `minecraft-fabric-voice-chat-fix-b526a`).
- **Core Fix**: Restore Vite development middleware in `server.ts` while keeping the HTTP server WebSocket `upgrade` tunnel for live bridge communication.
- **AI Models Alignment**: Modernize the AI provider options across NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct`, `meta/llama-3.3-70b-instruct`), Google Gemini (`gemini-2.5-flash`, `gemini-3.8-flash`), and local Ollama (`qwen2.5vl:3b`, `llama3.2:3b`) matching actual deployed model endpoints.

---

## 1. Overview & Core Concept

- **What It Does**: Complete full-stack autonomous Minecraft robotics cockpit and swarming studio. Connects to Fabric Minecraft clients via IPC/WebSockets, provides real-time 3D voxel terrain perception, multi-agent coordination, and automated reasoning across 4 tiers of AI models.
- **Target Audience**: Minecraft automation engineers, bot operators, and modders running headless or graphical clients locally or inside Docker.
- **Key Value**: Rock-solid stability, fast Docker boot times, zero-latency local solver fallback, and full support for both browser-based development and containerized production deployment.

---

## 2. User Experience & Visual Design

- **Layout Structure**: 
  - Glassmorphic top navigation bar with clean single-line action buttons (`Top Bar Contract`).
  - Swarm Fleet & Quick-Command toolbar at the top for instant bot switching and autonomy toggling.
  - Multi-tab command center: 3D Visualizer & Workbench, In-Game Chat Perception, Litematica Studio, AI Brain & Router Telemetry, PvP Combat & Revanche, Sign Perception, and Environment Configuration.
- **Visual Identity & Theme**:
  - Dominant Neutral: Deep obsidian slate (`#020617` / `#0F172A`) with hairline borders (`#1E293B`).
  - Accent Color: Emerald / Cyan for active telemetry and nominal connections; Amber for warnings/rate-limits; Rose for hostile combat threats.
  - Typography: Plus Jakarta Sans for UI headers and body prose; JetBrains Mono / tabular numerals (`tabular-nums`) for coordinates, tick rates, and latency counters.
- **Dashboard Telemetry Cleanup**:
  - Replaces simulated or fake GPU cards with real router status: active API keys, endpoint ping latency, model name, and bridge connectivity.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Mode Dev/Production Server**
  - *Chosen Approach*: `server.ts` checks if `process.env.NODE_ENV !== "production"` and mounts `vite.middlewares` for instant HMR in AI Studio. When running in production (or inside standalone Docker), it serves pre-compiled `dist/` with explicit no-cache headers.
  - *Why*: Solves the blank/stuck dashboard in AI Studio while preserving the standalone Docker container's optimized boot performance.
- **Decision 2: WebSocket Tunneling & In-Game Telemetry**
  - *Chosen Approach*: Keep the raw-socket WebSocket `upgrade` event handler added in the updated branch to tunnel traffic directly between the browser and Fabric mod ports (`8080`, `8081`, etc.).
  - *Why*: Eliminates browser WebSocket handshake hangs that previously stalled client-side bridge synchronization.
- **Decision 3: Real Model Alignment**
  - *Chosen Approach*: Align default models with current generation: Gemini `gemini-2.5-flash` / `gemini-3.8-flash`, NVIDIA `meta/llama-3.2-11b-vision-instruct` / `meta/llama-3.3-70b-instruct`, Ollama `qwen2.5vl:3b` / `llama3.2:3b`.
  - *Why*: Prevents 404 errors or rate-limit rejections from deprecated or non-existent model tags.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│               Browser Dashboard (React SPA)            │
│  - Swarm QuickBar        - 3D Voxel Canvas             │
│  - AI Brain Console      - Live Chat & Telemetry       │
└──────────────┬────────────────────────▲────────────────┘
               │ HTTP API / REST        │ WebSockets (/ws)
               ▼                        │
┌───────────────────────────────────────┴────────────────┐
│               Express Full-Stack Server                │
│  - Dual-Mode: Vite Dev Middleware / Static Dist        │
│  - Multi-Tier AI Router (NVIDIA -> Gemini -> Ollama)   │
│  - WebSocket Upgrade Tunnel & Health Probes            │
└──────────────┬─────────────────────────────────────────┘
               │ IPC / Local Sockets (8080 - 8084)
               ▼
┌────────────────────────────────────────────────────────┐
│          Minecraft Fabric Client Bridge                │
│  - AiInputController (Anti-Feet Pitch Clamping)        │
│  - GameStateExporter (3D Voxel Scan & Telemetry)       │
│  - VoiceChatBridge & Session Auto-Connect              │
└────────────────────────────────────────────────────────┘
```

### Execution Steps
1. **Sync Files**: Copy over the updated framework files, start scripts, and configurations from the cloned branch (`/tmp/repo_pull`).
2. **Patch `server.ts`**: Restore Vite dev middleware support while keeping the new WebSocket upgrade tunneling, live cube map endpoints, and cache-control headers.
3. **Harmonize `src/`**: Verify that all components, types, and model selectors reflect real, functional model identifiers.
4. **Compile & Verify**: Run `npm install`, `lint_applet`, and `compile_applet` to ensure zero compilation or runtime errors.
