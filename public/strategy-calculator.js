// ============================================================================
// IMPORTS
// ============================================================================

import { TYPE_CHART } from "./battle-engine/constants/type-chart.js";
import { NATURES } from "./battle-engine/constants/nature-modifiers.js";
import {
  calculateHP,
  calculateStat,
  calculateAllStats,
} from "./battle-engine/core/stat-calculator.js";
import { getTypeEffectiveness } from "./battle-engine/core/type-effectiveness.js";
import {
  calculateDamage,
  calculateWorstCaseDamage,
} from "./battle-engine/core/damage-calculator.js";
import { BattleState } from "./battle-engine/core/BattleState.js";
import {
  applyStatusEffect,
  canPokemonMove,
  applyEndOfTurnStatus,
} from "./battle-engine/simulation/status-effects.js";
import {
  simulateTurnWorstCase,
  simulateTurn,
} from "./battle-engine/simulation/turn-simulator.js";
import {
  calculateSwitchInScore,
  findBestSwitchIn,
} from "./battle-engine/ai/switch-ai.js";
import { generatePossibleActions } from "./battle-engine/ai/action-generator.js";
import { selectEnemyAction } from "./battle-engine/ai/enemy-ai.js";
import { findBestActionWithLookahead } from "./battle-engine/ai/lookahead-ai.js";
import { evaluatePosition } from "./battle-engine/strategy/position-evaluator.js";
import { explainAction } from "./battle-engine/strategy/action-explainer.js";
import {
  fetchMoveData,
  loadAllMoveData,
  attachMoveData,
} from "./battle-engine/data/move-fetcher.js";
import {
  capitalize,
  displayTeams,
  displayBattleState,
  showError,
  hideError,
  showLoading,
  hideLoading,
} from "./battle-engine/ui/battle-formatter.js";
import { displayStrategyResults } from "./battle-engine/ui/strategy-display.js";
import { calculateWorstCaseStrategy } from "./battle-engine/simulation/scenario-calculator.js";
import { handleForcedSwitch } from "./battle-engine/simulation/switch-handler.js";
import { calculateActionRisk } from "./battle-engine/strategy/risk-calculator.js";
import { findOptimalStrategy } from "./battle-engine/strategy/strategy-optimizer.js";

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let yourTeam = [];
let enemyTeam = [];
let yourLeadIndex = null;
let enemyLeadIndex = null;

// ============================================================================
// DATA LOADING AND INITIALIZATION
// ============================================================================

/**
 * Load team data from localStorage
 */
function loadTeamData() {
  const yourTeamJSON = localStorage.getItem("pokemonTeam");
  const enemyTeamJSON = localStorage.getItem("enemyTeam");

  if (yourTeamJSON) {
    const rawYourTeam = JSON.parse(yourTeamJSON);
    yourTeam = rawYourTeam.filter((p) => p !== null);
  }

  if (enemyTeamJSON) {
    const rawEnemyTeam = JSON.parse(enemyTeamJSON);
    enemyTeam = rawEnemyTeam.filter((p) => p !== null);
  }

  // Validate teams
  if (yourTeam.length === 0 && enemyTeam.length === 0) {
    showError("No teams found! Please build teams in the Team Builder first.");
    return false;
  }

  if (yourTeam.length === 0) {
    showError(
      "Your team is empty! Please build your team in the Team Builder first."
    );
    return false;
  }

  if (enemyTeam.length === 0) {
    showError(
      "Enemy team is empty! Please add an enemy team in the Team Builder first."
    );
    return false;
  }

  return true;
}

// ============================================================================
// MAIN EVENT HANDLER
// ============================================================================

/**
 * Main event handler for calculating strategy
 */
document
  .getElementById("calculateBtn")
  .addEventListener("click", calculateStrategy);

async function calculateStrategy() {
  hideError();

  // Get selected leads
  yourLeadIndex = parseInt(document.getElementById("leadSelect").value);
  enemyLeadIndex = parseInt(document.getElementById("enemyLeadSelect").value);

  if (isNaN(yourLeadIndex) || isNaN(enemyLeadIndex)) {
    showError("Please select lead Pokémon for both teams!");
    return;
  }

  showLoading();

  try {
    // Step 1: Load all move data
    console.log("Loading move data...");
    const moveDataMap = await loadAllMoveData(yourTeam, enemyTeam);

    // Step 2: Attach move data to all Pokemon
    [...yourTeam, ...enemyTeam].forEach((pokemon) => {
      attachMoveData(pokemon, moveDataMap);
    });

    // Step 3: Initialize battle state
    console.log("Initializing battle state...");
    const initialState = new BattleState(
      yourTeam,
      enemyTeam,
      yourLeadIndex,
      enemyLeadIndex
    );

    // Display initial battle state
    displayBattleState(initialState);

    // Step 4: Run optimized battle simulation with lookahead
    console.log("Running optimized battle simulation with lookahead...");

    const strategy = findOptimalStrategy(
      initialState,
      20,
      calculateActionRisk,
      handleForcedSwitch
    );

    // Step 4.5: Run worst-case scenario analysis
    console.log("Running worst-case scenario analysis...");
    const worstCase = calculateWorstCaseStrategy(
      initialState,
      20,
      handleForcedSwitch
    );

    // Convert strategy to timeline format
    const timeline = strategy.map((step) => {
      const action = step.action;
      const actionText =
        action.type === "move"
          ? `Use ${capitalize(action.move.name)}`
          : `Switch to ${capitalize(action.pokemon.name)}`;

      const reasoningText = step.reasoning
        ? `<p style="background: #2d3748; padding: 8px; border-left: 3px solid #4299e1; margin: 5px 0;"><strong style="color: #4299e1;">Why this action?</strong><br>${step.reasoning}</p>`
        : "";

      const riskReasons =
        step.risk.reasons.length > 0
          ? `<p><strong>Risks:</strong> ${step.risk.reasons.join(", ")}</p>`
          : "";

      return {
        turn: step.turn,
        action: actionText,
        details:
          reasoningText +
          step.events.map((e) => `<p>${e.text}</p>`).join("") +
          riskReasons,
        risk: step.risk.level,
        critRisks: step.risk.critRisks || [],
        statusRisks: step.risk.statusRisks || [],
        aiMoveAnalysis: step.risk.aiMoveAnalysis || {},
      };
    });

    // Convert worst-case strategy to timeline format
    const worstCaseTimeline = worstCase.strategy.map((step) => {
      const action = step.action;
      const actionText =
        action.type === "move"
          ? `Use ${capitalize(action.move.name)}`
          : `Switch to ${capitalize(action.pokemon.name)}`;

      let deathText = "";
      if (step.yourDeathsThisTurn > 0) {
        deathText = `<p style="color: #d32f2f; font-weight: bold;">💀 ${step.yourDeathsThisTurn} of your Pokémon fainted this turn!</p>`;
      }

      return {
        turn: step.turn,
        action: actionText,
        details:
          step.events.map((e) => `<p>${e.text}</p>`).join("") + deathText,
        risk: "worst-case",
      };
    });

    // Get final state
    const currentState =
      strategy.length > 0 ? strategy[strategy.length - 1].state : initialState;

    // Display final battle state
    displayBattleState(currentState);

    // Step 5: Analyze results
    const yourAlive = currentState.yourTeam.filter((p) => !p.fainted).length;
    const enemyAlive = currentState.enemyTeam.filter((p) => !p.fainted).length;
    const yourDeaths = currentState.yourTeam.filter((p) => p.fainted).length;

    let riskLevel = "Low";
    if (yourDeaths >= 3) riskLevel = "High";
    else if (yourDeaths >= 1) riskLevel = "Medium";

    const analysis = {
      riskLevel: riskLevel,
      expectedDeaths: yourDeaths,
      turnCount: currentState.turnCount,
      victory: enemyAlive === 0,
      worstCaseDeaths: worstCase.yourDeaths,
      worstCaseWin: worstCase.weWin,
      worstCaseLoss: worstCase.weLose,
      worstCaseTier: worstCase.riskTier,
    };

    // Display results with both timelines
    displayStrategyResults(timeline, analysis, worstCaseTimeline);

    hideLoading();

    console.log("Strategy calculation complete!");
  } catch (error) {
    hideLoading();
    console.error("Error calculating strategy:", error);
    showError(`Error calculating strategy: ${error.message}`);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener("DOMContentLoaded", () => {
  if (loadTeamData()) {
    displayTeams(yourTeam, enemyTeam);
  }
});
