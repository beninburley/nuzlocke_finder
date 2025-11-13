/**
 * Scenario Calculator
 * Worst-case scenario simulation for battle planning
 */

import { findBestActionWithLookahead } from "../ai/lookahead-ai.js";
import { selectEnemyAction } from "../ai/enemy-ai.js";
import { simulateTurnWorstCase } from "./turn-simulator.js";

/**
 * Calculate worst-case strategy outcomes
 * @param {BattleState} initialState - Starting battle state
 * @param {number} maxDepth - Maximum turns to simulate
 * @param {Function} handleForcedSwitch - Function to handle forced switches
 * @returns {Object} - Worst case analysis with death count and risk tier
 */
export function calculateWorstCaseStrategy(
  initialState,
  maxDepth,
  handleForcedSwitch
) {
  const strategy = [];
  let currentState = initialState.clone();
  let turnCount = 0;
  let yourDeaths = 0;
  let enemyDeaths = 0;

  while (turnCount < maxDepth) {
    turnCount++;

    const yourAlive = currentState.yourTeam.filter((p) => !p.fainted).length;
    const enemyAlive = currentState.enemyTeam.filter((p) => !p.fainted).length;

    if (yourAlive === 0 || enemyAlive === 0) {
      break;
    }

    // Player uses lookahead to find best action
    const yourResult = findBestActionWithLookahead(currentState, true, 2);
    const yourAction = yourResult.action;

    if (!yourAction) break;

    // Enemy uses AI logic (same as normal simulation)
    const enemyAction = selectEnemyAction(currentState);

    if (!enemyAction) break;

    // Track deaths before this turn
    const yourAliveBeforeTurn = currentState.yourTeam.filter(
      (p) => !p.fainted
    ).length;
    const enemyAliveBeforeTurn = currentState.enemyTeam.filter(
      (p) => !p.fainted
    ).length;

    // Execute turn with worst-case damage
    const result = simulateTurnWorstCase(currentState, yourAction, enemyAction);
    currentState = result.state;

    // Track deaths after this turn
    const yourAliveAfterTurn = currentState.yourTeam.filter(
      (p) => !p.fainted
    ).length;
    const enemyAliveAfterTurn = currentState.enemyTeam.filter(
      (p) => !p.fainted
    ).length;

    const yourDeathsThisTurn = yourAliveBeforeTurn - yourAliveAfterTurn;
    const enemyDeathsThisTurn = enemyAliveBeforeTurn - enemyAliveAfterTurn;

    yourDeaths += yourDeathsThisTurn;
    enemyDeaths += enemyDeathsThisTurn;

    // Handle forced switches
    if (currentState.getYourActive().fainted) {
      const switchEvent = handleForcedSwitch(currentState, true);
      if (switchEvent) result.events.push(switchEvent);
    }

    if (currentState.getEnemyActive().fainted) {
      const switchEvent = handleForcedSwitch(currentState, false);
      if (switchEvent) result.events.push(switchEvent);
    }

    strategy.push({
      turn: currentState.turnCount,
      action: yourAction,
      events: result.events,
      state: currentState.clone(),
      yourDeathsThisTurn: yourDeathsThisTurn,
      enemyDeathsThisTurn: enemyDeathsThisTurn,
    });
  }

  // Determine risk tier
  const finalYourAlive = currentState.yourTeam.filter((p) => !p.fainted).length;
  const finalEnemyAlive = currentState.enemyTeam.filter(
    (p) => !p.fainted
  ).length;

  const weWin = finalEnemyAlive === 0 && finalYourAlive > 0;
  const weLose = finalYourAlive === 0;

  let riskTier = "";
  if (weLose) {
    riskTier = "⚠️ LOSS RISK - Can lose the battle in worst case";
  } else if (!weWin) {
    riskTier = "⚠️ INCONCLUSIVE - Battle may not complete";
  } else if (yourDeaths === 0) {
    riskTier = "✅ RISKLESS - Perfect, zero deaths even with max bad luck";
  } else {
    // Check if deaths were intentional (would happen in average case too)
    // For now, mark all as "Risky" - we can refine this later
    riskTier = `⚠️ RISKY ${yourDeaths} DEATH${
      yourDeaths > 1 ? "S" : ""
    } - Guaranteed win, possible ${yourDeaths} casualt${
      yourDeaths > 1 ? "ies" : "y"
    }`;
  }

  return {
    strategy: strategy,
    yourDeaths: yourDeaths,
    enemyDeaths: enemyDeaths,
    weWin: weWin,
    weLose: weLose,
    riskTier: riskTier,
    finalState: currentState,
  };
}
