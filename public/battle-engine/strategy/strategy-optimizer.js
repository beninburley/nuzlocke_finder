/**
 * Strategy Optimizer
 * Finds optimal battle strategy with minimal risk
 */

import { findBestActionWithLookahead } from "../ai/lookahead-ai.js";
import { selectEnemyAction } from "../ai/enemy-ai.js";
import { explainAction } from "./action-explainer.js";
import { simulateTurn } from "../simulation/turn-simulator.js";

/**
 * Find optimal strategy path with minimal risk
 * @param {BattleState} initialState - Starting state
 * @param {number} maxDepth - Maximum turns to look ahead
 * @param {Function} calculateActionRisk - Function to calculate risk for actions
 * @param {Function} handleForcedSwitch - Function to handle forced switches
 * @returns {Array} - Array of {turn, action, risk, reasoning} objects
 */
export function findOptimalStrategy(
  initialState,
  maxDepth,
  calculateActionRisk,
  handleForcedSwitch
) {
  const strategy = [];
  let currentState = initialState.clone();
  let turnCount = 0;

  while (turnCount < maxDepth) {
    turnCount++;

    // Check if battle is over
    const yourAlive = currentState.yourTeam.filter((p) => !p.fainted).length;
    const enemyAlive = currentState.enemyTeam.filter((p) => !p.fainted).length;

    if (yourAlive === 0 || enemyAlive === 0) {
      break;
    }

    // Player uses lookahead to find best action
    const yourResult = findBestActionWithLookahead(currentState, true, 2);
    const yourAction = yourResult.action;

    if (!yourAction) break;

    // Generate reasoning for this action
    const reasoning = explainAction(currentState, yourAction, true);

    // Enemy uses simple AI (no lookahead, follows move selection rules)
    const enemyAction = selectEnemyAction(currentState);

    if (!enemyAction) break;

    // Calculate risk for player action
    const risk = calculateActionRisk(currentState, yourAction, true);

    // Execute turn
    const result = simulateTurn(currentState, yourAction, enemyAction);
    currentState = result.state;

    // Handle forced switches
    if (currentState.getYourActive().fainted) {
      const switchEvent = handleForcedSwitch(currentState, true);
      if (switchEvent) result.events.push(switchEvent);
    }

    if (currentState.getEnemyActive().fainted) {
      const switchEvent = handleForcedSwitch(currentState, false);
      if (switchEvent) result.events.push(switchEvent);
    }

    // Add to strategy
    strategy.push({
      turn: currentState.turnCount,
      action: yourAction,
      events: result.events,
      risk: risk,
      reasoning: reasoning,
      state: currentState.clone(),
    });
  }

  return strategy;
}
