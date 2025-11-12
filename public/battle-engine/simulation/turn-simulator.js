/**
 * Turn Simulator Module
 *
 * This module provides battle turn simulation functions for both
 * worst-case analysis and normal battle simulation. Handles action ordering,
 * move execution, switching, and damage application.
 *
 * @module turn-simulator
 */

import {
  calculateDamage,
  calculateWorstCaseDamage,
} from "../core/damage-calculator.js";
import {
  applyStatusEffect,
  canPokemonMove,
  applyEndOfTurnStatus,
} from "./status-effects.js";

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Simulate a battle turn using worst-case damage assumptions
 *
 * Worst-case assumptions:
 * - Enemy attacks always crit and max roll
 * - Player attacks always min roll
 * - Enemy always wins speed ties
 * - Status effects always occur at worst for player (full para, max confusion, etc.)
 *
 * @param {BattleState} state - Initial battle state (will be mutated)
 * @param {Object} yourAction - Player's action {type: 'move'|'switch', move/pokemon, switchToIndex}
 * @param {Object} enemyAction - Enemy's action {type: 'move'|'switch', move/pokemon, switchToIndex}
 * @returns {Object} - Turn result {state, events}
 */
export function simulateTurnWorstCase(state, yourAction, enemyAction) {
  state.turnCount++;
  const events = [];

  // Determine action order based on priority and speed
  const actions = [
    { action: yourAction, isPlayer: true },
    { action: enemyAction, isPlayer: false },
  ];

  // Sort by priority, then speed (enemy always wins speed ties in worst case)
  actions.sort((a, b) => {
    const aPriority =
      a.action.type === "move" ? a.action.move.priority || 0 : 6;
    const bPriority =
      b.action.type === "move" ? b.action.move.priority || 0 : 6;

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    const aPokemon = a.isPlayer
      ? state.getYourActive()
      : state.getEnemyActive();
    const bPokemon = b.isPlayer
      ? state.getYourActive()
      : state.getEnemyActive();

    // In worst case, enemy always wins speed ties
    if (
      a.isPlayer &&
      !b.isPlayer &&
      aPokemon.stats.spe === bPokemon.stats.spe
    ) {
      return 1; // Enemy goes first
    }

    return bPokemon.stats.spe - aPokemon.stats.spe;
  });

  // Execute actions in order
  actions.forEach(({ action, isPlayer }) => {
    const attacker = isPlayer ? state.getYourActive() : state.getEnemyActive();
    const defender = isPlayer ? state.getEnemyActive() : state.getYourActive();

    if (attacker.fainted) return;

    if (action.type === "switch") {
      if (isPlayer) {
        state.yourActiveIndex = action.switchToIndex;
      } else {
        state.enemyActiveIndex = action.switchToIndex;
      }

      events.push({
        type: "switch",
        isPlayer: isPlayer,
        pokemon: action.pokemon,
        text: `${isPlayer ? "You" : "Enemy"} switched to ${capitalize(
          action.pokemon.name
        )}!`,
      });
    } else if (action.type === "move") {
      // Check if Pokemon can move (worst-case: always full para, never thaw, confusion hits)
      const worstCaseForPlayer = isPlayer; // Worst case for player means player gets bad outcomes
      if (!canPokemonMove(attacker, events, worstCaseForPlayer)) {
        return; // Pokemon can't move this turn
      }

      const move = action.move;

      events.push({
        type: "move-use",
        isPlayer: isPlayer,
        move: move,
        text: `${capitalize(attacker.name)} used ${capitalize(move.name)}!`,
      });

      if (move.damageClass === "status") {
        // Status moves - apply effects (enemy always succeeds, player may fail)
        const moveName = move.name.toLowerCase();

        if (
          moveName === "hypnosis" ||
          moveName === "sleep-powder" ||
          moveName === "spore"
        ) {
          applyStatusEffect(defender, "sleep", events);
        } else if (
          moveName === "thunder-wave" ||
          moveName === "stun-spore" ||
          moveName === "glare"
        ) {
          applyStatusEffect(defender, "paralysis", events);
        } else if (
          moveName === "will-o-wisp" ||
          moveName === "scald" ||
          moveName === "flare-blitz"
        ) {
          applyStatusEffect(defender, "burn", events);
        } else if (moveName === "poison-powder" || moveName === "poison-gas") {
          applyStatusEffect(defender, "poison", events);
        } else if (moveName === "toxic") {
          applyStatusEffect(defender, "toxic", events);
        } else if (
          moveName === "confuse-ray" ||
          moveName === "supersonic" ||
          moveName === "swagger"
        ) {
          if (defender.confusion === 0) {
            defender.confusion = isPlayer ? 1 : 4; // Worst case: player causes min, enemy causes max
            events.push({
              type: "confusion",
              text: `${capitalize(defender.name)} became confused!`,
            });
          }
        }
      } else {
        // Check accuracy for player moves
        if (isPlayer && move.accuracy && move.accuracy < 100) {
          events.push({
            type: "accuracy-risk",
            isPlayer: true,
            move: move,
            accuracy: move.accuracy,
            text: `⚠️ ${capitalize(move.name)} has ${
              move.accuracy
            }% accuracy - risk of missing`,
          });
        }

        const attackerStats = attacker.stats;
        const defenderStats = defender.stats;

        // Modify attack stat if burned
        const effectiveAttackerStats = { ...attackerStats };
        if (attacker.status === "burn" && move.damageClass === "physical") {
          effectiveAttackerStats.atk = Math.floor(
            effectiveAttackerStats.atk / 2
          );
        }

        // Use worst-case damage
        const worstCaseDamage = calculateWorstCaseDamage(
          attacker,
          defender,
          move,
          effectiveAttackerStats,
          defenderStats,
          isPlayer
        );

        const actualDamage = Math.min(worstCaseDamage, defender.currentHP);
        defender.currentHP -= actualDamage;

        if (defender.currentHP <= 0) {
          defender.currentHP = 0;
          defender.fainted = true;
        }

        const damageInfo = calculateDamage(
          attacker,
          defender,
          move,
          effectiveAttackerStats,
          defenderStats
        );
        let effectText = "";
        if (damageInfo.effectiveness > 1) effectText = " It's super effective!";
        if (damageInfo.effectiveness < 1 && damageInfo.effectiveness > 0)
          effectText = " It's not very effective...";
        if (damageInfo.effectiveness === 0)
          effectText = " It doesn't affect the target...";

        const critText = !isPlayer ? " [CRIT]" : "";

        events.push({
          type: "move",
          isPlayer: isPlayer,
          move: move,
          damage: actualDamage,
          effectiveness: damageInfo.effectiveness,
          text: `${actualDamage} damage.${effectText}`,
        });

        if (defender.fainted) {
          events.push({
            type: "faint",
            isPlayer: !isPlayer,
            pokemon: defender,
            text: `${capitalize(defender.name)} fainted!`,
          });
        }
      }
    }
  });

  // Apply end-of-turn status damage (worst case for player)
  applyEndOfTurnStatus(state.getYourActive(), events);
  applyEndOfTurnStatus(state.getEnemyActive(), events);

  return { state: state, events: events };
}

/**
 * Simulate a normal battle turn with average damage rolls
 *
 * Uses average damage calculations and realistic status effect chances.
 * Speed ties are resolved randomly.
 *
 * @param {BattleState} state - Current battle state (will be mutated)
 * @param {Object} yourAction - Your action {type: 'move'|'switch', move/pokemon, switchToIndex}
 * @param {Object} enemyAction - Enemy action {type: 'move'|'switch', move/pokemon, switchToIndex}
 * @returns {Object} - Turn result {state, events}
 */
export function simulateTurn(state, yourAction, enemyAction) {
  state.turnCount++;
  const events = [];

  // Determine action order based on priority and speed
  const actions = [
    { action: yourAction, isPlayer: true },
    { action: enemyAction, isPlayer: false },
  ];

  // Sort by priority, then speed
  actions.sort((a, b) => {
    const aPriority =
      a.action.type === "move" ? a.action.move.priority || 0 : 6; // Switches always go first
    const bPriority =
      b.action.type === "move" ? b.action.move.priority || 0 : 6;

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority goes first
    }

    // Same priority, check speed
    const aPokemon = a.isPlayer
      ? state.getYourActive()
      : state.getEnemyActive();
    const bPokemon = b.isPlayer
      ? state.getYourActive()
      : state.getEnemyActive();

    return bPokemon.stats.spe - aPokemon.stats.spe; // Faster goes first
  });

  // Execute actions in order
  actions.forEach(({ action, isPlayer }) => {
    const attacker = isPlayer ? state.getYourActive() : state.getEnemyActive();
    const defender = isPlayer ? state.getEnemyActive() : state.getYourActive();

    if (attacker.fainted) return; // Can't act if fainted

    if (action.type === "switch") {
      // Execute switch
      if (isPlayer) {
        state.yourActiveIndex = action.switchToIndex;
      } else {
        state.enemyActiveIndex = action.switchToIndex;
      }

      events.push({
        type: "switch",
        isPlayer: isPlayer,
        pokemon: action.pokemon,
        text: `${isPlayer ? "You" : "Enemy"} switched to ${capitalize(
          action.pokemon.name
        )}!`,
      });
    } else if (action.type === "move") {
      // Check if Pokemon can move (status effects)
      if (!canPokemonMove(attacker, events, false)) {
        return; // Pokemon can't move this turn
      }

      // Execute move
      const move = action.move;

      events.push({
        type: "move-use",
        isPlayer: isPlayer,
        move: move,
        text: `${capitalize(attacker.name)} used ${capitalize(move.name)}!`,
      });

      if (move.damageClass === "status") {
        // Status moves - apply effects
        const moveName = move.name.toLowerCase();

        if (
          moveName === "hypnosis" ||
          moveName === "sleep-powder" ||
          moveName === "spore"
        ) {
          applyStatusEffect(defender, "sleep", events);
        } else if (
          moveName === "thunder-wave" ||
          moveName === "stun-spore" ||
          moveName === "glare"
        ) {
          applyStatusEffect(defender, "paralysis", events);
        } else if (
          moveName === "will-o-wisp" ||
          moveName === "scald" ||
          moveName === "flare-blitz"
        ) {
          applyStatusEffect(defender, "burn", events);
        } else if (moveName === "poison-powder" || moveName === "poison-gas") {
          applyStatusEffect(defender, "poison", events);
        } else if (moveName === "toxic") {
          applyStatusEffect(defender, "toxic", events);
        } else if (
          moveName === "confuse-ray" ||
          moveName === "supersonic" ||
          moveName === "swagger"
        ) {
          if (defender.confusion === 0) {
            defender.confusion = Math.floor(Math.random() * 4) + 1; // 1-4 turns
            events.push({
              type: "confusion",
              text: `${capitalize(defender.name)} became confused!`,
            });
          }
        }
        // Other status moves can be added here
      } else {
        // Damaging move
        const attackerStats = attacker.stats;
        const defenderStats = defender.stats;

        // Modify attack stat if burned
        const effectiveAttackerStats = { ...attackerStats };
        if (attacker.status === "burn" && move.damageClass === "physical") {
          effectiveAttackerStats.atk = Math.floor(
            effectiveAttackerStats.atk / 2
          );
        }

        const damage = calculateDamage(
          attacker,
          defender,
          move,
          effectiveAttackerStats,
          defenderStats
        );

        // Apply damage (use average for simulation)
        const actualDamage = Math.min(damage.average, defender.currentHP);
        defender.currentHP -= actualDamage;

        if (defender.currentHP <= 0) {
          defender.currentHP = 0;
          defender.fainted = true;
        }

        let effectText = "";
        if (damage.effectiveness > 1) effectText = " It's super effective!";
        if (damage.effectiveness < 1 && damage.effectiveness > 0)
          effectText = " It's not very effective...";
        if (damage.effectiveness === 0)
          effectText = " It doesn't affect the target...";

        events.push({
          type: "move",
          isPlayer: isPlayer,
          move: move,
          damage: actualDamage,
          effectiveness: damage.effectiveness,
          text: `${actualDamage} damage.${effectText}`,
        });

        if (defender.fainted) {
          events.push({
            type: "faint",
            isPlayer: !isPlayer,
            pokemon: defender,
            text: `${capitalize(defender.name)} fainted!`,
          });
        }
      }
    }
  });

  // Apply end-of-turn status damage
  applyEndOfTurnStatus(state.getYourActive(), events);
  applyEndOfTurnStatus(state.getEnemyActive(), events);

  return { state, events };
}
