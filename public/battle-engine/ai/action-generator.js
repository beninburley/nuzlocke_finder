/**
 * Action Generator Module
 *
 * This module generates all possible actions (moves and switches) available
 * to a player or AI in the current battle state.
 *
 * @module action-generator
 */

/**
 * Generate all possible actions for a player or AI
 *
 * Creates an array of possible actions including:
 * - All available moves (up to 4)
 * - All available switches (to non-fainted, non-active Pokemon)
 *
 * @param {BattleState} state - Current battle state
 * @param {boolean} isPlayer - True for player actions, false for enemy actions
 * @returns {Array<Object>} - Array of action objects {type, move/pokemon, moveIndex/switchToIndex}
 */
export function generatePossibleActions(state, isPlayer) {
  const actions = [];
  const team = isPlayer ? state.yourTeam : state.enemyTeam;
  const activeIndex = isPlayer ? state.yourActiveIndex : state.enemyActiveIndex;
  const activePokemon = team[activeIndex];

  // Move actions (up to 4)
  if (activePokemon.moveData) {
    activePokemon.moveData.forEach((move, moveIndex) => {
      actions.push({
        type: "move",
        moveIndex: moveIndex,
        move: move,
        pokemon: activePokemon,
      });
    });
  }

  // Switch actions (up to 5 - all non-fainted, non-active Pokemon)
  team.forEach((pokemon, index) => {
    if (index !== activeIndex && !pokemon.fainted) {
      actions.push({
        type: "switch",
        switchToIndex: index,
        pokemon: pokemon,
      });
    }
  });

  return actions;
}
