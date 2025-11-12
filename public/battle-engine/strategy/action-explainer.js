/**
 * Action Explainer Module
 *
 * This module generates human-readable explanations for why specific actions
 * were chosen, helping players understand the strategy calculator's decisions.
 *
 * @module action-explainer
 */

import { calculateDamage } from "../core/damage-calculator.js";
import { calculateSwitchInScore } from "../ai/switch-ai.js";

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Explain why an action was chosen
 *
 * Generates context-aware explanations for:
 * - Switch-ins (matchup quality, defensive/offensive reasons)
 * - Damaging moves (KO potential, chip damage)
 * - Status moves (specific effects and targets)
 *
 * Only generates explanations for player actions.
 *
 * @param {BattleState} state - Current battle state
 * @param {Object} action - Action being taken {type, move/pokemon, ...}
 * @param {boolean} isPlayer - True if player action (only explains player actions)
 * @returns {string} - Explanation text with emoji indicators
 */
export function explainAction(state, action, isPlayer) {
  if (!isPlayer) return ""; // Only explain player actions

  const yourActive = state.getYourActive();
  const enemyActive = state.getEnemyActive();

  if (action.type === "switch") {
    const switchTarget = action.pokemon;
    const matchupScore = calculateSwitchInScore(switchTarget, enemyActive);

    if (matchupScore >= 4) {
      return `💡 Switching to ${capitalize(
        switchTarget.name
      )} for a favorable matchup (faster and can 2HKO+)`;
    } else if (matchupScore >= 2) {
      return `💡 Switching to ${capitalize(
        switchTarget.name
      )} for better positioning`;
    } else if (matchupScore <= -1) {
      return `⚠️ Defensive switch to ${capitalize(
        switchTarget.name
      )} to avoid OHKO`;
    } else {
      return `Switching to ${capitalize(switchTarget.name)}`;
    }
  } else if (action.type === "move" && action.move.damageClass !== "status") {
    // Check if this move secures a KO
    const yourStats = yourActive.stats;
    const enemyStats = enemyActive.stats;
    const damage = calculateDamage(
      yourActive,
      enemyActive,
      action.move,
      yourStats,
      enemyStats
    );

    if (damage.min >= enemyActive.currentHP) {
      return `✅ GUARANTEED KO - ${capitalize(action.move.name)} deals ${
        damage.min
      }-${damage.max} damage vs ${enemyActive.currentHP} HP`;
    } else if (damage.average >= enemyActive.currentHP) {
      return `🎯 LIKELY KO - ${capitalize(
        action.move.name
      )} averages ${Math.floor(damage.average)} damage vs ${
        enemyActive.currentHP
      } HP`;
    } else if (damage.max >= enemyActive.currentHP) {
      return `🎲 POSSIBLE KO - ${capitalize(action.move.name)} max rolls ${
        damage.max
      } vs ${enemyActive.currentHP} HP`;
    } else {
      const damagePercent = Math.floor(
        (damage.average / enemyActive.currentHP) * 100
      );
      return `📊 Chip damage - ${capitalize(
        action.move.name
      )} deals ~${damagePercent}% (${Math.floor(damage.average)} damage)`;
    }
  } else if (action.type === "move") {
    // Status move
    const moveName = action.move.name.toLowerCase();
    if (
      moveName === "hypnosis" ||
      moveName === "sleep-powder" ||
      moveName === "spore"
    ) {
      return `💤 Status move - Putting ${capitalize(
        enemyActive.name
      )} to sleep`;
    } else if (moveName === "thunder-wave" || moveName === "stun-spore") {
      return `⚡ Status move - Paralyzing ${capitalize(
        enemyActive.name
      )} (speed cut, 25% para chance)`;
    } else if (moveName === "will-o-wisp") {
      return `🔥 Status move - Burning ${capitalize(
        enemyActive.name
      )} (halves attack)`;
    } else if (moveName === "toxic") {
      return `☠️ Status move - Badly poisoning ${capitalize(
        enemyActive.name
      )} (increasing damage)`;
    } else {
      return `Using ${capitalize(action.move.name)}`;
    }
  }

  return "";
}
