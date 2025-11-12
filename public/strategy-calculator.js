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
 * @param {BattleState} state - Battle state to evaluate
 * @returns {number} - Position score
 */
function evaluatePosition(state) {
  let score = 0;

  // Count alive Pokemon
  const yourAlive = state.yourTeam.filter((p) => !p.fainted).length;
  const enemyAlive = state.enemyTeam.filter((p) => !p.fainted).length;

  // Heavy weight on Pokemon count (winning condition)
  score += (yourAlive - enemyAlive) * 1000;

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

  // Weight HP advantage
  score += (yourHPPercent - enemyHPPercent) * 200;

  // Evaluate current matchup
  if (yourAlive > 0 && enemyAlive > 0) {
    const yourActive = state.getYourActive();
    const enemyActive = state.getEnemyActive();

    if (!yourActive.fainted && !enemyActive.fainted) {
      const matchupScore = calculateSwitchInScore(yourActive, enemyActive);
      score += matchupScore * 50;
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

    timelineEl.appendChild(stepEl);
  });
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
 * Find optimal strategy path with minimal risk
 * @param {BattleState} initialState - Starting state
 * @param {number} maxDepth - Maximum turns to look ahead
 * @returns {Array} - Array of {turn, action, risk} objects
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

    // Convert strategy to timeline format
    const timeline = strategy.map((step) => {
      const action = step.action;
      const actionText =
        action.type === "move"
          ? `Use ${capitalize(action.move.name)}`
          : `Switch to ${capitalize(action.pokemon.name)}`;

      const riskReasons =
        step.risk.reasons.length > 0
          ? `<p><strong>Risks:</strong> ${step.risk.reasons.join(", ")}</p>`
          : "";

      return {
        turn: step.turn,
        action: actionText,
        details:
          step.events.map((e) => `<p>${e.text}</p>`).join("") + riskReasons,
        risk: step.risk.level,
        critRisks: step.risk.critRisks || [],
        statusRisks: step.risk.statusRisks || [],
        aiMoveAnalysis: step.risk.aiMoveAnalysis || {},
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
