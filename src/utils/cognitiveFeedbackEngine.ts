import { PlayerState, RaycastTarget, ActionPacket, CognitiveFeedbackState, MemoryStep } from "../types";

export interface ActionOutcomeEvaluation {
  feedback: CognitiveFeedbackState;
  detectedMistake: string | null;
  outcomeText: string;
  isStuck: boolean;
  reachExceeded: boolean;
}

/**
 * Real-Time Cognitive Feedback & Mistake Learning Engine.
 * Evaluates physical execution outcomes against Minecraft game mechanics:
 * 1. Obstacle collision & zero-displacement while moving ('w', 's', 'a', 'd', 'sprint')
 * 2. Strict Minecraft 4.5-block reach limit on mining and interaction
 * 3. Crosshair targeting accuracy (MISS vs targeted solid block)
 * 4. Repetitive action loops without state changes
 */
export class CognitiveFeedbackEngine {
  private static instance: CognitiveFeedbackEngine;
  private mistakesHistory: string[] = [];
  private stuckCycles: number = 0;
  private lastEvaluationTime: number = Date.now();
  private consecutiveSameActions: number = 0;
  private lastActionType: string = "";

  public static getInstance(): CognitiveFeedbackEngine {
    if (!CognitiveFeedbackEngine.instance) {
      CognitiveFeedbackEngine.instance = new CognitiveFeedbackEngine();
    }
    return CognitiveFeedbackEngine.instance;
  }

  /**
   * Evaluates the outcome of an action comparing player & raycast states before and after execution.
   */
  public evaluateOutcome(
    prevPlayer: PlayerState,
    nextPlayer: PlayerState,
    action: ActionPacket,
    raycast?: RaycastTarget
  ): ActionOutcomeEvaluation {
    const now = Date.now();
    this.lastEvaluationTime = now;

    let detectedMistake: string | null = null;
    let suggestedCorrection = "Proceed with goal execution.";
    let outcomeText = "Action executed successfully.";
    let reachExceeded = false;
    let isStuck = false;

    // Track consecutive repetitive action
    if (action.type === this.lastActionType) {
      this.consecutiveSameActions++;
    } else {
      this.consecutiveSameActions = 1;
      this.lastActionType = action.type;
    }

    // 1. Movement & Obstacle Evaluation
    const moveKeys = ["w", "s", "a", "d", "sprint"];
    const isMoveAction = action.type === "press_key" && action.key && moveKeys.includes(action.key.toLowerCase());

    if (isMoveAction) {
      const dx = nextPlayer.x - prevPlayer.x;
      const dz = nextPlayer.z - prevPlayer.z;
      const dy = nextPlayer.y - prevPlayer.y;
      const horizontalDisplacement = Math.hypot(dx, dz);

      // If key was pressed to walk forward/strafe but displacement was negligible (<0.06m)
      if (horizontalDisplacement < 0.06 && Math.abs(dy) < 0.2) {
        this.stuckCycles++;
        isStuck = true;
        detectedMistake = `STUCK AT OBSTACLE: Pressed '${action.key}' for movement, but displacement was only ${horizontalDisplacement.toFixed(3)}m (blocked by 1-block elevation or wall).`;
        suggestedCorrection = `Execute jump with 'space' or sprint-jump while pressing '${action.key}', or rotate camera yaw 45° to pathfind around the barrier.`;
        outcomeText = `Movement failed (zero displacement at [${nextPlayer.x.toFixed(1)}, ${nextPlayer.y.toFixed(1)}, ${nextPlayer.z.toFixed(1)}])`;
      } else {
        this.stuckCycles = 0;
        outcomeText = `Moved ${horizontalDisplacement.toFixed(2)}m along horizontal plane.`;
      }
    }

    // 2. Mining & Attack Reach Evaluation
    const isAttackOrMine = (action.type === "press_key" && action.key?.toLowerCase() === "attack") || action.type === "attack_entity";
    if (isAttackOrMine) {
      if (raycast) {
        if (raycast.type === "MISS") {
          detectedMistake = `CROSSHAIR MISALIGNED: Attempted attack/mining while crosshair is aimed at air (Raycast MISS).`;
          suggestedCorrection = `Rotate camera pitch and yaw toward the target block using 'look_at' before holding attack.`;
          outcomeText = `Mining failed: crosshair on air.`;
        } else if (raycast.type === "BLOCK" && raycast.x !== undefined && raycast.y !== undefined && raycast.z !== undefined) {
          const dist = Math.hypot(
            raycast.x + 0.5 - nextPlayer.x,
            raycast.y + 0.5 - (nextPlayer.y + 1.62),
            raycast.z + 0.5 - nextPlayer.z
          );

          // Minecraft strict reach is 4.5 blocks
          if (dist > 4.5) {
            reachExceeded = true;
            detectedMistake = `MINING REACH EXCEEDED: Target block is ${dist.toFixed(1)}m away. Maximum Minecraft reach is strictly 4.5 blocks.`;
            suggestedCorrection = `WALK CLOSER FIRST: Press 'w' towards target until distance <= 3.5m, then initiate mining attack.`;
            outcomeText = `Mining out of reach (${dist.toFixed(1)}m > 4.5m limit).`;
          } else {
            outcomeText = `Mining initiated within reach (${dist.toFixed(1)}m <= 4.5m).`;
          }
        }
      }
    }

    // 3. Repetitive Loop Check (stuck in a loop of 3+ identical actions without progress)
    if (this.consecutiveSameActions >= 3 && (isStuck || reachExceeded)) {
      detectedMistake = `REPETITIVE FAILURE LOOP: Repeated identical failed action '${action.type}' 3 times without environmental state change.`;
      suggestedCorrection = `Break the loop: Change stance, jump, rotate camera 90 degrees, or re-evaluate pathfinding.`;
    }

    // Record mistake in history if detected
    if (detectedMistake) {
      if (!this.mistakesHistory.includes(detectedMistake)) {
        this.mistakesHistory.unshift(detectedMistake);
        if (this.mistakesHistory.length > 8) {
          this.mistakesHistory.pop();
        }
      }
    }

    const feedbackState: CognitiveFeedbackState = {
      lastActionOutcome: outcomeText,
      mistakes: [...this.mistakesHistory],
      suggestedCorrection,
      stuckCycles: this.stuckCycles,
      reachMistakeDetected: reachExceeded,
      lastVerifiedTarget: raycast?.type === "BLOCK" ? raycast.block : undefined,
      lastDistance: raycast?.type === "BLOCK" && raycast.x !== undefined ? Math.hypot(raycast.x - nextPlayer.x, raycast.z - nextPlayer.z) : undefined,
      evaluatedAt: now
    };

    return {
      feedback: feedbackState,
      detectedMistake,
      outcomeText,
      isStuck,
      reachExceeded
    };
  }

  public getMistakes(): string[] {
    return [...this.mistakesHistory];
  }

  public clearMistakes(): void {
    this.mistakesHistory = [];
    this.stuckCycles = 0;
    this.consecutiveSameActions = 0;
  }

  public generatePromptFeedbackString(): string {
    if (this.mistakesHistory.length === 0) {
      return "No execution mistakes detected. All previous actions produced valid kinematic changes.";
    }

    return this.mistakesHistory
      .slice(0, 4)
      .map((m, idx) => `[Mistake #${idx + 1}]: ${m}`)
      .join(" | ");
  }
}
