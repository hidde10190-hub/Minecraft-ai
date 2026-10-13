"""Deterministic validation for AI-generated Minecraft action packets.

This module validates packet shape and numeric bounds only. It does not establish
that coordinates are grounded in current world telemetry or that an action worked.
"""
from __future__ import annotations

import math
from typing import Any, Dict, Iterable, List


class ActionValidationError(ValueError):
    """Raised when an action or action plan is unsafe or malformed."""


ALLOWED_ACTIONS = {
    "look_at", "look_at_relative", "set_rotation", "press_key", "release_key",
    "select_hotbar", "place_block", "attack_entity", "auto_build_litematica_step",
    "save_landmark", "send_chat",
}
ALLOWED_KEYS = {
    "forward", "back", "left", "right", "jump", "sneak", "sprint",
    "attack", "use", "inventory", "drop", "swapHands", "pickBlock",
    "escape", "enter", "space", "shift", "control", "alt",
}
MAX_COORDINATE = 30_000_000
MAX_ACTIONS_PER_PLAN = 12
MAX_KEY_HOLD_MS = 5_000
MAX_CHAT_LENGTH = 256


def _number(value: Any, label: str, *, low: float, high: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ActionValidationError(f"{label} must be a finite number")
    result = float(value)
    if not math.isfinite(result) or result < low or result > high:
        raise ActionValidationError(f"{label} must be between {low} and {high}")
    return result


def _integer(value: Any, label: str, *, low: int, high: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ActionValidationError(f"{label} must be an integer between {low} and {high}")
    return value


def validate_action(action: Any) -> Dict[str, Any]:
    """Validate one action packet and return the original dictionary."""
    if not isinstance(action, dict):
        raise ActionValidationError("each action must be a JSON object")
    kind = action.get("type")
    if not isinstance(kind, str) or kind not in ALLOWED_ACTIONS:
        raise ActionValidationError(f"unsupported action type: {kind!r}")

    if kind in {"look_at", "set_rotation"}:
        for axis in ("yaw", "pitch"):
            if axis in action:
                _number(action[axis], axis, low=-360_000, high=360_000) if axis == "yaw" else _number(action[axis], axis, low=-90, high=90)
        if kind == "look_at":
            for axis in ("x", "y", "z"):
                _number(action.get(axis), axis, low=-MAX_COORDINATE, high=MAX_COORDINATE)
        if kind == "set_rotation" and not all(axis in action for axis in ("yaw", "pitch")):
            raise ActionValidationError("set_rotation requires yaw and pitch")

    elif kind == "look_at_relative":
        for axis in ("yaw", "pitch"):
            _number(action.get(axis), axis, low=-360_000 if axis == "yaw" else -90,
                    high=360_000 if axis == "yaw" else 90)

    elif kind in {"press_key", "release_key"}:
        key = action.get("key")
        if not isinstance(key, str) or key not in ALLOWED_KEYS:
            raise ActionValidationError(f"unsupported key: {key!r}")
        if kind == "press_key" and "duration_ms" in action:
            _integer(action["duration_ms"], "duration_ms", low=1, high=MAX_KEY_HOLD_MS)

    elif kind == "select_hotbar":
        _integer(action.get("slot"), "slot", low=0, high=8)

    elif kind == "place_block":
        for axis in ("x", "y", "z"):
            _integer(action.get(axis), axis, low=-MAX_COORDINATE, high=MAX_COORDINATE)
        face = action.get("face")
        if face is not None and face not in {"up", "down", "north", "south", "east", "west"}:
            raise ActionValidationError("face must be a cardinal block face")
        hand = action.get("hand")
        if hand is not None and hand not in {"main_hand", "off_hand", "main", "off"}:
            raise ActionValidationError("hand must be main_hand or off_hand")

    elif kind == "attack_entity":
        if "entity_id" in action:
            _integer(action["entity_id"], "entity_id", low=0, high=2**31 - 1)

    elif kind == "save_landmark":
        name = action.get("name")
        if not isinstance(name, str) or not name.strip() or len(name) > 80:
            raise ActionValidationError("landmark name must contain 1–80 characters")
        for axis in ("x", "y", "z"):
            _number(action.get(axis), axis, low=-MAX_COORDINATE, high=MAX_COORDINATE)
        description = action.get("description", "")
        if not isinstance(description, str) or len(description) > 500:
            raise ActionValidationError("landmark description must be at most 500 characters")

    elif kind == "send_chat":
        message = action.get("message", action.get("text"))
        if not isinstance(message, str) or not message.strip() or len(message) > MAX_CHAT_LENGTH:
            raise ActionValidationError("chat message must contain 1–256 characters")

    return action


def validate_plan_actions(actions: Any) -> List[Dict[str, Any]]:
    """Validate the complete plan before any action is dispatched."""
    if not isinstance(actions, list):
        raise ActionValidationError("plan actions must be a list")
    if len(actions) > MAX_ACTIONS_PER_PLAN:
        raise ActionValidationError(f"plan may contain at most {MAX_ACTIONS_PER_PLAN} actions")
    return [validate_action(action) for action in actions]
