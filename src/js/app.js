/**
 * Główna logika aplikacji
 */

const CARDS_PER_PAGE = 24;

const app = {
    exams: [],
    filtered: [],
    completed: getCompletedExams(),
    visible: CARDS_PER_PAGE,
    tags: new Set(),
    loadMoreObserver: null
}

function renderResults(skipAnimation = false) {
    const grid = document.getElementById('results-grid');
    const noResults = document.getElementById('no-results');

    if (app.filtered.length === 0) {
        grid.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    noResults.style.display = 'none';

    grid.innerHTML = app.filtered
        .slice(0, app.visible)
        .map((exam, i) => window.uiComponents.createExamCard(exam, i, { skipAnimation }))
        .join('');

    renderLoadMoreBtn();
}

function renderLoadMoreBtn() {
    removeLoadMoreBtn();
    if (app.visible >= app.filtered.length) return;

    const remaining = app.filtered.length - app.visible;
    const btn = document.createElement('button');
    btn.id = 'load-more-btn';
    btn.className = 'load-more-btn';
    btn.textContent = `Załaduj więcej (${remaining} pozostałych)`;
    btn.onclick = () => {
        app.visible += CARDS_PER_PAGE;
        renderResults(true);
        updateResultsCount();
    };

    const resultsSection = document.querySelector('.results-section');
    if (resultsSection) {
        resultsSection.appendChild(btn);
        if (app.loadMoreObserver) app.loadMoreObserver.observe(btn);
    }
}

function removeLoadMoreBtn() {
    const existing = document.getElementById('load-more-btn');
    if (existing) {
        if (app.loadMoreObserver) app.loadMoreObserver.unobserve(existing);
        existing.remove();
    }
}

function setupInfiniteScroll() {
    app.loadMoreObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const btn = entry.target;
                if (btn && !btn.dataset.loading) {
                    btn.dataset.loading = "true";
                    btn.click();
                }
            }
        });
    }, { rootMargin: '200px' });
}

function setupBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function setupThemeToggle() {
    const btn = document.getElementById('toggle-theme');
    if (!btn) return;

    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    };

    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const nextTheme = current === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        if (window.umami) window.umami.track('Toggle Theme', { theme: nextTheme });
    });
}

function setupResultsGridHandlers() {
    const grid = document.getElementById('results-grid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
        const target = e.target;

        // Podgląd (Modal)
        if (target.closest('[data-action="open-modal"]')) {
            const card = target.closest('.exam-card');
            const examId = card.dataset.examId;
            const exam = app.exams.find(x => x.codeName === examId);
            if (window.openModal) window.openModal(exam);
            return;
        }

        // Checkbox ukończenia
        if (target.closest('[data-action="toggle-completed"]')) {
            const card = target.closest('.exam-card');
            const examId = card.dataset.examId;
            toggleCompleted(examId);
            return;
        }

        // Kopiowanie kodu
        if (target.closest('[data-action="copy-code"]')) {
            const btn = target.closest('[data-action="copy-code"]');
            window.appUtils.copyToClipboard(btn.dataset.code, btn);
            return;
        }

        // Rozwijanie tagów
        if (target.closest('.exam-tag-expand')) {
            const btn = target.closest('.exam-tag-expand');
            const examId = btn.dataset.examId;
            app.tags.add(examId);
            renderResults(true); // Pomiń animację przy rozwijaniu tagów
            return;
        }

        // Zwijanie tagów
        if (target.closest('.exam-tag-collapse')) {
            const btn = target.closest('.exam-tag-collapse');
            const examId = btn.dataset.examId;
            app.tags.delete(examId);
            renderResults(true); // Pomiń animację przy zwijaniu tagów
            return;
        }
    });
}

function toggleCompleted(examId) {
    app.completed = toggleExamCompleted(examId);
    if (getFilters().hideCompleted) {
        handleFiltersChange(getFilters(), true);
    } else {
        renderResults(true);
    }
}

function updateResultsCount() {
    const resultsCount = document.getElementById('results-count');
    if (!resultsCount) return;

    const showing = Math.min(app.visible, app.filtered.length);
    resultsCount.textContent = showing < app.filtered.length 
        ? `Wyświetlono ${showing} z ${app.filtered.length} egzaminów (${app.exams.length} łącznie)`
        : `${app.filtered.length} z ${app.exams.length} egzaminów`;
}

function handleFiltersChange(filts, skipAnimation = false) {
    app.filtered = searchExams(app.exams, filts, app.completed);
    app.visible = CARDS_PER_PAGE;
    renderResults(skipAnimation);
    updateResultsCount();
    updateUrlFromFilters(filts);

    // Reset tag select if query was cleared
    if (!filts.query) {
        const customBtnText = document.querySelector('#custom-tag-select .custom-select-text');
        if (customBtnText) customBtnText.textContent = 'Wszystkie tagi';
        document.querySelectorAll('#custom-tag-select .custom-select-option').forEach(o => o.classList.remove('selected'));
        const defaultTagBtn = document.querySelector('#custom-tag-select .custom-select-option[data-value=""]');
        if (defaultTagBtn) defaultTagBtn.classList.add('selected');
    }
}

function initTagFilter() {
    const customSelectWrapper = document.getElementById('custom-tag-select');
    if (!customSelectWrapper) return;

    const button = customSelectWrapper.querySelector('.custom-select-button');
    const dropdown = customSelectWrapper.querySelector('.custom-select-dropdown');

    const tagCounts = {};
    app.exams.forEach(exam => {
        exam.tags?.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    const sortedTags = Object.keys(tagCounts).sort((a, b) => {
        if (tagCounts[b] !== tagCounts[a]) return tagCounts[b] - tagCounts[a];
        return a.localeCompare(b, 'pl');
    });

    dropdown.innerHTML = `<div class="custom-select-option selected" role="option" aria-selected="true" data-value="">Wszystkie tagi</div>` + 
        sortedTags.map(tag => `
            <div class="custom-select-option" role="option" aria-selected="false" data-value="${tag}">
                <span>${tag}</span>
                <span class="custom-select-tag-count">${tagCounts[tag]}</span>
            </div>
        `).join('');

    button.onclick = () => {
        dropdown.classList.toggle('show');
        button.classList.toggle('active');
    };

    dropdown.onclick = (e) => {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;

        const value = option.dataset.value;
        dropdown.querySelectorAll('.custom-select-option').forEach(o => {
            const isSelected = o === option;
            o.classList.toggle('selected', isSelected);
            o.setAttribute('aria-selected', isSelected);
        });
        button.querySelector('.custom-select-text').textContent = value || 'Wszystkie tagi';
        dropdown.classList.remove('show');
        button.classList.remove('active');

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            setQuery(value);
            searchInput.value = value;
            updateSearchClearBtnVisibility();
        }
    };
}

const debouncedSearch = window.appUtils.debounce((value) => {
    setQuery(value);
    if (value && value.length > 2 && window.umami) {
        window.umami.track('Search', { query: value });
    }
}, 200);

const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');

function updateSearchClearBtnVisibility() {
    if (searchClearBtn && searchInput) {
        searchClearBtn.classList.toggle('visible', searchInput.value.length > 0);
    }
}

if (searchInput) {
    searchInput.oninput = e => {
        debouncedSearch(e.target.value);
        updateSearchClearBtnVisibility();
    };
}

if (searchClearBtn) {
    searchClearBtn.onclick = () => {
        if (searchInput) {
            searchInput.value = '';
            setQuery('');
            updateSearchClearBtnVisibility();
            searchInput.focus();
        }
    };
}

function updateUrlFromFilters(filts) {
    const params = new URLSearchParams();
    if (filts.query && filts.query.trim()) params.set('q', filts.query.trim());
    if (filts.formulas.length) params.set('formula', filts.formulas.join(','));
    if (filts.difficulties.length) params.set('difficulty', filts.difficulties.join(','));
    if (filts.languages.length) params.set('language', filts.languages.join(','));
    if (filts.hideCompleted) params.set('hideCompleted', '1');

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    history.replaceState(null, '', newUrl);
}

function loadFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');

    if (q) {
        const input = document.getElementById('search-input');
        if (input) input.value = q;
        setQuery(q);
    }

    ['formula', 'difficulty', 'language'].forEach(type => {
        const val = params.get(type);
        if (val) {
            val.split(',').forEach(v => {
                toggleFilter(type, v);
                const btn = document.querySelector(`.filter-btn[data-filter="${type}"][data-value="${v}"]`);
                if (btn) btn.classList.add('active');
            });
        }
    });

    if (params.get('hideCompleted') === '1') {
        setHideCompleted(true);
    }

    updateSearchClearBtnVisibility();
}

function renderSkeletons() {
    const grid = document.getElementById('results-grid');
    if (grid) {
        grid.innerHTML = Array(12).fill(window.uiComponents.createSkeletonCard()).join('');
        grid.style.display = 'grid';
    }
}

async function initApp() {
    setupThemeToggle();
    renderSkeletons();

    try {
        const response = await fetch('data.json');
        app.exams = await response.json();

        setOnFiltersChangeCallback(handleFiltersChange);
        loadFiltersFromUrl();
        handleFiltersChange(getFilters());
        const runIdle = (fn) => {
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(fn, { timeout: 2000 });
            } else {
                setTimeout(fn, 1);
            }
        };

        runIdle(() => {
            initFuse(app.exams);
            initTagFilter();
            bindFilterEvents();
            setupInfiniteScroll();
            setupBackToTop();
            setupResultsGridHandlers();
        });

    } catch (error) {
        console.error('Error loading exam data:', error);
    }
}

initApp();