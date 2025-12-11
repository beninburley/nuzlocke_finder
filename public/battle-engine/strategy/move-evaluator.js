import { calculateDamage } from "../core/damage-calculator.js";
import { getTypeEffectiveness } from "../core/type-effectiveness.js";

/**
 * Evaluates all possible moves for a Pokémon and ranks them
 * Returns an array of evaluated actions with scores
 */
export function evaluateAllActions(attacker, defender, playerTeam, enemyTeam) {
  const evaluations = [];

  // Evaluate all moves
  attacker.moves.forEach((move, index) => {
    const evaluation = evaluateMove(
      attacker,
      defender,
      move,
      playerTeam,
      enemyTeam
    );
    evaluations.push({
      type: "move",
      moveIndex: index,
      move: move,
      ...evaluation,
    });
  });

  // Evaluate switches (only non-fainted team members, excluding current)
  playerTeam.forEach((pokemon, index) => {
    if (pokemon.currentHP > 0 && index !== attacker.teamIndex) {
      const evaluation = evaluateSwitch(
        attacker,
        defender,
        pokemon,
        playerTeam,
        enemyTeam
      );
      evaluations.push({
        type: "switch",
        targetIndex: index,
        pokemon: pokemon,
        ...evaluation,
      });
    }
  });

  // Sort by score (highest first)
  evaluations.sort((a, b) => b.score - a.score);

  return evaluations;
}

/**
 * Evaluates a single move action
 */
function evaluateMove(attacker, defender, move, playerTeam, enemyTeam) {
  let score = 0;
  const reasons = [];

  // Base evaluation components
  const damageEval = evaluateDamage(attacker, defender, move);
  const speedEval = evaluateSpeed(attacker, defender);
  const typeEval = evaluateTypeMatchup(attacker, defender);
  const survivalEval = evaluateSurvival(attacker, defender, move);

  // Damage potential (30% weight)
  score += damageEval.score * 0.3;
  if (damageEval.reason) reasons.push(damageEval.reason);

  // Speed advantage (15% weight)
  score += speedEval.score * 0.15;
  if (speedEval.reason) reasons.push(speedEval.reason);

  // Type matchup (20% weight)
  score += typeEval.score * 0.2;
  if (typeEval.reason) reasons.push(typeEval.reason);

  // Survival/Safety (35% weight)
  score += survivalEval.score * 0.35;
  if (survivalEval.reason) reasons.push(survivalEval.reason);

  return {
    score: Math.round(score),
    reasons: reasons,
    details: {
      damage: damageEval,
      speed: speedEval,
      type: typeEval,
      survival: survivalEval,
    },
  };
}

/**
 * Evaluates a switch action
 */
function evaluateSwitch(
  currentPokemon,
  defender,
  switchTarget,
  playerTeam,
  enemyTeam
) {
  let score = 50; // Baseline for switches
  const reasons = [];

  // Check if current Pokémon is in danger
  const currentDanger = assessThreat(defender, currentPokemon);
  if (currentDanger > 70) {
    score += 30;
    reasons.push("Current Pokémon is in danger");
  }

  // Check type advantage of switch target
  const typeAdvantage = calculateTypeAdvantageScore(switchTarget, defender);
  score += typeAdvantage * 0.5;
  if (typeAdvantage > 50) {
    reasons.push("Better type matchup");
  }

  // Check HP of switch target
  const hpPercent = (switchTarget.currentHP / switchTarget.maxHP) * 100;
  if (hpPercent < 30) {
    score -= 40;
    reasons.push("Switch target is low on HP");
  } else if (hpPercent === 100) {
    score += 10;
    reasons.push("Switch target at full HP");
  }

  // Check if current Pokémon can still be useful
  const currentHpPercent =
    (currentPokemon.currentHP / currentPokemon.maxHP) * 100;
  if (currentHpPercent > 70) {
    score -= 20;
    reasons.push("Current Pokémon still healthy");
  }

  // Momentum loss penalty (switching gives opponent free turn)
  score -= 15;
  reasons.push("Loses tempo");

  return {
    score: Math.round(score),
    reasons: reasons,
  };
}

/**
 * Evaluate damage potential of a move
 */
function evaluateDamage(attacker, defender, move) {
  let score = 0;
  let reason = "";

  if (!move.power) {
    // Status move
    if (move.damage_class?.name === "status") {
      score = 40;
      reason = "Status move (utility)";
    }
    return { score, reason };
  }

  // Calculate potential damage
  const damageResult = calculateDamage(
    attacker,
    defender,
    move,
    attacker.stats,
    defender.stats
  );
  const avgDamage = (damageResult.min + damageResult.max) / 2;
  const damagePercent = (avgDamage / defender.currentHP) * 100;

  // Score based on damage percent
  if (damagePercent >= 100) {
    score = 100;
    reason = `Guaranteed KO (${Math.round(avgDamage)} damage)`;
  } else if (damagePercent >= 80) {
    score = 95;
    reason = `Near KO (${Math.round(damagePercent)}% of HP)`;
  } else if (damagePercent >= 50) {
    score = 80;
    reason = `Heavy damage (${Math.round(damagePercent)}% of HP)`;
  } else if (damagePercent >= 30) {
    score = 60;
    reason = `Solid damage (${Math.round(damagePercent)}% of HP)`;
  } else if (damagePercent >= 15) {
    score = 40;
    reason = `Moderate damage (${Math.round(damagePercent)}% of HP)`;
  } else {
    score = 20;
    reason = `Low damage (${Math.round(damagePercent)}% of HP)`;
  }

  return { score, reason, damagePercent, avgDamage };
}

/**
 * Evaluate speed advantage
 */
function evaluateSpeed(attacker, defender) {
  const attackerSpeed = attacker.stats.speed;
  const defenderSpeed = defender.stats.speed;

  let score = 50; // Neutral
  let reason = "";

  if (attackerSpeed > defenderSpeed * 1.1) {
    score = 80;
    reason = "Outspeeds opponent";
  } else if (attackerSpeed > defenderSpeed) {
    score = 65;
    reason = "Slightly faster";
  } else if (attackerSpeed * 1.1 < defenderSpeed) {
    score = 20;
    reason = "Much slower";
  } else {
    score = 35;
    reason = "Slower";
  }

  return { score, reason };
}

/**
 * Evaluate type matchup
 */
function evaluateTypeMatchup(attacker, defender) {
  let score = 50;
  let reason = "";

  // Check defensive typing
  const defensiveAdvantage = calculateTypeAdvantageScore(attacker, defender);

  if (defensiveAdvantage > 70) {
    score = 80;
    reason = "Favorable type matchup";
  } else if (defensiveAdvantage > 50) {
    score = 60;
    reason = "Decent type matchup";
  } else if (defensiveAdvantage < 30) {
    score = 20;
    reason = "Poor type matchup";
  } else {
    score = 40;
    reason = "Neutral type matchup";
  }

  return { score, reason };
}

/**
 * Evaluate survival/safety of staying in
 */
function evaluateSurvival(attacker, defender, move) {
  let score = 50;
  let reason = "";

  const currentHpPercent = (attacker.currentHP / attacker.maxHP) * 100;
  const threat = assessThreat(defender, attacker);

  // If we're low on HP and threatened
  if (currentHpPercent < 25 && threat > 70) {
    score = 10;
    reason = "Critical HP - high risk of KO";
  } else if (currentHpPercent < 50 && threat > 80) {
    score = 30;
    reason = "Low HP - vulnerable position";
  } else if (currentHpPercent > 75 && threat < 50) {
    score = 90;
    reason = "Safe position - good HP";
  } else if (threat < 30) {
    score = 80;
    reason = "Opponent poses little threat";
  } else {
    score = 50;
    reason = "Moderate risk";
  }

  return { score, reason, currentHpPercent, threat };
}

/**
 * Assess how threatening the defender is to the attacker
 */
function assessThreat(attacker, defender) {
  let threat = 0;

  // Check attacker's strongest move against defender
  let maxDamagePercent = 0;

  for (const move of attacker.moves) {
    if (move.power) {
      const damageResult = calculateDamage(
        attacker,
        defender,
        move,
        attacker.stats,
        defender.stats
      );
      const avgDamage = (damageResult.min + damageResult.max) / 2;
      const damagePercent = (avgDamage / defender.currentHP) * 100;
      maxDamagePercent = Math.max(maxDamagePercent, damagePercent);
    }
  }

  // Threat based on potential damage
  if (maxDamagePercent >= 100) {
    threat = 100;
  } else if (maxDamagePercent >= 75) {
    threat = 90;
  } else if (maxDamagePercent >= 50) {
    threat = 70;
  } else if (maxDamagePercent >= 30) {
    threat = 50;
  } else {
    threat = 30;
  }

  return threat;
}

/**
 * Calculate type advantage score (0-100)
 */
function calculateTypeAdvantageScore(pokemon, opponent) {
  let score = 50; // Neutral baseline

  // Check how well pokemon resists opponent's types
  let totalEffectiveness = 0;
  let moveCount = 0;

  for (const move of opponent.moves) {
    if (move.type) {
      const effectiveness = getTypeEffectiveness(move.type.name, pokemon.types);
      totalEffectiveness += effectiveness;
      moveCount++;
    }
  }

  if (moveCount > 0) {
    const avgEffectiveness = totalEffectiveness / moveCount;

    // Lower effectiveness = better defensive position
    if (avgEffectiveness < 0.5) {
      score = 90; // Resists well
    } else if (avgEffectiveness < 1.0) {
      score = 70; // Some resistance
    } else if (avgEffectiveness > 2.0) {
      score = 20; // Very weak
    } else if (avgEffectiveness > 1.0) {
      score = 35; // Weak
    }
  }

  return score;
}

/**
 * Classify the move based on how it compares to the best move
 */
export function classifyMove(chosenAction, allEvaluations) {
  const bestScore = allEvaluations[0].score;
  const chosenScore = chosenAction.score;
  const scoreDiff = bestScore - chosenScore;

  let classification = "";
  let symbol = "";
  let cssClass = "";

  if (scoreDiff <= 3) {
    // Within 3 points of best
    classification = "Best Move";
    symbol = "!!";
    cssClass = "best";
  } else if (scoreDiff <= 10) {
    // Within 10 points
    classification = "Excellent Move";
    symbol = "!";
    cssClass = "excellent";
  } else if (scoreDiff <= 20) {
    // Within 20 points
    classification = "Good Move";
    symbol = "";
    cssClass = "good";
  } else if (scoreDiff <= 35) {
    // Within 35 points
    classification = "Inaccuracy";
    symbol = "?!";
    cssClass = "inaccuracy";
  } else if (scoreDiff <= 50) {
    // Within 50 points
    classification = "Mistake";
    symbol = "?";
    cssClass = "mistake";
  } else {
    // More than 50 points worse
    classification = "Blunder";
    symbol = "??";
    cssClass = "blunder";
  }

  return {
    classification,
    symbol,
    cssClass,
    scoreDiff,
    chosenScore,
    bestScore,
  };
}
