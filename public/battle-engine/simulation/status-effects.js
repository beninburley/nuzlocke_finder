/**
 * Status Effects Module
 *
 * This module handles all status condition logic including:
 * - Applying status effects (sleep, paralysis, burn, poison, toxic, freeze, confusion)
 * - Checking if a Pokemon can move (status prevention checks)
 * - Applying end-of-turn status damage
 *
 * @module status-effects
 */

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Apply a status condition to a Pokemon
 *
 * @param {Object} pokemon - Pokemon to apply status to
 * @param {string} status - Status to apply ('sleep', 'paralysis', 'burn', 'poison', 'toxic', 'freeze')
 * @param {Array} events - Events array to log status application
 * @returns {boolean} - True if status was applied, false if Pokemon already has a status
 */
export function applyStatusEffect(pokemon, status, events) {
  if (pokemon.status) {
    events.push({
      type: "status-fail",
      text: `${capitalize(pokemon.name)} is already ${pokemon.status}!`,
    });
    return false;
  }

  pokemon.status = status;

  if (status === "sleep") {
    pokemon.statusCounter = Math.floor(Math.random() * 3) + 1; // 1-3 turns
    events.push({
      type: "status",
      text: `${capitalize(pokemon.name)} fell asleep!`,
    });
  } else if (status === "paralysis") {
    events.push({
      type: "status",
      text: `${capitalize(pokemon.name)} was paralyzed!`,
    });
  } else if (status === "burn") {
    events.push({
      type: "status",
      text: `${capitalize(pokemon.name)} was burned!`,
    });
  } else if (status === "poison") {
    events.push({
      type: "status",
      text: `${capitalize(pokemon.name)} was poisoned!`,
    });
  } else if (status === "toxic") {
    pokemon.statusCounter = 1; // Toxic counter starts at 1
    events.push({
      type: "status",
      text: `${capitalize(pokemon.name)} was badly poisoned!`,
    });
  } else if (status === "freeze") {
    events.push({
      type: "status",
      text: `${capitalize(pokemon.name)} was frozen solid!`,
    });
  }

  return true;
}

/**
 * Check if Pokemon can move this turn (status prevention checks)
 *
 * Handles sleep, freeze, paralysis, and confusion checks.
 * In worst-case mode, assumes worst outcomes (always paralyzed, never thaws, etc.)
 *
 * @param {Object} pokemon - Pokemon attempting to move
 * @param {Array} events - Events array to add messages to
 * @param {boolean} worstCase - If true, assume worst outcomes (full para, no thaw, always hurt by confusion)
 * @returns {boolean} - True if Pokemon can move, false if prevented by status
 */
export function canPokemonMove(pokemon, events, worstCase = false) {
  // Check sleep
  if (pokemon.status === "sleep") {
    if (pokemon.statusCounter > 0) {
      pokemon.statusCounter--;
      events.push({
        type: "status-prevent",
        text: `${capitalize(pokemon.name)} is fast asleep!`,
      });

      if (pokemon.statusCounter === 0) {
        pokemon.status = null;
        events.push({
          type: "status-cure",
          text: `${capitalize(pokemon.name)} woke up!`,
        });
      }
      return false;
    }
  }

  // Check freeze
  if (pokemon.status === "freeze") {
    const thawChance = worstCase ? 0 : 0.2; // 20% chance to thaw normally
    if (Math.random() >= thawChance) {
      events.push({
        type: "status-prevent",
        text: `${capitalize(pokemon.name)} is frozen solid!`,
      });
      return false;
    } else {
      pokemon.status = null;
      events.push({
        type: "status-cure",
        text: `${capitalize(pokemon.name)} thawed out!`,
      });
    }
  }

  // Check paralysis (25% chance to be fully paralyzed)
  if (pokemon.status === "paralysis") {
    const paraChance = worstCase ? 1.0 : 0.25;
    if (Math.random() < paraChance) {
      events.push({
        type: "status-prevent",
        text: `${capitalize(pokemon.name)} is fully paralyzed!`,
      });
      return false;
    }
  }

  // Check confusion
  if (pokemon.confusion > 0) {
    pokemon.confusion--;
    events.push({
      type: "confusion",
      text: `${capitalize(pokemon.name)} is confused!`,
    });

    const hurtSelfChance = worstCase ? 1.0 : 0.33; // 33% chance to hurt itself
    if (Math.random() < hurtSelfChance) {
      const confusionDamage = Math.floor(pokemon.stats.hp * 0.1); // ~10% HP
      pokemon.currentHP = Math.max(0, pokemon.currentHP - confusionDamage);
      events.push({
        type: "confusion-damage",
        text: `${capitalize(
          pokemon.name
        )} hurt itself in confusion! ${confusionDamage} damage.`,
      });

      if (pokemon.currentHP === 0) {
        pokemon.fainted = true;
        events.push({
          type: "faint",
          text: `${capitalize(pokemon.name)} fainted!`,
        });
      }
      return false;
    }

    if (pokemon.confusion === 0) {
      events.push({
        type: "confusion-end",
        text: `${capitalize(pokemon.name)} snapped out of confusion!`,
      });
    }
  }

  return true;
}

/**
 * Apply end-of-turn status damage
 *
 * Handles damage from burn, poison, and toxic at the end of each turn.
 * Toxic damage increases each turn based on statusCounter.
 *
 * @param {Object} pokemon - Pokemon to apply damage to
 * @param {Array} events - Events array to add damage messages to
 */
export function applyEndOfTurnStatus(pokemon, events) {
  if (pokemon.fainted) return;

  if (pokemon.status === "burn") {
    const burnDamage = Math.floor(pokemon.stats.hp / 16); // 1/16 max HP
    pokemon.currentHP = Math.max(0, pokemon.currentHP - burnDamage);
    events.push({
      type: "burn-damage",
      text: `${capitalize(
        pokemon.name
      )} was hurt by its burn! ${burnDamage} damage.`,
    });
  } else if (pokemon.status === "poison") {
    const poisonDamage = Math.floor(pokemon.stats.hp / 8); // 1/8 max HP
    pokemon.currentHP = Math.max(0, pokemon.currentHP - poisonDamage);
    events.push({
      type: "poison-damage",
      text: `${capitalize(
        pokemon.name
      )} was hurt by poison! ${poisonDamage} damage.`,
    });
  } else if (pokemon.status === "toxic") {
    const toxicDamage = Math.floor(
      (pokemon.stats.hp / 16) * pokemon.statusCounter
    );
    pokemon.currentHP = Math.max(0, pokemon.currentHP - toxicDamage);
    pokemon.statusCounter++;
    events.push({
      type: "toxic-damage",
      text: `${capitalize(
        pokemon.name
      )} was hurt by toxic! ${toxicDamage} damage.`,
    });
  }

  if (pokemon.currentHP === 0 && !pokemon.fainted) {
    pokemon.fainted = true;
    events.push({
      type: "faint",
      text: `${capitalize(pokemon.name)} fainted!`,
    });
  }
}
