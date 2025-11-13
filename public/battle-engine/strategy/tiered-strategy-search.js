/**
 * Tiered Strategy Search
 * Implements priority-based strategy finding with risk tiers
 *
 * Priority Order:
 * 1. Riskless win (0 deaths even in worst case)
 * 2. Risky win (chance to lose 1-5 Pokemon)
 * 3. Sacrifice win (guaranteed 1-5 Pokemon loss)
 * 4. Likely loss (might win with luck)
 * 5. Guaranteed loss
 */

import { selectEnemyAction } from "../ai/enemy-ai.js";
import { generatePossibleActions } from "../ai/action-generator.js";
import {
  simulateTurn,
  simulateTurnWorstCase,
} from "../simulation/turn-simulator.js";
import { calculateDamage } from "../core/damage-calculator.js";

/**
 * Find optimal strategy using tiered risk-based search
 * @param {BattleState} initialState - Starting state
 * @param {number} maxDepth - Maximum turns to search ahead
 * @param {Function} handleForcedSwitch - Function to handle forced switches
 * @returns {Object} - {strategy, riskTier, averageDeaths, worstCaseDeaths}
 */
export function findTieredStrategy(initialState, maxDepth, handleForcedSwitch) {
  console.log("Starting tiered strategy search...");

  // Try each acceptable loss tier from 0 to 5
  for (let acceptableLosses = 0; acceptableLosses <= 5; acceptableLosses++) {
    console.log(
      `\nSearching for strategy with max ${acceptableLosses} acceptable losses...`
    );

    const result = searchForStrategy(
      initialState,
      maxDepth,
      acceptableLosses,
      handleForcedSwitch
    );

    if (result) {
      console.log(`✓ Found strategy with risk tier: ${result.riskTier}`);
      return result;
    }
  }

  // No winning strategy found
  console.log("✗ No winning strategy found - battle is likely/guaranteed loss");
  return createLossStrategy(initialState, maxDepth, handleForcedSwitch);
}

/**
 * Search for a winning strategy with specified acceptable losses
 * @param {BattleState} initialState - Starting state
 * @param {number} maxDepth - Maximum turns ahead
 * @param {number} acceptableLosses - Maximum acceptable Pokemon losses
 * @param {Function} handleForcedSwitch - Forced switch handler
 * @returns {Object|null} - Strategy if found, null otherwise
 */
function searchForStrategy(
  initialState,
  maxDepth,
  acceptableLosses,
  handleForcedSwitch
) {
  const startTime = Date.now();
  let nodesExplored = 0;

  // Breadth-first search for shortest path
  const queue = [
    {
      state: initialState.clone(),
      path: [],
      depth: 0,
    },
  ];

  while (queue.length > 0) {
    const { state, path, depth } = queue.shift();
    nodesExplored++;

    // Check timeout (30 seconds max)
    if (Date.now() - startTime > 30000) {
      console.log(`⏱ Timeout after exploring ${nodesExplored} nodes`);
      return null;
    }

    // Check if we've won
    const enemyAlive = state.enemyTeam.filter((p) => !p.fainted).length;
    if (enemyAlive === 0) {
      // Validate this path meets our criteria
      const validation = validateStrategy(
        initialState,
        path,
        acceptableLosses,
        handleForcedSwitch
      );
      if (validation.valid) {
        console.log(
          `✓ Found valid strategy in ${nodesExplored} nodes (${
            Date.now() - startTime
          }ms)`
        );
        return {
          strategy: validation.detailedPath,
          worstCaseStrategy: validation.worstCasePath,
          riskTier: validation.riskTier,
          averageDeaths: validation.averageDeaths,
          worstCaseDeaths: validation.worstCaseDeaths,
          turnsToWin: path.length,
        };
      }
    }

    // Don't search past max depth
    if (depth >= maxDepth) continue;

    // Check if we've already lost
    const yourAlive = state.yourTeam.filter((p) => !p.fainted).length;
    if (yourAlive === 0) continue;

    // Generate and prune actions
    const actions = generateAndPruneActions(state, true);

    // Try each action
    for (const action of actions) {
      // Predict enemy response using full Run&Bun AI
      const enemyAction = selectEnemyAction(state);
      if (!enemyAction) continue;

      // Simulate this turn
      const newState = state.clone();
      const result = simulateTurn(newState, action, enemyAction);

      // Handle forced switches
      if (newState.getYourActive().fainted) {
        const switchEvent = handleForcedSwitch(newState, true);
        if (!switchEvent) continue; // No Pokemon left
      }
      if (newState.getEnemyActive().fainted) {
        handleForcedSwitch(newState, false);
      }

      // Add to queue
      queue.push({
        state: newState,
        path: [...path, { action, enemyAction }],
        depth: depth + 1,
      });
    }
  }

  console.log(
    `✗ No valid strategy found after exploring ${nodesExplored} nodes`
  );
  return null;
}

/**
 * Generate possible actions and prune bad choices
 * @param {BattleState} state - Current state
 * @param {boolean} isPlayer - True for player
 * @returns {Array} - Pruned list of actions
 */
function generateAndPruneActions(state, isPlayer) {
  const allActions = generatePossibleActions(state, isPlayer);
  const active = state.getYourActive();
  const enemy = state.getEnemyActive();

  const prunedActions = [];

  // Find max damage move for comparison
  let maxMoveDamage = 0;
  const moveActions = allActions.filter((a) => a.type === "move");

  moveActions.forEach((action) => {
    if (action.move.damageClass !== "status") {
      const damage = calculateDamage(
        active,
        enemy,
        action.move,
        active.stats,
        enemy.stats
      );
      maxMoveDamage = Math.max(maxMoveDamage, damage.average);
    }
  });

  // Keep moves that deal max damage or are status moves
  moveActions.forEach((action) => {
    if (action.move.damageClass === "status") {
      prunedActions.push(action);
    } else {
      const damage = calculateDamage(
        active,
        enemy,
        action.move,
        active.stats,
        enemy.stats
      );
      // Keep if it's the max damage move or can guarantee a KO
      if (
        damage.average >= maxMoveDamage * 0.95 ||
        damage.min >= enemy.currentHP
      ) {
        prunedActions.push(action);
      }
    }
  });

  // Evaluate switch options
  const switchActions = allActions.filter((a) => a.type === "switch");

  switchActions.forEach((action) => {
    const switchPokemon = action.pokemon;

    // Don't switch into guaranteed/near-certain death
    if (enemy.moveData) {
      let worstCaseDamagePercent = 0;
      let bestCaseDamagePercent = 0;
      let canOHKO = false;
      let canThreatenEnemy = false;

      // Calculate damage current active would take (for comparison)
      let currentPokemonWorstCase = 0;
      enemy.moveData.forEach((move) => {
        if (move.damageClass !== "status") {
          const damage = calculateDamage(
            enemy,
            active,
            move,
            enemy.stats,
            active.stats
          );
          const critDamage = Math.floor(damage.max * 1.5);
          const critPercent = (critDamage / active.currentHP) * 100;
          currentPokemonWorstCase = Math.max(
            currentPokemonWorstCase,
            critPercent
          );
        }
      });

      // Calculate worst-case damage from enemy to switch-in (max damage + crit)
      enemy.moveData.forEach((move) => {
        if (move.damageClass !== "status") {
          const damage = calculateDamage(
            enemy,
            switchPokemon,
            move,
            enemy.stats,
            switchPokemon.stats
          );
          const critDamage = Math.floor(damage.max * 1.5);
          const damagePercent = (damage.max / switchPokemon.currentHP) * 100;
          const critPercent = (critDamage / switchPokemon.currentHP) * 100;
          worstCaseDamagePercent = Math.max(
            worstCaseDamagePercent,
            critPercent
          );
          bestCaseDamagePercent = Math.max(
            bestCaseDamagePercent,
            damagePercent
          );
        }
      });

      // Calculate what switch-in can do to enemy
      if (switchPokemon.moveData) {
        switchPokemon.moveData.forEach((move) => {
          if (move.damageClass !== "status") {
            const damage = calculateDamage(
              switchPokemon,
              enemy,
              move,
              switchPokemon.stats,
              enemy.stats
            );
            if (damage.min >= enemy.currentHP) {
              canOHKO = true;
            }
            // Check if can threaten (deal significant damage)
            if (damage.average > enemy.currentHP * 0.25) {
              canThreatenEnemy = true;
            }
          }
        });
      }

      // Check if this is a defensive switch (takes much less damage than staying in)
      const isDefensiveSwitch =
        worstCaseDamagePercent < currentPokemonWorstCase * 0.7;

      // Decision logic:
      // 1. Allow if switch-in can OHKO (worth the risk)
      // 2. Allow if defensive switch (takes <70% of current's damage)
      // 3. Block if worst-case is >90% damage AND not OHKO AND not defensive (too risky)
      // 4. Allow if average case is <70% damage (reasonably safe)
      // 5. Allow if switch-in can threaten enemy (>25% damage)
      // 6. Otherwise block

      if (canOHKO) {
        prunedActions.push(action);
      } else if (isDefensiveSwitch) {
        prunedActions.push(action);
      } else if (worstCaseDamagePercent > 90) {
        // Too risky - could die to unlucky crit
        // Don't add to pruned actions
      } else if (bestCaseDamagePercent < 70) {
        // Reasonably safe switch
        prunedActions.push(action);
      } else if (canThreatenEnemy) {
        // Can deal meaningful damage
        prunedActions.push(action);
      }
      // Otherwise, don't allow the switch
    } else {
      // No enemy move data, allow switch
      prunedActions.push(action);
    }
  });

  return prunedActions;
}

/**
 * Validate a strategy path meets acceptable loss criteria
 * @param {BattleState} initialState - Starting state
 * @param {Array} path - Array of {action, enemyAction} objects
 * @param {number} acceptableLosses - Max acceptable losses
 * @param {Function} handleForcedSwitch - Forced switch handler
 * @returns {Object} - {valid, riskTier, averageDeaths, worstCaseDeaths, detailedPath}
 */
function validateStrategy(
  initialState,
  path,
  acceptableLosses,
  handleForcedSwitch
) {
  // Simulate average case
  const avgResult = simulatePath(initialState, path, false, handleForcedSwitch);

  // Simulate worst case
  const worstResult = simulatePath(
    initialState,
    path,
    true,
    handleForcedSwitch
  );

  const averageDeaths = avgResult.deaths;
  const worstCaseDeaths = worstResult.deaths;

  // Check if we win in both cases
  if (!avgResult.victory || !worstResult.victory) {
    return { valid: false };
  }

  // Check if worst case is within acceptable losses
  if (worstCaseDeaths > acceptableLosses) {
    return { valid: false };
  }

  // Determine risk tier
  let riskTier;
  if (worstCaseDeaths === 0) {
    riskTier = "✅ RISKLESS - Zero deaths guaranteed";
  } else if (averageDeaths === 0 && worstCaseDeaths > 0) {
    riskTier = `⚠️ RISKY ${worstCaseDeaths} - Might lose ${worstCaseDeaths} if unlucky`;
  } else if (averageDeaths === worstCaseDeaths) {
    riskTier = `⚠️ SACRIFICE ${averageDeaths} - Guaranteed to lose ${averageDeaths}`;
  } else {
    riskTier = `⚠️ HIGH RISK - Average ${averageDeaths}, worst ${worstCaseDeaths}`;
  }

  return {
    valid: true,
    riskTier,
    averageDeaths,
    worstCaseDeaths,
    detailedPath: avgResult.detailedPath,
    worstCasePath: worstResult.detailedPath,
  };
}

/**
 * Simulate a complete path through the battle
 * @param {BattleState} initialState - Starting state
 * @param {Array} path - Action sequence
 * @param {boolean} worstCase - Use worst-case damage
 * @param {Function} handleForcedSwitch - Forced switch handler
 * @returns {Object} - {victory, deaths, detailedPath}
 */
function simulatePath(initialState, path, worstCase, handleForcedSwitch) {
  const state = initialState.clone();
  const detailedPath = [];
  let deaths = 0;

  const initialAlive = state.yourTeam.filter((p) => !p.fainted).length;

  for (const { action, enemyAction } of path) {
    const aliveBefore = state.yourTeam.filter((p) => !p.fainted).length;

    // Simulate turn
    const simulator = worstCase ? simulateTurnWorstCase : simulateTurn;
    const result = simulator(state, action, enemyAction);

    // Handle forced switches
    if (state.getYourActive().fainted) {
      const switchEvent = handleForcedSwitch(state, true);
      if (switchEvent) result.events.push(switchEvent);
    }
    if (state.getEnemyActive().fainted) {
      const switchEvent = handleForcedSwitch(state, false);
      if (switchEvent) result.events.push(switchEvent);
    }

    const aliveAfter = state.yourTeam.filter((p) => !p.fainted).length;
    deaths += aliveBefore - aliveAfter;

    // Capture HP tracking for display (especially for worst case)
    const yourActiveAfter = state.getYourActive();
    const enemyActiveAfter = state.getEnemyActive();

    detailedPath.push({
      turn: state.turnCount,
      action,
      events: result.events,
      state: state.clone(),
      deathsThisTurn: aliveBefore - aliveAfter,
      yourDeathsThisTurn: aliveBefore - aliveAfter, // Alias for compatibility
      yourActiveHP: yourActiveAfter.fainted ? 0 : yourActiveAfter.currentHP,
      yourActiveMaxHP: yourActiveAfter.stats.hp,
      yourActiveName: yourActiveAfter.name,
      enemyActiveHP: enemyActiveAfter.fainted ? 0 : enemyActiveAfter.currentHP,
      enemyActiveMaxHP: enemyActiveAfter.stats.hp,
      enemyActiveName: enemyActiveAfter.name,
    });
  }

  const finalEnemyAlive = state.enemyTeam.filter((p) => !p.fainted).length;
  const victory = finalEnemyAlive === 0;

  return { victory, deaths, detailedPath };
}

/**
 * Create best-effort strategy when no winning path exists
 * @param {BattleState} initialState - Starting state
 * @param {number} maxDepth - Max turns
 * @param {Function} handleForcedSwitch - Forced switch handler
 * @returns {Object} - Loss strategy
 */
function createLossStrategy(initialState, maxDepth, handleForcedSwitch) {
  console.log("Creating best-effort loss mitigation strategy...");

  const path = [];
  const state = initialState.clone();

  // Just try to survive as long as possible
  for (let turn = 0; turn < maxDepth; turn++) {
    const yourAlive = state.yourTeam.filter((p) => !p.fainted).length;
    const enemyAlive = state.enemyTeam.filter((p) => !p.fainted).length;

    if (yourAlive === 0 || enemyAlive === 0) break;

    const actions = generateAndPruneActions(state, true);
    if (actions.length === 0) break;

    const action = actions[0]; // Just take first available
    const enemyAction = selectEnemyAction(state);
    if (!enemyAction) break;

    const result = simulateTurn(state, action, enemyAction);

    if (state.getYourActive().fainted) {
      const switchEvent = handleForcedSwitch(state, true);
      if (!switchEvent) break;
      result.events.push(switchEvent);
    }
    if (state.getEnemyActive().fainted) {
      const switchEvent = handleForcedSwitch(state, false);
      if (switchEvent) result.events.push(switchEvent);
    }

    path.push({
      turn: state.turnCount,
      action,
      events: result.events,
      state: state.clone(),
    });
  }

  const enemyAlive = state.enemyTeam.filter((p) => !p.fainted).length;
  const yourDeaths = state.yourTeam.filter((p) => p.fainted).length;

  return {
    strategy: path,
    riskTier:
      enemyAlive === 0
        ? "⚠️ UNLIKELY WIN - Requires luck"
        : "❌ GUARANTEED LOSS",
    averageDeaths: yourDeaths,
    worstCaseDeaths: yourDeaths,
    turnsToWin: null,
  };
}
