let filters = { query: '', formulas: [], difficulties: [], languages: [], sessions: [], years: [], hideCompleted: false };
let onFiltersChange = null;

function setOnFiltersChangeCallback(cb) { onFiltersChange = cb; }
function getFilters() { return { ...filters }; }
function setQuery(q) { filters.query = q; triggerChange(); }
function setFilters(newFilters) {
    filters = { 
        ...newFilters, 
        formulas: [...newFilters.formulas], 
        difficulties: [...newFilters.difficulties], 
        languages: [...newFilters.languages],
        sessions: [...(newFilters.sessions || [])],
        years: [...(newFilters.years || [])]
    };
}
function toggleFilter(type, value) {
    const keyMap = { 'difficulty': 'difficulties', 'language': 'languages', 'formula': 'formulas', 'session': 'sessions', 'year': 'years' };
    const key = keyMap[type] || type;
    const arr = filters[key];
    const idx = arr.indexOf(value);
    if (idx > -1) arr.splice(idx, 1); else arr.push(value);
    if (window.umami) {
        window.umami.track('Filter Toggle', { type, value });
    }
    triggerChange();
}

function triggerChange() {
    if (onFiltersChange) onFiltersChange(getFilters());
}

function clearFilters() {
    filters = { query: '', formulas: [], difficulties: [], languages: [], sessions: [], years: [], hideCompleted: false };
    document.querySelectorAll('.filter-btn.active, .hide-completed-btn.active').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
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
            const text = filters.hideCompleted ? 'Pokaż ukończone egzaminy' : 'Ukryj ukończone egzaminy';
            span.textContent = text;
            btn.setAttribute('aria-label', text);
        }
        btn.setAttribute('aria-pressed', filters.hideCompleted);
    }
}

function setHideCompleted(val) {
    filters.hideCompleted = !!val;
    const btn = document.getElementById('hide-completed-toggle');
    if (btn) {
        btn.classList.toggle('active', filters.hideCompleted);
        btn.setAttribute('aria-pressed', filters.hideCompleted);
    }
    updateHideCompletedBtnText();
    triggerChange();
}

function bindFilterEvents() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.setAttribute('aria-pressed', 'false');
        btn.onclick = e => {
            const t = btn.dataset.filter, v = btn.dataset.value;
            toggleFilter(t, v);
            const isActive = btn.classList.toggle('active');
            btn.setAttribute('aria-pressed', isActive);
        };
    });
    updateHideCompletedBtnText();
    const hideCompletedBtn = document.getElementById('hide-completed-toggle');
    if (hideCompletedBtn) {
        hideCompletedBtn.onclick = () => {
            filters.hideCompleted = !filters.hideCompleted;
            const isActive = hideCompletedBtn.classList.toggle('active');
            hideCompletedBtn.setAttribute('aria-pressed', isActive);
            updateHideCompletedBtnText();
            triggerChange();
        };
    }
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) clearBtn.onclick = clearFilters;
}
