// =============================================================================
// PERSISTENT WORLD MEMORY ENGINE (client side)
// Gives the bot long-term awareness that survives page reloads and restarts:
//  - landmarks (base, bed, village, diamond vein ... discovered or declared)
//  - known resource locations (last seen coords per block type)
//  - completed build projects (so it never rebuilds the same house twice)
//  - standing lessons distilled from failures
//  - a rolling session journal of what actually happened
// The server keeps an authoritative copy (data/world_memory.json); this module
// mirrors it into localStorage so the dashboard/offline built-in AI can use it
// too, and syncs via /api/ai/memory endpoints.
// =============================================================================

export interface WorldLandmark {
  x: number;
  y: number;
  z: number;
  dimension?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnownResource {
  count: number;
  lastX: number;
  lastY: number;
  lastZ: number;
  lastSeen: string;
  dimension?: string;
}

export interface CompletedProject {
  name: string;
  schematic?: string;
  center: [number, number, number];
  blocksPlaced: number;
  finishedAt: string;
}

export interface MemoryLesson {
  lesson: string;
  context: string;
  recordedAt: string;
}

export interface JournalEntry {
  ts: string;
  event: string;
  detail: string;
  pos?: [number, number, number];
}

/** A remembered danger zone (deep water / lava / drowning spot) the bot should avoid. */
export interface KnownHazard {
  kind: "water" | "lava" | "drowning" | "fall" | "other";
  x: number;
  y: number;
  z: number;
  radius: number;
  description?: string;
  lastSeen: string;
}

export interface WorldMemoryData {
  landmarks: Record<string, WorldLandmark>;
  knownResources: Record<string, KnownResource>;
  completedProjects: CompletedProject[];
  failureLessons: MemoryLesson[];
  journal: JournalEntry[];
  hazards: KnownHazard[];
}

const STORAGE_KEY = "mc_world_memory_v1";
const JOURNAL_CAP = 300;

const EMPTY_MEMORY: WorldMemoryData = {
  landmarks: {},
  knownResources: {},
  completedProjects: [],
  failureLessons: [],
  journal: [],
  hazards: []
};

const HAZARD_CAP = 40;

function sanitizeName(name: string): string {
  return (name || "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "unnamed";
}

export function loadWorldMemoryLocal(): WorldMemoryData {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return JSON.parse(JSON.stringify(EMPTY_MEMORY));
    const parsed = JSON.parse(raw);
    return {
      landmarks: parsed.landmarks || {},
      knownResources: parsed.knownResources || {},
      completedProjects: Array.isArray(parsed.completedProjects) ? parsed.completedProjects : [],
      failureLessons: Array.isArray(parsed.failureLessons) ? parsed.failureLessons : [],
      journal: Array.isArray(parsed.journal) ? parsed.journal : [],
      hazards: Array.isArray(parsed.hazards) ? parsed.hazards : []
    };
  } catch {
    return JSON.parse(JSON.stringify(EMPTY_MEMORY));
  }
}

export function saveWorldMemoryLocal(mem: WorldMemoryData): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mem));
  } catch {
    // storage full/blocked - memory degrades to in-session only, never crash the app
  }
}

export function mergeRemoteMemory(remote: Partial<WorldMemoryData> | null | undefined): WorldMemoryData {
  const local = loadWorldMemoryLocal();
  if (!remote) return local;
  const merged: WorldMemoryData = {
    landmarks: { ...(remote.landmarks || {}), ...local.landmarks },
    knownResources: { ...(remote.knownResources || {}), ...local.knownResources },
    completedProjects: dedupeById([...(remote.completedProjects || []), ...(local.completedProjects || [])], (p) => `${p.name}@${(p.center || []).join(",")}`),
    failureLessons: dedupeById([...(remote.failureLessons || []), ...(local.failureLessons || [])], (l) => l.lesson),
    journal: [...(remote.journal || []), ...(local.journal || [])].slice(-JOURNAL_CAP),
    hazards: dedupeById(
      [...(Array.isArray(remote.hazards) ? remote.hazards : []), ...(local.hazards || [])],
      (h) => `${h.kind}@${Math.round(h.x / 4)},${Math.round(h.y / 4)},${Math.round(h.z / 4)}`
    ).slice(-HAZARD_CAP)
  };
  saveWorldMemoryLocal(merged);
  return merged;
}

function dedupeById<T>(arr: T[], keyFn: (t: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, item);
  }
  return Array.from(map.values());
}

export function rememberLandmarkLocal(name: string, x: number, y: number, z: number, description = ""): void {
  const mem = loadWorldMemoryLocal();
  const key = sanitizeName(name);
  const now = new Date().toISOString();
  mem.landmarks[key] = {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    z: Math.round(z * 10) / 10,
    description,
    createdAt: mem.landmarks[key]?.createdAt || now,
    updatedAt: now
  };
  recordJournalLocal("landmark", `${key} @ [${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)}] ${description}`.trim(), [x, y, z]);
  saveWorldMemoryLocal(mem);
}

export function recordJournalLocal(event: string, detail: string, pos?: [number, number, number]): void {
  const mem = loadWorldMemoryLocal();
  mem.journal.push({ ts: new Date().toISOString(), event, detail, pos });
  if (mem.journal.length > JOURNAL_CAP) mem.journal.splice(0, mem.journal.length - JOURNAL_CAP);
  saveWorldMemoryLocal(mem);
}

export function noteResourceSightingLocal(blockName: string, x: number, y: number, z: number): void {
  const clean = String(blockName || "").replace("minecraft:", "").toLowerCase();
  if (!clean) return;
  const mem = loadWorldMemoryLocal();
  const prev = mem.knownResources[clean];
  mem.knownResources[clean] = {
    count: (prev?.count || 0) + 1,
    lastX: Math.round(x),
    lastY: Math.round(y),
    lastZ: Math.round(z),
    lastSeen: new Date().toISOString()
  };
  saveWorldMemoryLocal(mem);
}

export function noteProjectDoneLocal(name: string, center: [number, number, number], blocksPlaced: number, schematic?: string): void {
  const mem = loadWorldMemoryLocal();
  if (!mem.completedProjects.some((p) => p.name === name && p.center.join(",") === center.join(","))) {
    mem.completedProjects.push({ name, center, blocksPlaced, schematic, finishedAt: new Date().toISOString() });
    if (mem.completedProjects.length > 50) mem.completedProjects.splice(0, mem.completedProjects.length - 50);
    saveWorldMemoryLocal(mem);
  }
  recordJournalLocal("project_done", `${name}: ${blocksPlaced} blocks @ [${center.map(Math.round).join(", ")}]`, center);
}

export function noteLessonLocal(lesson: string, context: string): void {
  const mem = loadWorldMemoryLocal();
  if (!mem.failureLessons.some((l) => l.lesson === lesson)) {
    mem.failureLessons.push({ lesson, context, recordedAt: new Date().toISOString() });
    if (mem.failureLessons.length > 60) mem.failureLessons.splice(0, mem.failureLessons.length - 60);
    saveWorldMemoryLocal(mem);
  }
}

/** Record a danger zone (deep water / drowning spot / lava) so it persists across sessions. */
export function noteHazardLocal(kind: KnownHazard["kind"], x: number, y: number, z: number, radius = 8, description = ""): void {
  const mem = loadWorldMemoryLocal();
  const now = new Date().toISOString();
  // Merge into an existing hazard of the same kind within ~4 blocks; otherwise append.
  const existing = mem.hazards.find(
    (h) => h.kind === kind && Math.hypot(h.x - x, h.y - y, h.z - z) <= 4
  );
  if (existing) {
    // Grow the radius to cover both spots, keep newest timestamp.
    const far = Math.hypot(existing.x - x, existing.y - y, existing.z - z);
    existing.radius = Math.max(existing.radius, radius, Math.ceil(far + radius));
    existing.lastSeen = now;
    if (description) existing.description = description;
  } else {
    mem.hazards.push({ kind, x: Math.round(x), y: Math.round(y), z: Math.round(z), radius, description, lastSeen: now });
    if (mem.hazards.length > HAZARD_CAP) mem.hazards.splice(0, mem.hazards.length - HAZARD_CAP);
  }
  saveWorldMemoryLocal(mem);
  recordJournalLocal("hazard", `${kind} hazard @ [${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)}] r=${radius} ${description}`.trim(), [x, y, z]);
}

/** True if (x,y,z) is inside any remembered hazard zone. */
export function isInsideKnownHazard(x: number, y: number, z: number): KnownHazard | null {
  const mem = loadWorldMemoryLocal();
  for (const h of mem.hazards) {
    if (Math.hypot(h.x - x, h.y - y, h.z - z) <= h.radius) return h;
  }
  return null;
}

/** Distance-aware briefing text for injection into any prompt (LLM or built-in AI). */
export function buildMemoryBriefingLocal(pos: { x?: number; y?: number; z?: number }): string {
  const mem = loadWorldMemoryLocal();
  const px = pos?.x ?? 0, py = pos?.y ?? 0, pz = pos?.z ?? 0;
  const dist = (p: any) => Math.hypot((p.lastX ?? p.x ?? 0) - px, (p.lastY ?? p.y ?? 0) - py, (p.lastZ ?? p.z ?? 0) - pz).toFixed(0);
  const lines: string[] = [];

  const landmarkKeys = Object.keys(mem.landmarks);
  if (landmarkKeys.length > 0) {
    lines.push("KNOWN LANDMARKS (remembered across sessions):");
    landmarkKeys.slice(-10).forEach((k) => {
      const l = mem.landmarks[k];
      lines.push(`- ${k}: [${l.x}, ${l.y}, ${l.z}] (${dist(l)}m away)${l.description ? " - " + l.description : ""}`);
    });
  }
  const resourceKeys = Object.keys(mem.knownResources);
  if (resourceKeys.length > 0) {
    lines.push("KNOWN RESOURCES (last observed location, may still be there):");
    resourceKeys.slice(-12).forEach((k) => {
      const r = mem.knownResources[k];
      lines.push(`- ${k}: last seen at [${r.lastX}, ${r.lastY}, ${r.lastZ}] (${dist(r)}m away, sightings: ${r.count})`);
    });
  }
  if (mem.completedProjects.length > 0) {
    lines.push("PROJECTS YOU BUILT (do NOT rebuild these, extend or repair only if asked):");
    mem.completedProjects.slice(-5).forEach((p) => lines.push(`- ${p.name}${p.center ? ` @ [${p.center.join(", ")}]` : ""} (${p.blocksPlaced} blocks)`));
  }
  if (mem.failureLessons.length > 0) {
    lines.push("STANDING LESSONS FROM THE PAST:");
    mem.failureLessons.slice(-6).forEach((f) => lines.push(`- ${f.lesson} (${f.context})`));
  }
  if (mem.hazards.length > 0) {
    lines.push("KNOWN HAZARD ZONES (avoid these - deep water/drowning, lava, falls):");
    mem.hazards.slice(-8).forEach((h) => {
      const d = Math.hypot(h.x - px, h.y - py, h.z - pz).toFixed(0);
      lines.push(`- ${h.kind}: center [${h.x}, ${h.y}, ${h.z}] radius ~${h.radius}m (${d}m away)${h.description ? " - " + h.description : ""}`);
    });
    lines.push("RULE: never linger submerged with low air; if a build site is inside a hazard zone, build a dry platform/pillar first or route around it.");
  }
  const recent = mem.journal.slice(-5);
  if (recent.length > 0) {
    lines.push("RECENT JOURNAL:");
    recent.forEach((j) => lines.push(`- [${j.ts.slice(11, 16)}] ${j.event}: ${j.detail}`));
  }
  if (lines.length === 0) return "(No persistent memories yet. Everything learned this session is stored and recalled next time.)";
  return lines.join("\n");
}

/** Push local mirror to the authoritative server copy (best-effort). */
export async function syncMemoryToServer(endpoint = "/api/ai/memory/sync"): Promise<boolean> {
  try {
    const mem = loadWorldMemoryLocal();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mem)
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Pull authoritative server memory and merge into the local mirror. */
export async function pullMemoryFromServer(endpoint = "/api/ai/memory"): Promise<WorldMemoryData> {
  try {
    const res = await fetch(endpoint);
    if (!res.ok) return loadWorldMemoryLocal();
    const remote = await res.json();
    return mergeRemoteMemory(remote?.memory || remote);
  } catch {
    return loadWorldMemoryLocal();
  }
}
