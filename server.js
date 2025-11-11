const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const path = require('path');

const app = express();
const PORT = 3000;

// Initialize cache with 1 hour TTL (time to live)
const cache = new NodeCache({ stdTTL: 3600 });

// Middleware
app.use(express.static('public'));
app.use(express.json());

// API endpoint to get Pokemon by name or ID
app.get('/api/pokemon/:nameOrId', async (req, res) => {
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
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${nameOrId.toLowerCase()}`);
        
        // Extract relevant data
        const pokemonData = {
            id: response.data.id,
            name: response.data.name,
            height: response.data.height,
            weight: response.data.weight,
            types: response.data.types.map(t => t.type.name),
            abilities: response.data.abilities.map(a => a.ability.name),
            stats: response.data.stats.map(s => ({
                name: s.stat.name,
                value: s.base_stat
            })),
            sprite: response.data.sprites.front_default,
            spriteShiny: response.data.sprites.front_shiny
        };

        // Store in cache
        cache.set(cacheKey, pokemonData);
        
        res.json({ ...pokemonData, cached: false });
    } catch (error) {
        if (error.response && error.response.status === 404) {
            res.status(404).json({ error: 'Pokemon not found' });
        } else {
            console.error('Error fetching Pokemon:', error.message);
            res.status(500).json({ error: 'Failed to fetch Pokemon data' });
        }
    }
});

// API endpoint to get list of Pokemon (with pagination)
app.get('/api/pokemon', async (req, res) => {
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
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
        
        const data = {
            count: response.data.count,
            results: response.data.results
        };

        // Store in cache
        cache.set(cacheKey, data);
        
        res.json({ ...data, cached: false });
    } catch (error) {
        console.error('Error fetching Pokemon list:', error.message);
        res.status(500).json({ error: 'Failed to fetch Pokemon list' });
    }
});

// Cache stats endpoint
app.get('/api/cache/stats', (req, res) => {
    const stats = cache.getStats();
    res.json(stats);
});

// Clear cache endpoint
app.post('/api/cache/clear', (req, res) => {
    cache.flushAll();
    res.json({ message: 'Cache cleared successfully' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Pokemon API server running on http://localhost:${PORT}`);
});
