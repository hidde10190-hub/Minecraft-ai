# Minecraft-AI-Bridge: Autonomous AI Controller Framework

A modular, low-latency framework enabling Autonomous AI Agents (via local Ollama, Gemini, OpenAI, Claude, or CLI tools) to control a Minecraft player instance with in-memory virtual inputs, full server compatibility, and deep client-side Litematica / Syncmatica schematic integration.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   THE BRAIN (Python)                   │
│  - Model Adapter (Ollama, Gemini, OpenAI, Anthropic)   │
│  - Spatial & Task Memory Engine (Rolling + Long-Term)  │
│  - Litematica Auto-Build Goal Loop                     │
│  - Tick-Based Action Packet Generator                  │
└──────────────────────────┬─────────────────────────────┘
                           │ Bi-directional WebSocket & REST
                           │ (ws://localhost:8080/ws)
┌──────────────────────────▼─────────────────────────────┐
│                    THE BODY (Java)                     │
│  Fabric Client Mod (1.20.4+):                          │
│  - Virtual Input Controller (KeyBindingAccessor Mixin) │
│  - Smooth Camera Yaw/Pitch Interpolator                │
│  - Telemetry & Raycast Serializer                      │
│  - Multi-Auth & Session Switcher (MSA & Offline)       │
│  - Litematica Bridge (DataManager & Schematic Diff)    │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Build & Run the Fabric Mod (The Body)
Requirements: JDK 17+, Gradle 8+

```bash
# Clone and build the mod jar
cd framework
./gradlew build

# Copy the built jar to your Minecraft mods folder
cp build/libs/minecraft-ai-bridge-1.0.0.jar ~/.minecraft/mods/
```

Required mods in `~/.minecraft/mods/`:
* `fabric-api-0.96.1+1.20.4.jar`
* `malilib-fabric-1.20.4-0.17.0.jar`
* `litematica-fabric-1.20.4-0.16.0.jar` (optional, for schematic diff features)
* `minecraft-ai-bridge-1.0.0.jar`

When Minecraft boots, the mod automatically starts the Javalin WebSocket/REST server on `localhost:8080`.

---

### 2. Run the Python AI Orchestrator (The Brain)
Requirements: Python 3.10+

```bash
cd framework/python
pip install -r requirements.txt

# Run with local Ollama (Llama 3, Mistral, Qwen)
python ai_orchestrator.py --provider ollama --model llama3:latest

# Or run with Google Gemini:
export GEMINI_API_KEY="your_api_key"
python ai_orchestrator.py --provider gemini --model gemini-2.5-flash

# Or run with OpenAI:
export OPENAI_API_KEY="your_api_key"
python ai_orchestrator.py --provider openai --model gpt-4o-mini
```

---

## 📡 IPC Protocol Specification

### 1. Telemetry Packet (Broadcast from Java to Python at 20Hz)
```json
{
  "type": "telemetry",
  "in_game": true,
  "tick": 1420,
  "player": {
    "x": 124.52,
    "y": 64.0,
    "z": -82.14,
    "yaw": 45.2,
    "pitch": 12.0,
    "health": 20.0,
    "food": 18,
    "selected_slot": 0,
    "hotbar": [
      {"slot": 0, "item": "minecraft:obsidian", "count": 64}
    ]
  },
  "raycast": {
    "type": "BLOCK",
    "x": 126,
    "y": 64,
    "z": -82,
    "side": "west",
    "block": "minecraft:stone"
  },
  "nearby_entities": [
    {"id": 412, "type": "minecraft:zombie", "distance": 6.4, "health": 20.0}
  ]
}
```

### 2. Action Packets (Sent from Python to Java)
* **Smooth Camera Aim:**
  `{"type": "look_at", "x": 126.5, "y": 65.0, "z": -82.5, "ticks": 5}`
* **Virtual Key Press:**
  `{"type": "press_key", "key": "w", "duration_ms": 500}`
* **Block Placement:**
  `{"type": "place_block", "hand": "main", "x": 126, "y": 64, "z": -82, "side": "up"}`
* **Attack Entity:**
  `{"type": "attack_entity", "entity_id": 412}`
* **Select Hotbar:**
  `{"type": "select_hotbar", "slot": 2}`
