import { fetchPokemonData } from "./battle-engine/data/pokemon-fetcher.js";
import { fetchMoveData } from "./battle-engine/data/move-fetcher.js";
import { calculateAllStats } from "./battle-engine/core/stat-calculator.js";
import { calculateDamage } from "./battle-engine/core/damage-calculator.js";
import { getTypeEffectiveness } from "./battle-engine/core/type-effectiveness.js";
import { selectEnemyAction } from "./battle-engine/ai/enemy-ai.js";
import { BattleState } from "./battle-engine/core/BattleState.js";
import {
  evaluateAllActions,
  classifyMove,
} from "./battle-engine/strategy/move-evaluator.js";

// Application State
const state = {
  phase: "team-selection", // 'team-selection' | 'battle'
  playerTeam: [],
  enemyTeam: [],
  playerActive: null,
  enemyActive: null,
  turn: 0,
  battleLog: [],
  currentTeam: null, // 'player' | 'enemy'
  currentSlot: null,
  gameOver: false,
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  initializeTeamSelection();
  setupEventListeners();
});

// ===== TEAM SELECTION =====

function initializeTeamSelection() {
  const playerSlots = document.querySelectorAll(
    "#player-team-slots .team-slot"
  );
  const enemySlots = document.querySelectorAll("#enemy-team-slots .team-slot");

  playerSlots.forEach((slot, index) => {
    slot.addEventListener("click", () => openPokemonModal("player", index));
  });

  enemySlots.forEach((slot, index) => {
    slot.addEventListener("click", () => openPokemonModal("enemy", index));
  });
}

function openPokemonModal(team, slot) {
  state.currentTeam = team;
  state.currentSlot = slot;

  const modal = document.getElementById("pokemon-modal");
  modal.classList.add("active");

  // Load popular Pokémon initially
  loadPokemonOptions("");
}

async function loadPokemonOptions(searchQuery) {
  const resultsContainer = document.getElementById("pokemon-results");
  resultsContainer.innerHTML = "<p>Loading...</p>";

  try {
    // If no search query, show popular Pokémon
    const popularPokemon = [
      "pikachu",
      "charizard",
      "blastoise",
      "venusaur",
      "garchomp",
      "lucario",
      "gengar",
      "dragonite",
      "metagross",
      "salamence",
      "tyranitar",
      "blaziken",
      "greninja",
      "aegislash",
      "ferrothorn",
      "landorus-therian",
      "toxapex",
      "dragapult",
    ];

    let pokemonList = popularPokemon;

    // If there's a search query, filter by it
    if (searchQuery) {
      pokemonList = popularPokemon.filter((p) =>
        p.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // If no matches in popular list, try the search term directly
      if (pokemonList.length === 0) {
        pokemonList = [searchQuery.toLowerCase()];
      }
    }

    // Load Pokémon data
    resultsContainer.innerHTML = "";

    for (const pokemonName of pokemonList.slice(0, 12)) {
      try {
        const pokemon = await fetchPokemonData(pokemonName);
        const option = createPokemonOption(pokemon);
        resultsContainer.appendChild(option);
      } catch (error) {
        console.log(`Could not load ${pokemonName}`);
      }
    }

    if (resultsContainer.children.length === 0) {
      resultsContainer.innerHTML =
        "<p>No Pokémon found. Try another search.</p>";
    }
  } catch (error) {
    console.error("Error loading Pokémon:", error);
    resultsContainer.innerHTML =
      "<p>Error loading Pokémon. Please try again.</p>";
  }
}

function createPokemonOption(pokemon) {
  const option = document.createElement("div");
  option.className = "pokemon-option";

  const sprite = pokemon.sprites?.front_default || "";
  const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);

  option.innerHTML = `
        <img src="${sprite}" alt="${name}">
        <div class="name">${name}</div>
    `;

  option.addEventListener("click", () => showCustomizePanel(pokemon));

  return option;
}

function showCustomizePanel(pokemon) {
  // Close the search modal
  closeModal();

  // Show customize panel
  const panel = document.getElementById("customize-panel");
  panel.style.display = "block";

  const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
  document.getElementById("customize-name").textContent = name;
  document.getElementById("customize-sprite").src =
    pokemon.sprites?.front_default || "";

  // Set ability from Pokemon data
  const ability = pokemon.abilities?.[0]?.ability?.name || "";
  document.getElementById("customize-ability").value = ability;

  // Get first 4 moves from Pokemon
  const pokemonMoves = pokemon.moves || [];
  for (let i = 1; i <= 4; i++) {
    const moveInput = document.getElementById(`move-${i}`);
    if (pokemonMoves[i - 1]) {
      moveInput.value = pokemonMoves[i - 1].move.name;
    } else {
      moveInput.value = "";
    }
  }

  // Store pokemon data for later
  panel.dataset.pokemonData = JSON.stringify(pokemon);

  // Setup EV total tracker
  setupEVTracker();
}

function setupEVTracker() {
  const evInputs = [
    document.getElementById("ev-hp"),
    document.getElementById("ev-atk"),
    document.getElementById("ev-def"),
    document.getElementById("ev-spa"),
    document.getElementById("ev-spd"),
    document.getElementById("ev-spe"),
  ];

  function updateEVTotal() {
    const total = evInputs.reduce(
      (sum, input) => sum + (parseInt(input.value) || 0),
      0
    );
    document.getElementById("ev-total").textContent = total;
  }

  evInputs.forEach((input) => {
    input.removeEventListener("input", updateEVTotal);
    input.addEventListener("input", updateEVTotal);
  });

  updateEVTotal();
}

async function saveCustomizedPokemon() {
  const panel = document.getElementById("customize-panel");
  const pokemon = JSON.parse(panel.dataset.pokemonData);

  // Get form values
  const level =
    parseInt(document.getElementById("customize-level").value) || 50;
  const nature = document.getElementById("customize-nature").value;
  const ability =
    document.getElementById("customize-ability").value || "unknown";

  const ivs = {
    hp: parseInt(document.getElementById("iv-hp").value) || 31,
    atk: parseInt(document.getElementById("iv-atk").value) || 31,
    def: parseInt(document.getElementById("iv-def").value) || 31,
    spa: parseInt(document.getElementById("iv-spa").value) || 31,
    spd: parseInt(document.getElementById("iv-spd").value) || 31,
    spe: parseInt(document.getElementById("iv-spe").value) || 31,
  };

  const evs = {
    hp: parseInt(document.getElementById("ev-hp").value) || 0,
    atk: parseInt(document.getElementById("ev-atk").value) || 0,
    def: parseInt(document.getElementById("ev-def").value) || 0,
    spa: parseInt(document.getElementById("ev-spa").value) || 0,
    spd: parseInt(document.getElementById("ev-spd").value) || 0,
    spe: parseInt(document.getElementById("ev-spe").value) || 0,
  };

  // Get moves and fetch their data
  const moveNames = [];
  for (let i = 1; i <= 4; i++) {
    const moveName = document.getElementById(`move-${i}`).value.trim();
    if (moveName) {
      moveNames.push(moveName);
    }
  }

  // Fetch all move data
  const moves = [];
  for (const moveName of moveNames) {
    try {
      const moveData = await fetchMoveData(moveName);
      if (moveData) {
        moves.push(moveData);
      }
    } catch (error) {
      console.error(`Failed to fetch move ${moveName}:`, error);
    }
  }

  // Fill with tackle if needed
  while (moves.length < 4) {
    try {
      const tackle = await fetchMoveData("tackle");
      if (tackle) {
        moves.push(tackle);
      } else {
        break;
      }
    } catch (error) {
      break;
    }
  }

  // Add customization to pokemon
  pokemon.level = level;
  pokemon.nature = nature;
  pokemon.ivs = ivs;
  pokemon.evs = evs;

  // Calculate stats with customization
  const calculatedStats = calculateAllStats(pokemon);

  // Map stat names
  const stats = {
    hp: calculatedStats.hp,
    attack: calculatedStats.atk,
    defense: calculatedStats.def,
    specialAttack: calculatedStats.spa,
    specialDefense: calculatedStats.spd,
    speed: calculatedStats.spe,
  };

  // Extract types
  let types = ["normal"];
  if (pokemon.types && Array.isArray(pokemon.types)) {
    types = pokemon.types
      .map((t) => {
        if (typeof t === "string") return t;
        if (t.type && t.type.name) return t.type.name;
        if (t.name) return t.name;
        return "normal";
      })
      .filter(Boolean);
  }

  // Create battle-ready Pokémon object
  const battlePokemon = {
    name: pokemon.name,
    species: pokemon.species?.name || pokemon.name,
    level: level,
    types: types,
    stats: stats,
    currentHP: stats.hp,
    maxHP: stats.hp,
    moves: moves,
    ability: ability,
    nature: nature,
    status: null,
    statStages: {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
    },
    sprite: pokemon.sprites?.front_default || "",
    backSprite: pokemon.sprites?.back_default || "",
  };

  // Add to appropriate team
  if (state.currentTeam === "player") {
    state.playerTeam[state.currentSlot] = battlePokemon;
    updateTeamSlot("player", state.currentSlot, battlePokemon);
  } else {
    state.enemyTeam[state.currentSlot] = battlePokemon;
    updateTeamSlot("enemy", state.currentSlot, battlePokemon);
  }

  // Close customize panel
  document.getElementById("customize-panel").style.display = "none";

  // Check if we can start battle
  updateStartButtonState();
}

function updateTeamSlot(team, slot, pokemon) {
  const slotElement = document.querySelector(
    `#${team}-team-slots .team-slot[data-slot="${slot}"]`
  );

  slotElement.classList.remove("empty");
  slotElement.classList.add("filled");

  const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);

  slotElement.innerHTML = `
        <span class="slot-number">${slot + 1}</span>
        <div class="pokemon-preview">
            <img src="${pokemon.sprite}" alt="${name}">
            <div class="name">${name}</div>
            <div class="level">Lv. ${pokemon.level}</div>
        </div>
        <button class="remove-pokemon" onclick="removePokemon('${team}', ${slot})">×</button>
    `;
}

window.removePokemon = function (team, slot) {
  if (team === "player") {
    state.playerTeam[slot] = null;
  } else {
    state.enemyTeam[slot] = null;
  }

  const slotElement = document.querySelector(
    `#${team}-team-slots .team-slot[data-slot="${slot}"]`
  );

  slotElement.classList.remove("filled");
  slotElement.classList.add("empty");
  slotElement.innerHTML = `
        <span class="slot-number">${slot + 1}</span>
        <button class="add-pokemon">+</button>
    `;

  updateStartButtonState();
};

function updateStartButtonState() {
  const startButton = document.getElementById("start-battle");
  const hasPlayerPokemon = state.playerTeam.filter((p) => p).length > 0;
  const hasEnemyPokemon = state.enemyTeam.filter((p) => p).length > 0;

  startButton.disabled = !(hasPlayerPokemon && hasEnemyPokemon);
}

// ===== EVENT LISTENERS =====

function setupEventListeners() {
  // Search functionality
  const searchInput = document.getElementById("pokemon-search");
  searchInput.addEventListener("input", (e) => {
    loadPokemonOptions(e.target.value);
  });

  // Close modal
  document.querySelector(".close-modal").addEventListener("click", closeModal);
  document.getElementById("pokemon-modal").addEventListener("click", (e) => {
    if (e.target.id === "pokemon-modal") {
      closeModal();
    }
  });

  // Close customize panel
  document
    .getElementById("close-customize-btn")
    .addEventListener("click", () => {
      document.getElementById("customize-panel").style.display = "none";
    });

  // Save customized Pokemon
  document
    .getElementById("save-customize-btn")
    .addEventListener("click", saveCustomizedPokemon);

  // Start battle
  document
    .getElementById("start-battle")
    .addEventListener("click", startBattle);

  // Continue battle after analysis
  document
    .getElementById("continue-battle")
    .addEventListener("click", continueAfterAnalysis);
}

function closeModal() {
  const modal = document.getElementById("pokemon-modal");
  const searchInput = document.getElementById("pokemon-search");

  if (modal) {
    modal.classList.remove("active");
  }
  if (searchInput) {
    searchInput.value = "";
  }
}

// ===== BATTLE PHASE =====

function startBattle() {
  // Clean up teams (remove null entries)
  state.playerTeam = state.playerTeam.filter((p) => p);
  state.enemyTeam = state.enemyTeam.filter((p) => p);

  // Set starting Pokémon (first in each team)
  state.playerActive = { ...state.playerTeam[0], teamIndex: 0 };
  state.enemyActive = { ...state.enemyTeam[0], teamIndex: 0 };

  // Reset battle state
  state.turn = 0;
  state.battleLog = [];
  state.gameOver = false;

  // Switch to battle phase
  state.phase = "battle";
  document.getElementById("team-selection").classList.remove("active");
  document.getElementById("battle-phase").classList.add("active");

  // Initialize battle UI
  updateBattleUI();
  addLog("Battle Start!");
  addLog(`Go! ${state.playerActive.name}!`);
  addLog(`${state.enemyActive.name} appeared!`);
}

function updateBattleUI() {
  // Update player Pokémon
  updatePokemonDisplay("player", state.playerActive);

  // Update enemy Pokémon
  updatePokemonDisplay("enemy", state.enemyActive);

  // Update action buttons
  updateActionButtons();
}

function updatePokemonDisplay(side, pokemon) {
  const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
  const hpPercent = (pokemon.currentHP / pokemon.maxHP) * 100;

  // Update name
  document.getElementById(`${side}-name`).textContent = name;

  // Update types
  const typesContainer = document.getElementById(`${side}-types`);
  typesContainer.innerHTML = pokemon.types
    .map((type) => `<span class="type-badge type-${type}">${type}</span>`)
    .join("");

  // Update HP
  const hpFill = document.getElementById(`${side}-hp-fill`);
  hpFill.style.width = `${hpPercent}%`;
  hpFill.className = "hp-fill";
  if (hpPercent < 25) hpFill.classList.add("low");
  else if (hpPercent < 50) hpFill.classList.add("medium");

  document.getElementById(
    `${side}-hp-text`
  ).textContent = `${pokemon.currentHP}/${pokemon.maxHP} HP`;

  // Update sprite
  const sprite = side === "player" ? pokemon.backSprite : pokemon.sprite;
  document.getElementById(`${side}-sprite`).src = sprite;

  // Update status
  const statusDisplay = document.getElementById(`${side}-status`);
  statusDisplay.textContent = pokemon.status ? `Status: ${pokemon.status}` : "";

  // Update stat stages (if any are non-zero)
  const statStages = document.getElementById(`${side}-stats`);
  const stages = Object.entries(pokemon.statStages)
    .filter(([_, value]) => value !== 0)
    .map(([stat, value]) => `${stat}: ${value > 0 ? "+" : ""}${value}`)
    .join(", ");
  statStages.textContent = stages ? `Stat Changes: ${stages}` : "";
}

function updateActionButtons() {
  // Update move buttons
  const moveButtons = document.getElementById("move-buttons");
  moveButtons.innerHTML = "";

  state.playerActive.moves.forEach((move, index) => {
    const button = document.createElement("button");
    button.className = "move-button";

    const moveName = move.name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    button.innerHTML = `
            <div>
                <div class="move-name">${moveName}</div>
                <div class="move-details">
                    <span class="type-badge type-${move.type.name}">${
      move.type.name
    }</span>
                    ${
                      move.power
                        ? `<span>Power: ${move.power}</span>`
                        : "<span>Status</span>"
                    }
                    ${
                      move.accuracy
                        ? `<span>Acc: ${move.accuracy}%</span>`
                        : "<span>—</span>"
                    }
                </div>
            </div>
        `;

    button.addEventListener("click", () => selectMove(index));
    moveButtons.appendChild(button);
  });

  // Update switch buttons
  const switchButtons = document.getElementById("switch-buttons");
  switchButtons.innerHTML = "";

  state.playerTeam.forEach((pokemon, index) => {
    // Don't show current active Pokémon or fainted Pokémon
    if (index === state.playerActive.teamIndex || pokemon.currentHP <= 0) {
      return;
    }

    const button = document.createElement("button");
    button.className = "switch-button";

    const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    const hpPercent = ((pokemon.currentHP / pokemon.maxHP) * 100).toFixed(0);

    button.innerHTML = `
            <img src="${pokemon.sprite}" alt="${name}" class="switch-sprite">
            <div class="switch-info">
                <div class="switch-name">${name}</div>
                <div class="switch-hp">HP: ${hpPercent}%</div>
            </div>
        `;

    button.addEventListener("click", () => selectSwitch(index));
    switchButtons.appendChild(button);
  });
}

function addLog(message) {
  state.battleLog.push(message);
  const logContent = document.getElementById("log-content");
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = message;
  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;
}

// ===== ACTION SELECTION =====

async function selectMove(moveIndex) {
  const playerAction = {
    type: "move",
    moveIndex: moveIndex,
    move: state.playerActive.moves[moveIndex],
  };

  await analyzeAndExecuteTurn(playerAction);
}

async function selectSwitch(teamIndex) {
  const playerAction = {
    type: "switch",
    targetIndex: teamIndex,
  };

  await analyzeAndExecuteTurn(playerAction);
}

// ===== ANALYSIS & EXECUTION =====

function getEnemyAction() {
  // Create a mock BattleState-like object for the AI
  // We can't use the BattleState constructor because it recalculates stats
  const battleState = {
    yourTeam: state.enemyTeam.map((p) => ({
      name: p.name,
      species: p.species,
      level: p.level,
      types: p.types,
      nature: p.nature,
      ability: p.ability,
      moves: p.moves.map((m) => m.name),
      moveData: p.moves,
      stats: {
        hp: p.stats.hp,
        atk: p.stats.attack,
        def: p.stats.defense,
        spa: p.stats.specialAttack,
        spd: p.stats.specialDefense,
        spe: p.stats.speed,
      },
      currentHP: p.currentHP,
      fainted: p.currentHP <= 0,
      status: p.status,
      statusCounter: 0,
      confusion: 0,
      hasSubstitute: false,
    })),
    enemyTeam: state.playerTeam.map((p) => ({
      name: p.name,
      species: p.species,
      level: p.level,
      types: p.types,
      nature: p.nature,
      ability: p.ability,
      moves: p.moves.map((m) => m.name),
      moveData: p.moves,
      stats: {
        hp: p.stats.hp,
        atk: p.stats.attack,
        def: p.stats.defense,
        spa: p.stats.specialAttack,
        spd: p.stats.specialDefense,
        spe: p.stats.speed,
      },
      currentHP: p.currentHP,
      fainted: p.currentHP <= 0,
      status: p.status,
      statusCounter: 0,
      confusion: 0,
      hasSubstitute: false,
    })),
    yourActiveIndex: state.enemyActive.teamIndex,
    enemyActiveIndex: state.playerActive.teamIndex,
    getYourActive: function () {
      return this.yourTeam[this.yourActiveIndex];
    },
    getEnemyActive: function () {
      return this.enemyTeam[this.enemyActiveIndex];
    },
    fieldEffects: {
      weather: null,
      terrain: null,
      yourHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0 },
      enemyHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0 },
    },
    turnCount: 0,
  };

  // Get AI's chosen action
  const aiAction = selectEnemyAction(battleState);

  if (!aiAction) {
    // Fallback to first move if AI returns null
    return {
      type: "move",
      moveIndex: 0,
      move: state.enemyActive.moves[0],
    };
  }

  // Convert back to our action format
  if (aiAction.type === "move") {
    return {
      type: "move",
      moveIndex: aiAction.moveIndex,
      move: state.enemyActive.moves[aiAction.moveIndex],
    };
  } else {
    return {
      type: "switch",
      targetIndex: aiAction.switchToIndex,
    };
  }
}

async function analyzeAndExecuteTurn(playerAction) {
  // Step 1: Get enemy's optimal action
  const enemyAction = getEnemyAction();

  // Step 2: Evaluate all possible player actions
  const allEvaluations = evaluateAllActions(
    state.playerActive,
    state.enemyActive,
    state.playerTeam,
    state.enemyTeam
  );

  // Step 3: Find the player's chosen action in evaluations
  let chosenEvaluation = null;
  if (playerAction.type === "move") {
    chosenEvaluation = allEvaluations.find(
      (e) => e.type === "move" && e.moveIndex === playerAction.moveIndex
    );
  } else {
    chosenEvaluation = allEvaluations.find(
      (e) => e.type === "switch" && e.targetIndex === playerAction.targetIndex
    );
  }

  if (!chosenEvaluation) {
    console.error("Could not find chosen action in evaluations");
    return;
  }

  // Step 4: Classify the move
  const classification = classifyMove(chosenEvaluation, allEvaluations);

  // Step 5: Show analysis report
  displayAnalysisReport(
    playerAction,
    chosenEvaluation,
    classification,
    allEvaluations,
    enemyAction
  );

  // Step 6: Store actions for execution after user reviews analysis
  state.pendingPlayerAction = playerAction;
  state.pendingEnemyAction = enemyAction;
}

function displayAnalysisReport(
  playerAction,
  evaluation,
  classification,
  allEvaluations,
  enemyAction
) {
  const report = document.getElementById("analysis-report");
  report.classList.remove("hidden");

  // Update rating badge
  const badge = document.getElementById("rating-badge");
  badge.textContent = classification.symbol || "✓";
  badge.className = `rating-badge rating-${classification.cssClass}`;

  // Update title
  document.getElementById("rating-title").textContent =
    classification.classification;

  // Build analysis details
  const detailsContainer = document.getElementById("analysis-details");
  detailsContainer.innerHTML = "";

  // Show action name
  const actionSection = document.createElement("div");
  actionSection.className = "analysis-section";
  actionSection.innerHTML = `
        <h4>Your Choice</h4>
        <p><strong>${getActionName(playerAction)}</strong></p>
        <p>Score: ${evaluation.score}/100 (Best: ${
    classification.bestScore
  })</p>
    `;
  detailsContainer.appendChild(actionSection);

  // Show reasoning
  const reasonSection = document.createElement("div");
  reasonSection.className = "analysis-section";
  reasonSection.innerHTML = `
        <h4>Analysis</h4>
        ${evaluation.reasons.map((r) => `<p>• ${r}</p>`).join("")}
    `;
  detailsContainer.appendChild(reasonSection);

  // Show enemy's planned action
  const enemySection = document.createElement("div");
  enemySection.className = "analysis-section";
  enemySection.innerHTML = `
        <h4>Opponent's Response</h4>
        <p>Predicted: <strong>${getActionName(enemyAction)}</strong></p>
    `;
  detailsContainer.appendChild(enemySection);

  // Show alternatives (top 3)
  const alternativesContainer = document.getElementById("alternatives");
  alternativesContainer.innerHTML = "<h3>Better Alternatives</h3>";

  const topAlternatives = allEvaluations.slice(0, 3);
  topAlternatives.forEach((alt, index) => {
    const altDiv = document.createElement("div");
    altDiv.className = "alternative-move";

    const isChosen =
      alt.type === playerAction.type &&
      ((alt.type === "move" && alt.moveIndex === playerAction.moveIndex) ||
        (alt.type === "switch" &&
          alt.targetIndex === playerAction.targetIndex));

    altDiv.innerHTML = `
            <div class="alternative-header">
                <span class="alternative-name">
                    ${index + 1}. ${getActionName(alt)} ${
      isChosen ? "(Your Choice)" : ""
    }
                </span>
                <span class="alternative-score">Score: ${alt.score}</span>
            </div>
            <div class="alternative-reason">
                ${alt.reasons.slice(0, 2).join(" • ")}
            </div>
        `;

    alternativesContainer.appendChild(altDiv);
  });

  // Scroll to report
  report.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function getActionName(action) {
  if (action.type === "move") {
    const move = action.move;
    return move.name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  } else {
    const pokemon = action.pokemon || state.playerTeam[action.targetIndex];
    return `Switch to ${
      pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)
    }`;
  }
}

async function continueAfterAnalysis() {
  document.getElementById("analysis-report").classList.add("hidden");

  // Execute the turn
  await executeTurn(state.pendingPlayerAction, state.pendingEnemyAction);

  // Clear pending actions
  state.pendingPlayerAction = null;
  state.pendingEnemyAction = null;
}

// ===== TURN EXECUTION =====

async function executeTurn(playerAction, enemyAction) {
  state.turn++;
  addLog(`\n--- Turn ${state.turn} ---`);

  // Determine action order based on priority and speed
  const playerFirst = determineActionOrder(
    playerAction,
    enemyAction,
    state.playerActive,
    state.enemyActive
  );

  if (playerFirst) {
    await executeAction(
      playerAction,
      state.playerActive,
      state.enemyActive,
      "player"
    );
    if (state.enemyActive.currentHP > 0 && !state.gameOver) {
      await executeAction(
        enemyAction,
        state.enemyActive,
        state.playerActive,
        "enemy"
      );
    }
  } else {
    await executeAction(
      enemyAction,
      state.enemyActive,
      state.playerActive,
      "enemy"
    );
    if (state.playerActive.currentHP > 0 && !state.gameOver) {
      await executeAction(
        playerAction,
        state.playerActive,
        state.enemyActive,
        "player"
      );
    }
  }

  // Check for game over
  if (checkGameOver()) {
    return;
  }

  // Update UI for next turn
  updateBattleUI();
}

function determineActionOrder(action1, action2, pokemon1, pokemon2) {
  // Switches always go first
  if (action1.type === "switch" && action2.type !== "switch") return true;
  if (action2.type === "switch" && action1.type !== "switch") return false;
  if (action1.type === "switch" && action2.type === "switch") return true;

  // Both are moves - check priority, then speed
  const move1 = action1.move;
  const move2 = action2.move;

  const priority1 = move1.priority || 0;
  const priority2 = move2.priority || 0;

  if (priority1 > priority2) return true;
  if (priority2 > priority1) return false;

  // Same priority - check speed
  return pokemon1.stats.speed >= pokemon2.stats.speed;
}

async function executeAction(action, attacker, defender, side) {
  if (action.type === "switch") {
    executeSwitchAction(action, side);
  } else {
    executeMoveAction(action, attacker, defender, side);
  }
}

function executeSwitchAction(action, side) {
  const teamIndex = action.targetIndex;
  const newPokemon =
    side === "player"
      ? state.playerTeam[teamIndex]
      : state.enemyTeam[teamIndex];

  const oldName =
    side === "player" ? state.playerActive.name : state.enemyActive.name;
  const newName =
    newPokemon.name.charAt(0).toUpperCase() + newPokemon.name.slice(1);

  addLog(`${oldName} was recalled!`);
  addLog(`Go! ${newName}!`);

  // Update active Pokémon
  if (side === "player") {
    state.playerActive = { ...newPokemon, teamIndex: teamIndex };
  } else {
    state.enemyActive = { ...newPokemon, teamIndex: teamIndex };
  }

  updateBattleUI();
}

function executeMoveAction(action, attacker, defender, side) {
  const move = action.move;
  const moveName = move.name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const attackerName =
    attacker.name.charAt(0).toUpperCase() + attacker.name.slice(1);

  addLog(`${attackerName} used ${moveName}!`);

  // Check accuracy
  if (move.accuracy && Math.random() * 100 > move.accuracy) {
    addLog("But it missed!");
    return;
  }

  // Calculate and apply damage
  if (move.power) {
    const damageResult = calculateDamage(
      attacker,
      defender,
      move,
      attacker.stats,
      defender.stats
    );
    const damage = Math.floor(
      Math.random() * (damageResult.max - damageResult.min + 1) +
        damageResult.min
    );

    defender.currentHP = Math.max(0, defender.currentHP - damage);

    // Update team member's HP too
    if (side === "player") {
      state.enemyTeam[state.enemyActive.teamIndex].currentHP =
        defender.currentHP;
    } else {
      state.playerTeam[state.playerActive.teamIndex].currentHP =
        defender.currentHP;
    }

    addLog(`It dealt ${damage} damage!`);

    // Show effectiveness message
    const effectiveness = getTypeEffectiveness(move.type.name, defender.types);
    if (effectiveness > 1) {
      addLog("It's super effective!");
    } else if (effectiveness < 1 && effectiveness > 0) {
      addLog("It's not very effective...");
    } else if (effectiveness === 0) {
      addLog("It doesn't affect the target...");
    }

    // Check for KO
    if (defender.currentHP <= 0) {
      const defenderName =
        defender.name.charAt(0).toUpperCase() + defender.name.slice(1);
      addLog(`${defenderName} fainted!`);

      // Handle KO
      handleKO(side === "player" ? "enemy" : "player");
    }
  } else {
    // Status move (simplified - just show message)
    addLog("Status effects not fully implemented yet.");
  }

  updateBattleUI();
}

function handleKO(faintedSide) {
  const team = faintedSide === "player" ? state.playerTeam : state.enemyTeam;

  // Check if there are any remaining Pokémon
  const remainingPokemon = team.filter((p) => p.currentHP > 0);

  if (remainingPokemon.length === 0) {
    // Game over
    state.gameOver = true;
    const winner = faintedSide === "player" ? "Enemy" : "You";
    addLog(`\n${winner} won the battle!`);

    // Disable action buttons
    document.getElementById("move-buttons").innerHTML = "";
    document.getElementById("switch-buttons").innerHTML = "";

    // Show restart option
    const actionPanel = document.querySelector(".action-panel");
    actionPanel.innerHTML = `
            <h3>Battle Over!</h3>
            <p style="text-align: center; margin: 20px 0;">${winner} won the battle!</p>
            <button class="primary-button" onclick="location.reload()">Start New Battle</button>
        `;
  } else {
    // Force switch (simplified - auto-switch to first available)
    const nextPokemon = remainingPokemon[0];
    const teamIndex = team.findIndex((p) => p === nextPokemon);

    if (faintedSide === "player") {
      state.playerActive = { ...nextPokemon, teamIndex: teamIndex };
      addLog(`Go! ${nextPokemon.name}!`);
    } else {
      state.enemyActive = { ...nextPokemon, teamIndex: teamIndex };
      addLog(`Enemy sent out ${nextPokemon.name}!`);
    }

    updateBattleUI();
  }
}

function checkGameOver() {
  if (state.gameOver) {
    return true;
  }

  const playerAlive = state.playerTeam.some((p) => p.currentHP > 0);
  const enemyAlive = state.enemyTeam.some((p) => p.currentHP > 0);

  if (!playerAlive || !enemyAlive) {
    state.gameOver = true;
    return true;
  }

  return false;
}

// Export for use in other modules if needed
export { state, addLog, updateBattleUI };
