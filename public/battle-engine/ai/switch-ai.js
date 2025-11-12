/**
 * Switch AI Module
 *
 * This module provides AI logic for evaluating and selecting switch-in Pokemon.
 * Implements a scoring system based on speed, damage potential, and survivability.
 *
 * @module switch-ai
 */

import { calculateDamage } from "../core/damage-calculator.js";

/**
 * Calculate switch-in score for a Pokemon against the enemy active
 *
 * Scoring system:
 * +5: Faster and can OHKO
 * +4: Faster and can 2HKO
 * +3: Faster, survives a hit, deals good damage
 * +2: Slower but can OHKO
 * +1: Slower, survives a hit, deals moderate damage
 *  0: Neutral matchup
 * -1: Slower and gets OHKO'd
 *
 * @param {Object} switchIn - Pokemon considering switching in
 * @param {Object} enemyActive - Current enemy active Pokemon
 * @returns {number} - Score from -1 to +5
 */
export function calculateSwitchInScore(switchIn, enemyActive) {
  if (!switchIn || !enemyActive || switchIn.fainted) {
    return -999; // Invalid switch
  }

  const switchInStats = switchIn.stats;
  const enemyStats = enemyActive.stats;

  // Determine who is faster
  const isFaster = switchInStats.spe > enemyStats.spe;

  // Calculate best damage switch-in can deal to enemy
  let maxDamageToEnemy = 0;
  if (switchIn.moveData && switchIn.moveData.length > 0) {
    switchIn.moveData.forEach((move) => {
      const damage = calculateDamage(
        switchIn,
        enemyActive,
        move,
        switchInStats,
        enemyStats
      );
      maxDamageToEnemy = Math.max(maxDamageToEnemy, damage.max);
    });
  }

  // Calculate best damage enemy can deal to switch-in
  let maxDamageFromEnemy = 0;
  if (enemyActive.moveData && enemyActive.moveData.length > 0) {
    enemyActive.moveData.forEach((move) => {
      const damage = calculateDamage(
        enemyActive,
        switchIn,
        move,
        enemyStats,
        switchInStats
      );
      maxDamageFromEnemy = Math.max(maxDamageFromEnemy, damage.max);
    });
  }

  const canOHKO = maxDamageToEnemy >= enemyActive.currentHP;
  const can2HKO = maxDamageToEnemy * 2 >= enemyActive.currentHP;
  const getsOHKOd = maxDamageFromEnemy >= switchIn.currentHP;
  const survivesHit = !getsOHKOd;
  const damagePercent = (maxDamageToEnemy / enemyActive.currentHP) * 100;

  // Apply scoring system
  if (isFaster && canOHKO) return 5;
  if (isFaster && can2HKO) return 4;
  if (isFaster && survivesHit && damagePercent > 30) return 3;
  if (!isFaster && canOHKO) return 2;
  if (!isFaster && survivesHit && damagePercent > 20) return 1;
  if (!isFaster && getsOHKOd) return -1;

  return 0; // Neutral matchup
}

/**
 * Find best switch-in from team
 *
 * Evaluates all non-fainted, non-active Pokemon on the team and selects
 * the one with the highest switch-in score against the opponent.
 *
 * @param {Array} team - Team of Pokemon
 * @param {number} currentActiveIndex - Current active Pokemon index
 * @param {Object} enemyActive - Enemy active Pokemon
 * @returns {Object} - {index, score, pokemon} of best switch
 */
export function findBestSwitchIn(team, currentActiveIndex, enemyActive) {
  let bestScore = -999;
  let bestIndex = -1;
  let bestPokemon = null;

  team.forEach((pokemon, index) => {
    if (index === currentActiveIndex || pokemon.fainted) return;

    const score = calculateSwitchInScore(pokemon, enemyActive);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
      bestPokemon = pokemon;
    }
  });

  return { index: bestIndex, score: bestScore, pokemon: bestPokemon };
}
