require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
const fs = require('fs');
const path = require('path');
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
        projectId: 'semanticmemorysystem-9bf21'
    });
    console.log('Firebase Admin initialized with service account.');
} else {
    admin.initializeApp({
        projectId: 'semanticmemorysystem-9bf21'
    });
    console.warn('Warning: No serviceAccountKey.json found. Firestore might fail locally.');
}

const db = admin.firestore();

// Initialize Gemini
const genAI = new GoogleGenerativeAI('AIzaSyD9R1vF0Xbec7ikS4RRuuLyMI9RXWeFI6E');

app.post('/update-memory', async (req, res) => {
    try {
        const { userInput } = req.body;
        const uid = 'anonymous'; // Use anonymous user for now

        console.log(`Processing request for anonymous user`);

        if (!userInput || userInput.length < 3) {
            return res.status(400).json({ error: 'Valid user input is required.' });
        }

        // 1. Fetch ALL memory layers
        const memoryRef = db.collection('users').doc(uid).collection('memory');

        // Layer 1: Current Summary (30 words)
        let currentSummary = "";
        try {
            const summaryDoc = await memoryRef.doc('current_summary').get();
            currentSummary = summaryDoc.exists ? summaryDoc.data().summary : "";
        } catch (error) {
            console.error('Error fetching summary:', error.message);
        }

        // Layer 2: Core Facts (Structured)
        let coreFacts = [];
        try {
            const factsDoc = await memoryRef.doc('core_facts').get();
            coreFacts = factsDoc.exists ? (factsDoc.data().facts || []) : [];
        } catch (error) {
            console.error('Error fetching core facts:', error.message);
        }

        // Layer 3: Recent Conversation History (Last 10)
        let recentHistory = [];
        try {
            console.log('Fetching conversation history...');
            const historySnapshot = await memoryRef.doc('current_summary').collection('history')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
            recentHistory = historySnapshot.docs.map(doc => ({
                input: doc.data().input || "",
                response: doc.data().response || "",
                key_points: doc.data().key_points || []
            }));
            console.log(`Found ${recentHistory.length} history items.`);
        } catch (error) {
            console.error('CRITICAL: Error fetching history (potential missing index):', error.message);
            // Don't throw, just proceed with empty history for now to verify if it's the index
        }

        // 2. Prepare Gemini Prompt with ALL context layers
        const coreFactsText = coreFacts.length > 0 ? coreFacts.join('\n- ') : 'None yet';
        const recentHistoryText = recentHistory.length > 0
            ? recentHistory.map((h, i) => `${i + 1}. User: "${h.input}" | Key: ${h.key_points.join(', ')}`).join('\n')
            : 'No previous conversations';

        const prompt = `You are Aura, a helpful and conversational AI assistant with a hierarchical memory system.

=== MEMORY CONTEXT ===

Current Summary (recent context):
"${currentSummary}"

Core Facts (permanent knowledge about user):
- ${coreFactsText}

Recent Conversations:
${recentHistoryText}

=== NEW INPUT ===
"${userInput}"

=== YOUR TASKS ===

1. Generate a natural, conversational RESPONSE:
   - Be helpful, friendly, and informative like ChatGPT
   - Use ALL memory layers to personalize your response
   - Reference past conversations when relevant
   - Provide detailed explanations with examples

2. Update the CURRENT SUMMARY (max 30 words):
   - Capture recent conversation context
   - Keep it concise and relevant

3. Extract/Update CORE FACTS:
   - Identify any NEW permanent facts about the user (preferences, goals, background)
   - Return as array of strings
   - Only include facts that should NEVER be forgotten
   - Examples: "User is learning Python", "Prefers visual explanations", "Working on web project"
   - Return empty array if no new facts

4. Extract KEY POINTS from this conversation:
   - 1-3 short phrases summarizing what was discussed
   - Will be stored in conversation history

OUTPUT FORMAT (JSON):
{
  "response": "Your natural, conversational reply",
  "summary_update": "Updated 30-word summary",
  "new_core_facts": ["fact1", "fact2"],
  "key_points": ["point1", "point2"]
}`;

        // 3. Call Gemini
        console.log(`Calling Gemini with hierarchical memory for user ${uid}...`);
        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text());

        const finalResponse = data.response;
        const updatedSummary = data.summary_update || currentSummary;
        const newCoreFacts = data.new_core_facts || [];
        const keyPoints = data.key_points || [];

        console.log('AI Response:', finalResponse);
        console.log('Updated Summary:', updatedSummary);
        console.log('New Core Facts:', newCoreFacts);
        console.log('Key Points:', keyPoints);

        // 4. Update ALL memory layers in Firestore (SILENT)

        // Update Layer 1: Current Summary
        await memoryRef.doc('current_summary').set({
            summary: updatedSummary,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update Layer 2: Core Facts (merge new facts, avoid duplicates)
        if (newCoreFacts.length > 0) {
            const updatedCoreFacts = [...new Set([...coreFacts, ...newCoreFacts])];
            await memoryRef.doc('core_facts').set({
                facts: updatedCoreFacts,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Update Layer 3: Conversation History (store this conversation)
        await memoryRef.doc('current_summary').collection('history').add({
            input: userInput,
            response: finalResponse,
            key_points: keyPoints,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // 5. Return ONLY the response to the frontend
        res.json({ success: true, response: finalResponse });

    } catch (error) {
        console.error('SERVER ERROR (Full Stack Trace):', error);
        res.status(500).json({ error: 'An error occurred while processing your thought.' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
