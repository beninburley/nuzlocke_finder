/**
 * Stat Calculator Module
 *
 * This module provides Gen 8 stat calculation formulas for Pokemon.
 * Includes HP calculation, general stat calculation, and full stat calculation
 * for a Pokemon based on base stats, IVs, EVs, level, and nature.
 *
 * @module stat-calculator
 */

import { NATURES } from "../constants/nature-modifiers.js";

/**
 * Calculate HP stat using Gen 8 formula
 * Formula: floor(((2 * Base + IV + floor(EV/4)) * Level) / 100) + Level + 10
 *
 * @param {number} baseStat - Base HP stat
 * @param {number} iv - Individual Value (0-31)
 * @param {number} ev - Effort Value (0-252)
 * @param {number} level - Pokemon level (1-100)
 * @returns {number} - Calculated HP stat
 */
export function calculateHP(baseStat, iv, ev, level) {
  return (
    Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) +
    level +
    10
  );
}

/**
 * Calculate other stats (Attack, Defense, Special Attack, Special Defense, Speed)
 * Formula: floor((floor(((2 * Base + IV + floor(EV/4)) * Level) / 100) + 5) * Nature)
 *
 * @param {number} baseStat - Base stat value
 * @param {number} iv - Individual Value (0-31)
 * @param {number} ev - Effort Value (0-252)
 * @param {number} level - Pokemon level (1-100)
 * @param {number} natureMod - Nature modifier (0.9, 1.0, or 1.1)
 * @returns {number} - Calculated stat value
 */
export function calculateStat(baseStat, iv, ev, level, natureMod) {
  const base =
    Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(base * natureMod);
}

/**
 * Calculate all stats for a Pokemon
 *
 * @param {Object} pokemon - Pokemon object with the following structure:
 * @param {string} [pokemon.nature] - Nature name (e.g., "Adamant", "Jolly")
 * @param {number} [pokemon.level=100] - Pokemon level
 * @param {Object} [pokemon.ivs] - Individual Values (defaults to 31 for all)
 * @param {Object} [pokemon.evs] - Effort Values (defaults to 0 for all)
 * @param {Array<Object>} pokemon.stats - Array of base stat objects with {name, value}
 * @returns {Object} - Object containing all calculated stats: {hp, atk, def, spa, spd, spe}
 */
export function calculateAllStats(pokemon) {
  const nature = NATURES[pokemon.nature?.toLowerCase()] || NATURES.hardy;
  const level = pokemon.level || 100;

  // Get IVs (default to 31)
  const ivs = pokemon.ivs || {
    hp: 31,
    atk: 31,
    def: 31,
    spa: 31,
    spd: 31,
    spe: 31,
  };

  // Get EVs (default to 0)
  const evs = pokemon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  // Get base stats from the pokemon's stats array
  const baseStats = {};
  pokemon.stats.forEach((stat) => {
    const statName = stat.name
      .replace("special-attack", "spa")
      .replace("special-defense", "spd")
      .replace("attack", "atk")
      .replace("defense", "def")
      .replace("speed", "spe");
    baseStats[statName] = stat.value;
  });

  return {
    hp: calculateHP(baseStats.hp, ivs.hp, evs.hp, level),
    atk: calculateStat(baseStats.atk, ivs.atk, evs.atk, level, nature.atk),
    def: calculateStat(baseStats.def, ivs.def, evs.def, level, nature.def),
    spa: calculateStat(baseStats.spa, ivs.spa, evs.spa, level, nature.spa),
    spd: calculateStat(baseStats.spd, ivs.spd, evs.spd, level, nature.spd),
    spe: calculateStat(baseStats.spe, ivs.spe, evs.spe, level, nature.spe),
  };
}
