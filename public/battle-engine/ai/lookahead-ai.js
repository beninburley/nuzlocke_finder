/**
 * Lookahead AI Module
 *
 * This module implements minimax-style lookahead AI for the player.
 * Evaluates potential future game states to find the best action.
 *
 * @module lookahead-ai
 */

import { calculateDamage } from "../core/damage-calculator.js";
import { simulateTurn } from "../simulation/turn-simulator.js";
import { generatePossibleActions } from "./action-generator.js";
import { evaluatePosition } from "../strategy/position-evaluator.js";

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Find best action using recursive lookahead
 *
 * Uses minimax-style evaluation with simplified opponent modeling:
 * - Simulates possible actions for both player and opponent
 * - Recursively evaluates resulting positions up to specified depth
 * - Returns best action for current player based on position evaluation
 *
 * @param {BattleState} state - Current battle state
 * @param {boolean} isPlayer - True if finding action for player
 * @param {number} depth - Remaining search depth (0 = terminal node)
 * @param {Function} handleForcedSwitch - Callback for handling faints
 * @returns {Object} - {action, score} representing best move and its evaluation
 */
export function findBestActionWithLookahead(
  state,
  isPlayer,
  depth = 2,
  handleForcedSwitch
) {
  if (depth === 0) {
    return { action: null, score: evaluatePosition(state) };
  }

  const actions = generatePossibleActions(state, isPlayer);
  if (actions.length === 0) {
    return { action: null, score: evaluatePosition(state) };
  }

  let bestAction = actions[0];
  let bestScore = isPlayer ? -Infinity : Infinity;

  actions.forEach((action) => {
    // Simulate this action
    const opponent = isPlayer ? state.getEnemyActive() : state.getYourActive();

    // For simplicity, assume opponent does their best move
    const opponentActions = generatePossibleActions(state, !isPlayer);
    if (opponentActions.length === 0) return;

    // Pick opponent's best move (greedy for now to keep it fast)
    let opponentAction = opponentActions[0];
    if (opponentActions.length > 0) {
      opponentAction =
        opponentActions.reduce((best, current) => {
          if (
            current.type === "move" &&
            current.move.damageClass !== "status"
          ) {
            const target = isPlayer
              ? state.getYourActive()
              : state.getEnemyActive();
            const targetStats = target.stats;
            const opponentStats = opponent.stats;
            const damage = calculateDamage(
              opponent,
              target,
              current.move,
              opponentStats,
              targetStats
            );

            if (!best || damage.average > 0) return current;
          }
          return best || current;
        }, null) || opponentActions[0];
    }

    // Simulate the turn
    const clonedState = state.clone();
    const yourAction = isPlayer ? action : opponentAction;
    const enemyAction = isPlayer ? opponentAction : action;

    simulateTurn(clonedState, yourAction, enemyAction);

    // Handle forced switches if provided
    if (handleForcedSwitch) {
      if (clonedState.getYourActive().fainted) {
        handleForcedSwitch(clonedState, true);
      }
      if (clonedState.getEnemyActive().fainted) {
        handleForcedSwitch(clonedState, false);
      }
    }

    // Recurse
    const result = findBestActionWithLookahead(
      clonedState,
      isPlayer,
      depth - 1,
      handleForcedSwitch
    );
    const score = result.score;

    // Update best
    if (isPlayer && score > bestScore) {
      bestScore = score;
      bestAction = action;
    } else if (!isPlayer && score < bestScore) {
      bestScore = score;
      bestAction = action;
    }
  });

  return { action: bestAction, score: bestScore };
}
