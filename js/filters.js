let filters = { query: '', formulas: [], difficulties: [], languages: [], hideCompleted: false };
let onFiltersChange = null;

function setOnFiltersChangeCallback(cb) { onFiltersChange = cb; }
function getFilters() { return { ...filters }; }
function setQuery(q) { filters.query = q; triggerChange(); }
function toggleFilter(type, value) {
    const key = type === 'difficulty' ? 'difficulties' : type === 'language' ? 'languages' : type === 'formula' ? 'formulas' : type;
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
    document.querySelectorAll('.active').forEach(btn => btn.classList.remove('active'));
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    updateHideCompletedBtnText && updateHideCompletedBtnText();
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

function bindFilterEvents() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = e => {
            const t = btn.dataset.filter, v = btn.dataset.value;
            toggleFilter(t, v);
            btn.classList.toggle('active');
        };
    });
    const hideBtn = document.getElementById('hide-completed-toggle');
    if (hideBtn) {
        hideBtn.addEventListener('click', () => {
            filters.hideCompleted = !filters.hideCompleted;
            hideBtn.classList.toggle('active', filters.hideCompleted);
            updateHideCompletedBtnText();
            triggerChange();
        });
        updateHideCompletedBtnText();
    }
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) clearBtn.onclick = clearFilters;
}
bindFilterEvents();
