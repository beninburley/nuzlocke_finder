// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let yourTeam = [];
let enemyTeam = [];
let yourLeadIndex = null;
let enemyLeadIndex = null;

// ============================================================================
// GEN 8 TYPE EFFECTIVENESS CHART
// ============================================================================

const TYPE_CHART = {
  normal: {
    rock: 0.5,
    ghost: 0,
    steel: 0.5,
  },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2,
  },
  water: {
    fire: 2,
    water: 0.5,
    grass: 0.5,
    ground: 2,
    rock: 2,
    dragon: 0.5,
  },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
    fairy: 2,
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: {
    electric: 0.5,
    grass: 2,
    fighting: 2,
    bug: 2,
    rock: 0.5,
    steel: 0.5,
  },
  psychic: {
    fighting: 2,
    poison: 2,
    psychic: 0.5,
    dark: 0,
    steel: 0.5,
  },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: {
    fire: 2,
    ice: 2,
    fighting: 0.5,
    ground: 0.5,
    flying: 2,
    bug: 2,
    steel: 0.5,
  },
  ghost: {
    normal: 0,
    psychic: 2,
    ghost: 2,
    dark: 0.5,
  },
  dragon: {
    dragon: 2,
    steel: 0.5,
    fairy: 0,
  },
  dark: {
    fighting: 0.5,
    psychic: 2,
    ghost: 2,
    dark: 0.5,
    fairy: 0.5,
  },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
    fairy: 2,
  },
  fairy: {
    fire: 0.5,
    fighting: 2,
    poison: 0.5,
    dragon: 2,
    dark: 2,
    steel: 0.5,
  },
};

// ============================================================================
// NATURE MODIFIERS
// ============================================================================

const NATURES = {
  hardy: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 },
  lonely: { atk: 1.1, def: 0.9, spa: 1.0, spd: 1.0, spe: 1.0 },
  brave: { atk: 1.1, def: 1.0, spa: 1.0, spd: 1.0, spe: 0.9 },
  adamant: { atk: 1.1, def: 1.0, spa: 0.9, spd: 1.0, spe: 1.0 },
  naughty: { atk: 1.1, def: 1.0, spa: 1.0, spd: 0.9, spe: 1.0 },
  bold: { atk: 0.9, def: 1.1, spa: 1.0, spd: 1.0, spe: 1.0 },
  docile: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 },
  relaxed: { atk: 1.0, def: 1.1, spa: 1.0, spd: 1.0, spe: 0.9 },
  impish: { atk: 1.0, def: 1.1, spa: 0.9, spd: 1.0, spe: 1.0 },
  lax: { atk: 1.0, def: 1.1, spa: 1.0, spd: 0.9, spe: 1.0 },
  timid: { atk: 0.9, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.1 },
  hasty: { atk: 1.0, def: 0.9, spa: 1.0, spd: 1.0, spe: 1.1 },
  serious: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 },
  jolly: { atk: 1.0, def: 1.0, spa: 0.9, spd: 1.0, spe: 1.1 },
  naive: { atk: 1.0, def: 1.0, spa: 1.0, spd: 0.9, spe: 1.1 },
  modest: { atk: 0.9, def: 1.0, spa: 1.1, spd: 1.0, spe: 1.0 },
  mild: { atk: 1.0, def: 0.9, spa: 1.1, spd: 1.0, spe: 1.0 },
  quiet: { atk: 1.0, def: 1.0, spa: 1.1, spd: 1.0, spe: 0.9 },
  bashful: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 },
  rash: { atk: 1.0, def: 1.0, spa: 1.1, spd: 0.9, spe: 1.0 },
  calm: { atk: 0.9, def: 1.0, spa: 1.0, spd: 1.1, spe: 1.0 },
  gentle: { atk: 1.0, def: 0.9, spa: 1.0, spd: 1.1, spe: 1.0 },
  sassy: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.1, spe: 0.9 },
  careful: { atk: 1.0, def: 1.0, spa: 0.9, spd: 1.1, spe: 1.0 },
  quirky: { atk: 1.0, def: 1.0, spa: 1.0, spd: 1.0, spe: 1.0 },
};

// ============================================================================
// STAT CALCULATION (GEN 8 FORMULA)
// ============================================================================

/**
 * Calculate HP stat
 * Formula: floor(((2 * Base + IV + floor(EV/4)) * Level) / 100) + Level + 10
 */
function calculateHP(baseStat, iv, ev, level) {
  return (
    Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) +
    level +
    10
  );
}

/**
 * Calculate other stats (Attack, Defense, Special Attack, Special Defense, Speed)
 * Formula: floor((floor(((2 * Base + IV + floor(EV/4)) * Level) / 100) + 5) * Nature)
 */
function calculateStat(baseStat, iv, ev, level, natureMod) {
  const base =
    Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(base * natureMod);
}

/**
 * Calculate all stats for a Pokemon
 */
function calculateAllStats(pokemon) {
  const nature = NATURES[pokemon.nature?.toLowerCase()] || NATURES.hardy;
  const level = pokemon.level || 100;

  // Get IVs (default to 31)
  const ivs = pokemon.ivs || {
    hp: 31,
    atk: 31,
    def: 31,
    spa: 31,
    spd: 31,
    spe: 31,
  };

  // Get EVs (default to 0)
  const evs = pokemon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  // Get base stats from the pokemon's stats array
  const baseStats = {};
  pokemon.stats.forEach((stat) => {
    const statName = stat.name
      .replace("special-attack", "spa")
      .replace("special-defense", "spd")
      .replace("attack", "atk")
      .replace("defense", "def")
      .replace("speed", "spe");
    baseStats[statName] = stat.value;
  });

  return {
    hp: calculateHP(baseStats.hp, ivs.hp, evs.hp, level),
    atk: calculateStat(baseStats.atk, ivs.atk, evs.atk, level, nature.atk),
    def: calculateStat(baseStats.def, ivs.def, evs.def, level, nature.def),
    spa: calculateStat(baseStats.spa, ivs.spa, evs.spa, level, nature.spa),
    spd: calculateStat(baseStats.spd, ivs.spd, evs.spd, level, nature.spd),
    spe: calculateStat(baseStats.spe, ivs.spe, evs.spe, level, nature.spe),
  };
}

// ============================================================================
// TYPE EFFECTIVENESS CALCULATION
// ============================================================================

/**
 * Get type effectiveness multiplier
 * @param {string} moveType - Type of the attacking move
 * @param {Array<string>} defenderTypes - Types of the defending Pokemon
 * @returns {number} - Effectiveness multiplier (0, 0.25, 0.5, 1, 2, or 4)
 */
function getTypeEffectiveness(moveType, defenderTypes) {
  let multiplier = 1;

  defenderTypes.forEach((defenderType) => {
    const matchup = TYPE_CHART[moveType]?.[defenderType];
    if (matchup !== undefined) {
      multiplier *= matchup;
    }
  });

  return multiplier;
}

// ============================================================================
// DAMAGE CALCULATION (GEN 8 FORMULA)
// ============================================================================

/**
 * Calculate damage for a move
 * Formula: ((((2 * Level / 5 + 2) * Power * A / D) / 50) + 2) * Modifiers
 * Modifiers: STAB, Type Effectiveness, Random (0.85-1.0)
 */
function calculateDamage(
  attacker,
  defender,
  move,
  attackerStats,
  defenderStats
) {
  // Check if move data is available
  if (!move.power || move.power === 0) {
    return { min: 0, max: 0, average: 0 };
  }

  const level = attacker.level || 100;
  const power = move.power;

  // Determine if physical or special
  const isPhysical = move.damageClass === "physical";
  const attackStat = isPhysical ? attackerStats.atk : attackerStats.spa;
  const defenseStat = isPhysical ? defenderStats.def : defenderStats.spd;

  // Base damage calculation
  const baseDamage = Math.floor(
    (Math.floor((2 * level) / 5 + 2) * power * attackStat) / defenseStat / 50 +
      2
  );

  // STAB (Same Type Attack Bonus) - 1.5x if move type matches attacker type
  let stab = 1;
  if (attacker.types.includes(move.type)) {
    stab = 1.5;
  }

  // Type effectiveness
  const effectiveness = getTypeEffectiveness(move.type, defender.types);

  // Random multiplier (85% - 100%)
  const minRandom = 0.85;
  const maxRandom = 1.0;

  const minDamage = Math.floor(baseDamage * stab * effectiveness * minRandom);
  const maxDamage = Math.floor(baseDamage * stab * effectiveness * maxRandom);
  const avgDamage = Math.floor((minDamage + maxDamage) / 2);

  return {
    min: minDamage,
    max: maxDamage,
    average: avgDamage,
    effectiveness: effectiveness,
    isStab: stab > 1,
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
// BATTLE STATE MANAGER
// ============================================================================

class BattleState {
  constructor(yourTeam, enemyTeam, yourLeadIndex, enemyLeadIndex) {
    this.yourTeam = yourTeam.map((p) => ({
      ...p,
      stats: calculateAllStats(p),
      currentHP: null, // Will be set after stats are calculated
      fainted: false,
    }));

    this.enemyTeam = enemyTeam.map((p) => ({
      ...p,
      stats: calculateAllStats(p),
      currentHP: null,
      fainted: false,
    }));

    // Set current HP to max HP
    this.yourTeam.forEach((p) => (p.currentHP = p.stats.hp));
    this.enemyTeam.forEach((p) => (p.currentHP = p.stats.hp));

    this.yourActiveIndex = yourLeadIndex;
    this.enemyActiveIndex = enemyLeadIndex;

    this.fieldEffects = {
      weather: null, // sun, rain, sandstorm, hail
      terrain: null, // electric, grassy, misty, psychic
      yourHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0 },
      enemyHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0 },
    };

    this.turnCount = 0;
  }

  getYourActive() {
    return this.yourTeam[this.yourActiveIndex];
  }

  getEnemyActive() {
    return this.enemyTeam[this.enemyActiveIndex];
  }

  clone() {
    const cloned = new BattleState([], [], 0, 0);
    cloned.yourTeam = JSON.parse(JSON.stringify(this.yourTeam));
    cloned.enemyTeam = JSON.parse(JSON.stringify(this.enemyTeam));
    cloned.yourActiveIndex = this.yourActiveIndex;
    cloned.enemyActiveIndex = this.enemyActiveIndex;
    cloned.fieldEffects = JSON.parse(JSON.stringify(this.fieldEffects));
    cloned.turnCount = this.turnCount;
    return cloned;
  }
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
      // Execute move
      const move = action.move;

      if (move.damageClass === "status") {
        events.push({
          type: "move",
          isPlayer: isPlayer,
          move: move,
          text: `${capitalize(attacker.name)} used ${capitalize(move.name)}!`,
        });
      } else {
        // Damaging move
        const attackerStats = attacker.stats;
        const defenderStats = defender.stats;
        const damage = calculateDamage(
          attacker,
          defender,
          move,
          attackerStats,
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
          text: `${capitalize(attacker.name)} used ${capitalize(
            move.name
          )}! ${actualDamage} damage.${effectText}`,
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
  const currentIndex = isPlayer ? state.yourActiveIndex : state.enemyActiveIndex;
  
  // Find first non-fainted Pokemon
  let nextIndex = -1;
  for (let i = 0; i < team.length; i++) {
    if (i !== currentIndex && !team[i].fainted) {
      nextIndex = i;
      break;
    }
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
    type: 'switch',
    isPlayer: isPlayer,
    pokemon: team[nextIndex],
    text: `${isPlayer ? 'You' : 'Enemy'} sent out ${capitalize(team[nextIndex].name)}!`
  };
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
function displayStrategyResults(timeline, analysis) {
  const resultsSection = document.querySelector(".strategy-results-section");
  resultsSection.style.display = "block";

  // Display summary stats
  document.getElementById("riskLevel").textContent = analysis.riskLevel;
  document.getElementById(
    "riskLevel"
  ).className = `stat-value risk-${analysis.riskLevel.toLowerCase()}`;
  document.getElementById("expectedDeaths").textContent =
    analysis.expectedDeaths;
  document.getElementById("turnCount").textContent = analysis.turnCount;

  // Display timeline
  const timelineEl = document.getElementById("strategyTimeline");
  timelineEl.innerHTML = "";

  timeline.forEach((step, index) => {
    const stepEl = document.createElement("div");
    stepEl.className = "timeline-step";

    const riskClass = step.risk || "low";

    stepEl.innerHTML = `
      <div class="step-header">
        <span class="step-number">Turn ${step.turn}</span>
        <span class="step-action">${step.action}</span>
      </div>
      <div class="step-details">
        ${step.details}
        <span class="step-risk ${riskClass}">Risk: ${capitalize(
      riskClass
    )}</span>
      </div>
    `;

    timelineEl.appendChild(stepEl);
  });
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

    // Step 4: Run basic battle simulation (greedy AI for now)
    console.log("Running battle simulation...");
    const timeline = [];
    let currentState = initialState;
    let maxTurns = 20; // Safety limit

    while (maxTurns > 0) {
      maxTurns--;

      // Check if battle is over
      const yourAlive = currentState.yourTeam.filter((p) => !p.fainted).length;
      const enemyAlive = currentState.enemyTeam.filter(
        (p) => !p.fainted
      ).length;

      if (yourAlive === 0 || enemyAlive === 0) {
        break; // Battle over
      }

      // Generate possible actions
      const yourActions = generatePossibleActions(currentState, true);
      const enemyActions = generatePossibleActions(currentState, false);

      if (yourActions.length === 0 || enemyActions.length === 0) {
        break; // No actions available
      }

      // Simple AI: Choose best move or switch
      let yourAction = yourActions[0]; // Default to first action
      let enemyAction = enemyActions[0];

      // Player AI: Find best switch if current matchup is bad
      const yourActive = currentState.getYourActive();
      const enemyActive = currentState.getEnemyActive();
      const currentScore = calculateSwitchInScore(yourActive, enemyActive);

      if (currentScore < 0) {
        // Look for better switch
        const bestSwitch = findBestSwitchIn(
          currentState.yourTeam,
          currentState.yourActiveIndex,
          enemyActive
        );
        if (bestSwitch.score > currentScore) {
          yourAction = yourActions.find(
            (a) => a.type === "switch" && a.switchToIndex === bestSwitch.index
          );
        }
      }

      // If not switching, choose highest damage move
      if (
        yourAction.type === "move" &&
        yourActions.filter((a) => a.type === "move").length > 0
      ) {
        let bestMove = yourActions.filter((a) => a.type === "move")[0];
        let bestDamage = 0;

        yourActions
          .filter((a) => a.type === "move")
          .forEach((action) => {
            const damage = calculateDamage(
              yourActive,
              enemyActive,
              action.move,
              yourActive.stats,
              enemyActive.stats
            );
            if (damage.average > bestDamage) {
              bestDamage = damage.average;
              bestMove = action;
            }
          });

        yourAction = bestMove;
      }

      // Enemy AI: Similar logic
      const enemyScore = calculateSwitchInScore(enemyActive, yourActive);

      if (enemyScore < 0) {
        const bestSwitch = findBestSwitchIn(
          currentState.enemyTeam,
          currentState.enemyActiveIndex,
          yourActive
        );
        if (bestSwitch.score > enemyScore) {
          enemyAction = enemyActions.find(
            (a) => a.type === "switch" && a.switchToIndex === bestSwitch.index
          );
        }
      }

      if (
        enemyAction.type === "move" &&
        enemyActions.filter((a) => a.type === "move").length > 0
      ) {
        let bestMove = enemyActions.filter((a) => a.type === "move")[0];
        let bestDamage = 0;

        enemyActions
          .filter((a) => a.type === "move")
          .forEach((action) => {
            const damage = calculateDamage(
              enemyActive,
              yourActive,
              action.move,
              enemyActive.stats,
              yourActive.stats
            );
            if (damage.average > bestDamage) {
              bestDamage = damage.average;
              bestMove = action;
            }
          });

        enemyAction = bestMove;
      }

      // Simulate turn
      const result = simulateTurn(currentState, yourAction, enemyAction);
      currentState = result.state;
      
      // Handle forced switches after faints
      if (currentState.getYourActive().fainted) {
        const switchEvent = handleForcedSwitch(currentState, true);
        if (switchEvent) {
          result.events.push(switchEvent);
        }
      }
      
      if (currentState.getEnemyActive().fainted) {
        const switchEvent = handleForcedSwitch(currentState, false);
        if (switchEvent) {
          result.events.push(switchEvent);
        }
      }

      // Add to timeline
      const turnSummary = {
        turn: currentState.turnCount,
        action:
          yourAction.type === "move"
            ? `Use ${capitalize(yourAction.move.name)}`
            : `Switch to ${capitalize(yourAction.pokemon.name)}`,
        details: result.events.map((e) => `<p>${e.text}</p>`).join(""),
        risk: "low", // TODO: Calculate actual risk
      };

      timeline.push(turnSummary);

      // Update battle display
      displayBattleState(currentState);
    }

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
    };

    // Display results
    displayStrategyResults(timeline, analysis);

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
