/**
 * Główna logika aplikacji
 */

import { SESSION_NAMES, cleanTag, copyToClipboard, debounce, getThumbnailUrl, groupTagsByCategory, normalizeString, track } from './utils.js';
import { createAllBadges, createExamCard, createSkeletonCard } from './components.js';
import { getCompletedExams, toggleExamCompleted } from './storage.js';
import { FILTER_KEYS, bindFilterEvents, getFilters, setFilters, setOnFiltersChangeCallback, setQuery, toggleFilter, updateFilters, updateHideCompletedBtnText } from './filters.js';
import { searchExams } from './search.js';
import { bindModalEvents, openModal } from './modal.js';

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
        .map((exam, i) => createExamCard(exam, i, { skipAnimation, isCompleted: app.completed.includes(exam.codeName) }))
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
            openModal(exam);
track('View exam modal', { exam: examId });
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
copyToClipboard(btn.dataset.code, btn);
track('Copy exam code', { exam: btn.dataset.code });
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
    const categories = groupTagsByCategory(sortedTags);

    let html = `<div class="custom-select-option ${currentQuery === '' ? 'selected' : ''}" role="option" tabindex="0" aria-selected="${currentQuery === ''}" data-value="">Wszystkie tagi</div>`;

    for (const [category, items] of Object.entries(categories)) {
        if (items.length === 0) continue;
        html += `<div class="custom-select-group-header">${category}</div>`;
        html += items.map(item => {
            const tag = item.full;
            const cleanTag = item.clean;
            const isSelected = tag.toLowerCase() === currentQuery.toLowerCase();
            return `
                <div class="custom-select-option ${isSelected ? 'selected' : ''} custom-select-option-indented" role="option" tabindex="0" aria-selected="${isSelected}" data-value="${tag}">
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
            btnText.textContent = hasExactTag ? cleanTag(filts.query) : 'Wszystkie tagi';
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

function setDropdownOpen(wrapper, open) {
    const button = wrapper.querySelector('.custom-select-button');
    wrapper.querySelector('.custom-select-dropdown').classList.toggle('show', open);
    button.classList.toggle('active', open);
    button.setAttribute('aria-expanded', open);
}

function bindDropdownClose(wrapper) {
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) setDropdownOpen(wrapper, false);
    });
    wrapper.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        setDropdownOpen(wrapper, false);
        wrapper.querySelector('.custom-select-button').focus();
    });
}

function setupKeyboardActivation() {
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = e.target;
        if (!el.matches('[role="button"], [role="checkbox"], [role="option"]') || el.matches('button, a, input')) return;
        e.preventDefault();
        el.click();
    });
}

function initTagFilter() {
    const customSelectWrapper = document.getElementById('custom-tag-select');
    if (!customSelectWrapper) return;

    const button = customSelectWrapper.querySelector('.custom-select-button');
    const dropdown = customSelectWrapper.querySelector('.custom-select-dropdown');
    const tagSearchInput = document.getElementById('tag-search-input');

    updateTagFilterOptions(getFilters());

    button.onclick = () => {
        const show = !dropdown.classList.contains('show');
        setDropdownOpen(customSelectWrapper, show);
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
        setDropdownOpen(customSelectWrapper, false);
        button.focus();

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            setQuery(value);
            searchInput.value = value;
            if (value) track('Filter Tag', { tag: value });
        }
    };

    bindDropdownClose(customSelectWrapper);

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
        setDropdownOpen(customSelectWrapper, !dropdown.classList.contains('show'));
    };

    dropdown.onclick = (e) => {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;

        const value = option.dataset.value;
        if (value === "") {
            updateFilters({ years: [] });
        } else {
            toggleFilter('year', value);
        }

        setDropdownOpen(customSelectWrapper, false);
        button.focus();
    };

    bindDropdownClose(customSelectWrapper);
}

function initSortSelect() {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.onchange = (e) => {
            const val = e.target.value;
            track('Sort Change', { sortBy: val });
            updateFilters({ sortBy: val });
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

    const normalizedQuery = normalizeString(query);

    app.exams.forEach(exam => {
        if (exam._normalizedCode.includes(normalizedQuery) ||
            exam._normalizedName.includes(normalizedQuery)) {
            suggestions.push({
                type: 'exam',
                title: exam.name,
                subtitle: exam.codeName,
                value: exam.codeName,
                thumb: getThumbnailUrl(exam),
                badges: createAllBadges(exam)
            });
        }
    });

    const allTags = new Set();
    app.exams.forEach(ex => ex.tags?.forEach(t => allTags.add(t)));
    allTags.forEach(tag => {
        const parts = tag.split(': ');
        const category = parts.length > 1 ? parts[0] : '';
        const normalizedTag = normalizeString(tag);
        if (normalizedTag.includes(normalizedQuery)) {
            suggestions.push({
                type: 'tag',
                title: cleanTag(tag),
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

    const pattern = [...normalizeString(query)]
        .map(char => map[char] || char.replace(/[.*+?^${}()|[\]\\]/, '\\$&'))
        .join('');

    return text.replace(new RegExp(`(${pattern})`, 'gi'), '<span class="suggestion-highlight">$1</span>');
}

function selectSuggestion(value) {
    const input = document.getElementById('search-input');
    if (input) {
        input.value = value;
        setQuery(value);
        debouncedTrackSearch(value);
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

const debouncedSearch = debounce((value) => {
    setQuery(value);
}, 200);

const debouncedTrackSearch = debounce((value) => {
    if (value && value.length > 2) {
        const results = searchExams(app.exams, { query: value, formulas: [], difficulties: [], languages: [] }).length;
track('Search', { query: value, results });
    }
}, 1000);

const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');

if (searchInput) {
    searchInput.oninput = e => {
        const val = e.target.value;
        debouncedSearch(val);
        debouncedTrackSearch(val);
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
        const key = FILTER_KEYS[type] || type;
        const isActive = newFilters[key].includes(val);
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive);
    });

    updateHideCompletedBtnText();
}

function renderSkeletons() {
    const grid = document.getElementById('results-grid');
    if (grid) {
        grid.innerHTML = Array(12).fill(createSkeletonCard()).join('');
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
            const sessionName = SESSION_NAMES[session] || session;
            const cleanSession = String(sessionName).toLowerCase().replace('ć', 'c').replace('ń', 'n');
            return `<button class="filter-btn session-${cleanSession}" data-filter="session" data-value="${session}">${sessionName}</button>`;
        }).join('');
    }

    const yearContainer = document.querySelector('#custom-year-select .custom-select-options-container');
    if (yearContainer) {
        let html = `<div class="custom-select-option" role="option" tabindex="0" data-value="">Wszystkie lata</div>`;
        html += sortedYears.map(year => {
            return `<div class="custom-select-option" role="option" tabindex="0" data-value="${year}">${year}</div>`;
        }).join('');
        yearContainer.innerHTML = html;
    }
}

async function initApp() {
    setupThemeToggle();
    bindModalEvents();
    renderSkeletons();

    try {
        const response = await fetch('data.json');
        app.exams = await response.json();
        app.exams.forEach(exam => {
            exam._normalizedCode = normalizeString(exam.codeName);
            exam._normalizedName = normalizeString(exam.name);
            exam._normalizedTags = exam.tags?.map(t => normalizeString(t)) || [];
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
            setupKeyboardActivation();
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