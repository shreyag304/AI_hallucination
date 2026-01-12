# Stable Semantic Memory System

A lightweight web application demonstrating stable long-term memory by maintaining ONE short evolving summary of user intent.

## Features

- ✅ Single evolving memory summary (max 30 words)
- ✅ Real-time updates via Firestore
- ✅ Google Gemini AI integration
- ✅ Firebase Cloud Functions backend
- ✅ Clean, minimal UI with loading states
- ✅ Input validation and error handling

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js + Express
- **AI**: Google Gemini API
- **Database**: Firebase Firestore
- **Hosting**: Firebase Hosting (Frontend only)

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Google Cloud account with Gemini API access
- Firebase project created

### Step 1: Firebase Project Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database (in production mode).
3. Under **Project Settings > Service Accounts**, generate a new private key and save it as `server/serviceAccountKey.json`.

### Step 2: Configure Backend

1. Navigate to the server directory: `cd server`
2. Install dependencies: `npm install`
3. Create a `.env` file in the `server` folder:
```env
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
PORT=3001
```

### Step 3: Configure Frontend

1. Update `script.js` with your Firebase config from the Firebase Console.

### Step 4: Run Locally

1. **Start Backend**:
```bash
cd server
node index.js
```

2. **Start Frontend** (using Firebase serve or any live server):
```bash
firebase serve
```

### Step 5: Deploying (Optional)

- **Frontend**: `firebase deploy --only hosting`
- **Backend**: Deploy the `server` folder to Render, Railway, or any Node.js host. Update the URL in `script.js` to point to your live backend.

## Local Development

### Run Functions Emulator

```bash
firebase emulators:start
```

Update `script.js` to use emulator:
```javascript
// Add after initializing functions
import { connectFunctionsEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
connectFunctionsEmulator(functions, "localhost", 5001);
```

### Serve Locally

```bash
firebase serve
```

Access at: `http://localhost:5000`

## Data Model

Firestore document structure:
```javascript
{
  "memory_summary": "one short evolving sentence",
  "updated_at": Timestamp
}
```

Collection: `memory`  
Document ID: `current`

## How It Works

1. User enters a statement and clicks "Update Memory"
2. Frontend calls `updateMemory` Cloud Function
3. Function fetches current memory from Firestore
4. Function sends current memory + new input to Gemini
5. Gemini returns ONE updated sentence (max 30 words)
6. Function overwrites memory in Firestore
7. Frontend displays updated memory via real-time listener

## Gemini Prompt

```
You are an AI that updates a user's long-term semantic memory.

Rules:
- Output exactly ONE sentence
- Maximum 30 words
- Resolve contradictions
- No explanations
- No extra text

Current Memory:
"{CURRENT_MEMORY}"

New Input:
"{USER_INPUT}"
```

## Security

- Firestore rules allow public read, function-only write
- Input validation (3-500 characters)
- Error handling for API failures
- XSS protection via HTML escaping

## Troubleshooting

**Functions not deploying?**
- Ensure Node.js 18+ is installed
- Check `firebase.json` functions config
- Verify billing is enabled on Firebase project

**Gemini API errors?**
- Verify API key is set correctly
- Check API quota limits
- Ensure `@google/generative-ai` package is installed

**Real-time updates not working?**
- Check Firestore rules are deployed
- Verify Firebase config in `script.js`
- Check browser console for errors

## License

MIT
