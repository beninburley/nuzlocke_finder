// DOM Elements
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const randomBtn = document.getElementById("randomBtn");
const cacheStatsBtn = document.getElementById("cacheStatsBtn");
const clearCacheBtn = document.getElementById("clearCacheBtn");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessage = document.getElementById("errorMessage");
const pokemonDisplay = document.getElementById("pokemonDisplay");
const cacheInfo = document.getElementById("cacheInfo");

// Event Listeners
searchBtn.addEventListener("click", searchPokemon);
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchPokemon();
});
randomBtn.addEventListener("click", getRandomPokemon);
cacheStatsBtn.addEventListener("click", showCacheStats);
clearCacheBtn.addEventListener("click", clearCache);

// Search Pokemon
async function searchPokemon() {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    showError("Please enter a Pokemon name or ID");
    return;
  }

  await fetchAndDisplayPokemon(query);
}

// Get Random Pokemon
async function getRandomPokemon() {
  const randomId = Math.floor(Math.random() * 898) + 1; // Gen 1-8 Pokemon
  await fetchAndDisplayPokemon(randomId);
}

// Fetch and Display Pokemon
async function fetchAndDisplayPokemon(nameOrId) {
  showLoading();
  hideError();
  hidePokemon();

  try {
    const response = await fetch(`/api/pokemon/${nameOrId}`);

    if (!response.ok) {
      throw new Error("Pokemon not found");
    }

    const data = await response.json();
    displayPokemon(data);

    if (data.cached) {
      showCacheStatus("✓ Loaded from cache (fast!)");
    } else {
      showCacheStatus("⚡ Fetched from API (now cached)");
    }
  } catch (error) {
    showError("Pokemon not found. Please try another name or ID.");
  } finally {
    hideLoading();
  }
}

// Display Pokemon
function displayPokemon(pokemon) {
  document.getElementById("pokemonName").textContent = pokemon.name;
  document.getElementById("pokemonId").textContent = `#${String(
    pokemon.id
  ).padStart(3, "0")}`;
  document.getElementById("pokemonSprite").src = pokemon.sprite;
  document.getElementById("pokemonSpriteShiny").src = pokemon.spriteShiny;
  document.getElementById("pokemonHeight").textContent = `${
    pokemon.height / 10
  } m`;
  document.getElementById("pokemonWeight").textContent = `${
    pokemon.weight / 10
  } kg`;

  // Display types
  const typesContainer = document.getElementById("pokemonTypes");
  typesContainer.innerHTML = pokemon.types
    .map((type) => `<span class="type-badge">${type}</span>`)
    .join("");

  // Display abilities
  const abilitiesContainer = document.getElementById("pokemonAbilities");
  abilitiesContainer.innerHTML = pokemon.abilities
    .map((ability) => `<span class="ability-badge">${ability}</span>`)
    .join("");

  // Display stats
  const statsContainer = document.getElementById("statsContainer");
  statsContainer.innerHTML = pokemon.stats
    .map(
      (stat) => `
        <div class="stat-row">
            <span class="stat-name">${stat.name}</span>
            <div class="stat-bar-container">
                <div class="stat-bar" style="width: ${
                  (stat.value / 255) * 100
                }%">
                    ${stat.value}
                </div>
            </div>
        </div>
    `
    )
    .join("");

  pokemonDisplay.style.display = "block";
}

// Show Cache Stats
async function showCacheStats() {
  try {
    const response = await fetch("/api/cache/stats");
    const stats = await response.json();

    alert(
      `Cache Statistics:\n\nKeys: ${stats.keys}\nHits: ${stats.hits}\nMisses: ${
        stats.misses
      }\nHit Rate: ${
        stats.hits > 0
          ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)
          : 0
      }%`
    );
  } catch (error) {
    showError("Failed to fetch cache stats");
  }
}

// Clear Cache
async function clearCache() {
  if (!confirm("Are you sure you want to clear the cache?")) {
    return;
  }

  try {
    const response = await fetch("/api/cache/clear", { method: "POST" });
    const result = await response.json();

    showCacheStatus("🗑️ " + result.message);
    setTimeout(() => {
      cacheInfo.style.display = "none";
    }, 3000);
  } catch (error) {
    showError("Failed to clear cache");
  }
}

// UI Helper Functions
function showLoading() {
  loadingIndicator.style.display = "block";
}

function hideLoading() {
  loadingIndicator.style.display = "none";
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

function hideError() {
  errorMessage.style.display = "none";
}

function hidePokemon() {
  pokemonDisplay.style.display = "none";
}

function showCacheStatus(message) {
  cacheInfo.textContent = message;
  cacheInfo.style.display = "block";
}

// Load a random Pokemon on page load
window.addEventListener("load", () => {
  getRandomPokemon();
});
