/**
 * Risk Calculator
 * Calculates risk levels and probabilities for battle actions
 */

import { calculateDamage } from "../core/damage-calculator.js";
import { capitalize } from "../ui/battle-formatter.js";

/**
 * Calculate risk for a specific action
 * @param {BattleState} state - Current state
 * @param {Object} action - Action to evaluate
 * @param {boolean} isPlayer - True if player action
 * @returns {Object} - Risk analysis {level, reasons, probability, aiMoveOdds, critRisk, statusRisks}
 */
export function calculateActionRisk(state, action, isPlayer) {
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
export function calculateAIMoveOdds(state, enemy, target) {
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
export function calculateKillProbability(minDamage, maxDamage, threshold) {
  if (minDamage >= threshold) return 1.0; // Always kills
  if (maxDamage < threshold) return 0.0; // Never kills

  // Linear approximation of damage roll distribution
  // Damage rolls are uniform between min and max
  const killRange = maxDamage - threshold;
  const totalRange = maxDamage - minDamage;

  return killRange / totalRange;
}
