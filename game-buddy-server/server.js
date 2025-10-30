// server.js

// 1. Load environment variables first
require('dotenv').config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


// 2. Setup dependencies
const express = require('express');
const cors = require('cors');
// We require this here, but use the dynamic import inside the functions for reliability
const fetch = require('node-fetch'); 

const app = express();
const PORT = 3000;
const CHEAPSHARK_BASE_URL = 'https://www.cheapshark.com/api/1.0';

// Middleware
const allowedOrigins = [
    'http://localhost:5500', // Still useful for local testing
    'http://127.0.0.1:5500',
    'https://graceful-biscochitos-b238a6.netlify.app' // YOUR NETLIFY DOMAIN
];

// Allow requests from your front-end origin
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(express.json()); // Allows the server to parse JSON bodies

// --- ENDPOINT 1: CHEAPSHARK API PROXY (Handles Deals, Stores, Games) ---
app.get('/api/cheapshark', async (req, res) => {
    // Determine which CheapShark resource to fetch based on query params
    const resource = req.query.resource; 
    delete req.query.resource; 

    if (!resource) {
        return res.status(400).json({ error: 'Missing CheapShark resource type.' });
    }

    // Convert query parameters to a URL search string
    const query = new URLSearchParams(req.query).toString();
    const apiUrl = `${CHEAPSHARK_BASE_URL}/${resource}?${query}`;

    try {
        // Use dynamic import for fetch (CRITICAL FIX for Node fetch issues)
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(apiUrl);

        if (!response.ok) {
            return res.status(response.status).json({ error: `CheapShark API call failed for resource ${resource}.` });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Proxy server error (CheapShark):", error);
        res.status(500).json({ error: 'Internal server error while calling CheapShark.' });
    }
});


// 3. The Proxy Endpoint (GEMINI)
app.post('/api/gemini', async (req, res) => {
    // Check if the prompt was sent from the client
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt in request body.' });
    }

    if (!GEMINI_API_KEY) {
        // This error check is no longer possible because the key is verified in Render
        return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    // 4. Construct the request to the Gemini API (using the secret key)
    const chatHistory = [{ parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        // Use dynamic import for fetch
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // 5. Forward the response (or error) back to the client
        const result = await response.json();
        if (!response.ok) {
            console.error("Gemini API Error:", result);
            return res.status(response.status).json({ error: 'Gemini API call failed', details: result });
        }
        
        // Extract the text and send it back to the client
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        res.json({ text });

    } catch (error) {
        console.error("Proxy server error (Gemini):", error);
        res.status(500).json({ error: 'Internal server error while calling Gemini.' });
    }
});


// 6. Start the server (FINAL CORRECT RENDER CONFIGURATION)
const HOST = '0.0.0.0';
const RENDER_PORT = process.env.PORT || PORT; // Use Render's assigned port

app.listen(RENDER_PORT, HOST, () => {
    // The server must listen on 0.0.0.0 for Render to expose it correctly.
    console.log(`Server running securely on ${HOST}:${RENDER_PORT}`);
});
