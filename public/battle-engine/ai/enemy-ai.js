/**
 * Enemy AI Module
 *
 * This module implements the "Run & Bun" AI system for enemy move selection.
 * Uses probability-based scoring to simulate realistic trainer AI behavior.
 *
 * @module enemy-ai
 */

import { calculateDamage } from "../core/damage-calculator.js";
import { generatePossibleActions } from "./action-generator.js";

/**
 * Enemy AI: Select action based on Run & Bun AI scoring system
 *
 * Implements probability-based move scoring:
 * - Status moves: +6
 * - Highest damage move: +6 (80%) or +8 (20%)
 * - Kill bonus (fast): +6
 * - Kill bonus (slow): +3
 * - Priority move when threatened: +11
 * - Moxie/Beast Boost: +1
 * - High crit + super effective: +1 (50% chance)
 *
 * Enemy NEVER switches voluntarily (only on faints via handleForcedSwitch).
 *
 * @param {BattleState} state - Current state
 * @returns {Object} - Selected action
 */
export function selectEnemyAction(state) {
  const enemyActive = state.getEnemyActive();
  const yourActive = state.getYourActive();
  const actions = generatePossibleActions(state, false);

  if (actions.length === 0) return null;

  // Enemy NEVER switches voluntarily - only uses moves
  // (Forced switches after fainting are handled separately by handleForcedSwitch)
  const moveActions = actions.filter((a) => a.type === "move");

  if (moveActions.length === 0) {
    // No moves available (shouldn't happen in normal gameplay)
    return null;
  }

  // Check if AI is slower and gets killed by player (for priority move bonus)
  const enemyIsFaster = enemyActive.stats.spe >= yourActive.stats.spe; // AI sees ties as faster
  let aiDiestoPlayer = false;

  if (!enemyIsFaster && yourActive.moveData) {
    yourActive.moveData.forEach((move) => {
      if (move.damageClass !== "status") {
        const damage = calculateDamage(
          yourActive,
          enemyActive,
          move,
          yourActive.stats,
          enemyActive.stats
        );
        if (damage.average >= enemyActive.currentHP) {
          aiDiestoPlayer = true;
        }
      }
    });
  }

  // Calculate scores for each move according to Run & Bun AI specification
  const moveScores = moveActions.map((action) => {
    let score = 0;
    let rolledDamage = 0;

    if (action.move.damageClass === "status") {
      // Status moves default to +6
      score = 6;
    } else {
      // Damaging moves: calculate damage range
      const damage = calculateDamage(
        enemyActive,
        yourActive,
        action.move,
        enemyActive.stats,
        yourActive.stats
      );

      // AI rolls a random damage value between min and max (16 possible rolls)
      // This simulates the 85%-100% random multiplier in damage calculation
      const damageRange = damage.max - damage.min;
      const roll = Math.floor(Math.random() * 16); // 0-15
      rolledDamage = damage.min + Math.floor((damageRange * roll) / 15);

      // Store both damage info and rolled value
      action._damageInfo = damage;
      action._rolledDamage = rolledDamage;
      score = 0; // Will be set if this is highest rolled damage move
    }

    return { action, score, rolledDamage, damageInfo: action._damageInfo };
  });

  // Find highest rolled damage value(s)
  // All moves that rolled the same highest damage get the "highest damage" score
  let maxRolledDamage = -1;
  moveScores.forEach((ms) => {
    if (ms.rolledDamage > maxRolledDamage) {
      maxRolledDamage = ms.rolledDamage;
    }
  });

  // Assign scores to moves
  moveScores.forEach((ms) => {
    if (ms.damageInfo) {
      const isHighestDamage =
        ms.rolledDamage === maxRolledDamage && maxRolledDamage > 0;
      const moveKills = ms.rolledDamage >= yourActive.currentHP;
      const hasPriority =
        ms.action.move.priority && ms.action.move.priority > 0;

      if (isHighestDamage) {
        // Highest damaging move (by rolled damage): +6 (80%), +8 (20%)
        ms.score = Math.random() < 0.8 ? 6 : 8;
      }

      if (moveKills) {
        // Kill bonus
        if (enemyIsFaster || (!enemyIsFaster && hasPriority)) {
          // Fast kill (AI faster OR has priority while slower): additional +6
          ms.score += 6;
        } else {
          // Slow kill (AI slower, no priority): additional +3
          ms.score += 3;
        }

        // Moxie/Beast Boost/Chilling Neigh/Grim Neigh bonus
        const boostAbilities = [
          "moxie",
          "beast-boost",
          "chilling-neigh",
          "grim-neigh",
        ];
        if (
          enemyActive.ability &&
          boostAbilities.includes(enemyActive.ability.toLowerCase())
        ) {
          ms.score += 1;
        }
      }

      // Priority move bonus: If AI is slower and dead to player, priority moves get +11
      if (hasPriority && aiDiestoPlayer && !enemyIsFaster) {
        ms.score += 11;
      }

      // High crit chance + Super Effective bonus: +1 (50% chance)
      const highCritMoves = [
        "stone-edge",
        "shadow-claw",
        "razor-leaf",
        "crabhammer",
        "slash",
        "cross-poison",
        "night-slash",
        "spacial-rend",
        "attack-order",
        "leaf-blade",
        "psycho-cut",
        "blaze-kick",
      ];
      const hasHighCrit =
        highCritMoves.includes(ms.action.move.name.toLowerCase()) ||
        (ms.action.move.name &&
          ms.action.move.name.toLowerCase().includes("crit"));
      const isSuperEffective = ms.damageInfo.effectiveness > 1;

      if (hasHighCrit && isSuperEffective && Math.random() < 0.5) {
        ms.score += 1;
      }
    }
  });

  // Find all moves with highest score
  const maxScore = Math.max(...moveScores.map((ms) => ms.score));
  const bestMoves = moveScores.filter((ms) => ms.score === maxScore);

  // Randomly select from moves with highest score
  const selected = bestMoves[Math.floor(Math.random() * bestMoves.length)];

  return selected.action;
}
