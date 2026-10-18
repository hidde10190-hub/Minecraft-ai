import unittest

from action_validation import ActionValidationError, validate_action, validate_plan_actions


class ActionValidationTests(unittest.TestCase):
    def test_accepts_valid_rotation(self):
        self.assertEqual(validate_action({"type": "set_rotation", "yaw": 90, "pitch": 0})["yaw"], 90)

    def test_rejects_unknown_action(self):
        with self.assertRaises(ActionValidationError):
            validate_action({"type": "teleport", "x": 0, "y": 80, "z": 0})

    def test_rejects_nan_coordinates(self):
        with self.assertRaises(ActionValidationError):
            validate_action({"type": "look_at", "x": float("nan"), "y": 64, "z": 0})

    def test_rejects_boolean_as_number(self):
        with self.assertRaises(ActionValidationError):
            validate_action({"type": "look_at", "x": True, "y": 64, "z": 0})

    def test_rejects_out_of_world_coordinates(self):
        with self.assertRaises(ActionValidationError):
            validate_action({"type": "look_at", "x": 30_000_001, "y": 64, "z": 0})

    def test_rejects_bad_pitch(self):
        with self.assertRaises(ActionValidationError):
            validate_action({"type": "set_rotation", "yaw": 0, "pitch": 91})

    def test_rejects_bad_hotbar_slot(self):
        with self.assertRaises(ActionValidationError):
            validate_action({"type": "select_hotbar", "slot": 9})

    def test_accepts_controller_movement_keys(self):
        for key in ("w", "a", "s", "d", "space", "shift", "attack", "use"):
            self.assertEqual(validate_action({"type": "press_key", "key": key})["key"], key)

    def test_rejects_unapproved_key(self):
        with self.assertRaises(ActionValidationError):
            validate_action({"type": "press_key", "key": "delete_world"})

    def test_rejects_excessive_key_hold(self):
        with self.assertRaises(ActionValidationError):
            validate_action({"type": "press_key", "key": "forward", "duration_ms": 5001})

    def test_rejects_fractional_block_coordinates(self):
        with self.assertRaises(ActionValidationError):
            validate_action({"type": "place_block", "x": 1.5, "y": 64, "z": 2})

    def test_rejects_empty_landmark_name(self):
        with self.assertRaises(ActionValidationError):
            validate_action({"type": "save_landmark", "name": " ", "x": 0, "y": 64, "z": 0})

    def test_rejects_oversized_plan(self):
        with self.assertRaises(ActionValidationError):
            validate_plan_actions([{"type": "release_key", "key": "forward"}] * 13)

    def test_validates_whole_plan_before_returning(self):
        with self.assertRaises(ActionValidationError):
            validate_plan_actions([
                {"type": "release_key", "key": "forward"},
                {"type": "press_key", "key": "not-a-key"},
            ])

    def test_accepts_common_actions(self):
        actions = [
            {"type": "look_at", "x": 0, "y": 64, "z": 0},
            {"type": "press_key", "key": "forward", "duration_ms": 250},
            {"type": "select_hotbar", "slot": 0},
            {"type": "save_landmark", "name": "base", "x": 1.5, "y": 64, "z": -3},
        ]
        self.assertEqual(len(validate_plan_actions(actions)), 4)


if __name__ == "__main__":
    unittest.main()
