// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD9R1vF0Xbec7ikS4RRuuLyMI9RXWeFI6E",
    authDomain: "semanticmemorysystem-9bf21.firebaseapp.com",
    projectId: "semanticmemorysystem-9bf21",
    storageBucket: "semanticmemorysystem-9bf21.firebasestorage.app",
    messagingSenderId: "593430630902",
    appId: "1:593430630902:web:c35787591beb994c00f7d7"
};

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Initialize Firebase (keeping for future use, but not enforcing auth)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// DOM elements
const landingPage = document.getElementById('landingPage');
const appContainer = document.getElementById('appContainer');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInput = document.getElementById('userInput');
const submitBtn = document.getElementById('submitBtn');
const chatLog = document.getElementById('chatLog');
const errorMessage = document.getElementById('errorMessage');
const btnText = submitBtn.querySelector('.btn-text');
const loader = submitBtn.querySelector('.loader');

// Get Started button elements
const getStartedNav = document.getElementById('getStartedNav');
const heroGetStarted = document.getElementById('heroGetStarted');

// Initialize: Show landing page, hide chat
landingPage.style.display = 'block';
appContainer.style.display = 'none';

// Function to navigate to AI chat
function navigateToChat() {
    landingPage.style.display = 'none';
    appContainer.style.display = 'flex';
    // Update navbar button to "Back to Home"
    if (getStartedNav) {
        getStartedNav.textContent = 'Back to Home';
    }
    console.log('Navigated to AI chat interface');
}

// Function to navigate back to landing page
function navigateToHome() {
    landingPage.style.display = 'block';
    appContainer.style.display = 'none';
    // Update navbar button to "Get Started"
    if (getStartedNav) {
        getStartedNav.textContent = 'Get Started';
    }
    chatLog.innerHTML = '<div class="system-message">Select a thought and let Aura integrate it.</div>';
    console.log('Navigated back to landing page');
}

// Navbar button handler - toggles between pages
if (getStartedNav) {
    getStartedNav.addEventListener('click', () => {
        if (landingPage.style.display === 'none') {
            // Currently on chat page, go back to home
            navigateToHome();
        } else {
            // Currently on landing page, go to chat
            navigateToChat();
        }
    });
}

// Hero Get Started button - only navigates to chat
if (heroGetStarted) {
    heroGetStarted.addEventListener('click', navigateToChat);
}

// Logout button - navigate back to landing page
logoutBtn.addEventListener('click', navigateToHome);

// Auto-expand textarea
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
});

// Submit handler (works without auth)
submitBtn.addEventListener('click', async () => {
    const input = userInput.value.trim();
    if (!input) return;

    if (input.length < 3) {
        showError('Please provide a more detailed thought.');
        return;
    }

    hideError();
    setLoading(true);

    // 1. Render User Message immediately
    renderMessage('user', input);
    userInput.value = '';
    userInput.style.height = 'auto';

    try {
        const response = await fetch('https://aura-backend-pidm.onrender.com/update-memory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userInput: input }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to process thought');
        }

        const result = await response.json();

        // 2. Render AI Response
        renderMessage('ai', result.response);

    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'An error occurred. Please try again.');
    } finally {
        setLoading(false);
    }
});

// Render message with markdown support for AI responses
function renderMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;

    if (sender === 'ai') {
        // Simple markdown rendering for AI responses
        msgDiv.innerHTML = formatMarkdown(text);
    } else {
        msgDiv.textContent = text;
    }

    chatLog.appendChild(msgDiv);

    // Auto scroll to bottom
    chatLog.scrollTop = chatLog.scrollHeight;
}

// Simple markdown formatter
function formatMarkdown(text) {
    // Escape HTML first
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks (```code```) - handle multi-line
    html = html.replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>');

    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold (**text**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic (*text*)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Split by double line breaks for paragraphs
    const blocks = html.split('\n\n');

    html = blocks.map(block => {
        const trimmed = block.trim();

        // Headings (### Heading)
        if (trimmed.match(/^###\s+(.+)$/)) {
            return trimmed.replace(/^###\s+(.+)$/, '<h3>$1</h3>');
        }
        if (trimmed.match(/^##\s+(.+)$/)) {
            return trimmed.replace(/^##\s+(.+)$/, '<h2>$1</h2>');
        }
        if (trimmed.match(/^#\s+(.+)$/)) {
            return trimmed.replace(/^#\s+(.+)$/, '<h1>$1</h1>');
        }

        // Unordered lists
        if (trimmed.match(/^[-*]\s+/)) {
            const items = trimmed.split('\n').map(line => {
                const match = line.match(/^[-*]\s+(.+)$/);
                return match ? `<li>${match[1]}</li>` : '';
            }).filter(Boolean).join('');
            return `<ul>${items}</ul>`;
        }

        // Ordered lists
        if (trimmed.match(/^\d+\.\s+/)) {
            const items = trimmed.split('\n').map(line => {
                const match = line.match(/^\d+\.\s+(.+)$/);
                return match ? `<li>${match[1]}</li>` : '';
            }).filter(Boolean).join('');
            return `<ol>${items}</ol>`;
        }

        // Code blocks (already processed above, but check if it's a pre tag)
        if (trimmed.startsWith('<pre>')) {
            return trimmed;
        }

        // Regular paragraphs - replace single line breaks with <br>
        if (trimmed) {
            const withBreaks = trimmed.replace(/\n/g, '<br>');
            return `<p>${withBreaks}</p>`;
        }

        return '';
    }).join('');

    return html;
}

function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    userInput.disabled = isLoading;
    if (isLoading) {
        btnText.style.display = 'none';
        loader.style.display = 'block';
    } else {
        btnText.style.display = 'block';
        loader.style.display = 'none';
    }
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
}

function hideError() {
    errorMessage.style.display = 'none';
}
