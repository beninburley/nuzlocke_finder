/**
 * Type Effectiveness Module
 *
 * This module provides type effectiveness calculations for Pokemon battles.
 * Determines damage multipliers based on attacking move type and defending Pokemon types.
 *
 * @module type-effectiveness
 */

import { TYPE_CHART } from "../constants/type-chart.js";

/**
 * Get type effectiveness multiplier for a move against a defender
 *
 * Calculates the cumulative type effectiveness by checking the move type
 * against each of the defender's types. For dual-type Pokemon, multipliers
 * are multiplied together.
 *
 * @param {string} moveType - Type of the attacking move (e.g., "fire", "water")
 * @param {Array<string>} defenderTypes - Array of defending Pokemon's types
 * @returns {number} - Effectiveness multiplier (0, 0.25, 0.5, 1, 2, or 4)
 *
 * @example
 * // Fire move vs Water/Ground Pokemon
 * getTypeEffectiveness("fire", ["water", "ground"]) // Returns 0.25 (0.5 * 0.5)
 *
 * @example
 * // Electric move vs Water/Flying Pokemon
 * getTypeEffectiveness("electric", ["water", "flying"]) // Returns 4 (2 * 2)
 */
export function getTypeEffectiveness(moveType, defenderTypes) {
  let multiplier = 1;

  defenderTypes.forEach((defenderType) => {
    const matchup = TYPE_CHART[moveType]?.[defenderType];
    if (matchup !== undefined) {
      multiplier *= matchup;
    }
  });

  return multiplier;
}
