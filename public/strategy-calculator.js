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

  // Simulate a delay for calculation
  setTimeout(() => {
    hideLoading();

    // For now, show a placeholder message
    showError(
      "Strategy calculation is in development! Sprint 2 will implement move data loading and basic AI logic."
    );

    // TODO: Implement actual strategy calculation in Sprint 2
  }, 1000);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener("DOMContentLoaded", () => {
  if (loadTeamData()) {
    displayTeams();
  }
});
