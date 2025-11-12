/**
 * Damage Calculator Module
 *
 * This module provides Gen 8 damage calculation formulas for Pokemon battles.
 * Includes normal damage calculation and worst-case damage calculation for risk analysis.
 *
 * @module damage-calculator
 */

import { getTypeEffectiveness } from "./type-effectiveness.js";

/**
 * Calculate damage for a move using Gen 8 formula
 * Formula: ((((2 * Level / 5 + 2) * Power * A / D) / 50) + 2) * Modifiers
 * Modifiers: STAB, Type Effectiveness, Random (0.85-1.0)
 *
 * @param {Object} attacker - Attacking Pokemon object
 * @param {Object} defender - Defending Pokemon object
 * @param {Object} move - Move object with power, type, and damageClass
 * @param {Object} attackerStats - Calculated stats for attacker {hp, atk, def, spa, spd, spe}
 * @param {Object} defenderStats - Calculated stats for defender {hp, atk, def, spa, spd, spe}
 * @returns {Object} Damage calculation result:
 *   - min: Minimum damage (with 85% roll)
 *   - max: Maximum damage (with 100% roll)
 *   - average: Average damage
 *   - effectiveness: Type effectiveness multiplier
 *   - isStab: Whether STAB bonus applies
 */
export function calculateDamage(
  attacker,
  defender,
  move,
  attackerStats,
  defenderStats
) {
  // Check if move data is available
  if (!move.power || move.power === 0) {
    return { min: 0, max: 0, average: 0 };
  }

  const level = attacker.level || 100;
  const power = move.power;

  // Determine if physical or special
  const isPhysical = move.damageClass === "physical";
  const attackStat = isPhysical ? attackerStats.atk : attackerStats.spa;
  const defenseStat = isPhysical ? defenderStats.def : defenderStats.spd;

  // Base damage calculation
  const baseDamage = Math.floor(
    (Math.floor((2 * level) / 5 + 2) * power * attackStat) / defenseStat / 50 +
      2
  );

  // STAB (Same Type Attack Bonus) - 1.5x if move type matches attacker type
  let stab = 1;
  if (attacker.types.includes(move.type)) {
    stab = 1.5;
  }

  // Type effectiveness
  const effectiveness = getTypeEffectiveness(move.type, defender.types);

  // Random multiplier (85% - 100%)
  const minRandom = 0.85;
  const maxRandom = 1.0;

  const minDamage = Math.floor(baseDamage * stab * effectiveness * minRandom);
  const maxDamage = Math.floor(baseDamage * stab * effectiveness * maxRandom);
  const avgDamage = Math.floor((minDamage + maxDamage) / 2);

  return {
    min: minDamage,
    max: maxDamage,
    average: avgDamage,
    effectiveness: effectiveness,
    isStab: stab > 1,
  };
}

/**
 * Calculate worst-case damage (for risk analysis in battle simulations)
 *
 * Uses pessimistic assumptions:
 * - Enemy attacks: Always crit (1.5x) + max damage roll
 * - Player attacks: Always min damage roll, no crit
 *
 * This conservative approach ensures the battle simulator doesn't underestimate risks.
 *
 * @param {Object} attacker - Attacking Pokemon
 * @param {Object} defender - Defending Pokemon
 * @param {Object} move - Move being used
 * @param {Object} attackerStats - Attacker's stats
 * @param {Object} defenderStats - Defender's stats
 * @param {boolean} isPlayerAttacking - True if player is attacking, false if enemy is attacking
 * @returns {number} - Worst case damage value
 */
export function calculateWorstCaseDamage(
  attacker,
  defender,
  move,
  attackerStats,
  defenderStats,
  isPlayerAttacking
) {
  const normalDamage = calculateDamage(
    attacker,
    defender,
    move,
    attackerStats,
    defenderStats
  );

  if (isPlayerAttacking) {
    // Player attacking: minimum damage roll
    return normalDamage.min;
  } else {
    // Enemy attacking: maximum damage + crit (1.5x multiplier)
    const critMultiplier = 1.5;
    return Math.floor(normalDamage.max * critMultiplier);
  }
}
