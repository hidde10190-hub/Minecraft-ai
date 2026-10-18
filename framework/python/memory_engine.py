"""
Spatial and Task Memory Engine for Minecraft AI Controller.
Provides Short-Term Rolling Action Buffer and Long-Term Spatial Landmark / Goal Persistence.
"""

import json
import os
import tempfile
import time
from collections import deque
from typing import Dict, List, Optional, Any


class MemoryEngine:
    def __init__(self, storage_path: str = "ai_agent_memory.json", short_term_capacity: int = 25):
        self.storage_path = storage_path
        self.short_term_capacity = short_term_capacity
        
        # Short-term rolling buffer of recent observations and actions
        self.short_term_buffer: deque = deque(maxlen=short_term_capacity)
        
        # Long-term persistent memory: landmarks, base coords, completed plans, item caches
        self.long_term_data: Dict[str, Any] = {
            "landmarks": {},
            "base_locations": {},
            "explored_biomes": [],
            "completed_schematics": [],
            "task_notes": []
        }
        
        self.load_long_term_memory()

    def record_step(self, observation: Dict[str, Any], action: Dict[str, Any], result: Optional[str] = None):
        """Records an action-observation step into the short-term rolling window."""
        step = {
            "timestamp": time.time(),
            "tick": observation.get("tick", 0),
            "player_pos": {
                "x": observation.get("player", {}).get("x", 0),
                "y": observation.get("player", {}).get("y", 0),
                "z": observation.get("player", {}).get("z", 0),
            },
            "action": action,
            "result": result or "executed"
        }
        self.short_term_buffer.append(step)

    def get_short_term_summary(self, max_items: int = 5) -> str:
        """Summarizes recent steps for context injection into LLM prompts."""
        if not self.short_term_buffer:
            return "No recent actions recorded."
        
        recent = list(self.short_term_buffer)[-max_items:]
        lines = []
        for s in recent:
            action_type = s["action"].get("type", "unknown")
            pos = s["player_pos"]
            lines.append(f"- Action: {action_type} at [{pos['x']}, {pos['y']}, {pos['z']}] -> {s['result']}")
        return "\n".join(lines)

    def save_landmark(self, name: str, x: float, y: float, z: float, description: str = ""):
        """Stores a named 3D landmark in long-term memory."""
        self.long_term_data["landmarks"][name] = {
            "x": round(x, 2),
            "y": round(y, 2),
            "z": round(z, 2),
            "description": description,
            "created_at": time.time()
        }
        self.persist()

    def get_landmark(self, name: str) -> Optional[Dict[str, Any]]:
        return self.long_term_data["landmarks"].get(name)

    def list_landmarks(self) -> Dict[str, Any]:
        return self.long_term_data.get("landmarks", {})

    def add_task_note(self, note: str):
        self.long_term_data["task_notes"].append({
            "timestamp": time.time(),
            "note": note
        })
        self.persist()

    def note_resource_sighting(self, block_name: str, x: float, y: float, z: float):
        """Remembers where a valuable block was last seen (persistent across restarts)."""
        clean = str(block_name or "").replace("minecraft:", "").lower().strip()
        if not clean:
            return
        prev = self.long_term_data.setdefault("resource_sightings", {}).get(clean, {})
        self.long_term_data["resource_sightings"][clean] = {
            "count": int(prev.get("count", 0)) + 1,
            "lastX": round(float(x), 1),
            "lastY": round(float(y), 1),
            "lastZ": round(float(z), 1),
            "lastSeen": time.time(),
        }
        self.persist()

    def build_long_term_briefing(self, px: float = 0, py: float = 0, pz: float = 0) -> str:
        """Distance-aware recall of landmarks and known resources for LLM prompts."""
        lines: List[str] = []
        landmarks = self.long_term_data.get("landmarks", {})
        if landmarks:
            lines.append("KNOWN LANDMARKS (persistent memory):")
            for name, lm in list(landmarks.items())[-10:]:
                d = ((lm.get("x", 0) - px) ** 2 + (lm.get("y", 0) - py) ** 2 + (lm.get("z", 0) - pz) ** 2) ** 0.5
                desc = f" - {lm['description']}" if lm.get("description") else ""
                lines.append(f"- {name}: [{lm.get('x')}, {lm.get('y')}, {lm.get('z')}] ({d:.0f}m away){desc}")
        sightings = self.long_term_data.get("resource_sightings", {})
        if sightings:
            lines.append("KNOWN RESOURCES (last observed position):")
            for name, r in list(sightings.items())[-12:]:
                d = ((r.get("lastX", 0) - px) ** 2 + (r.get("lastY", 0) - py) ** 2 + (r.get("lastZ", 0) - pz) ** 2) ** 0.5
                lines.append(f"- {name}: last seen at [{r.get('lastX')}, {r.get('lastY')}, {r.get('lastZ')}] ({d:.0f}m away, sightings: {r.get('count', 1)})")
        notes = self.long_term_data.get("task_notes", [])
        if notes:
            lines.append("TASK NOTES:")
            for n in notes[-4:]:
                lines.append(f"- {n.get('note')}")
        if not lines:
            return "(No persistent memories yet. Store landmarks with save_landmark actions.)"
        return "\n".join(lines)

    def load_long_term_memory(self):
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.long_term_data.update(data)
            except Exception as e:
                print(f"[MemoryEngine] Error loading memory from {self.storage_path}: {e}")

    def persist(self):
        """Atomically replace the JSON file so interruption cannot truncate memory."""
        directory = os.path.dirname(os.path.abspath(self.storage_path))
        temporary_path = None
        try:
            os.makedirs(directory, exist_ok=True)
            fd, temporary_path = tempfile.mkstemp(
                prefix=".ai-memory-", suffix=".tmp", dir=directory
            )
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(self.long_term_data, f, indent=2, ensure_ascii=False)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temporary_path, self.storage_path)
            temporary_path = None
        except Exception as e:
            print(f"[MemoryEngine] Error persisting memory to {self.storage_path}: {e}")
            raise
        finally:
            if temporary_path and os.path.exists(temporary_path):
                try:
                    os.remove(temporary_path)
                except OSError:
                    pass
