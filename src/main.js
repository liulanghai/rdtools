import * as base64 from './modules/base64.js';
import * as auth from './modules/auth.js';
import { setupJsonEditor } from './modules/jsonEditor.js';

// Tab switching logic
const tabs = {
    'tab-json': 'section-json',
    'tab-base64': 'section-base64',
    'tab-auth': 'section-auth'
};

Object.keys(tabs).forEach(tabId => {
    document.getElementById(tabId).addEventListener('click', () => {
        // Update tab buttons
        Object.keys(tabs).forEach(id => {
            document.getElementById(id).classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');

        // Update sections
        Object.values(tabs).forEach(sectionId => {
            document.getElementById(sectionId).classList.add('hidden');
        });
        document.getElementById(tabs[tabId]).classList.remove('hidden');
    });
});

// Base64 logic
const base64Input = document.getElementById('base64-input');
const base64Output = document.getElementById('base64-output');

document.getElementById('btn-base64-encode').addEventListener('click', () => {
    base64Output.value = base64.encode(base64Input.value);
});

document.getElementById('btn-base64-decode').addEventListener('click', () => {
    base64Output.value = base64.decode(base64Input.value);
});

// Auth Gen logic
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const authOutput = document.getElementById('auth-output');

document.getElementById('btn-auth-generate').addEventListener('click', () => {
    authOutput.value = auth.generateBasicAuth(authUsername.value, authPassword.value);
});

document.getElementById('btn-auth-copy').addEventListener('click', () => {
    authOutput.select();
    document.execCommand('copy');
});

// JSON Editor setup
setupJsonEditor();
