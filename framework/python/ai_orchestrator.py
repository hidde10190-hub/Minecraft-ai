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
from typing import Any, Dict, List, Optional

import aiohttp
import requests
import websockets

from action_validation import ActionValidationError, validate_action, validate_plan_actions
from memory_engine import MemoryEngine


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
    """Unified interface for OpenAI, Anthropic, Gemini, and Ollama CLI/REST."""

    def __init__(self, provider: str = "ollama", model_name: str = "llama3:latest", api_key: Optional[str] = None):
        self.provider = provider.lower()
        self.model_name = model_name
        self.api_key = api_key or os.environ.get(f"{provider.upper()}_API_KEY")

    async def generate_action_plan(self, telemetry: Dict[str, Any], goal: str, memory_summary: str, litematica_diff: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        user_prompt = self._build_prompt(telemetry, goal, memory_summary, litematica_diff)

        if self.provider == "ollama":
            return await self._call_ollama(user_prompt)
        elif self.provider == "gemini":
            return await self._call_gemini(user_prompt)
        elif self.provider == "openai":
            return await self._call_openai(user_prompt)
        elif self.provider == "anthropic":
            return await self._call_anthropic(user_prompt)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

    def _build_prompt(self, telemetry: Dict[str, Any], goal: str, memory_summary: str, diff: Optional[Dict[str, Any]]) -> str:
        player = telemetry.get("player", {})
        raycast = telemetry.get("raycast", {})
        nearby = telemetry.get("nearby_entities", [])

        payload = {
            "current_goal": goal,
            "player_state": {
                "pos": [player.get("x"), player.get("y"), player.get("z")],
                "yaw": player.get("yaw"),
                "pitch": player.get("pitch"),
                "health": player.get("health"),
                "food": player.get("food"),
                "selected_slot": player.get("selected_slot"),
                "hotbar": player.get("hotbar", [])
            },
            "crosshair_target": raycast,
            "nearby_entities": nearby[:5],
            "recent_actions": memory_summary,
            "litematica_diff": diff.get("diffs", [])[:5] if diff else []
        }

        return f"Current World Telemetry and Goal Context:\n```json\n{json.dumps(payload, indent=2)}\n```\nDecide next actions. Return ONLY valid JSON."

    async def _call_ollama(self, user_prompt: str) -> Dict[str, Any]:
        """Calls local Ollama instance via REST or CLI subprocess."""
        ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
        try:
            async with aiohttp.ClientSession() as session:
                body = {
                    "model": self.model_name,
                    "system": SYSTEM_PROMPT,
                    "prompt": user_prompt,
                    "format": "json",
                    "stream": False
                }
                async with session.post(ollama_url, json=body, timeout=aiohttp.ClientTimeout(total=20)) as resp:
                    if resp.status == 200:
                        res = await resp.json()
                        return json.loads(res.get("response", "{}"))
        except Exception as e:
            print(f"[ModelAdapter] Ollama REST failed ({e}), falling back to CLI subprocess...")
            # Fallback to Ollama CLI: `ollama run <model>`
            process = await asyncio.create_subprocess_exec(
                "ollama", "run", self.model_name, f"{SYSTEM_PROMPT}\n{user_prompt}",
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            stdout, _ = await process.communicate()
            return self._parse_json_safely(stdout.decode("utf-8"))

    async def _call_gemini(self, user_prompt: str) -> Dict[str, Any]:
        """Calls Google Gemini API."""
        api_key = self.api_key or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable required")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={api_key}"
        body = {
            "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\n{user_prompt}"}]}],
            "generationConfig": {"responseMimeType": "application/json"}
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body) as resp:
                data = await resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)

    async def _call_openai(self, user_prompt: str) -> Dict[str, Any]:
        """Calls OpenAI Chat Completion API."""
        api_key = self.api_key or os.environ.get("OPENAI_API_KEY")
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        body = {
            "model": self.model_name or "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"}
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=body) as resp:
                data = await resp.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)

    async def _call_anthropic(self, user_prompt: str) -> Dict[str, Any]:
        """Calls Anthropic Claude API."""
        api_key = self.api_key or os.environ.get("ANTHROPIC_API_KEY")
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        body = {
            "model": self.model_name or "claude-3-5-sonnet-20241022",
            "max_tokens": 1024,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_prompt}]
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=body) as resp:
                data = await resp.json()
                content = data["content"][0]["text"]
                return self._parse_json_safely(content)

    def _parse_json_safely(self, text: str) -> Dict[str, Any]:
        try:
            # Strip potential markdown formatting
            cleaned = text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
        except Exception:
            return {"thought": "Fallback parse", "actions": []}


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
    parser.add_argument("--provider", choices=["ollama", "gemini", "openai", "anthropic"], default="ollama", help="LLM Provider")
    parser.add_argument("--model", default="llama3:latest", help="Model name or tag")
    parser.add_argument("--host", default="localhost", help="Minecraft Java Mod Bridge host")
    parser.add_argument("--port", type=int, default=8080, help="Minecraft Java Mod Bridge port")
    parser.add_argument("--goal", default="Build the active Litematica schematic", help="Initial agent goal")
    parser.add_argument("--api-key", default=None, help="Provider API Key (optional, defaults to env vars)")

    args = parser.parse_args()

    adapter = ModelAdapter(provider=args.provider, model_name=args.model, api_key=args.api_key)
    orchestrator = MinecraftAiOrchestrator(bridge_host=args.host, bridge_port=args.port, model_adapter=adapter)

    print("=" * 65)
    print("  MINECRAFT-AI-BRIDGE: AUTONOMOUS AGENT ORCHESTRATOR")
    print(f"  Provider: {args.provider} | Model: {args.model}")
    print(f"  Bridge Target: ws://{args.host}:{args.port}/ws")
    print(f"  Primary Goal: {args.goal}")
    print("=" * 65)

    try:
        asyncio.run(orchestrator.start(goal=args.goal))
    except KeyboardInterrupt:
        print("\n[Orchestrator] Shutting down gracefully...")
