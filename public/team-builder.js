// State Management
let pokemonBox = [];
let pokemonTeam = [null, null, null, null, null, null];
let enemyTeam = [null, null, null, null, null, null];
let draggedPokemon = null;
let draggedFromTeam = false;
let currentCustomizeSlot = null;
let currentCustomizePokemon = null;

// DOM Elements
const showdownInput = document.getElementById("showdownInput");
const importBtn = document.getElementById("importBtn");
const clearBoxBtn = document.getElementById("clearBoxBtn");
const pokemonBoxEl = document.getElementById("pokemonBox");
const pokemonTeamEl = document.getElementById("pokemonTeam");
const messageBox = document.getElementById("messageBox");
const detailPanel = document.getElementById("detailPanel");
const closeDetailBtn = document.getElementById("closeDetailBtn");
const boxHeader = document.getElementById("boxHeader");
const customizePanel = document.getElementById("customizePanel");
const closeCustomizeBtn = document.getElementById("closeCustomizeBtn");
const saveCustomizeBtn = document.getElementById("saveCustomizeBtn");

// Event Listeners
importBtn.addEventListener("click", importShowdown);
clearBoxBtn.addEventListener("click", clearBox);
closeDetailBtn.addEventListener("click", closeDetailPanel);
closeCustomizeBtn.addEventListener("click", closeCustomizePanel);
saveCustomizeBtn.addEventListener("click", saveCustomization);
boxHeader.addEventListener("click", toggleBoxCollapse);

// Setup enemy team load buttons
document.querySelectorAll(".load-enemy-btn").forEach((btn) => {
  btn.addEventListener("click", loadEnemyPokemon);
});

// Setup EV input listeners to track total
document.querySelectorAll('[id^="ev"]').forEach((input) => {
  input.addEventListener("input", updateEVTotal);
});

// Import Pokemon from Showdown format
async function importShowdown() {
  const showdownText = showdownInput.value.trim();

  if (!showdownText) {
    showMessage("Please paste Pokemon data in Showdown format", "error");
    return;
  }

  showMessage("Importing Pokemon...", "loading");

  try {
    const response = await fetch("/api/parse-showdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showdownText }),
    });

    if (!response.ok) {
      throw new Error("Failed to parse Pokemon data");
    }

    const data = await response.json();

    // Add to box (max 30)
    const availableSpace = 30 - pokemonBox.length;
    const pokemonToAdd = data.pokemon.slice(0, availableSpace);

    pokemonBox.push(...pokemonToAdd);

    showMessage(
      `Successfully imported ${pokemonToAdd.length} Pokemon!`,
      "success"
    );
    showdownInput.value = "";
    renderBox();
  } catch (error) {
    console.error("Import error:", error);
    showMessage(
      "Failed to import Pokemon. Check the format and try again.",
      "error"
    );
  }
}

// Render Pokemon Box
function renderBox() {
  pokemonBoxEl.innerHTML = "";

  pokemonBox.forEach((pokemon, index) => {
    const pokemonCard = createPokemonCard(pokemon, index, false);
    pokemonBoxEl.appendChild(pokemonCard);
  });

  document.getElementById("boxCount").textContent = pokemonBox.length;
}

// Create Pokemon Card
function createPokemonCard(pokemon, index, isInTeam) {
  const card = document.createElement("div");
  card.className = "pokemon-card-small";
  card.draggable = true;
  card.dataset.index = index;
  card.dataset.inTeam = isInTeam;

  // Drag events
  card.addEventListener("dragstart", handleDragStart);
  card.addEventListener("dragend", handleDragEnd);

  // Click to show details
  card.addEventListener("click", () => showPokemonDetails(pokemon));

  // Card content
  card.innerHTML = `
        <img src="${pokemon.sprite}" alt="${pokemon.name}">
        <div class="card-info">
            <p class="card-name">${capitalize(pokemon.name)}</p>
            <p class="card-level">Lv. ${pokemon.level}</p>
        </div>
    `;

  return card;
}

// Drag and Drop Handlers
function handleDragStart(e) {
  const card = e.target;
  const index = parseInt(card.dataset.index);
  const isInTeam = card.dataset.inTeam === "true";

  draggedPokemon = isInTeam ? pokemonTeam[index] : pokemonBox[index];
  draggedFromTeam = isInTeam;

  card.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}

function handleDragEnd(e) {
  e.target.classList.remove("dragging");
  draggedPokemon = null;
}

// Setup Team Slots for Drop
document.querySelectorAll(".team-slot").forEach((slot) => {
  slot.addEventListener("dragover", handleDragOver);
  slot.addEventListener("drop", handleDrop);
  slot.addEventListener("dragleave", handleDragLeave);
});

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("drag-over");
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");

  const slotIndex = parseInt(e.currentTarget.dataset.slot);

  if (!draggedPokemon) return;

  // Check if team is full
  if (!draggedFromTeam && pokemonTeam[slotIndex] !== null) {
    showMessage("This slot is already occupied!", "error");
    return;
  }

  // Add to team
  if (!draggedFromTeam) {
    pokemonTeam[slotIndex] = draggedPokemon;
  } else {
    // Moving within team - swap positions
    const oldIndex = pokemonTeam.indexOf(draggedPokemon);
    pokemonTeam[oldIndex] = pokemonTeam[slotIndex];
    pokemonTeam[slotIndex] = draggedPokemon;
  }

  renderTeam();
  saveTeamsToLocalStorage();
}

// Render Team
function renderTeam() {
  const teamSlots = document.querySelectorAll(".team-slot");

  teamSlots.forEach((slot, index) => {
    const pokemon = pokemonTeam[index];

    if (pokemon) {
      slot.innerHTML = "";
      slot.classList.add("filled");

      const card = createPokemonCard(pokemon, index, true);
      slot.appendChild(card);

      // Add remove button
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = "&times;";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removePokemonFromTeam(index);
      });
      slot.appendChild(removeBtn);
    } else {
      slot.classList.remove("filled");
      slot.innerHTML = `
                <span class="slot-number">${index + 1}</span>
                <span class="empty-text">Empty Slot</span>
            `;
    }
  });

  updateTeamCount();
}

// Remove Pokemon from Team
function removePokemonFromTeam(index) {
  pokemonTeam[index] = null;
  renderTeam();
  saveTeamsToLocalStorage();
  showMessage("Pokemon removed from team", "success");
}

// Update Team Count
function updateTeamCount() {
  const count = pokemonTeam.filter((p) => p !== null).length;
  document.getElementById("teamCount").textContent = count;
}

// Show Pokemon Details
function showPokemonDetails(pokemon) {
  document.getElementById("detailName").textContent = capitalize(pokemon.name);
  document.getElementById("detailSprite").src = pokemon.sprite;
  document.getElementById("detailLevel").textContent = pokemon.level || 100;
  document.getElementById("detailNature").textContent =
    pokemon.nature || "Hardy";
  document.getElementById("detailAbility").textContent =
    pokemon.ability || "N/A";
  document.getElementById("detailItem").textContent = pokemon.item || "None";

  // Stats
  const statsHTML = pokemon.stats
    .map(
      (stat) => `
        <div class="stat-detail">
            <span class="stat-name">${capitalize(stat.name)}:</span>
            <span class="stat-value">${stat.value}</span>
        </div>
    `
    )
    .join("");
  document.getElementById("detailStats").innerHTML = statsHTML;

  // IVs
  if (pokemon.ivs) {
    const ivsHTML = `
            <div class="iv-ev-grid">
                <span>HP: ${pokemon.ivs.hp}</span>
                <span>Atk: ${pokemon.ivs.atk}</span>
                <span>Def: ${pokemon.ivs.def}</span>
                <span>SpA: ${pokemon.ivs.spa}</span>
                <span>SpD: ${pokemon.ivs.spd}</span>
                <span>Spe: ${pokemon.ivs.spe}</span>
            </div>
        `;
    document.getElementById("detailIVs").innerHTML = ivsHTML;
  }

  // EVs
  if (pokemon.evs) {
    const evsHTML = `
            <div class="iv-ev-grid">
                <span>HP: ${pokemon.evs.hp}</span>
                <span>Atk: ${pokemon.evs.atk}</span>
                <span>Def: ${pokemon.evs.def}</span>
                <span>SpA: ${pokemon.evs.spa}</span>
                <span>SpD: ${pokemon.evs.spd}</span>
                <span>Spe: ${pokemon.evs.spe}</span>
            </div>
        `;
    document.getElementById("detailEVs").innerHTML = evsHTML;
  }

  // Moves
  if (pokemon.moves && pokemon.moves.length > 0) {
    const movesHTML = pokemon.moves.map((move) => `<li>${move}</li>`).join("");
    document.getElementById("detailMoves").innerHTML = movesHTML;
  } else {
    document.getElementById("detailMoves").innerHTML = "<li>No moves set</li>";
  }

  detailPanel.style.display = "block";
}

// Close Detail Panel
function closeDetailPanel() {
  detailPanel.style.display = "none";
}

// Clear Box
function clearBox() {
  if (!confirm("Are you sure you want to clear all Pokemon from the box?")) {
    return;
  }

  pokemonBox = [];
  renderBox();
  showMessage("Box cleared", "success");
}

// Show Message
function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
  messageBox.style.display = "block";

  if (type !== "loading") {
    setTimeout(() => {
      messageBox.style.display = "none";
    }, 3000);
  }
}

// Utility Functions
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Toggle Box Collapse
function toggleBoxCollapse() {
  const icon = document.querySelector(".collapse-icon");
  const content = pokemonBoxEl;

  icon.classList.toggle("collapsed");
  content.classList.toggle("collapsed");
}

// Load Enemy Pokemon
async function loadEnemyPokemon(e) {
  const slot = parseInt(e.target.dataset.slot);
  const input = document.querySelector(`.enemy-input[data-slot="${slot}"]`);
  const query = input.value.trim().toLowerCase();

  if (!query) {
    showMessage("Please enter a Pokemon name or ID", "error");
    return;
  }

  showMessage("Loading Pokemon...", "loading");

  try {
    const response = await fetch(`/api/pokemon/${query}`);

    if (!response.ok) {
      throw new Error("Pokemon not found");
    }

    const data = await response.json();

    // Create enemy pokemon object with default values
    enemyTeam[slot] = {
      ...data,
      level: 100,
      nature: "Hardy",
      ability: data.abilities[0],
      item: null,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: [],
      allMoves: [], // Will be populated when customizing
    };

    renderEnemyTeam();
    saveTeamsToLocalStorage();
    showMessage(`${capitalize(data.name)} loaded!`, "success");
    input.value = "";
  } catch (error) {
    showMessage("Pokemon not found. Please try another name or ID.", "error");
  }
}

// Render Enemy Team
function renderEnemyTeam() {
  const enemySlots = document.querySelectorAll(".enemy-slot");

  enemySlots.forEach((slot, index) => {
    const pokemon = enemyTeam[index];

    if (pokemon) {
      slot.classList.add("filled");
      slot.innerHTML = `
        <span class="slot-number">${index + 1}</span>
        <div class="enemy-pokemon-display">
          <img src="${pokemon.sprite}" alt="${pokemon.name}">
          <p class="enemy-pokemon-name">${capitalize(pokemon.name)}</p>
          <p class="enemy-pokemon-level">Lv. ${pokemon.level}</p>
        </div>
        <button class="remove-btn" onclick="removeEnemyPokemon(${index})">&times;</button>
      `;

      // Add click to customize
      slot.addEventListener("click", (e) => {
        if (!e.target.classList.contains("remove-btn")) {
          openCustomizePanel(index);
        }
      });
    } else {
      slot.classList.remove("filled");
      slot.innerHTML = `
        <span class="slot-number">${index + 1}</span>
        <div class="enemy-slot-content">
          <input type="text" class="enemy-input" placeholder="Enter Pokemon name or ID" data-slot="${index}">
          <button class="load-enemy-btn" data-slot="${index}">Load</button>
        </div>
      `;

      // Re-attach event listener
      const btn = slot.querySelector(".load-enemy-btn");
      btn.addEventListener("click", loadEnemyPokemon);
    }
  });

  updateEnemyTeamCount();
}

// Remove Enemy Pokemon
function removeEnemyPokemon(index) {
  enemyTeam[index] = null;
  renderEnemyTeam();
  saveTeamsToLocalStorage();
  showMessage("Pokemon removed from enemy team", "success");
}

// Update Enemy Team Count
function updateEnemyTeamCount() {
  const count = enemyTeam.filter((p) => p !== null).length;
  document.getElementById("enemyTeamCount").textContent = count;
}

// Open Customize Panel
async function openCustomizePanel(slot) {
  currentCustomizeSlot = slot;
  currentCustomizePokemon = enemyTeam[slot];

  if (!currentCustomizePokemon) return;

  // Populate basic info
  document.getElementById("customizeName").textContent = capitalize(
    currentCustomizePokemon.name
  );
  document.getElementById("customizeSprite").src =
    currentCustomizePokemon.sprite;
  document.getElementById("customizeLevel").value =
    currentCustomizePokemon.level;
  document.getElementById("customizeNature").value =
    currentCustomizePokemon.nature;
  document.getElementById("customizeItem").value =
    currentCustomizePokemon.item || "";

  // Populate ability
  document.getElementById("customizeAbility").value =
    currentCustomizePokemon.ability || "";

  // Populate IVs
  document.getElementById("ivHP").value = currentCustomizePokemon.ivs.hp;
  document.getElementById("ivAtk").value = currentCustomizePokemon.ivs.atk;
  document.getElementById("ivDef").value = currentCustomizePokemon.ivs.def;
  document.getElementById("ivSpA").value = currentCustomizePokemon.ivs.spa;
  document.getElementById("ivSpD").value = currentCustomizePokemon.ivs.spd;
  document.getElementById("ivSpe").value = currentCustomizePokemon.ivs.spe;

  // Populate EVs
  document.getElementById("evHP").value = currentCustomizePokemon.evs.hp;
  document.getElementById("evAtk").value = currentCustomizePokemon.evs.atk;
  document.getElementById("evDef").value = currentCustomizePokemon.evs.def;
  document.getElementById("evSpA").value = currentCustomizePokemon.evs.spa;
  document.getElementById("evSpD").value = currentCustomizePokemon.evs.spd;
  document.getElementById("evSpe").value = currentCustomizePokemon.evs.spe;
  updateEVTotal();

  // Populate moves
  const moves = currentCustomizePokemon.moves || [];
  document.getElementById("move1").value = moves[0] || "";
  document.getElementById("move2").value = moves[1] || "";
  document.getElementById("move3").value = moves[2] || "";
  document.getElementById("move4").value = moves[3] || "";

  customizePanel.style.display = "block";
}

// Update EV Total
function updateEVTotal() {
  const total =
    parseInt(document.getElementById("evHP").value || 0) +
    parseInt(document.getElementById("evAtk").value || 0) +
    parseInt(document.getElementById("evDef").value || 0) +
    parseInt(document.getElementById("evSpA").value || 0) +
    parseInt(document.getElementById("evSpD").value || 0) +
    parseInt(document.getElementById("evSpe").value || 0);

  const totalSpan = document.getElementById("evTotal");
  totalSpan.textContent = total;

  // Highlight if over limit
  if (total > 510) {
    totalSpan.style.color = "#dc3545";
  } else {
    totalSpan.style.color = "#667eea";
  }
}

// Save Customization
function saveCustomization() {
  const evTotal =
    parseInt(document.getElementById("evHP").value || 0) +
    parseInt(document.getElementById("evAtk").value || 0) +
    parseInt(document.getElementById("evDef").value || 0) +
    parseInt(document.getElementById("evSpA").value || 0) +
    parseInt(document.getElementById("evSpD").value || 0) +
    parseInt(document.getElementById("evSpe").value || 0);

  if (evTotal > 510) {
    showMessage("Total EVs cannot exceed 510!", "error");
    return;
  }

  // Get moves from text inputs
  const moves = [
    document.getElementById("move1").value.trim(),
    document.getElementById("move2").value.trim(),
    document.getElementById("move3").value.trim(),
    document.getElementById("move4").value.trim(),
  ].filter((move) => move !== ""); // Remove empty moves

  if (moves.length === 0) {
    showMessage("Please enter at least one move!", "error");
    return;
  }

  // Get ability
  const ability = document.getElementById("customizeAbility").value.trim();
  if (!ability) {
    showMessage("Please enter an ability!", "error");
    return;
  }

  // Update pokemon data
  enemyTeam[currentCustomizeSlot].level = parseInt(
    document.getElementById("customizeLevel").value
  );
  enemyTeam[currentCustomizeSlot].nature =
    document.getElementById("customizeNature").value;
  enemyTeam[currentCustomizeSlot].ability = ability;
  enemyTeam[currentCustomizeSlot].item =
    document.getElementById("customizeItem").value.trim() || null;

  enemyTeam[currentCustomizeSlot].ivs = {
    hp: parseInt(document.getElementById("ivHP").value),
    atk: parseInt(document.getElementById("ivAtk").value),
    def: parseInt(document.getElementById("ivDef").value),
    spa: parseInt(document.getElementById("ivSpA").value),
    spd: parseInt(document.getElementById("ivSpD").value),
    spe: parseInt(document.getElementById("ivSpe").value),
  };

  enemyTeam[currentCustomizeSlot].evs = {
    hp: parseInt(document.getElementById("evHP").value),
    atk: parseInt(document.getElementById("evAtk").value),
    def: parseInt(document.getElementById("evDef").value),
    spa: parseInt(document.getElementById("evSpA").value),
    spd: parseInt(document.getElementById("evSpD").value),
    spe: parseInt(document.getElementById("evSpe").value),
  };

  enemyTeam[currentCustomizeSlot].moves = moves;

  renderEnemyTeam();
  saveTeamsToLocalStorage();
  closeCustomizePanel();
  showMessage("Pokemon customization saved!", "success");
}

// Close Customize Panel
function closeCustomizePanel() {
  customizePanel.style.display = "none";
  currentCustomizeSlot = null;
  currentCustomizePokemon = null;
}

// Save Teams to LocalStorage
function saveTeamsToLocalStorage() {
  localStorage.setItem("pokemonTeam", JSON.stringify(pokemonTeam));
  localStorage.setItem("enemyTeam", JSON.stringify(enemyTeam));
}

// Initialize
renderBox();
renderTeam();
renderEnemyTeam();
