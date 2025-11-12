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
 * Simulate battle with worst-case assumptions
 * @param {BattleState} state - Initial battle state
 * @param {Object} yourAction - Player's action
 * @param {Object} enemyAction - Enemy's action
 * @returns {Object} - Turn result with worst-case damage
 */
function simulateTurnWorstCase(state, yourAction, enemyAction) {
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

/**
 * Display teams on the page
 */
function displayTeams() {
  displayYourTeam();
  displayEnemyTeam();
  populateLeadSelectors();
}

/**
 * Display your team
 */
function displayYourTeam() {
  const container = document.getElementById("yourTeamDisplay");

  if (yourTeam.length === 0) {
    container.innerHTML =
      '<p class="no-team-message">No team loaded. Please build a team first.</p>';
    return;
  }

  container.innerHTML = "";
  yourTeam.forEach((pokemon, index) => {
    const card = createTeamCard(pokemon, index);
    container.appendChild(card);
  });
}

/**
 * Display enemy team
 */
function displayEnemyTeam() {
  const container = document.getElementById("enemyTeamDisplay");

  if (enemyTeam.length === 0) {
    container.innerHTML =
      '<p class="no-team-message">No enemy team loaded. Please add an enemy team first.</p>';
    return;
  }

  container.innerHTML = "";
  enemyTeam.forEach((pokemon, index) => {
    const card = createTeamCard(pokemon, index);
    container.appendChild(card);
  });
}

/**
 * Create a team card element
 */
function createTeamCard(pokemon, index) {
  const card = document.createElement("div");
  card.className = "team-pokemon-card";

  const typesBadges = pokemon.types
    .map((type) => `<span class="type-badge">${type}</span>`)
    .join("");

  card.innerHTML = `
    <img src="${pokemon.sprite}" alt="${pokemon.name}">
    <p class="pokemon-name">${capitalize(pokemon.name)}</p>
    <p class="pokemon-level">Lv. ${pokemon.level || 100}</p>
    <div class="pokemon-types">${typesBadges}</div>
  `;

  return card;
}

/**
 * Populate lead Pokemon selectors
 */
function populateLeadSelectors() {
  const yourLeadSelect = document.getElementById("leadSelect");
  const enemyLeadSelect = document.getElementById("enemyLeadSelect");

  // Clear existing options (except the first one)
  yourLeadSelect.innerHTML = '<option value="">Select your lead...</option>';
  enemyLeadSelect.innerHTML = '<option value="">Select enemy lead...</option>';

  // Add your team
  yourTeam.forEach((pokemon, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${capitalize(pokemon.name)} (Lv. ${
      pokemon.level || 100
    })`;
    yourLeadSelect.appendChild(option);
  });

  // Add enemy team
  enemyTeam.forEach((pokemon, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${capitalize(pokemon.name)} (Lv. ${
      pokemon.level || 100
    })`;
    enemyLeadSelect.appendChild(option);
  });
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
}

function hideError() {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.style.display = "none";
}

function showLoading() {
  const loadingDiv = document.getElementById("loadingIndicator");
  loadingDiv.style.display = "block";
}

function hideLoading() {
  const loadingDiv = document.getElementById("loadingIndicator");
  loadingDiv.style.display = "none";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// MOVE DATA FETCHING
// ============================================================================

/**
 * Fetch move data from API
 * @param {string} moveName - Name of the move
 * @returns {Promise<Object>} - Move data including power, type, accuracy, damageClass
 */
async function fetchMoveData(moveName) {
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
 * @returns {Promise<Object>} - Object with move data for all moves
 */
async function loadAllMoveData() {
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
function attachMoveData(pokemon, moveDataMap) {
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

// ============================================================================
// AI SWITCH-IN SCORING SYSTEM
// ============================================================================

/**
 * Calculate switch-in score for a Pokemon against the enemy active
 * Scoring system:
 * +5: Faster and can OHKO
 * +4: Faster and can 2HKO
 * +3: Faster, survives a hit, deals good damage
 * +2: Slower but can OHKO
 * +1: Slower, survives a hit, deals moderate damage
 *  0: Neutral matchup
 * -1: Slower and gets OHKO'd
 *
 * @param {Object} switchIn - Pokemon considering switching in
 * @param {Object} enemyActive - Current enemy active Pokemon
 * @returns {number} - Score from -1 to +5
 */
function calculateSwitchInScore(switchIn, enemyActive) {
  if (!switchIn || !enemyActive || switchIn.fainted) {
    return -999; // Invalid switch
  }

  const switchInStats = switchIn.stats;
  const enemyStats = enemyActive.stats;

  // Determine who is faster
  const isFaster = switchInStats.spe > enemyStats.spe;

  // Calculate best damage switch-in can deal to enemy
  let maxDamageToEnemy = 0;
  if (switchIn.moveData && switchIn.moveData.length > 0) {
    switchIn.moveData.forEach((move) => {
      const damage = calculateDamage(
        switchIn,
        enemyActive,
        move,
        switchInStats,
        enemyStats
      );
      maxDamageToEnemy = Math.max(maxDamageToEnemy, damage.max);
    });
  }

  // Calculate best damage enemy can deal to switch-in
  let maxDamageFromEnemy = 0;
  if (enemyActive.moveData && enemyActive.moveData.length > 0) {
    enemyActive.moveData.forEach((move) => {
      const damage = calculateDamage(
        enemyActive,
        switchIn,
        move,
        enemyStats,
        switchInStats
      );
      maxDamageFromEnemy = Math.max(maxDamageFromEnemy, damage.max);
    });
  }

  const canOHKO = maxDamageToEnemy >= enemyActive.currentHP;
  const can2HKO = maxDamageToEnemy * 2 >= enemyActive.currentHP;
  const getsOHKOd = maxDamageFromEnemy >= switchIn.currentHP;
  const survivesHit = !getsOHKOd;
  const damagePercent = (maxDamageToEnemy / enemyActive.currentHP) * 100;

  // Apply scoring system
  if (isFaster && canOHKO) return 5;
  if (isFaster && can2HKO) return 4;
  if (isFaster && survivesHit && damagePercent > 30) return 3;
  if (!isFaster && canOHKO) return 2;
  if (!isFaster && survivesHit && damagePercent > 20) return 1;
  if (!isFaster && getsOHKOd) return -1;

  return 0; // Neutral matchup
}

/**
 * Find best switch-in from team
 * @param {Array} team - Team of Pokemon
 * @param {number} currentActiveIndex - Current active Pokemon index
 * @param {Object} enemyActive - Enemy active Pokemon
 * @returns {Object} - {index, score, pokemon}
 */
function findBestSwitchIn(team, currentActiveIndex, enemyActive) {
  let bestScore = -999;
  let bestIndex = -1;
  let bestPokemon = null;

  team.forEach((pokemon, index) => {
    if (index === currentActiveIndex || pokemon.fainted) return;

    const score = calculateSwitchInScore(pokemon, enemyActive);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
      bestPokemon = pokemon;
    }
  });

  return { index: bestIndex, score: bestScore, pokemon: bestPokemon };
}

// ============================================================================
// ACTION GENERATION
// ============================================================================

/**
 * Generate all possible actions for a turn
 * @param {BattleState} state - Current battle state
 * @param {boolean} isPlayer - True if generating actions for player
 * @returns {Array} - Array of action objects
 */
function generatePossibleActions(state, isPlayer) {
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

// ============================================================================
// TURN SIMULATION
// ============================================================================

/**
 * Apply status effect to a Pokemon
 * @param {Object} pokemon - Pokemon to afflict
 * @param {string} status - Status to apply ('sleep', 'paralysis', 'burn', 'poison', 'freeze', 'toxic')
 * @param {Array} events - Events array to add messages to
 * @returns {boolean} - True if status was applied
 */
function applyStatusEffect(pokemon, status, events) {
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
 * Check if Pokemon can move this turn (status prevention)
 * @param {Object} pokemon - Pokemon attempting to move
 * @param {Array} events - Events array to add messages to
 * @param {boolean} worstCase - If true, assume worst outcomes (full para, no thaw, etc.)
 * @returns {boolean} - True if Pokemon can move
 */
function canPokemonMove(pokemon, events, worstCase = false) {
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
 * @param {Object} pokemon - Pokemon to apply damage to
 * @param {Array} events - Events array to add messages to
 */
function applyEndOfTurnStatus(pokemon, events) {
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

/**
 * Simulate a turn and update battle state
 * @param {BattleState} state - Current battle state
 * @param {Object} yourAction - Your action
 * @param {Object} enemyAction - Enemy action
 * @returns {Object} - Turn result with events
 */
function simulateTurn(state, yourAction, enemyAction) {
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
 * Evaluate a battle position
 * Returns a score where positive = good for player, negative = good for enemy
 * CRITICAL: Prioritizes immediate KOs above all else
 * @param {BattleState} state - Battle state to evaluate
 * @returns {number} - Position score
 */
function evaluatePosition(state) {
  let score = 0;

  // Count alive Pokemon
  const yourAlive = state.yourTeam.filter((p) => !p.fainted).length;
  const enemyAlive = state.enemyTeam.filter((p) => !p.fainted).length;

  // MASSIVE weight on Pokemon count (winning condition)
  score += (yourAlive - enemyAlive) * 5000;

  // Check for immediate KO opportunities - this should be HIGHEST priority
  if (yourAlive > 0 && enemyAlive > 0) {
    const yourActive = state.getYourActive();
    const enemyActive = state.getEnemyActive();

    if (!yourActive.fainted && !enemyActive.fainted && yourActive.moveData) {
      // Check if we can KO the enemy THIS TURN
      let canKOEnemy = false;
      let minDamageToKO = Infinity;

      yourActive.moveData.forEach((move) => {
        if (move.damageClass !== "status") {
          const yourStats = yourActive.stats;
          const enemyStats = enemyActive.stats;

          const damage = calculateDamage(
            yourActive,
            enemyActive,
            move,
            yourStats,
            enemyStats
          );

          // Check if minimum damage can KO
          if (damage.min >= enemyActive.currentHP) {
            canKOEnemy = true;
            minDamageToKO = Math.min(minDamageToKO, damage.min);
          }
        }
      });

      // HUGE bonus for guaranteed KO - this should override almost everything
      if (canKOEnemy) {
        score += 10000;
      }

      // Check if enemy can KO us - HUGE penalty
      if (enemyActive.moveData) {
        let enemyCanKO = false;

        enemyActive.moveData.forEach((move) => {
          if (move.damageClass !== "status") {
            const yourStats = yourActive.stats;
            const enemyStats = enemyActive.stats;

            const damage = calculateDamage(
              enemyActive,
              yourActive,
              move,
              enemyStats,
              yourStats
            );

            // Include crit damage in calculation (1.5x)
            const critDamage = Math.floor(damage.max * 1.5);

            if (
              damage.max >= yourActive.currentHP ||
              critDamage >= yourActive.currentHP
            ) {
              enemyCanKO = true;
            }
          }
        });

        // Penalty for being in KO range (but not as bad as missing a KO opportunity)
        if (enemyCanKO) {
          score -= 3000;
        }
      }
    }
  }

  // Calculate total HP percentage
  let yourTotalHP = 0;
  let yourMaxHP = 0;
  let enemyTotalHP = 0;
  let enemyMaxHP = 0;

  state.yourTeam.forEach((p) => {
    yourTotalHP += p.currentHP;
    yourMaxHP += p.stats.hp;
  });

  state.enemyTeam.forEach((p) => {
    enemyTotalHP += p.currentHP;
    enemyMaxHP += p.stats.hp;
  });

  const yourHPPercent = yourMaxHP > 0 ? yourTotalHP / yourMaxHP : 0;
  const enemyHPPercent = enemyMaxHP > 0 ? enemyTotalHP / enemyMaxHP : 0;

  // Weight HP advantage (much less than KO opportunities)
  score += (yourHPPercent - enemyHPPercent) * 500;

  // Evaluate current matchup (minor factor)
  if (yourAlive > 0 && enemyAlive > 0) {
    const yourActive = state.getYourActive();
    const enemyActive = state.getEnemyActive();

    if (!yourActive.fainted && !enemyActive.fainted) {
      const matchupScore = calculateSwitchInScore(yourActive, enemyActive);
      score += matchupScore * 100;
    }
  }

  return score;
}

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
// BATTLE DISPLAY
// ============================================================================

/**
 * Display current battle state
 * @param {BattleState} state - Battle state to display
 */
function displayBattleState(state) {
  const battleStateSection = document.querySelector(".battle-state-section");
  battleStateSection.style.display = "block";

  const yourActive = state.getYourActive();
  const enemyActive = state.getEnemyActive();

  // Display your active Pokemon
  const yourActiveEl = document.getElementById("yourActivePokemon");
  yourActiveEl.innerHTML = `
    <img src="${yourActive.sprite}" alt="${yourActive.name}">
    <p class="pokemon-name">${capitalize(yourActive.name)}</p>
    <div class="pokemon-hp">
      <p>HP: ${yourActive.currentHP} / ${yourActive.stats.hp}</p>
      <div class="hp-bar-container">
        <div class="hp-bar ${getHPClass(yourActive)}" style="width: ${
    (yourActive.currentHP / yourActive.stats.hp) * 100
  }%"></div>
      </div>
    </div>
  `;

  // Display enemy active Pokemon
  const enemyActiveEl = document.getElementById("enemyActivePokemon");
  enemyActiveEl.innerHTML = `
    <img src="${enemyActive.sprite}" alt="${enemyActive.name}">
    <p class="pokemon-name">${capitalize(enemyActive.name)}</p>
    <div class="pokemon-hp">
      <p>HP: ${enemyActive.currentHP} / ${enemyActive.stats.hp}</p>
      <div class="hp-bar-container">
        <div class="hp-bar ${getHPClass(enemyActive)}" style="width: ${
    (enemyActive.currentHP / enemyActive.stats.hp) * 100
  }%"></div>
      </div>
    </div>
  `;

  // Display field effects
  const fieldEffectsEl = document.getElementById("fieldEffects");
  const effects = [];

  if (state.fieldEffects.weather) {
    effects.push(
      `<span class="effect-badge">Weather: ${capitalize(
        state.fieldEffects.weather
      )}</span>`
    );
  }

  if (state.fieldEffects.terrain) {
    effects.push(
      `<span class="effect-badge">Terrain: ${capitalize(
        state.fieldEffects.terrain
      )}</span>`
    );
  }

  if (effects.length === 0) {
    fieldEffectsEl.innerHTML = "<p>No active field effects</p>";
  } else {
    fieldEffectsEl.innerHTML = effects.join("");
  }
}

/**
 * Get HP bar class based on HP percentage
 */
function getHPClass(pokemon) {
  const hpPercent = (pokemon.currentHP / pokemon.stats.hp) * 100;
  if (hpPercent <= 20) return "critical";
  if (hpPercent <= 50) return "low";
  return "";
}

/**
 * Display strategy results
 * @param {Array} timeline - Array of turn events
 * @param {Object} analysis - Battle analysis
 */
function displayStrategyResults(timeline, analysis, worstCaseTimeline) {
  const resultsSection = document.querySelector(".strategy-results-section");
  resultsSection.style.display = "block";

  // Display worst-case risk tier prominently
  const riskTierEl = document.getElementById("riskLevel");
  if (analysis.worstCaseTier) {
    // Display worst-case tier instead of simple risk level
    riskTierEl.textContent = analysis.worstCaseTier;

    // Set color based on tier
    if (analysis.worstCaseTier.includes("RISKLESS")) {
      riskTierEl.className = "stat-value risk-low";
    } else if (analysis.worstCaseTier.includes("RISKY")) {
      riskTierEl.className = "stat-value risk-medium";
    } else if (analysis.worstCaseTier.includes("SACRIFICE")) {
      riskTierEl.className = "stat-value risk-high";
    } else {
      riskTierEl.className = "stat-value risk-high";
    }
  } else {
    riskTierEl.textContent = analysis.riskLevel;
    riskTierEl.className = `stat-value risk-${analysis.riskLevel.toLowerCase()}`;
  }

  // Display death comparison
  document.getElementById(
    "expectedDeaths"
  ).textContent = `${analysis.expectedDeaths} avg / ${analysis.worstCaseDeaths} worst`;
  document.getElementById("turnCount").textContent = analysis.turnCount;

  // Display timeline with collapsible sections
  const timelineEl = document.getElementById("strategyTimeline");
  timelineEl.innerHTML = "";

  // Add comparison header
  const comparisonHeader = document.createElement("div");
  comparisonHeader.style.cssText =
    "background: #1e1e1e; padding: 15px; margin-bottom: 15px; border-radius: 8px;";
  comparisonHeader.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: #fff;">Battle Strategy Comparison</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <div style="background: #2d2d30; padding: 10px; border-radius: 5px;">
        <strong style="color: #4ec9b0;">Average Case:</strong>
        <div>${analysis.expectedDeaths} deaths${
    analysis.victory ? ", Victory ✅" : ""
  }</div>
      </div>
      <div style="background: #2d2d30; padding: 10px; border-radius: 5px;">
        <strong style="color: #ff6b6b;">Worst Case:</strong>
        <div>${analysis.worstCaseDeaths} deaths${
    analysis.worstCaseWin
      ? ", Victory ✅"
      : analysis.worstCaseLoss
      ? ", Loss ❌"
      : ""
  }</div>
      </div>
    </div>
  `;
  timelineEl.appendChild(comparisonHeader);

  // Average Case Section (collapsible)
  const avgCaseSection = document.createElement("div");
  avgCaseSection.style.cssText = "margin-bottom: 20px;";

  const avgCaseHeader = document.createElement("div");
  avgCaseHeader.style.cssText =
    "background: #2d2d30; padding: 12px; cursor: pointer; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;";
  avgCaseHeader.innerHTML = `
    <strong style="color: #4ec9b0; font-size: 16px;">📊 Average Case Scenario (${analysis.expectedDeaths} deaths)</strong>
    <span id="avgToggle" style="font-size: 20px;">▼</span>
  `;

  const avgCaseContent = document.createElement("div");
  avgCaseContent.id = "avgCaseContent";
  avgCaseContent.style.cssText = "margin-top: 10px;";

  timeline.forEach((step, index) => {
    const stepEl = document.createElement("div");
    stepEl.className = "timeline-step";

    const riskClass = step.risk || "low";

    // Build enhanced risk details
    let enhancedDetails = step.details;

    // Add crit risks if present
    if (step.critRisks && step.critRisks.length > 0) {
      enhancedDetails += `<div class="crit-risks"><strong>⚠️ Critical Hit Risks:</strong><ul>`;
      step.critRisks.forEach((risk) => {
        enhancedDetails += `<li>${risk}</li>`;
      });
      enhancedDetails += `</ul></div>`;
    }

    // Add status risks if present
    if (step.statusRisks && step.statusRisks.length > 0) {
      enhancedDetails += `<div class="status-risks"><strong>🌀 Status Effect Risks:</strong><ul>`;
      step.statusRisks.forEach((risk) => {
        enhancedDetails += `<li>${risk}</li>`;
      });
      enhancedDetails += `</ul></div>`;
    }

    // Add AI move probability analysis if present
    if (
      step.aiMoveAnalysis &&
      step.aiMoveAnalysis.odds &&
      Object.keys(step.aiMoveAnalysis.odds).length > 0
    ) {
      enhancedDetails += `<div class="ai-move-analysis"><strong>🎲 AI Move Probabilities:</strong><ul>`;

      // Sort moves by probability
      const sortedMoves = Object.entries(step.aiMoveAnalysis.odds).sort(
        (a, b) => b[1] - a[1]
      );

      sortedMoves.forEach(([move, prob]) => {
        const highlight =
          prob > 50 ? ' style="color: #ff6b6b; font-weight: bold;"' : "";
        enhancedDetails += `<li${highlight}>${capitalize(move)}: ${prob}%</li>`;
      });
      enhancedDetails += `</ul>`;

      // Add influence tips
      if (
        step.aiMoveAnalysis.influence &&
        step.aiMoveAnalysis.influence.length > 0
      ) {
        enhancedDetails += `<div class="influence-tips"><strong>💡 How to Influence AI:</strong><ul>`;
        step.aiMoveAnalysis.influence.forEach((tip) => {
          enhancedDetails += `<li>${tip}</li>`;
        });
        enhancedDetails += `</ul></div>`;
      }

      enhancedDetails += `</div>`;
    }

    stepEl.innerHTML = `
      <div class="step-header">
        <span class="step-number">Turn ${step.turn}</span>
        <span class="step-action">${step.action}</span>
      </div>
      <div class="step-details">
        ${enhancedDetails}
        <span class="step-risk ${riskClass}">Risk: ${capitalize(
      riskClass
    )}</span>
      </div>
    `;

    avgCaseContent.appendChild(stepEl);
  });

  avgCaseHeader.addEventListener("click", () => {
    const content = avgCaseContent;
    const toggle = document.getElementById("avgToggle");
    if (content.style.display === "none") {
      content.style.display = "block";
      toggle.textContent = "▼";
    } else {
      content.style.display = "none";
      toggle.textContent = "▶";
    }
  });

  avgCaseSection.appendChild(avgCaseHeader);
  avgCaseSection.appendChild(avgCaseContent);
  timelineEl.appendChild(avgCaseSection);

  // Worst Case Section (collapsible, expanded by default)
  if (worstCaseTimeline) {
    const worstCaseSection = document.createElement("div");
    worstCaseSection.style.cssText = "margin-bottom: 20px;";

    const worstCaseHeader = document.createElement("div");
    worstCaseHeader.style.cssText =
      "background: #3d2d2d; padding: 12px; cursor: pointer; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;";
    worstCaseHeader.innerHTML = `
      <strong style="color: #ff6b6b; font-size: 16px;">💀 Worst Case Scenario (${analysis.worstCaseDeaths} deaths)</strong>
      <span id="worstToggle" style="font-size: 20px;">▼</span>
    `;

    const worstCaseContent = document.createElement("div");
    worstCaseContent.id = "worstCaseContent";
    worstCaseContent.style.cssText = "margin-top: 10px;";

    worstCaseTimeline.forEach((step) => {
      const stepEl = document.createElement("div");
      stepEl.className = "timeline-step";
      stepEl.style.cssText = "border-left: 3px solid #ff6b6b;";

      stepEl.innerHTML = `
        <div class="step-header">
          <span class="step-number">Turn ${step.turn}</span>
          <span class="step-action">${step.action}</span>
        </div>
        <div class="step-details">
          ${step.details}
          <span class="step-risk worst-case" style="background: #d32f2f;">Worst Case</span>
        </div>
      `;

      worstCaseContent.appendChild(stepEl);
    });

    worstCaseHeader.addEventListener("click", () => {
      const content = worstCaseContent;
      const toggle = document.getElementById("worstToggle");
      if (content.style.display === "none") {
        content.style.display = "block";
        toggle.textContent = "▼";
      } else {
        content.style.display = "none";
        toggle.textContent = "▶";
      }
    });

    worstCaseSection.appendChild(worstCaseHeader);
    worstCaseSection.appendChild(worstCaseContent);
    timelineEl.appendChild(worstCaseSection);
  }
}

// ============================================================================
// LOOKAHEAD & STRATEGY OPTIMIZATION
// ============================================================================

/**
 * Find best action using lookahead
 * @param {BattleState} state - Current state
 * @param {boolean} isPlayer - True if finding action for player
 * @param {number} depth - Lookahead depth (turns)
 * @returns {Object} - Best action with score
 */
function findBestActionWithLookahead(state, isPlayer, depth = 2) {
  if (depth === 0) {
    return { action: null, score: evaluatePosition(state) };
  }

  const actions = generatePossibleActions(state, isPlayer);
  if (actions.length === 0) {
    return { action: null, score: evaluatePosition(state) };
  }

  let bestAction = actions[0];
  let bestScore = isPlayer ? -Infinity : Infinity;

  actions.forEach((action) => {
    // Simulate this action
    const opponent = isPlayer ? state.getEnemyActive() : state.getYourActive();

    // For simplicity, assume opponent does their best move
    const opponentActions = generatePossibleActions(state, !isPlayer);
    if (opponentActions.length === 0) return;

    // Pick opponent's best move (greedy for now to keep it fast)
    let opponentAction = opponentActions[0];
    if (opponentActions.length > 0) {
      opponentAction =
        opponentActions.reduce((best, current) => {
          if (
            current.type === "move" &&
            current.move.damageClass !== "status"
          ) {
            const target = isPlayer
              ? state.getYourActive()
              : state.getEnemyActive();
            const targetStats = target.stats;
            const opponentStats = opponent.stats;
            const damage = calculateDamage(
              opponent,
              target,
              current.move,
              opponentStats,
              targetStats
            );

            if (!best || damage.average > 0) return current;
          }
          return best || current;
        }, null) || opponentActions[0];
    }

    // Simulate the turn
    const clonedState = state.clone();
    const yourAction = isPlayer ? action : opponentAction;
    const enemyAction = isPlayer ? opponentAction : action;

    simulateTurn(clonedState, yourAction, enemyAction);

    // Handle forced switches
    if (clonedState.getYourActive().fainted) {
      handleForcedSwitch(clonedState, true);
    }
    if (clonedState.getEnemyActive().fainted) {
      handleForcedSwitch(clonedState, false);
    }

    // Recurse
    const result = findBestActionWithLookahead(
      clonedState,
      isPlayer,
      depth - 1
    );
    const score = result.score;

    // Update best
    if (isPlayer && score > bestScore) {
      bestScore = score;
      bestAction = action;
    } else if (!isPlayer && score < bestScore) {
      bestScore = score;
      bestAction = action;
    }
  });

  return { action: bestAction, score: bestScore };
}

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
    const moveDataMap = await loadAllMoveData();

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
    displayTeams();
  }
});
