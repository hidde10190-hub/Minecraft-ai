#!/usr/bin/env python3
"""
Minecraft-AI-Bridge: Autonomous Python AI Orchestrator (The Brain)
Coordinates LLMs (OpenAI, Anthropic, Gemini, local Ollama CLI/REST) to control
a Minecraft player via the Java Fabric Client Mod over WebSocket/REST IPC.
"""

import argparse
import asyncio
import json
import math
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiohttp
import requests
import websockets

from action_validation import ActionValidationError, validate_action, validate_plan_actions
from memory_engine import MemoryEngine


def _load_config_env() -> None:
    """Load root config.env for direct runs; existing process variables take priority."""
    config_path = Path(__file__).resolve().parents[2] / "config.env"
    if not config_path.is_file():
        return  # Docker Compose may already have loaded env_file into the process.
    for raw_line in config_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip()
        if not key or not key.replace("_", "").isalnum():
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            value = value[1:-1]
        else:
            value = value.split(" #", 1)[0].rstrip()
        os.environ.setdefault(key, value)


_load_config_env()


SYSTEM_PROMPT = """You are an Autonomous Minecraft AI Agent controlling a player character via the Minecraft-AI-Bridge Fabric Mod.
You perceive the world through real-time telemetry (player coordinates, health, food, hotbar, raycast targets, nearby entities)
and client-side schematic tools (Litematica block diffs).

You MUST respond ONLY with valid JSON containing a "thought" reasoning string and an "actions" list.

Available Actions:
1. {"type": "look_at", "x": float, "y": float, "z": float, "ticks": int}
2. {"type": "set_rotation", "yaw": float, "pitch": float}
3. {"type": "press_key", "key": "w"|"s"|"a"|"d"|"space"|"shift"|"attack"|"use", "duration_ms": int}
4. {"type": "release_key", "key": string}
5. {"type": "select_hotbar", "slot": int}  (0 to 8)
6. {"type": "place_block", "hand": "main"|"off", "x": int, "y": int, "z": int, "side": "up"|"down"|"north"|"south"|"east"|"west"}
7. {"type": "attack_entity", "entity_id": int}
8. {"type": "auto_build_litematica_step"}  (Triggers automated target block equip, alignment, and placement)
9. {"type": "save_landmark", "name": string, "x": float, "y": float, "z": float, "description": string}

Example Response Format:
{
  "thought": "I need to place obsidian to complete the nether portal frame. Target is at [100, 64, 20]. I will look at it and place.",
  "actions": [
    {"type": "select_hotbar", "slot": 0},
    {"type": "look_at", "x": 100.5, "y": 64.5, "z": 20.5, "ticks": 4},
    {"type": "place_block", "hand": "main", "x": 100, "y": 64, "z": 20, "side": "up"}
  ]
}
"""


class ModelAdapter:
    """Unified JSON action-plan adapter for hosted and local chat APIs.

    Native adapters are provided for Ollama, Gemini, OpenAI, and Anthropic.
    OpenAI-compatible adapters use a configurable base URL, covering NVIDIA NIM,
    OpenRouter, Groq, Together, DeepSeek, Mistral, Fireworks, xAI, and compatible
    self-hosted endpoints without requiring a separate implementation per vendor.
    """

    OPENAI_COMPATIBLE_DEFAULTS = {
        "nvidia": ("https://integrate.api.nvidia.com/v1", "NVIDIA_API_KEY", "NVIDIA_MODEL"),
        "openrouter": ("https://openrouter.ai/api/v1", "OPENROUTER_API_KEY", "OPENROUTER_MODEL"),
        "groq": ("https://api.groq.com/openai/v1", "GROQ_API_KEY", "GROQ_MODEL"),
        "together": ("https://api.together.xyz/v1", "TOGETHER_API_KEY", "TOGETHER_MODEL"),
        "deepseek": ("https://api.deepseek.com/v1", "DEEPSEEK_API_KEY", "DEEPSEEK_MODEL"),
        "mistral": ("https://api.mistral.ai/v1", "MISTRAL_API_KEY", "MISTRAL_MODEL"),
        "fireworks": ("https://api.fireworks.ai/inference/v1", "FIREWORKS_API_KEY", "FIREWORKS_MODEL"),
        "xai": ("https://api.x.ai/v1", "XAI_API_KEY", "XAI_MODEL"),
        "perplexity": ("https://api.perplexity.ai", "PERPLEXITY_API_KEY", "PERPLEXITY_MODEL"),
        "cerebras": ("https://api.cerebras.ai/v1", "CEREBRAS_API_KEY", "CEREBRAS_MODEL"),
        "sambanova": ("https://api.sambanova.ai/v1", "SAMBANOVA_API_KEY", "SAMBANOVA_MODEL"),
        "deepinfra": ("https://api.deepinfra.com/v1/openai", "DEEPINFRA_API_KEY", "DEEPINFRA_MODEL"),
        "ovhcloud": ("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1", "OVHCLOUD_API_KEY", "OVHCLOUD_MODEL"),
        "custom_openai": ("http://localhost:8000/v1", "CUSTOM_OPENAI_API_KEY", "CUSTOM_OPENAI_MODEL"),
    }

    def __init__(self, provider: str = "ollama", model_name: Optional[str] = None, api_key: Optional[str] = None):
        self.provider = provider.lower().strip()
        self.api_key = api_key or os.environ.get(f"{self.provider.upper()}_API_KEY")
        self.base_url = (
            os.environ.get(f"{self.provider.upper()}_BASE_URL")
            or os.environ.get("OPENAI_COMPATIBLE_BASE_URL")
        )
        self.model_name = model_name or os.environ.get(f"{self.provider.upper()}_MODEL")

        if self.provider in self.OPENAI_COMPATIBLE_DEFAULTS:
            default_url, key_env, model_env = self.OPENAI_COMPATIBLE_DEFAULTS[self.provider]
            self.base_url = self.base_url or os.environ.get(key_env.replace("_API_KEY", "_BASE_URL")) or default_url
            self.api_key = self.api_key or os.environ.get(key_env)
            self.model_name = self.model_name or os.environ.get(model_env)

        if self.provider == "ollama":
            self.model_name = self.model_name or "llama3:latest"
        elif self.provider == "gemini":
            self.model_name = self.model_name or os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        elif self.provider == "openai":
            self.model_name = self.model_name or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        elif self.provider == "anthropic":
            self.model_name = self.model_name or os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")

    async def generate_action_plan(self, telemetry: Dict[str, Any], goal: str, memory_summary: str, litematica_diff: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        user_prompt = self._build_prompt(telemetry, goal, memory_summary, litematica_diff)
        if self.provider == "ollama":
            return await self._call_ollama(user_prompt)
        if self.provider == "gemini":
            return await self._call_gemini(user_prompt)
        if self.provider == "openai":
            return await self._call_openai(user_prompt)
        if self.provider == "anthropic":
            return await self._call_anthropic(user_prompt)
        if self.provider in self.OPENAI_COMPATIBLE_DEFAULTS or self.base_url:
            return await self._call_openai_compatible(user_prompt)
        raise ValueError(f"Unsupported provider: {self.provider}. Supported: {', '.join(sorted(set(self.OPENAI_COMPATIBLE_DEFAULTS) | {'ollama', 'gemini', 'openai', 'anthropic'}))}")

    def _build_prompt(self, telemetry: Dict[str, Any], goal: str, memory_summary: str, diff: Optional[Dict[str, Any]]) -> str:
        player = telemetry.get("player", {})
        raycast = telemetry.get("raycast", {})
        nearby = telemetry.get("nearby_entities", [])
        payload = {
            "current_goal": goal,
            "player_state": {
                "pos": [player.get("x"), player.get("y"), player.get("z")],
                "yaw": player.get("yaw"), "pitch": player.get("pitch"),
                "health": player.get("health"), "food": player.get("food"),
                "selected_slot": player.get("selected_slot"), "hotbar": player.get("hotbar", [])
            },
            "crosshair_target": raycast,
            "nearby_entities": nearby[:5],
            "recent_actions": memory_summary,
            "litematica_diff": diff.get("diffs", [])[:5] if diff else []
        }
        return f"Current World Telemetry and Goal Context:\n\x60\x60\x60json\n{json.dumps(payload, indent=2)}\n\x60\x60\x60\nDecide next actions. Return ONLY valid JSON."

    async def _call_ollama(self, user_prompt: str) -> Dict[str, Any]:
        ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
        try:
            async with aiohttp.ClientSession() as session:
                body = {"model": self.model_name, "system": SYSTEM_PROMPT, "prompt": user_prompt, "format": "json", "stream": False}
                async with session.post(ollama_url, json=body, timeout=aiohttp.ClientTimeout(total=60)) as resp:
                    data = await resp.json()
                    if resp.status >= 400:
                        raise RuntimeError(f"Ollama HTTP {resp.status}: {str(data)[:500]}")
                    return self._parse_json_safely(data.get("response", "{}"))
        except Exception as e:
            print(f"[ModelAdapter] Ollama REST failed ({e}); trying CLI fallback.")
            process = await asyncio.create_subprocess_exec(
                "ollama", "run", self.model_name, f"{SYSTEM_PROMPT}\n{user_prompt}",
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            if process.returncode:
                raise RuntimeError(f"Ollama REST and CLI failed: {stderr.decode('utf-8', errors='replace')[:500]}") from e
            return self._parse_json_safely(stdout.decode("utf-8", errors="replace"))

    async def _call_gemini(self, user_prompt: str) -> Dict[str, Any]:
        api_key = self.api_key or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable required")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={api_key}"
        body = {"systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "contents": [{"parts": [{"text": user_prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"}}
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, timeout=aiohttp.ClientTimeout(total=60)) as resp:
                data = await resp.json()
                if resp.status >= 400:
                    raise RuntimeError(f"Gemini HTTP {resp.status}: {str(data)[:500]}")
                try:
                    return self._parse_json_safely(data["candidates"][0]["content"]["parts"][0]["text"])
                except (KeyError, IndexError, TypeError) as e:
                    raise RuntimeError(f"Gemini returned an unexpected response: {str(data)[:500]}") from e

    async def _call_openai(self, user_prompt: str) -> Dict[str, Any]:
        return await self._post_openai_compatible(
            "https://api.openai.com/v1", self.api_key or os.environ.get("OPENAI_API_KEY"),
            self.model_name, user_prompt, provider_label="OpenAI"
        )

    async def _call_openai_compatible(self, user_prompt: str) -> Dict[str, Any]:
        if not self.base_url:
            raise ValueError(f"{self.provider} requires a base URL")
        if not self.api_key and self.provider != "custom_openai":
            raise ValueError(f"{self.provider.upper()}_API_KEY environment variable required")
        return await self._post_openai_compatible(self.base_url, self.api_key, self.model_name, user_prompt, provider_label=self.provider)

    async def _post_openai_compatible(self, base_url: str, api_key: Optional[str], model: Optional[str], user_prompt: str, provider_label: str) -> Dict[str, Any]:
        if not model:
            raise ValueError(f"Set {self.provider.upper()}_MODEL to a model ID supported by {provider_label}")
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        if self.provider == "openrouter":
            headers["HTTP-Referer"] = os.environ.get("OPENROUTER_HTTP_REFERER", "https://github.com/hidde10190-hub/Minecraft-ai")
            headers["X-OpenRouter-Title"] = os.environ.get("OPENROUTER_APP_TITLE", "Minecraft AI")
        body = {
            "model": model,
            "messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_prompt}],
            "response_format": {"type": "json_object"},
        }
        url = base_url.rstrip("/") + "/chat/completions"
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=90)) as resp:
                data = await resp.json(content_type=None)
                if resp.status >= 400:
                    raise RuntimeError(f"{provider_label} HTTP {resp.status}: {str(data)[:500]}")
                try:
                    content = data["choices"][0]["message"]["content"]
                except (KeyError, IndexError, TypeError) as e:
                    raise RuntimeError(f"{provider_label} returned an unexpected response: {str(data)[:500]}") from e
                return self._parse_json_safely(content)

    async def _call_anthropic(self, user_prompt: str) -> Dict[str, Any]:
        api_key = self.api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable required")
        url = "https://api.anthropic.com/v1/messages"
        headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        body = {"model": self.model_name, "max_tokens": 2048, "system": SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": user_prompt}]}
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=60)) as resp:
                data = await resp.json()
                if resp.status >= 400:
                    raise RuntimeError(f"Anthropic HTTP {resp.status}: {str(data)[:500]}")
                try:
                    return self._parse_json_safely(data["content"][0]["text"])
                except (KeyError, IndexError, TypeError) as e:
                    raise RuntimeError(f"Anthropic returned an unexpected response: {str(data)[:500]}") from e

    def _parse_json_safely(self, text: str) -> Dict[str, Any]:
        try:
            cleaned = text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed = json.loads(cleaned.strip())
            if not isinstance(parsed, dict) or not isinstance(parsed.get("actions", []), list):
                raise ValueError("Model response must be a JSON object with an actions list")
            return parsed
        except Exception as e:
            raise ValueError(f"Model returned invalid action-plan JSON: {e}") from e


class MinecraftAiOrchestrator:
    """
    Main Orchestrator loop:
    Connects to Fabric mod WebSocket, maintains real-time telemetry state,
    coordinates the ModelAdapter, memory engine, and Litematica auto-build loop.
    """

    def __init__(self, bridge_host: str = "localhost", bridge_port: int = 8080, model_adapter: Optional[ModelAdapter] = None):
        self.bridge_host = bridge_host
        self.bridge_port = bridge_port
        self.ws_url = f"ws://{bridge_host}:{bridge_port}/ws"
        self.rest_url = f"http://{bridge_host}:{bridge_port}/api"
        self.model = model_adapter or ModelAdapter(provider="ollama", model_name="llama3:latest")
        self.memory = MemoryEngine()
        
        self.latest_telemetry: Dict[str, Any] = {}
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.is_running = False

    async def start(self, goal: str = "Build active Litematica schematic"):
        self.is_running = True
        print(f"[Orchestrator] Connecting to Java Fabric Bridge at {self.ws_url}...")

        while self.is_running:
            try:
                async with websockets.connect(self.ws_url) as ws:
                    self.ws = ws
                    print("[Orchestrator] Connected to Fabric Client Mod! Starting telemetry consumer and AI loop.")

                    # Start background listener for continuous telemetry streaming
                    telemetry_task = asyncio.create_task(self._telemetry_listener())
                    
                    # Start high-level goal decision loop
                    ai_loop_task = asyncio.create_task(self._decision_loop(goal))

                    done, pending = await asyncio.wait(
                        [telemetry_task, ai_loop_task],
                        return_when=asyncio.FIRST_COMPLETED
                    )
                    for task in pending:
                        task.cancel()

            except (websockets.ConnectionClosed, ConnectionRefusedError) as e:
                print(f"[Orchestrator] Disconnected or bridge unreachable ({e}). Reconnecting in 3s...")
                await asyncio.sleep(3)

    async def _telemetry_listener(self):
        """Consumes real-time 20Hz telemetry broadcast from the Java Fabric Mod."""
        while self.is_running and self.ws:
            msg = await self.ws.recv()
            try:
                data = json.loads(msg)
                if data.get("type") == "telemetry":
                    self.latest_telemetry = data
            except Exception as e:
                print(f"[Orchestrator] Telemetry parse error: {e}")

    async def _decision_loop(self, goal: str):
        """High-level cognitive loop: Evaluates state, asks LLM, dispatches actions."""
        while self.is_running:
            if not self.latest_telemetry.get("in_game", False):
                print("[Orchestrator] Waiting for player to be in-game...")
                await asyncio.sleep(2)
                continue

            # Check if this is a Litematica building task
            diff = await self.query_litematica_diff(limit=20)

            # If the goal is auto-building and diff exists, execute specialized auto-build tick
            if "build" in goal.lower() and diff and diff.get("diffs"):
                await self.execute_litematica_autobuild_step(diff)
                await asyncio.sleep(0.35)
                continue

            # Standard LLM cognitive cycle
            memory_summary = self.memory.get_short_term_summary(max_items=5)
            try:
                plan = await self.model.generate_action_plan(
                    self.latest_telemetry,
                    goal,
                    memory_summary,
                    diff
                )
                # Validate the entire model response before sending any action. This prevents
                # a malformed later action from leaving a partially executed plan.
                actions = validate_plan_actions(plan.get("actions", []))
                print(f"[AI Thought]: {plan.get('thought')}")

                for action in actions:
                    await self.dispatch_action(action)
                    self.memory.record_step(self.latest_telemetry, action, "dispatched")
                    await asyncio.sleep(0.05)

            except ActionValidationError as e:
                print(f"[Orchestrator] Rejected unsafe/malformed action plan: {e}")
            except Exception as e:
                print(f"[Orchestrator] Error during cognitive step: {e}")

            await asyncio.sleep(0.5)

    async def dispatch_action(self, action: Dict[str, Any]):
        """Dispatches an action packet over WebSocket to Java AiInputController."""
        if not self.ws:
            return

        # Revalidate at the execution boundary too, including non-LLM callers.
        validate_action(action)
        action_type = action.get("type")
        if action_type == "save_landmark":
            self.memory.save_landmark(action["name"], action["x"], action["y"], action["z"], action.get("description", ""))
            return

        if action_type == "auto_build_litematica_step":
            diff = await self.query_litematica_diff(limit=10)
            await self.execute_litematica_autobuild_step(diff)
            return

        # Send raw action command to Java mod
        await self.ws.send(json.dumps(action))

    async def query_litematica_diff(self, limit: int = 50) -> Optional[Dict[str, Any]]:
        """Queries the REST API for Litematica schematic differences."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.rest_url}/litematica/diff?limit={limit}") as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception:
            pass
        return None

    async def execute_litematica_autobuild_step(self, diff: Dict[str, Any]):
        """
        Deterministic Auto-Build Goal Loop:
        1. Identify closest missing block coordinate.
        2. Equip required block into hotbar.
        3. Smoothly align camera to block face.
        4. Dispatch placement action.
        5. Verify state on next tick.
        """
        diffs = diff.get("diffs", [])
        if not diffs:
            print("[Auto-Build] No missing blocks in schematic. Placement complete!")
            return

        target_diff = diffs[0]
        tx, ty, tz = target_diff["x"], target_diff["y"], target_diff["z"]
        expected_block = target_diff["expected_block"]
        diff_type = target_diff["type"]

        player = self.latest_telemetry.get("player", {})
        px, py, pz = player.get("x", 0), player.get("y", 0), player.get("z", 0)

        # 1. Distance check
        dist = math.sqrt((tx - px)**2 + (ty - py)**2 + (tz - pz)**2)
        if dist > 4.5:
            # Need to walk closer: Look towards target and tap 'w'
            await self.dispatch_action({"type": "look_at", "x": tx, "y": py + 1.6, "z": tz, "ticks": 4})
            await self.dispatch_action({"type": "press_key", "key": "w", "duration_ms": 300})
            return

        # 2. Equip Block: Search hotbar for expected block or item
        hotbar = player.get("hotbar", [])
        target_slot = -1
        expected_item_id = expected_block  # e.g. "minecraft:obsidian"
        
        for slot in hotbar:
            if expected_item_id in slot.get("item", ""):
                target_slot = slot["slot"]
                break

        if target_slot != -1 and target_slot != player.get("selected_slot"):
            await self.dispatch_action({"type": "select_hotbar", "slot": target_slot})
            await asyncio.sleep(0.05)

        # 3. Smooth Camera Look at target voxel center
        await self.dispatch_action({
            "type": "look_at",
            "x": tx + 0.5,
            "y": ty + 0.5,
            "z": tz + 0.5,
            "ticks": 3
        })
        await asyncio.sleep(0.1)

        # 4. Trigger block placement or attack (if misplaced)
        if diff_type == "MISSING":
            await self.dispatch_action({
                "type": "place_block",
                "hand": "main",
                "x": tx,
                "y": ty,
                "z": tz,
                "side": "up"
            })
            print(f"[Auto-Build] Placed {expected_block} at ({tx}, {ty}, {tz})")
        elif diff_type == "MISPLACED" or diff_type == "EXTRA":
            # Break offending block
            await self.dispatch_action({"type": "press_key", "key": "attack", "duration_ms": 600})
            print(f"[Auto-Build] Breaking invalid block at ({tx}, {ty}, {tz})")


# CLI Entry Point
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Minecraft-AI-Bridge Python AI Orchestrator")
    supported_providers = sorted(set(ModelAdapter.OPENAI_COMPATIBLE_DEFAULTS) | {"ollama", "gemini", "openai", "anthropic"})
    parser.add_argument(
        "--provider", choices=supported_providers,
        default=os.environ.get("AI_PROVIDER", "ollama").strip().lower(),
        help="LLM provider (defaults to AI_PROVIDER in config.env)",
    )
    parser.add_argument(
        "--model", default=None,
        help="Model ID/tag (defaults to the selected provider's *_MODEL setting)",
    )
    parser.add_argument("--host", default="localhost", help="Minecraft Java Mod Bridge host")
    parser.add_argument("--port", type=int, default=8080, help="Minecraft Java Mod Bridge port")
    parser.add_argument("--goal", default="Build the active Litematica schematic", help="Initial agent goal")
    parser.add_argument("--api-key", default=None, help="Provider API Key (optional, defaults to env vars)")

    args = parser.parse_args()

    adapter = ModelAdapter(provider=args.provider, model_name=args.model, api_key=args.api_key)
    orchestrator = MinecraftAiOrchestrator(bridge_host=args.host, bridge_port=args.port, model_adapter=adapter)

    print("=" * 65)
    print("  MINECRAFT-AI-BRIDGE: AUTONOMOUS AGENT ORCHESTRATOR")
    print(f"  Provider: {adapter.provider} | Model: {adapter.model_name}")
    print(f"  Bridge Target: ws://{args.host}:{args.port}/ws")
    print(f"  Primary Goal: {args.goal}")
    print("=" * 65)

    try:
        asyncio.run(orchestrator.start(goal=args.goal))
    except KeyboardInterrupt:
        print("\n[Orchestrator] Shutting down gracefully...")
