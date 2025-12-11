const express = require("express");
const axios = require("axios");
const NodeCache = require("node-cache");
const path = require("path");

const app = express();
const PORT = 3000;

// Initialize cache with 1 hour TTL (time to live)
const cache = new NodeCache({ stdTTL: 3600 });

// Middleware
app.use(express.static("public"));
app.use(express.json());

// API endpoint to get Pokemon by name or ID
app.get("/api/pokemon/:nameOrId", async (req, res) => {
  const { nameOrId } = req.params;
  const cacheKey = `pokemon_${nameOrId.toLowerCase()}`;

  try {
    // Check if data is in cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for: ${nameOrId}`);
      return res.json({ ...cachedData, cached: true });
    }

    // If not in cache, fetch from API
    console.log(`Cache miss for: ${nameOrId}, fetching from API...`);
    const response = await axios.get(
      `https://pokeapi.co/api/v2/pokemon/${nameOrId.toLowerCase()}`
    );

    // Extract relevant data
    const pokemonData = {
      id: response.data.id,
      name: response.data.name,
      height: response.data.height,
      weight: response.data.weight,
      types: response.data.types.map((t) => t.type.name),
      abilities: response.data.abilities.map((a) => a.ability.name),
      stats: response.data.stats.map((s) => ({
        name: s.stat.name,
        value: s.base_stat,
      })),
      moves: response.data.moves,
      sprite: response.data.sprites.front_default,
      spriteShiny: response.data.sprites.front_shiny,
    };

    // Store in cache
    cache.set(cacheKey, pokemonData);

    res.json({ ...pokemonData, cached: false });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      res.status(404).json({ error: "Pokemon not found" });
    } else {
      console.error("Error fetching Pokemon:", error.message);
      res.status(500).json({ error: "Failed to fetch Pokemon data" });
    }
  }
});

// API endpoint to get list of Pokemon (with pagination)
app.get("/api/pokemon", async (req, res) => {
  const limit = req.query.limit || 20;
  const offset = req.query.offset || 0;
  const cacheKey = `pokemon_list_${limit}_${offset}`;

  try {
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for Pokemon list`);
      return res.json({ ...cachedData, cached: true });
    }

    // Fetch from API
    console.log(`Cache miss for Pokemon list, fetching from API...`);
    const response = await axios.get(
      `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`
    );

    const data = {
      count: response.data.count,
      results: response.data.results,
    };

    // Store in cache
    cache.set(cacheKey, data);

    res.json({ ...data, cached: false });
  } catch (error) {
    console.error("Error fetching Pokemon list:", error.message);
    res.status(500).json({ error: "Failed to fetch Pokemon list" });
  }
});

// Cache stats endpoint
app.get("/api/cache/stats", (req, res) => {
  const stats = cache.getStats();
  res.json(stats);
});

// Clear cache endpoint
app.post("/api/cache/clear", (req, res) => {
  cache.flushAll();
  res.json({ message: "Cache cleared successfully" });
});

// API endpoint to get move data by name or ID
app.get("/api/move/:nameOrId", async (req, res) => {
  const { nameOrId } = req.params;
  const cacheKey = `move_${nameOrId.toLowerCase()}`;

  try {
    // Check if data is in cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for move: ${nameOrId}`);
      return res.json({ ...cachedData, cached: true });
    }

    // If not in cache, fetch from API
    console.log(`Cache miss for move: ${nameOrId}, fetching from API...`);
    const response = await axios.get(
      `https://pokeapi.co/api/v2/move/${nameOrId.toLowerCase()}`
    );

    // Extract relevant move data
    const moveData = {
      id: response.data.id,
      name: response.data.name,
      type: response.data.type.name,
      power: response.data.power,
      accuracy: response.data.accuracy,
      pp: response.data.pp,
      damageClass: response.data.damage_class.name, // physical, special, or status
      priority: response.data.priority,
      effectChance: response.data.effect_chance,
      effectEntries: response.data.effect_entries
        .filter((e) => e.language.name === "en")
        .map((e) => e.effect),
    };

    // Store in cache
    cache.set(cacheKey, moveData);

    res.json({ ...moveData, cached: false });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      res.status(404).json({ error: "Move not found" });
    } else {
      console.error("Error fetching move:", error.message);
      res.status(500).json({ error: "Failed to fetch move data" });
    }
  }
});

// Parse Showdown format and return Pokemon data
app.post("/api/parse-showdown", async (req, res) => {
  const { showdownText } = req.body;

  if (!showdownText) {
    return res.status(400).json({ error: "No showdown text provided" });
  }

  try {
    const parsedPokemon = parseShowdownFormat(showdownText);

    // Fetch Pokemon data from API for each parsed Pokemon
    const pokemonDataPromises = parsedPokemon.map(async (parsed) => {
      const cacheKey = `pokemon_${parsed.name.toLowerCase()}`;

      // Check cache first
      let pokemonData = cache.get(cacheKey);

      if (!pokemonData) {
        // Fetch from API
        const response = await axios.get(
          `https://pokeapi.co/api/v2/pokemon/${parsed.name.toLowerCase()}`
        );
        pokemonData = {
          id: response.data.id,
          name: response.data.name,
          height: response.data.height,
          weight: response.data.weight,
          types: response.data.types.map((t) => t.type.name),
          abilities: response.data.abilities.map((a) => a.ability.name),
          stats: response.data.stats.map((s) => ({
            name: s.stat.name,
            value: s.base_stat,
          })),
          sprite: response.data.sprites.front_default,
          spriteShiny: response.data.sprites.front_shiny,
        };
        cache.set(cacheKey, pokemonData);
      }

      // Combine API data with parsed data
      return {
        ...pokemonData,
        level: parsed.level,
        nature: parsed.nature,
        ability: parsed.ability || pokemonData.abilities[0],
        item: parsed.item,
        ivs: parsed.ivs,
        evs: parsed.evs,
        moves: parsed.moves,
      };
    });

    const pokemonData = await Promise.all(pokemonDataPromises);
    res.json({ pokemon: pokemonData });
  } catch (error) {
    console.error("Error parsing showdown format:", error.message);
    res
      .status(500)
      .json({ error: "Failed to parse Pokemon data: " + error.message });
  }
});

// Helper function to parse Showdown format
function parseShowdownFormat(text) {
  const pokemon = [];
  const blocks = text.trim().split(/\n\n+/);

  blocks.forEach((block) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    if (lines.length === 0) return;

    const parsed = {
      name: "",
      level: 100,
      nature: "Hardy",
      ability: null,
      item: null,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: [],
    };

    // Parse first line (name and optional item)
    const firstLine = lines[0];
    if (firstLine.includes("@")) {
      const parts = firstLine.split("@").map((p) => p.trim());
      parsed.name = parts[0];
      parsed.item = parts[1];
    } else {
      parsed.name = firstLine;
    }

    // Parse remaining lines
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Level
      if (line.startsWith("Level:")) {
        parsed.level = parseInt(line.split(":")[1].trim());
      }
      // Nature
      else if (line.includes("Nature")) {
        parsed.nature = line.split("Nature")[0].trim();
      }
      // Ability
      else if (line.startsWith("Ability:")) {
        parsed.ability = line.split(":")[1].trim();
      }
      // IVs
      else if (line.startsWith("IVs:")) {
        const ivStr = line.split(":")[1].trim();
        const ivPairs = ivStr.split("/").map((p) => p.trim());
        ivPairs.forEach((pair) => {
          const [value, stat] = pair.split(" ").map((p) => p.trim());
          const statKey = stat.toLowerCase();
          if (statKey === "hp") parsed.ivs.hp = parseInt(value);
          else if (statKey === "atk") parsed.ivs.atk = parseInt(value);
          else if (statKey === "def") parsed.ivs.def = parseInt(value);
          else if (statKey === "spa") parsed.ivs.spa = parseInt(value);
          else if (statKey === "spd") parsed.ivs.spd = parseInt(value);
          else if (statKey === "spe") parsed.ivs.spe = parseInt(value);
        });
      }
      // EVs
      else if (line.startsWith("EVs:")) {
        const evStr = line.split(":")[1].trim();
        const evPairs = evStr.split("/").map((p) => p.trim());
        evPairs.forEach((pair) => {
          const [value, stat] = pair.split(" ").map((p) => p.trim());
          const statKey = stat.toLowerCase();
          if (statKey === "hp") parsed.evs.hp = parseInt(value);
          else if (statKey === "atk") parsed.evs.atk = parseInt(value);
          else if (statKey === "def") parsed.evs.def = parseInt(value);
          else if (statKey === "spa") parsed.evs.spa = parseInt(value);
          else if (statKey === "spd") parsed.evs.spd = parseInt(value);
          else if (statKey === "spe") parsed.evs.spe = parseInt(value);
        });
      }
      // Moves
      else if (line.startsWith("-")) {
        const move = line.substring(1).trim();
        parsed.moves.push(move);
      }
    }

    pokemon.push(parsed);
  });

  return pokemon;
}

// Start server
app.listen(PORT, () => {
  console.log(`Pokemon API server running on http://localhost:${PORT}`);
});
