export function setupJsonEditor() {
    const jsonInput = document.getElementById('json-input');
    const jsonError = document.getElementById('json-error');
    const treeContainer = document.getElementById('json-tree-container');
    const searchInput = document.getElementById('json-search');
    const searchCount = document.getElementById('search-count');

    // Modal elements
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTextarea = document.getElementById('modal-textarea');
    const btnModalSave = document.getElementById('btn-modal-save');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const btnModalPrettify = document.getElementById('btn-modal-prettify');

    let originalJson = null;
    let currentData = null;
    let activeModalTarget = null;

    // BigInt sensitive helpers
    const BIGINT_MARKER = '___BIGINT___';

    function bigIntSafeParse(str) {
        const wrapped = str.replace(/(:\s*|\[\s*|,|,\s*)(-?\d{16,})(\s*,|\s*\]|\s*\})/g, (match, prefix, num, suffix) => {
            return `${prefix}"${BIGINT_MARKER}${num}"${suffix}`;
        });

        const data = JSON.parse(wrapped);
        const process = (obj) => {
            if (typeof obj === 'string' && obj.startsWith(BIGINT_MARKER)) {
                return { [BIGINT_MARKER]: obj.replace(BIGINT_MARKER, '') };
            }
            if (obj && typeof obj === 'object') {
                for (let k in obj) {
                    obj[k] = process(obj[k]);
                }
            }
            return obj;
        };
        return process(data);
    }

    function bigIntSafeStringify(obj, space) {
        const json = JSON.stringify(obj, (key, value) => {
            if (value && value[BIGINT_MARKER]) {
                return `${BIGINT_MARKER}${value[BIGINT_MARKER]}@@@`;
            }
            return value;
        }, space);
        return json.replace(new RegExp(`"${BIGINT_MARKER}(\\d+)@@@"`, 'g'), '$1');
    }

    // Toast helper
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 1000);
    }

    function clearError() {
        jsonInput.classList.remove('invalid-input');
        jsonError.textContent = '';
    }

    function showError(message) {
        jsonInput.classList.add('invalid-input');
        jsonError.textContent = '❌ ' + message;
    }

    document.getElementById('btn-json-prettify').addEventListener('click', () => {
        const rawValue = jsonInput.value.trim();
        if (!rawValue) {
            clearError();
            return;
        }

        try {
            originalJson = bigIntSafeParse(rawValue);
            currentData = bigIntSafeParse(rawValue);
            renderTree(currentData, treeContainer);
            syncRawView();
            searchInput.value = '';
            searchCount.textContent = '';
            clearError();
        } catch (e) {
            showError("Invalid JSON: " + e.message);
        }
    });

    // Clear error when user starts typing
    jsonInput.addEventListener('input', () => {
        if (jsonInput.classList.contains('invalid-input')) {
            clearError();
        }
    });

    document.getElementById('btn-json-copy').addEventListener('click', () => {
        if (!currentData) return;
        const jsonString = bigIntSafeStringify(currentData, 2);
        navigator.clipboard.writeText(jsonString).then(() => {
            showToast("Copied to clipboard!");
        });
    });

    // Search logic
    searchInput.addEventListener('input', () => {
        performSearch();
    });

    function performSearch() {
        const query = searchInput.value.trim();
        const items = treeContainer.querySelectorAll('.tree-key, .tree-value');
        let count = 0;

        items.forEach(el => {
            const row = el.closest('.tree-row');
            if (row) row.classList.remove('search-match');

            const originalText = el.dataset.originalText || el.textContent;
            if (!el.dataset.originalText) {
                el.dataset.originalText = originalText;
            }

            if (!query) {
                el.textContent = originalText;
                return;
            }

            const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
            if (originalText.toLowerCase().includes(query.toLowerCase())) {
                el.innerHTML = originalText.replace(regex, '<mark class="highlight">$1</mark>');
                if (row) row.classList.add('search-match');
                count++;
                expandParents(el);
            } else {
                el.textContent = originalText;
            }
        });

        searchCount.textContent = query ? `${count} found` : '';
    }

    function expandParents(el) {
        let parent = el.closest('.tree-children');
        while (parent) {
            parent.style.display = 'block';
            const toggle = parent.previousElementSibling?.querySelector('.tree-toggle');
            if (toggle) toggle.textContent = '▼';
            parent = parent.parentElement.closest('.tree-children');
        }
    }

    // Modal Handlers
    btnModalCancel.onclick = () => {
        modalOverlay.classList.add('hidden');
        activeModalTarget = null;
    };

    btnModalSave.onclick = () => {
        if (activeModalTarget) {
            const { parentData, key, isNestedJson } = activeModalTarget;
            let newValue = modalTextarea.value;
            const originalValue = parentData[key];

            if (isNestedJson) {
                try {
                    const parsed = bigIntSafeParse(newValue);
                    newValue = bigIntSafeStringify(parsed);
                } catch (e) { }
            } else if (originalValue && originalValue[BIGINT_MARKER]) {
                if (/^-?\d+$/.test(newValue.trim())) {
                    newValue = { [BIGINT_MARKER]: newValue.trim() };
                }
            } else if (typeof originalValue !== 'string' && originalValue !== null) {
                if (typeof originalValue === 'number' && !isNaN(newValue) && newValue.trim() !== '') {
                    newValue = Number(newValue);
                } else if (typeof originalValue === 'boolean') {
                    newValue = newValue.trim() === 'true';
                }
            }

            parentData[key] = newValue;
            syncRawView();
            renderTree(currentData, treeContainer);
            if (searchInput.value) performSearch();
        }
        modalOverlay.classList.add('hidden');
        activeModalTarget = null;
    };

    btnModalPrettify.onclick = () => {
        try {
            const val = bigIntSafeParse(modalTextarea.value);
            modalTextarea.value = bigIntSafeStringify(val, 2);
        } catch (e) {
            alert("Invalid JSON in modal: " + e.message);
        }
    };

    function syncRawView() {
        if (!currentData) return;
        jsonInput.value = bigIntSafeStringify(currentData, 2);
    }

    function renderTree(data, container) {
        if (!container) return;
        container.innerHTML = '';
        const root = createNode('', data, null, true);
        container.appendChild(root);
    }

    function createNode(key, value, parentData, isRoot = false) {
        const node = document.createElement('div');
        node.className = isRoot ? 'tree-root' : 'tree-node';

        const row = document.createElement('div');
        row.className = 'tree-row';

        let isBigInt = false;
        let displayValue = value;
        if (value && value[BIGINT_MARKER]) {
            isBigInt = true;
            displayValue = value[BIGINT_MARKER];
        }

        if (typeof displayValue === 'object' && displayValue !== null && !isBigInt) {
            const isArray = Array.isArray(displayValue);
            const toggle = document.createElement('span');
            toggle.className = 'tree-toggle';
            toggle.textContent = '▼';
            toggle.onclick = (e) => {
                const children = node.querySelector('.tree-children');
                if (children.style.display === 'none') {
                    children.style.display = 'block';
                    toggle.textContent = '▼';
                } else {
                    children.style.display = 'none';
                    toggle.textContent = '▶';
                }
                e.stopPropagation();
            };
            row.appendChild(toggle);

            if (key !== '') {
                const keySpan = document.createElement('span');
                keySpan.className = 'tree-key';
                const keyText = `"${key}"`;
                keySpan.textContent = keyText;
                keySpan.dataset.originalText = keyText;
                row.appendChild(keySpan);
                const colon = document.createElement('span');
                colon.className = 'tree-colon';
                colon.textContent = ': ';
                row.appendChild(colon);
            }

            const bracket = document.createElement('span');
            bracket.textContent = isArray ? '[' : '{';
            row.appendChild(bracket);
            node.appendChild(row);

            const children = document.createElement('div');
            children.className = 'tree-children';
            Object.entries(displayValue).forEach(([childKey, childValue]) => {
                children.appendChild(createNode(childKey, childValue, displayValue));
            });
            node.appendChild(children);

            const endBracketRow = document.createElement('div');
            endBracketRow.className = 'tree-bracket-end';
            endBracketRow.textContent = isArray ? ']' : '}';
            node.appendChild(endBracketRow);
            return node;
        }

        if (key !== '') {
            const keySpan = document.createElement('span');
            keySpan.className = 'tree-key';
            const keyText = `"${key}"`;
            keySpan.textContent = keyText;
            keySpan.dataset.originalText = keyText;
            row.appendChild(keySpan);
            const colon = document.createElement('span');
            colon.className = 'tree-colon';
            colon.textContent = ': ';
            row.appendChild(colon);
        }

        const valueSpan = document.createElement('span');
        valueSpan.className = `tree-value type-${isBigInt ? 'number' : typeof displayValue}`;

        let isNestedJson = false;
        let nestedParsed = null;
        if (typeof displayValue === 'string' && (displayValue.startsWith('{') || displayValue.startsWith('['))) {
            try {
                nestedParsed = bigIntSafeParse(displayValue);
                if (typeof nestedParsed === 'object' && nestedParsed !== null) {
                    isNestedJson = true;
                }
            } catch (e) { }
        }

        let valueDisplay = '';
        if (isBigInt) {
            valueDisplay = displayValue;
        } else if (typeof displayValue === 'string') {
            valueDisplay = JSON.stringify(displayValue);
        } else {
            valueDisplay = String(displayValue);
        }

        valueSpan.textContent = valueDisplay;
        valueSpan.dataset.originalText = valueDisplay;
        valueSpan.onclick = () => handleValueEdit(valueSpan, key, value, parentData, isNestedJson);
        row.appendChild(valueSpan);
        node.appendChild(row);

        if (isNestedJson) {
            const nestedContainer = document.createElement('div');
            nestedContainer.className = 'tree-node nested-tree';
            nestedContainer.style.borderLeft = '1px dashed #444';
            nestedContainer.style.marginLeft = '20px';
            renderTree(nestedParsed, nestedContainer);
            node.appendChild(nestedContainer);
        }

        return node;
    }

    function handleValueEdit(element, key, value, parentData, isNestedJson = false) {
        if (!parentData) return;

        let actualValue = value;
        let isBigInt = false;
        if (value && value[BIGINT_MARKER]) {
            actualValue = value[BIGINT_MARKER];
            isBigInt = true;
        }

        if (isNestedJson || (typeof actualValue === 'string' && actualValue.length > 100)) {
            activeModalTarget = { parentData, key, isNestedJson };
            if (isNestedJson) {
                try {
                    modalTextarea.value = bigIntSafeStringify(bigIntSafeParse(actualValue), 2);
                } catch (e) {
                    modalTextarea.value = actualValue;
                }
            } else {
                modalTextarea.value = actualValue;
            }
            modalOverlay.classList.remove('hidden');
        } else {
            makeEditable(element, key, value, parentData);
        }
    }

    function makeEditable(element, key, value, parentData) {
        const input = document.createElement('input');
        input.className = 'tree-value-input';

        let actualValue = value;
        let isBigInt = false;
        if (value && value[BIGINT_MARKER]) {
            actualValue = value[BIGINT_MARKER];
            isBigInt = true;
        }

        input.value = isBigInt ? actualValue : (typeof actualValue === 'string' ? actualValue : String(actualValue));

        const blurHandler = () => {
            let newValue = input.value.trim();
            const originalValue = value;
            let finalValue;

            if (originalValue && originalValue[BIGINT_MARKER]) {
                if (/^-?\d+$/.test(newValue)) {
                    finalValue = { [BIGINT_MARKER]: newValue };
                } else {
                    finalValue = newValue;
                }
            } else if (typeof originalValue === 'number') {
                finalValue = isNaN(newValue) || newValue === '' ? newValue : Number(newValue);
            } else if (typeof originalValue === 'boolean') {
                finalValue = newValue === 'true';
            } else if (originalValue === null) {
                if (newValue === 'null') finalValue = null;
                else if (newValue === 'true') finalValue = true;
                else if (newValue === 'false') finalValue = false;
                else if (/^-?\d+$/.test(newValue)) {
                    if (newValue.length >= 16) finalValue = { [BIGINT_MARKER]: newValue };
                    else finalValue = Number(newValue);
                }
                else finalValue = newValue;
            } else {
                finalValue = newValue;
            }

            parentData[key] = finalValue;
            syncRawView();
            renderTree(currentData, treeContainer);
            if (searchInput.value) performSearch();
        };

        input.onblur = blurHandler;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') blurHandler();
        };

        element.replaceWith(input);
        input.focus();
    }
}
