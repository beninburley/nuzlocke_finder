/**
 * Battle State Module
 *
 * This module defines the BattleState class which manages all battle state data
 * including team rosters, active Pokemon, HP tracking, status conditions, field effects,
 * and turn counting. The BattleState serves as the core data structure for battle simulations.
 *
 * @module BattleState
 */

import { calculateAllStats } from "./stat-calculator.js";

/**
 * BattleState class - Manages complete battle state
 *
 * Tracks all relevant battle information including:
 * - Both teams with calculated stats
 * - Current HP and fainted status
 * - Status conditions (sleep, paralysis, burn, etc.)
 * - Active Pokemon indices
 * - Field effects (weather, terrain, hazards)
 * - Turn counter
 */
export class BattleState {
  /**
   * Create a new battle state
   *
   * @param {Array<Object>} yourTeam - Player's team of Pokemon
   * @param {Array<Object>} enemyTeam - Enemy's team of Pokemon
   * @param {number} yourLeadIndex - Index of player's starting Pokemon
   * @param {number} enemyLeadIndex - Index of enemy's starting Pokemon
   */
  constructor(yourTeam, enemyTeam, yourLeadIndex, enemyLeadIndex) {
    this.yourTeam = yourTeam.map((p) => ({
      ...p,
      stats: calculateAllStats(p),
      currentHP: null, // Will be set after stats are calculated
      fainted: false,
      status: null, // 'sleep', 'paralysis', 'burn', 'poison', 'freeze', 'toxic'
      statusCounter: 0, // For sleep (1-3 turns), toxic counter, etc.
      confusion: 0, // Confusion turns remaining (1-4)
      hasSubstitute: false, // Substitute active
    }));

    this.enemyTeam = enemyTeam.map((p) => ({
      ...p,
      stats: calculateAllStats(p),
      currentHP: null,
      fainted: false,
      status: null,
      statusCounter: 0,
      confusion: 0,
      hasSubstitute: false,
    }));

    // Set current HP to max HP
    this.yourTeam.forEach((p) => (p.currentHP = p.stats.hp));
    this.enemyTeam.forEach((p) => (p.currentHP = p.stats.hp));

    this.yourActiveIndex = yourLeadIndex;
    this.enemyActiveIndex = enemyLeadIndex;

    this.fieldEffects = {
      weather: null, // sun, rain, sandstorm, hail
      terrain: null, // electric, grassy, misty, psychic
      yourHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0 },
      enemyHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0 },
    };

    this.turnCount = 0;
  }

  /**
   * Get the currently active player Pokemon
   * @returns {Object} - Active Pokemon object
   */
  getYourActive() {
    return this.yourTeam[this.yourActiveIndex];
  }

  /**
   * Get the currently active enemy Pokemon
   * @returns {Object} - Active Pokemon object
   */
  getEnemyActive() {
    return this.enemyTeam[this.enemyActiveIndex];
  }

  /**
   * Create a deep copy of the battle state
   * Used for simulating potential future game states without modifying the original
   *
   * @returns {BattleState} - Cloned battle state
   */
  clone() {
    const cloned = new BattleState([], [], 0, 0);
    cloned.yourTeam = JSON.parse(JSON.stringify(this.yourTeam));
    cloned.enemyTeam = JSON.parse(JSON.stringify(this.enemyTeam));
    cloned.yourActiveIndex = this.yourActiveIndex;
    cloned.enemyActiveIndex = this.enemyActiveIndex;
    cloned.fieldEffects = JSON.parse(JSON.stringify(this.fieldEffects));
    cloned.turnCount = this.turnCount;
    return cloned;
  }
}
