/**
 * Position Evaluator Module
 *
 * This module evaluates battle positions and assigns numerical scores.
 * Used by AI lookahead to determine the best course of action.
 *
 * @module position-evaluator
 */

import { calculateDamage } from "../core/damage-calculator.js";
import { calculateSwitchInScore } from "../ai/switch-ai.js";

/**
 * Evaluate a battle position and return a numerical score
 *
 * Scoring priorities (highest to lowest):
 * 1. Pokemon count difference (5000 per Pokemon)
 * 2. Guaranteed KO opportunities (+10,000)
 * 3. Enemy can KO us (-3000)
 * 4. Total HP percentage (500)
 * 5. Current matchup quality (100)
 *
 * Returns a score where:
 * - Positive = advantage for player
 * - Negative = advantage for enemy
 * - Magnitude indicates strength of advantage
 *
 * @param {BattleState} state - Battle state to evaluate
 * @returns {number} - Position score
 */
export function evaluatePosition(state) {
  let score = 0;

  // Count alive Pokemon
  const yourAlive = state.yourTeam.filter((p) => !p.fainted).length;
  const enemyAlive = state.enemyTeam.filter((p) => !p.fainted).length;

  // MASSIVE weight on Pokemon count (winning condition)
  score += (yourAlive - enemyAlive) * 5000;

  // Check for immediate KO opportunities - this should be HIGHEST priority
  if (yourAlive > 0 && enemyAlive > 0) {
    const yourActive = state.getYourActive();
    const enemyActive = state.getEnemyActive();

    if (!yourActive.fainted && !enemyActive.fainted && yourActive.moveData) {
      // Check if we can KO the enemy THIS TURN
      let canKOEnemy = false;
      let minDamageToKO = Infinity;

      yourActive.moveData.forEach((move) => {
        if (move.damageClass !== "status") {
          const yourStats = yourActive.stats;
          const enemyStats = enemyActive.stats;

          const damage = calculateDamage(
            yourActive,
            enemyActive,
            move,
            yourStats,
            enemyStats
          );

          // Check if minimum damage can KO
          if (damage.min >= enemyActive.currentHP) {
            canKOEnemy = true;
            minDamageToKO = Math.min(minDamageToKO, damage.min);
          }
        }
      });

      // HUGE bonus for guaranteed KO - this should override almost everything
      if (canKOEnemy) {
        score += 10000;
      }

      // Check if enemy can KO us - HUGE penalty
      if (enemyActive.moveData) {
        let enemyCanKO = false;

        enemyActive.moveData.forEach((move) => {
          if (move.damageClass !== "status") {
            const yourStats = yourActive.stats;
            const enemyStats = enemyActive.stats;

            const damage = calculateDamage(
              enemyActive,
              yourActive,
              move,
              enemyStats,
              yourStats
            );

            // Include crit damage in calculation (1.5x)
            const critDamage = Math.floor(damage.max * 1.5);

            if (
              damage.max >= yourActive.currentHP ||
              critDamage >= yourActive.currentHP
            ) {
              enemyCanKO = true;
            }
          }
        });

        // Penalty for being in KO range (but not as bad as missing a KO opportunity)
        if (enemyCanKO) {
          score -= 3000;
        }
      }
    }
  }

  // Calculate total HP percentage
  let yourTotalHP = 0;
  let yourMaxHP = 0;
  let enemyTotalHP = 0;
  let enemyMaxHP = 0;

  state.yourTeam.forEach((p) => {
    yourTotalHP += p.currentHP;
    yourMaxHP += p.stats.hp;
  });

  state.enemyTeam.forEach((p) => {
    enemyTotalHP += p.currentHP;
    enemyMaxHP += p.stats.hp;
  });

  const yourHPPercent = yourMaxHP > 0 ? yourTotalHP / yourMaxHP : 0;
  const enemyHPPercent = enemyMaxHP > 0 ? enemyTotalHP / enemyMaxHP : 0;

  // Weight HP advantage (much less than KO opportunities)
  score += (yourHPPercent - enemyHPPercent) * 500;

  // Evaluate current matchup (minor factor)
  if (yourAlive > 0 && enemyAlive > 0) {
    const yourActive = state.getYourActive();
    const enemyActive = state.getEnemyActive();

    if (!yourActive.fainted && !enemyActive.fainted) {
      const matchupScore = calculateSwitchInScore(yourActive, enemyActive);
      score += matchupScore * 100;
    }
  }

  return score;
}
