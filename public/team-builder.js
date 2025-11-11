// State Management
let pokemonBox = [];
let pokemonTeam = [null, null, null, null, null, null];
let draggedPokemon = null;
let draggedFromTeam = false;

// DOM Elements
const showdownInput = document.getElementById("showdownInput");
const importBtn = document.getElementById("importBtn");
const clearBoxBtn = document.getElementById("clearBoxBtn");
const pokemonBoxEl = document.getElementById("pokemonBox");
const pokemonTeamEl = document.getElementById("pokemonTeam");
const messageBox = document.getElementById("messageBox");
const detailPanel = document.getElementById("detailPanel");
const closeDetailBtn = document.getElementById("closeDetailBtn");

// Event Listeners
importBtn.addEventListener("click", importShowdown);
clearBoxBtn.addEventListener("click", clearBox);
closeDetailBtn.addEventListener("click", closeDetailPanel);

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

// Initialize
renderBox();
renderTeam();
