/**
 * Move Data Fetching Module
 * Handles fetching and caching move data from the PokeAPI
 */

/**
 * Fetch move data from API
 * @param {string} moveName - Name of the move
 * @returns {Promise<Object>} - Move data including power, type, accuracy, damageClass
 */
export async function fetchMoveData(moveName) {
  if (!moveName) return null;

  try {
    const response = await fetch(
      `/api/move/${moveName.toLowerCase().replace(/\s+/g, "-")}`
    );

    if (!response.ok) {
      console.warn(`Move not found: ${moveName}`);
      return null;
    }

    const moveData = await response.json();
    return moveData;
  } catch (error) {
    console.error(`Error fetching move ${moveName}:`, error);
    return null;
  }
}

/**
 * Load all move data for both teams
 * @param {Array} yourTeam - Your team array
 * @param {Array} enemyTeam - Enemy team array
 * @returns {Promise<Object>} - Object with move data for all moves
 */
export async function loadAllMoveData(yourTeam, enemyTeam) {
  const allMoves = new Set();

  // Collect all unique move names from both teams
  [...yourTeam, ...enemyTeam].forEach((pokemon) => {
    if (pokemon && pokemon.moves) {
      pokemon.moves.forEach((move) => {
        if (move && move.trim()) {
          allMoves.add(move.toLowerCase().trim());
        }
      });
    }
  });

  // Fetch all move data in parallel
  const moveDataMap = {};
  const fetchPromises = Array.from(allMoves).map(async (moveName) => {
    const data = await fetchMoveData(moveName);
    if (data) {
      moveDataMap[moveName] = data;
    }
  });

  await Promise.all(fetchPromises);

  console.log(`Loaded ${Object.keys(moveDataMap).length} moves from API`);
  return moveDataMap;
}

/**
 * Attach move data to Pokemon
 * @param {Object} pokemon - Pokemon object
 * @param {Object} moveDataMap - Map of move names to move data
 */
export function attachMoveData(pokemon, moveDataMap) {
  if (!pokemon || !pokemon.moves) return;

  pokemon.moveData = pokemon.moves
    .filter((move) => move && move.trim())
    .map((moveName) => {
      const normalizedName = moveName.toLowerCase().trim();
      const data = moveDataMap[normalizedName];

      if (!data) {
        console.warn(`No data found for move: ${moveName}`);
        return {
          name: moveName,
          type: "normal",
          power: 0,
          accuracy: 100,
          damageClass: "status",
          priority: 0,
        };
      }

      return data;
    });
}
