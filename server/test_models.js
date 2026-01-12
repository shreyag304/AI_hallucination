const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyD9R1vF0Xbec7ikS4RRuuLyMI9RXWeFI6E');

async function listModels() {
    try {
        const models = await genAI.getGenerativeModel({ model: "gemini-pro" }); // placeholder
        // Note: SDK doesn't have a direct listModels without full client setup usually
        // but we can try a simple request or use the API directly
        console.log("Testing API key with gemini-pro...");
        const result = await models.generateContent("Hi");
        console.log("Success with gemini-pro!");
    } catch (e) {
        console.error("Error with gemini-pro:", e.message);
        console.log("\nAttempting to find available models via fetch...");
        const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyD9R1vF0Xbec7ikS4RRuuLyMI9RXWeFI6E`);
            const data = await response.json();
            console.log("Available Models:", JSON.stringify(data, null, 2));
        } catch (fetchError) {
            console.error("Fetch Error:", fetchError.message);
        }
    }
}

listModels();
