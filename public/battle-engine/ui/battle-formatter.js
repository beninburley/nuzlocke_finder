/**
 * Battle State Formatting Module
 * Handles displaying battle state and team information in the UI
 */

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Display teams on the page
 * @param {Array} yourTeam - Your team array
 * @param {Array} enemyTeam - Enemy team array
 */
export function displayTeams(yourTeam, enemyTeam) {
  displayYourTeam(yourTeam);
  displayEnemyTeam(enemyTeam);
  populateLeadSelectors(yourTeam, enemyTeam);
}

/**
 * Display your team
 * @param {Array} yourTeam - Your team array
 */
export function displayYourTeam(yourTeam) {
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
 * @param {Array} enemyTeam - Enemy team array
 */
export function displayEnemyTeam(enemyTeam) {
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
 * @param {Object} pokemon - Pokemon object
 * @param {number} index - Pokemon index in team
 * @returns {HTMLElement} - Team card element
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
 * @param {Array} yourTeam - Your team array
 * @param {Array} enemyTeam - Enemy team array
 */
export function populateLeadSelectors(yourTeam, enemyTeam) {
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

/**
 * Display current battle state
 * @param {BattleState} state - Battle state to display
 */
export function displayBattleState(state) {
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
 * @param {Object} pokemon - Pokemon object
 * @returns {string} - CSS class for HP bar
 */
function getHPClass(pokemon) {
  const hpPercent = (pokemon.currentHP / pokemon.stats.hp) * 100;
  if (hpPercent <= 20) return "critical";
  if (hpPercent <= 50) return "low";
  return "";
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
export function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
}

/**
 * Hide error message
 */
export function hideError() {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.style.display = "none";
}

/**
 * Show loading indicator
 */
export function showLoading() {
  const loadingDiv = document.getElementById("loadingIndicator");
  loadingDiv.style.display = "block";
}

/**
 * Hide loading indicator
 */
export function hideLoading() {
  const loadingDiv = document.getElementById("loadingIndicator");
  loadingDiv.style.display = "none";
}
