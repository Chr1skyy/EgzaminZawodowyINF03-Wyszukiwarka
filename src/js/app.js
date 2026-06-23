/**
 * Główna logika aplikacji
 */

const CARDS_PER_PAGE = 24;

const app = {
    exams: [],
    filtered: [],
    completed: getCompletedExams(),
    visible: CARDS_PER_PAGE,
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

    grid.style.display = '';
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

    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
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
    });
}

function toggleCompleted(examId) {
    app.completed = toggleExamCompleted(examId);
    const isCompleted = app.completed.includes(examId);
    const card = document.querySelector(`.exam-card[data-exam-id="${examId}"]`);
    if (card) {
        card.classList.toggle('completed', isCompleted);
        const checkbox = card.querySelector('[data-action="toggle-completed"]');
        if (checkbox) {
            checkbox.classList.toggle('completed', isCompleted);
            checkbox.setAttribute('aria-checked', isCompleted);
        }
    }

    if (getFilters().hideCompleted) {
        if (card) {
            card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.remove();
                app.filtered = app.filtered.filter(x => x.codeName !== examId);
                updateResultsCount();
                renderResults(true);
            }, 200);
        } else {
            handleFiltersChange(getFilters(), true);
        }
    } else {
        updateResultsCount();
    }
}

function updateResultsCount() {
    const resultsCount = document.getElementById('results-count');
    if (!resultsCount) return;

    const total = app.exams.length;
    const matched = app.filtered.length;
    const showing = Math.min(app.visible, matched);
    const hasFilters = matched !== total;

    if (showing < matched) {
        resultsCount.textContent = `Wyświetlono ${showing} z ${matched} znalezionych`;
    } else if (hasFilters) {
        resultsCount.textContent = `Znaleziono ${matched} z ${total} egzaminów`;
    } else {
        resultsCount.textContent = `${total} egzaminów`;
    }
}

function updateTagFilterOptions(filts) {
    const container = document.querySelector('#custom-tag-select .custom-select-options-container');
    if (!container) return;

    const filtersWithoutQuery = {
        ...filts,
        query: ''
    };
    const baseFiltered = searchExams(app.exams, filtersWithoutQuery, app.completed);

    const tagCounts = {};
    baseFiltered.forEach(exam => {
        exam.tags?.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    const sortedTags = Object.keys(tagCounts).sort((a, b) => {
        if (tagCounts[b] !== tagCounts[a]) return tagCounts[b] - tagCounts[a];
        return a.localeCompare(b, 'pl');
    });

    const currentQuery = (filts.query || '').trim();

    const categories = {
        'SQL': [],
        'Grafika': [],
        'HTML': [],
        'CSS': [],
        'PHP': [],
        'JS': [],
        'Inne': []
    };

    sortedTags.forEach(tag => {
        const parts = tag.split(': ');
        if (parts.length > 1 && categories[parts[0]] !== undefined) {
            categories[parts[0]].push({ full: tag, clean: parts[1] });
        } else {
            categories['Inne'].push({ full: tag, clean: tag });
        }
    });

    let html = `<div class="custom-select-option ${currentQuery === '' ? 'selected' : ''}" role="option" aria-selected="${currentQuery === ''}" data-value="">Wszystkie tagi</div>`;

    for (const [category, items] of Object.entries(categories)) {
        if (items.length === 0) continue;
        html += `<div class="custom-select-group-header">${category}</div>`;
        html += items.map(item => {
            const tag = item.full;
            const cleanTag = item.clean;
            const isSelected = tag.toLowerCase() === currentQuery.toLowerCase();
            return `
                <div class="custom-select-option ${isSelected ? 'selected' : ''} custom-select-option-indented" role="option" aria-selected="${isSelected}" data-value="${tag}">
                    <span>${cleanTag}</span>
                    <span class="custom-select-tag-count">${tagCounts[tag]}</span>
                </div>
            `;
        }).join('');
    }

    container.innerHTML = html;
}

function handleFiltersChange(filts, skipAnimation = false) {
    app.filtered = searchExams(app.exams, filts, app.completed);
    app.visible = CARDS_PER_PAGE;
    renderResults(skipAnimation);
    updateResultsCount();
    updateUrlFromFilters(filts);

    const btnText = document.querySelector('#custom-tag-select .custom-select-text');
    if (btnText) {
        if (!filts.query) {
            btnText.textContent = 'Wszystkie tagi';
        } else {
            const hasExactTag = app.exams.some(ex => ex.tags?.some(t => t.toLowerCase() === filts.query.toLowerCase()));
            const showName = filts.query.includes(': ') ? filts.query.split(': ')[1] : filts.query;
            btnText.textContent = hasExactTag ? showName : 'Wszystkie tagi';
        }
    }

    const yearBtnText = document.querySelector('#custom-year-select .custom-select-text');
    if (yearBtnText) {
        if (!filts.years || filts.years.length === 0) {
            yearBtnText.textContent = 'Wszystkie lata';
        } else {
            yearBtnText.textContent = filts.years.join(', ');
        }
    }

    document.querySelectorAll('#custom-year-select .custom-select-option').forEach(opt => {
        const val = opt.dataset.value;
        const isSelected = val === '' ? (!filts.years || filts.years.length === 0) : filts.years.includes(val);
        opt.classList.toggle('selected', isSelected);
        opt.setAttribute('aria-selected', isSelected);
    });

    updateTagFilterOptions(filts);
}

function initTagFilter() {
    const customSelectWrapper = document.getElementById('custom-tag-select');
    if (!customSelectWrapper) return;

    const button = customSelectWrapper.querySelector('.custom-select-button');
    const dropdown = customSelectWrapper.querySelector('.custom-select-dropdown');
    const tagSearchInput = document.getElementById('tag-search-input');

    updateTagFilterOptions(getFilters());

    button.onclick = () => {
        const show = dropdown.classList.toggle('show');
        button.classList.toggle('active');
        if (show && tagSearchInput) {
            tagSearchInput.value = '';
            filterDropdownOptions('');
            setTimeout(() => tagSearchInput.focus(), 50);
        }
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
            if (window.umami) {
                window.umami.track('Filter Tag', { tag: value || 'Wszystkie' });
            }
        }
    };

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!customSelectWrapper.contains(e.target)) {
            dropdown.classList.remove('show');
            button.classList.remove('active');
        }
    });

    if (tagSearchInput) {
        tagSearchInput.oninput = (e) => {
            filterDropdownOptions(e.target.value);
        };
        // Stop clicks inside search container from bubbling (so it doesn't trigger button toggle or closing)
        tagSearchInput.parentElement.onclick = (e) => {
            e.stopPropagation();
        };
    }

    function filterDropdownOptions(query) {
        const cleanQuery = query.toLowerCase().trim();
        const options = dropdown.querySelectorAll('.custom-select-option');
        
        options.forEach(opt => {
            const val = (opt.dataset.value || '').toLowerCase();
            const text = (opt.textContent || '').toLowerCase();
            if (!cleanQuery || val.includes(cleanQuery) || text.includes(cleanQuery)) {
                opt.style.display = 'flex';
            } else {
                opt.style.display = 'none';
            }
        });

        // Hide headers that have no visible options in their section
        let nextEl = dropdown.querySelector('.custom-select-options-container').firstElementChild;
        let currentHeader = null;
        let hasVisibleOptions = false;
        
        while (nextEl) {
            if (nextEl.classList.contains('custom-select-group-header')) {
                if (currentHeader && !hasVisibleOptions) {
                    currentHeader.style.display = 'none';
                }
                currentHeader = nextEl;
                currentHeader.style.display = '';
                hasVisibleOptions = false;
            } else if (nextEl.classList.contains('custom-select-option')) {
                if (nextEl.style.display !== 'none' && nextEl.dataset.value !== "") {
                    hasVisibleOptions = true;
                }
            }
            nextEl = nextEl.nextElementSibling;
        }
        if (currentHeader && !hasVisibleOptions) {
            currentHeader.style.display = 'none';
        }
    }
}

function initYearFilter() {
    const customSelectWrapper = document.getElementById('custom-year-select');
    if (!customSelectWrapper) return;

    const button = customSelectWrapper.querySelector('.custom-select-button');
    const dropdown = customSelectWrapper.querySelector('.custom-select-dropdown');

    button.onclick = () => {
        const show = dropdown.classList.toggle('show');
        button.classList.toggle('active');
    };

    dropdown.onclick = (e) => {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;

        const value = option.dataset.value;
        if (value === "") {
            filters.years = [];
            triggerChange();
        } else {
            toggleFilter('year', value);
        }

        dropdown.classList.remove('show');
        button.classList.remove('active');
    };

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!customSelectWrapper.contains(e.target)) {
            dropdown.classList.remove('show');
            button.classList.remove('active');
        }
    });
}

function initSortSelect() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.onchange = (e) => {
            const val = e.target.value;
            filters.sortBy = val;
            if (window.umami) {
                window.umami.track('Sort Change', { sortBy: val });
            }
            triggerChange();
        };
    }
}

let activeSuggestionIndex = -1;

function renderSuggestions(query) {
    const container = document.getElementById('search-suggestions');
    if (!container) return;

    if (!query || query.length < 1) {
        container.style.display = 'none';
        activeSuggestionIndex = -1;
        return;
    }

    const suggestions = [];
    const maxSuggestions = 15;

    const normalizedQuery = window.appUtils.normalizeString(query);

    app.exams.forEach(exam => {
        if (exam._normalizedCode.includes(normalizedQuery) ||
            exam._normalizedName.includes(normalizedQuery)) {
            suggestions.push({
                type: 'exam',
                title: exam.name,
                subtitle: exam.codeName,
                value: exam.codeName,
                thumb: window.appUtils.getThumbnailUrl(exam),
                badges: window.uiComponents.createAllBadges(exam)
            });
        }
    });

    const allTags = new Set();
    app.exams.forEach(ex => ex.tags?.forEach(t => allTags.add(t)));
    allTags.forEach(tag => {
        const parts = tag.split(': ');
        const category = parts.length > 1 ? parts[0] : '';
        const cleanTag = parts.length > 1 ? parts[1] : tag;
        const normalizedTag = window.appUtils.normalizeString(tag);
        if (normalizedTag.includes(normalizedQuery)) {
            suggestions.push({
                type: 'tag',
                title: cleanTag,
                subtitle: category ? `Tag (${category})` : 'Tag',
                value: tag,
                badges: ''
            });
        }
    });

    const uniqueSuggestions = [];
    const seen = new Set();
    for (const s of suggestions) {
        const key = `${s.type}-${s.value}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueSuggestions.push(s);
        }
        if (uniqueSuggestions.length >= maxSuggestions) break;
    }

    if (uniqueSuggestions.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = uniqueSuggestions.map((s, i) => `
        <div class="suggestion-item" data-index="${i}" data-value="${s.value}">
            <div class="suggestion-icon">
                ${s.thumb ? `<img src="${s.thumb}" alt="" class="suggestion-thumb" onerror="this.onerror=null; this.parentElement.innerHTML='🖼️';">` : (s.type === 'exam' ? '📄' : '🏷️')}
            </div>
            <div class="suggestion-content">
                <div class="suggestion-header-row">
                    <span class="suggestion-title">${highlightText(s.title, query)}</span>
                    <div class="suggestion-badges">${s.badges}</div>
                </div>
                <span class="suggestion-meta">${s.subtitle}</span>
            </div>
        </div>
    `).join('');

    container.style.display = 'block';
    activeSuggestionIndex = -1;
}

function highlightText(text, query) {
    if (!query) return text;

    const map = {
        'a': '[aą]',
        'c': '[cć]',
        'e': '[eę]',
        'l': '[lł]',
        'n': '[nń]',
        'o': '[oó]',
        's': '[sś]',
        'z': '[zźż]'
    };

    const normalized = window.appUtils.normalizeString(query);
    let pattern = '';
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i];
        if ('[\\^$.|?*+()'.includes(char)) {
            pattern += '\\' + char;
        } else {
            pattern += map[char] || char;
        }
    }

    try {
        const regex = new RegExp(`(${pattern})`, 'gi');
        return text.replace(regex, '<span class="suggestion-highlight">$1</span>');
    } catch (e) {
        const fallbackRegex = new RegExp(`(${query})`, 'gi');
        return text.replace(fallbackRegex, '<span class="suggestion-highlight">$1</span>');
    }
}

function selectSuggestion(value) {
    const input = document.getElementById('search-input');
    if (input) {
        input.value = value;
        setQuery(value);
        if (value && value.length > 2 && window.umami) {
            window.umami.track('Search', { query: value });
        }
        updateSearchClearBtnVisibility();
        hideSuggestions();
    }
}

function hideSuggestions() {
    const container = document.getElementById('search-suggestions');
    if (container) {
        container.style.display = 'none';
        activeSuggestionIndex = -1;
    }
}

const debouncedSearch = window.appUtils.debounce((value) => {
    setQuery(value);
}, 200);

const debouncedTrackSearch = window.appUtils.debounce((value) => {
    if (value && value.length > 2 && window.umami) {
        window.umami.track('Search', { query: value });
    }
}, 1000);

const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');

function updateSearchClearBtnVisibility() {
    if (searchClearBtn && searchInput) {
        searchClearBtn.classList.toggle('visible', searchInput.value.length > 0);
    }
}

if (searchInput) {
    searchInput.oninput = e => {
        const val = e.target.value;
        debouncedSearch(val);
        debouncedTrackSearch(val);
        updateSearchClearBtnVisibility();
        renderSuggestions(val);
    };

    searchInput.onkeydown = e => {
        const suggestions = document.querySelectorAll('.suggestion-item');
        if (suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
            updateActiveSuggestion(suggestions);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex - 1 + suggestions.length) % suggestions.length;
            updateActiveSuggestion(suggestions);
        } else if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
            e.preventDefault();
            selectSuggestion(suggestions[activeSuggestionIndex].dataset.value);
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    };

    // Obsługa kliknięcia poza sugestie
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrapper')) {
            hideSuggestions();
        }
    });

    // Obsługa kliknięcia w sugestię (delegacja)
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.onclick = (e) => {
            const item = e.target.closest('.suggestion-item');
            if (item) {
                selectSuggestion(item.dataset.value);
            }
        };
    }
}

function updateActiveSuggestion(suggestions) {
    suggestions.forEach((s, i) => {
        s.classList.toggle('active', i === activeSuggestionIndex);
        if (i === activeSuggestionIndex) {
            s.scrollIntoView({ block: 'nearest' });
        }
    });
}

if (searchClearBtn) {
    searchClearBtn.onclick = () => {
        if (searchInput) {
            searchInput.value = '';
            setQuery('');
            updateSearchClearBtnVisibility();
            hideSuggestions();
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
    if (filts.sessions && filts.sessions.length) params.set('session', filts.sessions.join(','));
    if (filts.years && filts.years.length) params.set('year', filts.years.join(','));
    if (filts.sortBy && filts.sortBy !== 'default') params.set('sortBy', filts.sortBy);
    if (filts.hideCompleted) params.set('hideCompleted', '1');

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    history.replaceState(null, '', newUrl);
}

function loadFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const newFilters = {
        query: params.get('q') || '',
        formulas: params.get('formula') ? params.get('formula').split(',') : [],
        difficulties: params.get('difficulty') ? params.get('difficulty').split(',') : [],
        languages: params.get('language') ? params.get('language').split(',') : [],
        sessions: params.get('session') ? params.get('session').split(',') : [],
        years: params.get('year') ? params.get('year').split(',') : [],
        sortBy: params.get('sortBy') || 'default',
        hideCompleted: params.get('hideCompleted') === '1'
    };
    setFilters(newFilters);
    const input = document.getElementById('search-input');
    if (input) input.value = newFilters.query;
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = newFilters.sortBy;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        const type = btn.dataset.filter;
        const val = btn.dataset.value;
        const keyMap = { 'difficulty': 'difficulties', 'language': 'languages', 'formula': 'formulas', 'session': 'sessions', 'year': 'years' };
        const key = keyMap[type] || type;
        const isActive = newFilters[key].includes(val);
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive);
    });

    if (typeof updateHideCompletedBtnText === 'function') updateHideCompletedBtnText();
    updateSearchClearBtnVisibility();
}

function renderSkeletons() {
    const grid = document.getElementById('results-grid');
    if (grid) {
        grid.innerHTML = Array(12).fill(window.uiComponents.createSkeletonCard()).join('');
        grid.style.display = 'grid';
    }
}

function renderDynamicFilters() {
    const languages = new Set();
    const sessions = new Set();
    const years = new Set();
    const langCounts = {};

    app.exams.forEach(exam => {
        if (exam.language) {
            languages.add(exam.language);
            langCounts[exam.language] = (langCounts[exam.language] || 0) + 1;
        }
        if (exam.session) sessions.add(exam.session);
        if (exam.year) years.add(exam.year);
    });

    const sortedLanguages = Array.from(languages).sort((a, b) => langCounts[b] - langCounts[a]);
    const sortedSessions = Array.from(sessions).sort((a, b) => a - b);
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    const langContainer = document.getElementById('language-filters');
    if (langContainer) {
        langContainer.innerHTML = sortedLanguages.map(lang => {
            const cleanLang = lang.toLowerCase().replace('+', '').replace('/', '');
            return `<button class="filter-btn language-${cleanLang}" data-filter="language" data-value="${lang}">${lang}</button>`;
        }).join('');
    }

    const sessionContainer = document.getElementById('session-filters');
    if (sessionContainer) {
        sessionContainer.innerHTML = sortedSessions.map(session => {
            const sessionName = window.appUtils.SESSION_NAMES[session] || session;
            const cleanSession = String(sessionName).toLowerCase().replace('ć', 'c').replace('ń', 'n');
            return `<button class="filter-btn session-${cleanSession}" data-filter="session" data-value="${session}">${sessionName}</button>`;
        }).join('');
    }

    const yearContainer = document.querySelector('#custom-year-select .custom-select-options-container');
    if (yearContainer) {
        let html = `<div class="custom-select-option" role="option" data-value="">Wszystkie lata</div>`;
        html += sortedYears.map(year => {
            return `<div class="custom-select-option" role="option" data-value="${year}">${year}</div>`;
        }).join('');
        yearContainer.innerHTML = html;
    }
}

function repositionSearchInput() {
    const searchContainer = document.querySelector('.search-container');
    const headerContainer = document.querySelector('.header-search-container');
    const mainSearchSection = document.querySelector('.search-section');

    if (!searchContainer || !headerContainer || !mainSearchSection) return;

    if (window.innerWidth >= 768) {
        if (searchContainer.parentElement !== headerContainer) {
            headerContainer.appendChild(searchContainer);
        }
    } else {
        if (searchContainer.parentElement !== mainSearchSection) {
            mainSearchSection.appendChild(searchContainer);
        }
    }
}

async function initApp() {
    setupThemeToggle();
    repositionSearchInput();
    window.addEventListener('resize', repositionSearchInput);
    renderSkeletons();

    try {
        const response = await fetch('data.json');
        app.exams = await response.json();
        window.appTagCounts = {};
        app.exams.forEach(exam => {
            exam._normalizedCode = window.appUtils.normalizeString(exam.codeName);
            exam._normalizedName = window.appUtils.normalizeString(exam.name);
            exam._normalizedTags = exam.tags?.map(t => window.appUtils.normalizeString(t)) || [];
            exam.tags?.forEach(tag => {
                window.appTagCounts[tag] = (window.appTagCounts[tag] || 0) + 1;
            });
        });

        renderDynamicFilters();
        loadFiltersFromUrl();
        setOnFiltersChangeCallback(handleFiltersChange);
        handleFiltersChange(getFilters());
        const runIdle = (fn) => {
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(fn, { timeout: 2000 });
            } else {
                setTimeout(fn, 1);
            }
        };

        runIdle(() => {
            initTagFilter();
            initYearFilter();
            initSortSelect();
            bindFilterEvents();
            setupInfiniteScroll();
            setupBackToTop();
            setupResultsGridHandlers();
        });

        window.addEventListener('popstate', () => {
            loadFiltersFromUrl();
            handleFiltersChange(getFilters(), true);
        });

    } catch (error) {
        console.error('Error loading exam data:', error);
    }
}

initApp();