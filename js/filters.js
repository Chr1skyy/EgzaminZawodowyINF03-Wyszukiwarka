let filters = { query: '', formulas: [], difficulties: [], languages: [], hideCompleted: false };
let onFiltersChange = null;

function setOnFiltersChangeCallback(cb) { onFiltersChange = cb; }
function getFilters() { return { ...filters }; }
function setQuery(q) { filters.query = q; triggerChange(); }
function toggleFilter(type, value) {
    const keyMap = { 'difficulty': 'difficulties', 'language': 'languages', 'formula': 'formulas' };
    const key = keyMap[type] || type;
    const arr = filters[key];
    const idx = arr.indexOf(value);
    if (idx > -1) arr.splice(idx, 1); else arr.push(value);
    triggerChange();
}

function triggerChange() {
    if (onFiltersChange) onFiltersChange(getFilters());
}

function clearFilters() {
    filters = { query: '', formulas: [], difficulties: [], languages: [], hideCompleted: false };
    document.querySelectorAll('.filter-btn.active, .hide-completed-btn.active').forEach(btn => btn.classList.remove('active'));
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    if (typeof updateHideCompletedBtnText === 'function') updateHideCompletedBtnText();
    if (typeof updateSearchClearBtnVisibility === 'function') updateSearchClearBtnVisibility();
    triggerChange();
}

function updateHideCompletedBtnText() {
    const btn = document.getElementById('hide-completed-toggle');
    if (btn) {
        const span = btn.querySelector('span');
        if (span) {
            span.textContent = filters.hideCompleted ? 'Pokaż ukończone egzaminy' : 'Ukryj ukończone egzaminy';
        }
    }
}

function setHideCompleted(val) {
    filters.hideCompleted = !!val;
    const btn = document.getElementById('hide-completed-toggle');
    if (btn) btn.classList.toggle('active', filters.hideCompleted);
    updateHideCompletedBtnText();
    triggerChange();
}

function bindFilterEvents() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = e => {
            const t = btn.dataset.filter, v = btn.dataset.value;
            toggleFilter(t, v);
            btn.classList.toggle('active');
        };
    });
    updateHideCompletedBtnText();
    const hideCompletedBtn = document.getElementById('hide-completed-toggle');
    if (hideCompletedBtn) {
        hideCompletedBtn.onclick = () => {
            filters.hideCompleted = !filters.hideCompleted;
            hideCompletedBtn.classList.toggle('active');
            updateHideCompletedBtnText();
            triggerChange();
        };
    }
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) clearBtn.onclick = clearFilters;
}

