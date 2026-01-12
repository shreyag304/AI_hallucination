const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI('AIzaSyD9R1vF0Xbec7ikS4RRuuLyMI9RXWeFI6E');

exports.updateMemory = functions.https.onCall(async (data, context) => {
    try {
        // Validate input
        const userInput = data.userInput?.trim();

        if (!userInput) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'User input is required.'
            );
        }

        if (userInput.length < 3) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Input is too short.'
            );
        }

        if (userInput.length > 500) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Input is too long (max 500 characters).'
            );
        }

        // Fetch current memory from Firestore
        const memoryRef = db.collection('memory').doc('current');
        const memoryDoc = await memoryRef.get();

        const currentMemory = memoryDoc.exists
            ? memoryDoc.data().memory_summary
            : '';

        // Prepare prompt for Gemini
        const prompt = `You are an AI that updates a user's long-term semantic memory.

Rules:
- Output exactly ONE sentence
- Maximum 30 words
- Resolve contradictions
- No explanations
- No extra text

Current Memory:
"${currentMemory}"

New Input:
"${userInput}"`;

        // Call Gemini API
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let updatedMemory = response.text().trim();

        // Clean up response (remove quotes, extra whitespace)
        updatedMemory = updatedMemory.replace(/^["']|["']$/g, '').trim();

        // Validate response length (enforce 30 words max)
        const wordCount = updatedMemory.split(/\s+/).length;
        if (wordCount > 30) {
            // Truncate to 30 words
            updatedMemory = updatedMemory.split(/\s+/).slice(0, 30).join(' ') + '...';
        }

        // Overwrite memory in Firestore
        await memoryRef.set({
            memory_summary: updatedMemory,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            memory: updatedMemory
        };

    } catch (error) {
        console.error('Error updating memory:', error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError(
            'internal',
            'Failed to update memory. Please try again.'
        );
    }
});
