import { SESSION_NAMES, track } from './utils.js';

let filters = { query: '', formulas: [], difficulties: [], languages: [], sessions: [], years: [], hideCompleted: false, sortBy: 'default' };
let onFiltersChange = null;

export function setOnFiltersChangeCallback(cb) { onFiltersChange = cb; }
export function getFilters() { return { ...filters }; }
export function setQuery(q) { filters.query = q; triggerChange(); }
export function updateFilters(changes) { Object.assign(filters, changes); triggerChange(); }
export function setFilters(newFilters) {
    filters = { 
        ...newFilters, 
        formulas: [...newFilters.formulas], 
        difficulties: [...newFilters.difficulties], 
        languages: [...newFilters.languages],
        sessions: [...(newFilters.sessions || [])],
        years: [...(newFilters.years || [])],
        sortBy: newFilters.sortBy || 'default'
    };
}
export const FILTER_KEYS = { 'difficulty': 'difficulties', 'language': 'languages', 'formula': 'formulas', 'session': 'sessions', 'year': 'years' };

export function toggleFilter(type, value) {
    const key = FILTER_KEYS[type] || type;
    const arr = filters[key];
    const idx = arr.indexOf(value);
    const isAdding = idx === -1;
    if (isAdding) arr.push(value); else arr.splice(idx, 1);
    if (isAdding) {
        const trackValue = type === 'session' ? (SESSION_NAMES[value] || value) : value;
        track('Filter Toggle', { type, value: trackValue });
    }
    triggerChange();
}

function triggerChange() {
    if (onFiltersChange) onFiltersChange(getFilters());
}

function clearFilters() {
    filters = { query: '', formulas: [], difficulties: [], languages: [], sessions: [], years: [], hideCompleted: false, sortBy: 'default' };
    document.querySelectorAll('.filter-btn.active, .hide-completed-btn.active').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'default';
    updateHideCompletedBtnText();
    triggerChange();
}

export function updateHideCompletedBtnText() {
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

export function bindFilterEvents() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
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
