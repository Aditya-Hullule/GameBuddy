// server.js

// 1. Load environment variables first
require('dotenv').config(); 
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


// 2. Setup dependencies
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Middleware
// Allow requests from your front-end origin (adjust if needed, but this works for local testing)
app.use(cors({
    origin: '*' // You can restrict this to 'http://127.0.0.1:5500' or similar if your front-end uses a specific port
}));
app.use(express.json()); // Allows the server to parse JSON bodies

// 3. The Proxy Endpoint
app.post('/api/gemini', async (req, res) => {
    // Check if the prompt was sent from the client
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt in request body.' });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    // 4. Construct the request to the Gemini API (using the secret key)
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
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
        console.error("Proxy server error:", error);
        res.status(500).json({ error: 'Internal server error while calling Gemini.' });
    }
});

// 6. Start the server
app.listen(PORT, () => {
    console.log(`Server running securely on http://localhost:${PORT}`);
});