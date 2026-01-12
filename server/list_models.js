const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyD9R1vF0Xbec7ikS4RRuuLyMI9RXWeFI6E');

async function listModels() {
    try {
        console.log("Fetching models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyD9R1vF0Xbec7ikS4RRuuLyMI9RXWeFI6E`);
        const data = await response.json();
        const names = data.models.map(m => m.name);
        console.log("Model Names:", names.filter(n => n.includes('gemini')));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

listModels();
