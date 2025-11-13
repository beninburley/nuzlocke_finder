/**
 * Switch Handler
 * Handles forced switches after Pokemon faints
 */

import { findBestSwitchIn } from "../ai/switch-ai.js";
import { capitalize } from "../ui/battle-formatter.js";

/**
 * Handle forced switch after a Pokemon faints
 * @param {BattleState} state - Current battle state
 * @param {boolean} isPlayer - True if player's Pokemon fainted
 * @returns {Object|null} - Switch event or null if no available Pokemon
 */
export function handleForcedSwitch(state, isPlayer) {
  const team = isPlayer ? state.yourTeam : state.enemyTeam;
  const currentIndex = isPlayer
    ? state.yourActiveIndex
    : state.enemyActiveIndex;
  const opponent = isPlayer ? state.getEnemyActive() : state.getYourActive();

  let nextIndex = -1;

  if (isPlayer) {
    // Player: just find first non-fainted Pokemon
    for (let i = 0; i < team.length; i++) {
      if (i !== currentIndex && !team[i].fainted) {
        nextIndex = i;
        break;
      }
    }
  } else {
    // Enemy: use switch-in scoring to pick best matchup
    const bestSwitch = findBestSwitchIn(team, currentIndex, opponent);
    nextIndex = bestSwitch.index;
  }

  if (nextIndex === -1) {
    return null; // No Pokemon available
  }

  // Update active index
  if (isPlayer) {
    state.yourActiveIndex = nextIndex;
  } else {
    state.enemyActiveIndex = nextIndex;
  }

  return {
    type: "switch",
    isPlayer: isPlayer,
    pokemon: team[nextIndex],
    text: `${isPlayer ? "You" : "Enemy"} sent out ${capitalize(
      team[nextIndex].name
    )}!`,
  };
}
