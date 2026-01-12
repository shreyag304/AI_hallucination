const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AIzaSyD9R1vF0Xbec7ikS4RRuuLyMI9RXWeFI6E');

async function findWorkingModel() {
    const candidateModels = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-flash-latest',
        'gemini-pro-latest'
    ];

    for (const modelName of candidateModels) {
        try {
            console.log(`Testing model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say 'hello'");
            const response = await result.response;
            console.log(`✅ Success with ${modelName}: ${response.text()}`);
            return modelName;
        } catch (e) {
            console.log(`❌ Failed with ${modelName}: ${e.message}`);
        }
    }
    console.log("No working model found in basic list. Checking all available models...");

    try {
        const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyD9R1vF0Xbec7ikS4RRuuLyMI9RXWeFI6E`);
        const data = await res.json();
        const apiModels = data.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace('models/', ''));

        for (const modelName of apiModels) {
            if (candidateModels.includes(modelName)) continue;
            try {
                console.log(`Testing API model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Say 'hello'");
                const response = await result.response;
                console.log(`✅ Success with ${modelName}: ${response.text()}`);
                return modelName;
            } catch (e) {
                console.log(`❌ Failed with ${modelName}: ${e.message}`);
            }
        }
    } catch (err) {
        console.error("Discovery error:", err.message);
    }
    return null;
}

findWorkingModel().then(name => {
    if (name) {
        console.log(`FOUND WORKING MODEL: ${name}`);
    } else {
        console.log("CRITICAL: No working models found for this API key.");
    }
});
