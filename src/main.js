import * as base64 from './modules/base64.js';
import * as auth from './modules/auth.js';
import * as timestamp from './modules/timestamp.js';
import { setupJsonEditor } from './modules/jsonEditor.js';

// Tool Configuration
const TOOLS = [
    { id: 'json', label: 'JSON Editor', sectionId: 'section-json' },
    { id: 'base64', label: 'Base64', sectionId: 'section-base64' },
    { id: 'timestamp', label: 'Timestamp', sectionId: 'section-timestamp' },
    { id: 'auth', label: 'Auth Gen', sectionId: 'section-auth' }
];

let toolOrder = [];

// Initialize
async function init() {
    // Load tool order from storage
    const result = await chrome.storage.local.get(['toolOrder']);
    if (result.toolOrder && result.toolOrder.length === TOOLS.length) {
        toolOrder = result.toolOrder;
    } else {
        toolOrder = TOOLS.map(t => t.id);
    }

    renderTabs();
    setupEventListeners();
    setupSettingsModal();

    // JSON Editor setup
    setupJsonEditor();
}

function renderTabs() {
    const navTabs = document.getElementById('nav-tabs');
    navTabs.innerHTML = '';

    toolOrder.forEach((toolId, index) => {
        const tool = TOOLS.find(t => t.id === toolId);
        if (!tool) return;

        const button = document.createElement('button');
        button.id = `tab-${tool.id}`;
        button.textContent = tool.label;
        if (index === 0) button.className = 'active';

        button.onclick = () => switchTab(tool.id);
        navTabs.appendChild(button);
    });

    // Show the first tool's section by default
    if (toolOrder.length > 0) {
        switchTab(toolOrder[0]);
    }
}

function switchTab(activeToolId) {
    toolOrder.forEach(toolId => {
        const tool = TOOLS.find(t => t.id === toolId);
        const button = document.getElementById(`tab-${toolId}`);
        const section = document.getElementById(tool.sectionId);

        if (toolId === activeToolId) {
            button.classList.add('active');
            section.classList.remove('hidden');
        } else {
            button.classList.remove('active');
            section.classList.add('hidden');
        }
    });
}

function setupEventListeners() {
    // Base64 logic
    const base64Input = document.getElementById('base64-input');
    const base64Output = document.getElementById('base64-output');

    document.getElementById('btn-base64-encode').addEventListener('click', () => {
        base64Output.value = base64.encode(base64Input.value);
    });

    document.getElementById('btn-base64-decode').addEventListener('click', () => {
        base64Output.value = base64.decode(base64Input.value);
    });

    // Timestamp logic
    const tsInput = document.getElementById('ts-input');
    const dateInput = document.getElementById('date-input');

    document.getElementById('btn-ts-to-date').addEventListener('click', () => {
        dateInput.value = timestamp.toDate(tsInput.value);
    });

    document.getElementById('btn-date-to-ts').addEventListener('click', () => {
        tsInput.value = timestamp.toTimestamp(dateInput.value);
    });

    document.getElementById('btn-date-to-tsms').addEventListener('click', () => {
        tsInput.value = timestamp.toTimestampMs(dateInput.value);
    });

    document.getElementById('btn-ts-now').addEventListener('click', () => {
        tsInput.value = Math.floor(Date.now() / 1000).toString();
        dateInput.value = new Date().toLocaleString();
    });

    document.getElementById('btn-ts-clear').addEventListener('click', () => {
        tsInput.value = '';
        dateInput.value = '';
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
}

function setupSettingsModal() {
    const settingsModal = document.getElementById('settings-modal-overlay');
    const btnSettings = document.getElementById('btn-settings');
    const btnClose = document.getElementById('btn-settings-close');
    const reorderList = document.getElementById('reorder-list');

    btnSettings.onclick = () => {
        renderReorderList();
        settingsModal.classList.remove('hidden');
    };

    btnClose.onclick = () => {
        settingsModal.classList.add('hidden');
    };

    let draggedItem = null;

    function renderReorderList() {
        reorderList.innerHTML = '';
        toolOrder.forEach((toolId, index) => {
            const tool = TOOLS.find(t => t.id === toolId);
            const item = document.createElement('div');
            item.className = 'reorder-item';
            item.draggable = true;
            item.dataset.id = toolId;
            item.dataset.index = index;

            item.innerHTML = `
                <div class="drag-handle">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="15" x2="16" y2="15"></line></svg>
                </div>
                <span class="reorder-item-label">${tool.label}</span>
            `;

            // Drag and Drop handlers
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                reorderList.querySelectorAll('.reorder-item').forEach(el => el.classList.remove('drag-over'));
                draggedItem = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const target = e.target.closest('.reorder-item');
                if (target && target !== draggedItem) {
                    reorderList.querySelectorAll('.reorder-item').forEach(el => el.classList.remove('drag-over'));
                    target.classList.add('drag-over');
                }
            });

            item.addEventListener('drop', async (e) => {
                e.preventDefault();
                const target = e.target.closest('.reorder-item');
                if (target && target !== draggedItem) {
                    const fromIndex = parseInt(draggedItem.dataset.index);
                    const toIndex = parseInt(target.dataset.index);

                    const [movedTool] = toolOrder.splice(fromIndex, 1);
                    toolOrder.splice(toIndex, 0, movedTool);

                    await chrome.storage.local.set({ toolOrder });
                    renderReorderList();
                    renderTabs();
                }
            });

            reorderList.appendChild(item);
        });
    }
}

init();

