/**
 * Pokemon Data Fetching Module
 * Handles fetching Pokemon data from the PokeAPI
 * Note: Currently, Pokemon data is loaded via team-builder and localStorage.
 * This module is provided for future expansion if direct Pokemon fetching is needed.
 */

/**
 * Fetch Pokemon data from API
 * @param {string} nameOrId - Pokemon name or ID
 * @returns {Promise<Object>} - Pokemon data
 */
export async function fetchPokemonData(nameOrId) {
  if (!nameOrId) return null;

  try {
    const response = await fetch(`/api/pokemon/${nameOrId.toLowerCase()}`);

    if (!response.ok) {
      console.warn(`Pokemon not found: ${nameOrId}`);
      return null;
    }

    const pokemonData = await response.json();
    return pokemonData;
  } catch (error) {
    console.error(`Error fetching Pokemon ${nameOrId}:`, error);
    return null;
  }
}

/**
 * Fetch multiple Pokemon in parallel
 * @param {Array<string>} names - Array of Pokemon names or IDs
 * @returns {Promise<Array<Object>>} - Array of Pokemon data
 */
export async function fetchMultiplePokemon(names) {
  const fetchPromises = names.map((name) => fetchPokemonData(name));
  const results = await Promise.all(fetchPromises);
  return results.filter((data) => data !== null);
}

/**
 * Parse Showdown format and fetch Pokemon data
 * @param {string} showdownText - Showdown format text
 * @returns {Promise<Object>} - Response with pokemon array
 */
export async function parseShowdownFormat(showdownText) {
  if (!showdownText) {
    throw new Error("No showdown text provided");
  }

  try {
    const response = await fetch("/api/parse-showdown", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ showdownText }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to parse Showdown format: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error parsing Showdown format:", error);
    throw error;
  }
}
