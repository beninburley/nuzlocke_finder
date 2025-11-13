// ============================================================================
// IMPORTS
// ============================================================================

import { TYPE_CHART } from "./battle-engine/constants/type-chart.js";
import { NATURES } from "./battle-engine/constants/nature-modifiers.js";
import {
  calculateHP,
  calculateStat,
  calculateAllStats,
} from "./battle-engine/core/stat-calculator.js";
import { getTypeEffectiveness } from "./battle-engine/core/type-effectiveness.js";
import {
  calculateDamage,
  calculateWorstCaseDamage,
} from "./battle-engine/core/damage-calculator.js";
import { BattleState } from "./battle-engine/core/BattleState.js";
import {
  applyStatusEffect,
  canPokemonMove,
  applyEndOfTurnStatus,
} from "./battle-engine/simulation/status-effects.js";
import {
  simulateTurnWorstCase,
  simulateTurn,
} from "./battle-engine/simulation/turn-simulator.js";
import {
  calculateSwitchInScore,
  findBestSwitchIn,
} from "./battle-engine/ai/switch-ai.js";
import { generatePossibleActions } from "./battle-engine/ai/action-generator.js";
import { selectEnemyAction } from "./battle-engine/ai/enemy-ai.js";
import { findBestActionWithLookahead } from "./battle-engine/ai/lookahead-ai.js";
import { evaluatePosition } from "./battle-engine/strategy/position-evaluator.js";
import { explainAction } from "./battle-engine/strategy/action-explainer.js";
import {
  fetchMoveData,
  loadAllMoveData,
  attachMoveData,
} from "./battle-engine/data/move-fetcher.js";
import {
  capitalize,
  displayTeams,
  displayBattleState,
  showError,
  hideError,
  showLoading,
  hideLoading,
} from "./battle-engine/ui/battle-formatter.js";
import { displayStrategyResults } from "./battle-engine/ui/strategy-display.js";

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let yourTeam = [];
let enemyTeam = [];
let yourLeadIndex = null;
let enemyLeadIndex = null;

// ============================================================================
// WORST-CASE SCENARIO SIMULATION
// ============================================================================

/**
 * Calculate worst-case strategy outcomes
 * @param {BattleState} initialState - Starting battle state
 * @param {number} maxDepth - Maximum turns to simulate
 * @returns {Object} - Worst case analysis with death count and risk tier
 */
function calculateWorstCaseStrategy(initialState, maxDepth = 20) {
  const strategy = [];
  let currentState = initialState.clone();
  let turnCount = 0;
  let yourDeaths = 0;
  let enemyDeaths = 0;

  while (turnCount < maxDepth) {
    turnCount++;

    const yourAlive = currentState.yourTeam.filter((p) => !p.fainted).length;
    const enemyAlive = currentState.enemyTeam.filter((p) => !p.fainted).length;

    if (yourAlive === 0 || enemyAlive === 0) {
      break;
    }

    // Player uses lookahead to find best action
    const yourResult = findBestActionWithLookahead(currentState, true, 2);
    const yourAction = yourResult.action;

    if (!yourAction) break;

    // Enemy uses AI logic (same as normal simulation)
    const enemyAction = selectEnemyAction(currentState);

    if (!enemyAction) break;

    // Track deaths before this turn
    const yourAliveBeforeTurn = currentState.yourTeam.filter(
      (p) => !p.fainted
    ).length;
    const enemyAliveBeforeTurn = currentState.enemyTeam.filter(
      (p) => !p.fainted
    ).length;

    // Execute turn with worst-case damage
    const result = simulateTurnWorstCase(currentState, yourAction, enemyAction);
    currentState = result.state;

    // Track deaths after this turn
    const yourAliveAfterTurn = currentState.yourTeam.filter(
      (p) => !p.fainted
    ).length;
    const enemyAliveAfterTurn = currentState.enemyTeam.filter(
      (p) => !p.fainted
    ).length;

    const yourDeathsThisTurn = yourAliveBeforeTurn - yourAliveAfterTurn;
    const enemyDeathsThisTurn = enemyAliveBeforeTurn - enemyAliveAfterTurn;

    yourDeaths += yourDeathsThisTurn;
    enemyDeaths += enemyDeathsThisTurn;

    // Handle forced switches
    if (currentState.getYourActive().fainted) {
      const switchEvent = handleForcedSwitch(currentState, true);
      if (switchEvent) result.events.push(switchEvent);
    }

    if (currentState.getEnemyActive().fainted) {
      const switchEvent = handleForcedSwitch(currentState, false);
      if (switchEvent) result.events.push(switchEvent);
    }

    strategy.push({
      turn: currentState.turnCount,
      action: yourAction,
      events: result.events,
      state: currentState.clone(),
      yourDeathsThisTurn: yourDeathsThisTurn,
      enemyDeathsThisTurn: enemyDeathsThisTurn,
    });
  }

  // Determine risk tier
  const finalYourAlive = currentState.yourTeam.filter((p) => !p.fainted).length;
  const finalEnemyAlive = currentState.enemyTeam.filter(
    (p) => !p.fainted
  ).length;

  const weWin = finalEnemyAlive === 0 && finalYourAlive > 0;
  const weLose = finalYourAlive === 0;

  let riskTier = "";
  if (weLose) {
    riskTier = "⚠️ LOSS RISK - Can lose the battle in worst case";
  } else if (!weWin) {
    riskTier = "⚠️ INCONCLUSIVE - Battle may not complete";
  } else if (yourDeaths === 0) {
    riskTier = "✅ RISKLESS - Perfect, zero deaths even with max bad luck";
  } else {
    // Check if deaths were intentional (would happen in average case too)
    // For now, mark all as "Risky" - we can refine this later
    riskTier = `⚠️ RISKY ${yourDeaths} DEATH${
      yourDeaths > 1 ? "S" : ""
    } - Guaranteed win, possible ${yourDeaths} casualt${
      yourDeaths > 1 ? "ies" : "y"
    }`;
  }

  return {
    strategy: strategy,
    yourDeaths: yourDeaths,
    enemyDeaths: enemyDeaths,
    weWin: weWin,
    weLose: weLose,
    riskTier: riskTier,
    finalState: currentState,
  };
}

// ============================================================================
// DATA LOADING AND INITIALIZATION
// ============================================================================

/**
 * Load team data from localStorage
 */
function loadTeamData() {
  const yourTeamJSON = localStorage.getItem("pokemonTeam");
  const enemyTeamJSON = localStorage.getItem("enemyTeam");

  if (yourTeamJSON) {
    const rawYourTeam = JSON.parse(yourTeamJSON);
    yourTeam = rawYourTeam.filter((p) => p !== null);
  }

  if (enemyTeamJSON) {
    const rawEnemyTeam = JSON.parse(enemyTeamJSON);
    enemyTeam = rawEnemyTeam.filter((p) => p !== null);
  }

  // Validate teams
  if (yourTeam.length === 0 && enemyTeam.length === 0) {
    showError("No teams found! Please build teams in the Team Builder first.");
    return false;
  }

  if (yourTeam.length === 0) {
    showError(
      "Your team is empty! Please build your team in the Team Builder first."
    );
    return false;
  }

  if (enemyTeam.length === 0) {
    showError(
      "Enemy team is empty! Please add an enemy team in the Team Builder first."
    );
    return false;
  }

  return true;
}

// ============================================================================
// FORCED SWITCH HANDLER
// ============================================================================

/**
 * Handle forced switch after a Pokemon faints
 * @param {BattleState} state - Current battle state
 * @param {boolean} isPlayer - True if player's Pokemon fainted
 * @returns {Object|null} - Switch event or null if no available Pokemon
 */
function handleForcedSwitch(state, isPlayer) {
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

// ============================================================================
// POSITION EVALUATION & RISK ASSESSMENT
// ============================================================================

/**
 * Calculate risk for a specific action
 * @param {BattleState} state - Current state
 * @param {Object} action - Action to evaluate
 * @param {boolean} isPlayer - True if player action
 * @returns {Object} - Risk analysis {level, reasons, probability, aiMoveOdds, critRisk, statusRisks}
 */
function calculateActionRisk(state, action, isPlayer) {
  const risks = [];
  let riskScore = 0;
  const critRisks = [];
  const statusRisks = [];
  const aiMoveAnalysis = { mostLikely: null, odds: {}, influence: [] };

  const attacker = isPlayer ? state.getYourActive() : state.getEnemyActive();
  const defender = isPlayer ? state.getEnemyActive() : state.getYourActive();

  if (action.type === "move" && action.move.damageClass !== "status") {
    // Calculate damage ranges
    const attackerStats = attacker.stats;
    const defenderStats = defender.stats;
    const damage = calculateDamage(
      attacker,
      defender,
      action.move,
      attackerStats,
      defenderStats
    );

    // Analyze AI move selection probabilities (if player is acting)
    if (isPlayer && defender.moveData) {
      aiMoveAnalysis.odds = calculateAIMoveOdds(state, defender, attacker);
    }

    // Check if we can get OHKO'd back
    if (defender.moveData) {
      let maxRetaliation = 0;
      let maxRetaliationMove = null;
      let critRetaliation = 0;

      defender.moveData.forEach((move) => {
        if (move.damageClass !== "status") {
          const retDamage = calculateDamage(
            defender,
            attacker,
            move,
            defenderStats,
            attackerStats
          );

          if (retDamage.max > maxRetaliation) {
            maxRetaliation = retDamage.max;
            maxRetaliationMove = move;
          }

          // Calculate critical hit damage (1.5x in Gen 8)
          const critDamage = Math.floor(retDamage.max * 1.5);
          critRetaliation = Math.max(critRetaliation, critDamage);

          // Check if this move has high crit chance
          const highCritMoves = [
            "stone-edge",
            "shadow-claw",
            "razor-leaf",
            "crabhammer",
            "slash",
            "cross-poison",
            "night-slash",
            "spacial-rend",
            "attack-order",
            "leaf-blade",
            "psycho-cut",
            "blaze-kick",
          ];
          const hasHighCrit = highCritMoves.includes(move.name.toLowerCase());
          const critChance = hasHighCrit ? 0.125 : 0.0625; // 12.5% vs 6.25%

          if (
            critDamage >= attacker.currentHP &&
            retDamage.max < attacker.currentHP
          ) {
            critRisks.push(
              `${capitalize(move.name)} crit OHKO (${Math.round(
                critChance * 100
              )}% chance, ${critDamage} dmg)`
            );
            riskScore += hasHighCrit ? 2 : 1;
          }
        }
      });

      if (maxRetaliation >= attacker.currentHP) {
        risks.push(
          `OHKO risk from ${capitalize(
            maxRetaliationMove?.name || "counter-attack"
          )} (${maxRetaliation} dmg)`
        );
        riskScore += 3;
      } else if (maxRetaliation * 2 >= attacker.currentHP) {
        risks.push(
          `2HKO risk from ${capitalize(
            maxRetaliationMove?.name || "counter-attack"
          )} (${maxRetaliation} dmg)`
        );
        riskScore += 2;
      }

      // Check for status effect risks
      defender.moveData.forEach((move) => {
        if (move.effectChance && move.effectEntries) {
          const effect = move.effectEntries[0] || "";
          const chance = move.effectChance;

          // Check for common status effects
          if (
            effect.toLowerCase().includes("burn") ||
            move.name.toLowerCase().includes("will-o-wisp")
          ) {
            statusRisks.push(`Burn risk (${chance}% chance) - halves attack`);
            riskScore += 1;
          } else if (
            effect.toLowerCase().includes("paralyze") ||
            effect.toLowerCase().includes("paralysis")
          ) {
            statusRisks.push(
              `Paralyze risk (${chance}% chance) - 25% speed, 25% full paralysis`
            );
            riskScore += 1;
          } else if (effect.toLowerCase().includes("poison")) {
            statusRisks.push(
              `Poison risk (${chance}% chance) - ongoing damage`
            );
            riskScore += 0.5;
          } else if (effect.toLowerCase().includes("confus")) {
            statusRisks.push(
              `Confusion risk (${chance}% chance) - 33% self-hit`
            );
            riskScore += 1;
          } else if (
            effect.toLowerCase().includes("flinch") &&
            defenderStats.spe > attackerStats.spe
          ) {
            statusRisks.push(`Flinch risk (${chance}% chance) - can't move`);
            riskScore += 1;
          } else if (effect.toLowerCase().includes("freeze")) {
            statusRisks.push(`Freeze risk (${chance}% chance) - can't move`);
            riskScore += 1.5;
          }
        }
      });
    }

    // Check for kill reliability
    const minDamageKills = damage.min >= defender.currentHP;
    const maxDamageKills = damage.max >= defender.currentHP;

    if (maxDamageKills && !minDamageKills) {
      const killProb = calculateKillProbability(
        damage.min,
        damage.max,
        defender.currentHP
      );
      risks.push(
        `Kill depends on damage roll (${Math.round(killProb * 100)}% chance)`
      );
      riskScore += 1;
    }

    // Check type effectiveness
    if (damage.effectiveness < 1 && damage.effectiveness > 0) {
      risks.push("Resisted attack");
      riskScore += 1;
    } else if (damage.effectiveness === 0) {
      risks.push("Immune to attack");
      riskScore += 5;
    }

    // Check speed (if defender is faster, they hit first)
    if (defenderStats.spe > attackerStats.spe && !minDamageKills) {
      risks.push("Opponent moves first");
      riskScore += 1;
    }

    // Check if our move has secondary effects
    if (action.move.effectChance && action.move.effectEntries) {
      const effect = action.move.effectEntries[0] || "";
      const chance = action.move.effectChance;
      if (
        effect.toLowerCase().includes("flinch") &&
        attackerStats.spe > defenderStats.spe
      ) {
        risks.push(`Flinch chance (${chance}%) - prevents enemy move`);
        riskScore -= 0.5; // This is actually good
      }
    }
  } else if (action.type === "switch") {
    // Switching gives opponent a free hit
    const switchIn = action.pokemon;

    // Analyze AI move selection for the switch-in
    if (isPlayer && defender.moveData) {
      aiMoveAnalysis.odds = calculateAIMoveOdds(state, defender, switchIn);
    }

    if (defender.moveData) {
      let maxDamage = 0;
      let maxDamageMove = null;
      let critDamage = 0;

      defender.moveData.forEach((move) => {
        if (move.damageClass !== "status") {
          const damage = calculateDamage(
            defender,
            switchIn,
            move,
            defender.stats,
            switchIn.stats
          );

          if (damage.max > maxDamage) {
            maxDamage = damage.max;
            maxDamageMove = move;
          }

          const crit = Math.floor(damage.max * 1.5);
          if (crit > critDamage) {
            critDamage = crit;
          }

          if (crit >= switchIn.currentHP && damage.max < switchIn.currentHP) {
            critRisks.push(
              `${capitalize(move.name)} crit can OHKO switch-in (${crit} dmg)`
            );
            riskScore += 1;
          }
        }
      });

      if (maxDamage >= switchIn.currentHP) {
        risks.push(
          `Switch-in OHKO'd by ${capitalize(
            maxDamageMove?.name || "attack"
          )} (${maxDamage} dmg)`
        );
        riskScore += 4;
      } else if (maxDamage * 2 >= switchIn.currentHP) {
        risks.push(
          `Switch-in 2HKO'd by ${capitalize(
            maxDamageMove?.name || "attack"
          )} (${maxDamage} dmg)`
        );
        riskScore += 2;
      }
    }

    risks.push("Free attack for opponent");
    riskScore += 1;
  }

  // Determine risk level
  let level = "low";
  if (riskScore >= 5) level = "high";
  else if (riskScore >= 3) level = "medium";

  return {
    level: level,
    reasons: risks,
    score: riskScore,
    probability: Math.max(0, 1 - riskScore * 0.15),
    critRisks: critRisks,
    statusRisks: statusRisks,
    aiMoveAnalysis: aiMoveAnalysis,
  };
}

/**
 * Calculate AI move selection odds for enemy Pokemon
 * @param {BattleState} state - Current battle state
 * @param {Object} enemy - Enemy Pokemon
 * @param {Object} target - Target Pokemon (player's)
 * @returns {Object} - Move names with selection probabilities and influence tips
 */
function calculateAIMoveOdds(state, enemy, target) {
  if (!enemy.moveData || enemy.moveData.length === 0) {
    return {};
  }

  const enemyIsFaster = enemy.stats.spe >= target.stats.spe;
  const moveOdds = {};
  const influence = [];

  // Simulate AI scoring for each move multiple times to get probability distribution
  const simulations = 1000;
  const moveCounts = {};

  enemy.moveData.forEach((move) => {
    moveCounts[move.name] = 0;
  });

  // Run simulations
  for (let i = 0; i < simulations; i++) {
    const moveScores = enemy.moveData.map((move) => {
      let score = 0;
      let rolledDamage = 0;

      if (move.damageClass === "status") {
        score = 6;
      } else {
        const damage = calculateDamage(
          enemy,
          target,
          move,
          enemy.stats,
          target.stats
        );
        const damageRange = damage.max - damage.min;
        const roll = Math.floor(Math.random() * 16);
        rolledDamage = damage.min + Math.floor((damageRange * roll) / 15);

        return { move, score, rolledDamage, damage };
      }

      return { move, score, rolledDamage: 0 };
    });

    // Find highest rolled damage
    let maxRolled = -1;
    moveScores.forEach((ms) => {
      if (ms.rolledDamage > maxRolled) {
        maxRolled = ms.rolledDamage;
      }
    });

    // Assign scores
    moveScores.forEach((ms) => {
      if (ms.damage) {
        const isHighest = ms.rolledDamage === maxRolled && maxRolled > 0;
        const kills = ms.rolledDamage >= target.currentHP;

        if (isHighest) {
          ms.score = Math.random() < 0.8 ? 6 : 8;
        }

        if (kills) {
          ms.score += enemyIsFaster ? 6 : 3;
        }
      }
    });

    // Select highest scoring move
    const maxScore = Math.max(...moveScores.map((ms) => ms.score));
    const bestMoves = moveScores.filter((ms) => ms.score === maxScore);
    const selected = bestMoves[Math.floor(Math.random() * bestMoves.length)];

    moveCounts[selected.move.name]++;
  }

  // Calculate percentages
  enemy.moveData.forEach((move) => {
    const percentage = (moveCounts[move.name] / simulations) * 100;
    moveOdds[move.name] = Math.round(percentage * 10) / 10; // Round to 1 decimal
  });

  // Add influence tips
  const sortedMoves = Object.entries(moveOdds).sort((a, b) => b[1] - a[1]);
  const mostLikely = sortedMoves[0];

  if (mostLikely[1] > 70) {
    influence.push(
      `${mostLikely[0]} is highly likely (${mostLikely[1]}%) - AI sees it as strongest`
    );
  } else if (
    sortedMoves.length > 1 &&
    Math.abs(sortedMoves[0][1] - sortedMoves[1][1]) < 10
  ) {
    influence.push(
      `Close decision between ${sortedMoves[0][0]} and ${sortedMoves[1][0]} due to similar damage rolls`
    );
  }

  // Check if changing HP would influence decision
  enemy.moveData.forEach((move) => {
    if (move.damageClass !== "status") {
      const damage = calculateDamage(
        enemy,
        target,
        move,
        enemy.stats,
        target.stats
      );
      if (damage.max >= target.currentHP && damage.min < target.currentHP) {
        influence.push(
          `Staying above ${damage.min} HP prevents guaranteed ${move.name} selection`
        );
      }
    }
  });

  return {
    odds: moveOdds,
    influence: influence,
    mostLikely: mostLikely[0],
  };
}

/**
 * Calculate damage roll probabilities
 * @param {number} minDamage - Minimum damage
 * @param {number} maxDamage - Maximum damage
 * @param {number} threshold - HP threshold to check
 * @returns {number} - Probability of exceeding threshold (0-1)
 */
function calculateKillProbability(minDamage, maxDamage, threshold) {
  if (minDamage >= threshold) return 1.0; // Always kills
  if (maxDamage < threshold) return 0.0; // Never kills

  // Linear approximation of damage roll distribution
  // Damage rolls are uniform between min and max
  const killRange = maxDamage - threshold;
  const totalRange = maxDamage - minDamage;

  return killRange / totalRange;
}

// ============================================================================
// ============================================================================
// LOOKAHEAD & STRATEGY OPTIMIZATION
// ============================================================================

/**
 * Enemy AI: Select action based on Run & Bun AI scoring system
 * Implements probability-based move scoring as per AI specification
 * @param {BattleState} state - Current state
 * @returns {Object} - Selected action
 */
function selectEnemyAction(state) {
  const enemyActive = state.getEnemyActive();
  const yourActive = state.getYourActive();
  const actions = generatePossibleActions(state, false);

  if (actions.length === 0) return null;

  // Enemy NEVER switches voluntarily - only uses moves
  // (Forced switches after fainting are handled separately by handleForcedSwitch)
  const moveActions = actions.filter((a) => a.type === "move");

  if (moveActions.length === 0) {
    // No moves available (shouldn't happen in normal gameplay)
    return null;
  }

  // Check if AI is slower and gets killed by player (for priority move bonus)
  const enemyIsFaster = enemyActive.stats.spe >= yourActive.stats.spe; // AI sees ties as faster
  let aiDiestoPlayer = false;

  if (!enemyIsFaster && yourActive.moveData) {
    yourActive.moveData.forEach((move) => {
      if (move.damageClass !== "status") {
        const damage = calculateDamage(
          yourActive,
          enemyActive,
          move,
          yourActive.stats,
          enemyActive.stats
        );
        if (damage.average >= enemyActive.currentHP) {
          aiDiestoPlayer = true;
        }
      }
    });
  }

  // Calculate scores for each move according to Run & Bun AI specification
  const moveScores = moveActions.map((action) => {
    let score = 0;
    let rolledDamage = 0;

    if (action.move.damageClass === "status") {
      // Status moves default to +6
      score = 6;
    } else {
      // Damaging moves: calculate damage range
      const damage = calculateDamage(
        enemyActive,
        yourActive,
        action.move,
        enemyActive.stats,
        yourActive.stats
      );

      // AI rolls a random damage value between min and max (16 possible rolls)
      // This simulates the 85%-100% random multiplier in damage calculation
      const damageRange = damage.max - damage.min;
      const roll = Math.floor(Math.random() * 16); // 0-15
      rolledDamage = damage.min + Math.floor((damageRange * roll) / 15);

      // Store both damage info and rolled value
      action._damageInfo = damage;
      action._rolledDamage = rolledDamage;
      score = 0; // Will be set if this is highest rolled damage move
    }

    return { action, score, rolledDamage, damageInfo: action._damageInfo };
  });

  // Find highest rolled damage value(s)
  // All moves that rolled the same highest damage get the "highest damage" score
  let maxRolledDamage = -1;
  moveScores.forEach((ms) => {
    if (ms.rolledDamage > maxRolledDamage) {
      maxRolledDamage = ms.rolledDamage;
    }
  });

  // Assign scores to moves
  moveScores.forEach((ms) => {
    if (ms.damageInfo) {
      const isHighestDamage =
        ms.rolledDamage === maxRolledDamage && maxRolledDamage > 0;
      const moveKills = ms.rolledDamage >= yourActive.currentHP;
      const hasPriority =
        ms.action.move.priority && ms.action.move.priority > 0;

      if (isHighestDamage) {
        // Highest damaging move (by rolled damage): +6 (80%), +8 (20%)
        ms.score = Math.random() < 0.8 ? 6 : 8;
      }

      if (moveKills) {
        // Kill bonus
        if (enemyIsFaster || (!enemyIsFaster && hasPriority)) {
          // Fast kill (AI faster OR has priority while slower): additional +6
          ms.score += 6;
        } else {
          // Slow kill (AI slower, no priority): additional +3
          ms.score += 3;
        }

        // Moxie/Beast Boost/Chilling Neigh/Grim Neigh bonus
        const boostAbilities = [
          "moxie",
          "beast-boost",
          "chilling-neigh",
          "grim-neigh",
        ];
        if (
          enemyActive.ability &&
          boostAbilities.includes(enemyActive.ability.toLowerCase())
        ) {
          ms.score += 1;
        }
      }

      // Priority move bonus: If AI is slower and dead to player, priority moves get +11
      if (hasPriority && aiDiestoPlayer && !enemyIsFaster) {
        ms.score += 11;
      }

      // High crit chance + Super Effective bonus: +1 (50% chance)
      const highCritMoves = [
        "stone-edge",
        "shadow-claw",
        "razor-leaf",
        "crabhammer",
        "slash",
        "cross-poison",
        "night-slash",
        "spacial-rend",
        "attack-order",
        "leaf-blade",
        "psycho-cut",
        "blaze-kick",
      ];
      const hasHighCrit =
        highCritMoves.includes(ms.action.move.name.toLowerCase()) ||
        (ms.action.move.name &&
          ms.action.move.name.toLowerCase().includes("crit"));
      const isSuperEffective = ms.damageInfo.effectiveness > 1;

      if (hasHighCrit && isSuperEffective && Math.random() < 0.5) {
        ms.score += 1;
      }
    }
  });

  // Find all moves with highest score
  const maxScore = Math.max(...moveScores.map((ms) => ms.score));
  const bestMoves = moveScores.filter((ms) => ms.score === maxScore);

  // Randomly select from moves with highest score
  const selected = bestMoves[Math.floor(Math.random() * bestMoves.length)];

  return selected.action;
}

/**
 * Explain why an action was chosen
 * @param {BattleState} state - Current battle state
 * @param {Object} action - Action being taken
 * @param {boolean} isPlayer - True if player action
 * @returns {string} - Explanation text
 */
function explainAction(state, action, isPlayer) {
  if (!isPlayer) return ""; // Only explain player actions

  const yourActive = state.getYourActive();
  const enemyActive = state.getEnemyActive();

  if (action.type === "switch") {
    const switchTarget = action.pokemon;
    const matchupScore = calculateSwitchInScore(switchTarget, enemyActive);

    if (matchupScore >= 4) {
      return `💡 Switching to ${capitalize(
        switchTarget.name
      )} for a favorable matchup (faster and can 2HKO+)`;
    } else if (matchupScore >= 2) {
      return `💡 Switching to ${capitalize(
        switchTarget.name
      )} for better positioning`;
    } else if (matchupScore <= -1) {
      return `⚠️ Defensive switch to ${capitalize(
        switchTarget.name
      )} to avoid OHKO`;
    } else {
      return `Switching to ${capitalize(switchTarget.name)}`;
    }
  } else if (action.type === "move" && action.move.damageClass !== "status") {
    // Check if this move secures a KO
    const yourStats = yourActive.stats;
    const enemyStats = enemyActive.stats;
    const damage = calculateDamage(
      yourActive,
      enemyActive,
      action.move,
      yourStats,
      enemyStats
    );

    if (damage.min >= enemyActive.currentHP) {
      return `✅ GUARANTEED KO - ${capitalize(action.move.name)} deals ${
        damage.min
      }-${damage.max} damage vs ${enemyActive.currentHP} HP`;
    } else if (damage.average >= enemyActive.currentHP) {
      return `🎯 LIKELY KO - ${capitalize(
        action.move.name
      )} averages ${Math.floor(damage.average)} damage vs ${
        enemyActive.currentHP
      } HP`;
    } else if (damage.max >= enemyActive.currentHP) {
      return `🎲 POSSIBLE KO - ${capitalize(action.move.name)} max rolls ${
        damage.max
      } vs ${enemyActive.currentHP} HP`;
    } else {
      const damagePercent = Math.floor(
        (damage.average / enemyActive.currentHP) * 100
      );
      return `📊 Chip damage - ${capitalize(
        action.move.name
      )} deals ~${damagePercent}% (${Math.floor(damage.average)} damage)`;
    }
  } else if (action.type === "move") {
    // Status move
    const moveName = action.move.name.toLowerCase();
    if (
      moveName === "hypnosis" ||
      moveName === "sleep-powder" ||
      moveName === "spore"
    ) {
      return `💤 Status move - Putting ${capitalize(
        enemyActive.name
      )} to sleep`;
    } else if (moveName === "thunder-wave" || moveName === "stun-spore") {
      return `⚡ Status move - Paralyzing ${capitalize(
        enemyActive.name
      )} (speed cut, 25% para chance)`;
    } else if (moveName === "will-o-wisp") {
      return `🔥 Status move - Burning ${capitalize(
        enemyActive.name
      )} (halves attack)`;
    } else if (moveName === "toxic") {
      return `☠️ Status move - Badly poisoning ${capitalize(
        enemyActive.name
      )} (increasing damage)`;
    } else {
      return `Using ${capitalize(action.move.name)}`;
    }
  }

  return "";
}

// STRATEGY CALCULATION & TURN PLANNING
// ============================================================================

/**
 * Find optimal strategy path with minimal risk
 * @param {BattleState} initialState - Starting state
 * @param {number} maxDepth - Maximum turns to look ahead
 * @returns {Array} - Array of {turn, action, risk, reasoning} objects
 */
function findOptimalStrategy(initialState, maxDepth = 10) {
  const strategy = [];
  let currentState = initialState.clone();
  let turnCount = 0;

  while (turnCount < maxDepth) {
    turnCount++;

    // Check if battle is over
    const yourAlive = currentState.yourTeam.filter((p) => !p.fainted).length;
    const enemyAlive = currentState.enemyTeam.filter((p) => !p.fainted).length;

    if (yourAlive === 0 || enemyAlive === 0) {
      break;
    }

    // Player uses lookahead to find best action
    const yourResult = findBestActionWithLookahead(currentState, true, 2);
    const yourAction = yourResult.action;

    if (!yourAction) break;

    // Generate reasoning for this action
    const reasoning = explainAction(currentState, yourAction, true);

    // Enemy uses simple AI (no lookahead, follows move selection rules)
    const enemyAction = selectEnemyAction(currentState);

    if (!enemyAction) break;

    // Calculate risk for player action
    const risk = calculateActionRisk(currentState, yourAction, true);

    // Execute turn
    const result = simulateTurn(currentState, yourAction, enemyAction);
    currentState = result.state;

    // Handle forced switches
    if (currentState.getYourActive().fainted) {
      const switchEvent = handleForcedSwitch(currentState, true);
      if (switchEvent) result.events.push(switchEvent);
    }

    if (currentState.getEnemyActive().fainted) {
      const switchEvent = handleForcedSwitch(currentState, false);
      if (switchEvent) result.events.push(switchEvent);
    }

    // Add to strategy
    strategy.push({
      turn: currentState.turnCount,
      action: yourAction,
      events: result.events,
      risk: risk,
      reasoning: reasoning,
      state: currentState.clone(),
    });
  }

  return strategy;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

document
  .getElementById("calculateBtn")
  .addEventListener("click", calculateStrategy);

/**
 * Calculate battle strategy
 */
async function calculateStrategy() {
  hideError();

  // Get selected leads
  yourLeadIndex = parseInt(document.getElementById("leadSelect").value);
  enemyLeadIndex = parseInt(document.getElementById("enemyLeadSelect").value);

  if (isNaN(yourLeadIndex) || isNaN(enemyLeadIndex)) {
    showError("Please select lead Pokémon for both teams!");
    return;
  }

  showLoading();

  try {
    // Step 1: Load all move data
    console.log("Loading move data...");
    const moveDataMap = await loadAllMoveData(yourTeam, enemyTeam);

    // Step 2: Attach move data to all Pokemon
    [...yourTeam, ...enemyTeam].forEach((pokemon) => {
      attachMoveData(pokemon, moveDataMap);
    });

    // Step 3: Initialize battle state
    console.log("Initializing battle state...");
    const initialState = new BattleState(
      yourTeam,
      enemyTeam,
      yourLeadIndex,
      enemyLeadIndex
    );

    // Display initial battle state
    displayBattleState(initialState);

    // Step 4: Run optimized battle simulation with lookahead
    console.log("Running optimized battle simulation with lookahead...");

    const strategy = findOptimalStrategy(initialState, 20);

    // Step 4.5: Run worst-case scenario analysis
    console.log("Running worst-case scenario analysis...");
    const worstCase = calculateWorstCaseStrategy(initialState, 20);

    // Convert strategy to timeline format
    const timeline = strategy.map((step) => {
      const action = step.action;
      const actionText =
        action.type === "move"
          ? `Use ${capitalize(action.move.name)}`
          : `Switch to ${capitalize(action.pokemon.name)}`;

      const reasoningText = step.reasoning
        ? `<p style="background: #2d3748; padding: 8px; border-left: 3px solid #4299e1; margin: 5px 0;"><strong style="color: #4299e1;">Why this action?</strong><br>${step.reasoning}</p>`
        : "";

      const riskReasons =
        step.risk.reasons.length > 0
          ? `<p><strong>Risks:</strong> ${step.risk.reasons.join(", ")}</p>`
          : "";

      return {
        turn: step.turn,
        action: actionText,
        details:
          reasoningText +
          step.events.map((e) => `<p>${e.text}</p>`).join("") +
          riskReasons,
        risk: step.risk.level,
        critRisks: step.risk.critRisks || [],
        statusRisks: step.risk.statusRisks || [],
        aiMoveAnalysis: step.risk.aiMoveAnalysis || {},
      };
    });

    // Convert worst-case strategy to timeline format
    const worstCaseTimeline = worstCase.strategy.map((step) => {
      const action = step.action;
      const actionText =
        action.type === "move"
          ? `Use ${capitalize(action.move.name)}`
          : `Switch to ${capitalize(action.pokemon.name)}`;

      let deathText = "";
      if (step.yourDeathsThisTurn > 0) {
        deathText = `<p style="color: #d32f2f; font-weight: bold;">💀 ${step.yourDeathsThisTurn} of your Pokémon fainted this turn!</p>`;
      }

      return {
        turn: step.turn,
        action: actionText,
        details:
          step.events.map((e) => `<p>${e.text}</p>`).join("") + deathText,
        risk: "worst-case",
      };
    });

    // Get final state
    const currentState =
      strategy.length > 0 ? strategy[strategy.length - 1].state : initialState;

    // Display final battle state
    displayBattleState(currentState);

    // Step 5: Analyze results
    const yourAlive = currentState.yourTeam.filter((p) => !p.fainted).length;
    const enemyAlive = currentState.enemyTeam.filter((p) => !p.fainted).length;
    const yourDeaths = currentState.yourTeam.filter((p) => p.fainted).length;

    let riskLevel = "Low";
    if (yourDeaths >= 3) riskLevel = "High";
    else if (yourDeaths >= 1) riskLevel = "Medium";

    const analysis = {
      riskLevel: riskLevel,
      expectedDeaths: yourDeaths,
      turnCount: currentState.turnCount,
      victory: enemyAlive === 0,
      worstCaseDeaths: worstCase.yourDeaths,
      worstCaseWin: worstCase.weWin,
      worstCaseLoss: worstCase.weLose,
      worstCaseTier: worstCase.riskTier,
    };

    // Display results with both timelines
    displayStrategyResults(timeline, analysis, worstCaseTimeline);

    hideLoading();

    console.log("Strategy calculation complete!");
  } catch (error) {
    hideLoading();
    console.error("Error calculating strategy:", error);
    showError(`Error calculating strategy: ${error.message}`);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener("DOMContentLoaded", () => {
  if (loadTeamData()) {
    displayTeams(yourTeam, enemyTeam);
  }
});
