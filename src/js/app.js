let examData = [];
let completedExams = getCompletedExams();
let filteredExams = [];
let expandedTags = new Set();

const CARDS_PER_PAGE = 24;
let visibleCount = CARDS_PER_PAGE;
let loadMoreObserver;

function renderResults(options = {}) {
    const resultsGrid = document.getElementById('results-grid');
    const noResults = document.getElementById('no-results');
    if (!resultsGrid || !noResults) return;

    if (filteredExams.length === 0) {
        resultsGrid.style.display = 'none';
        noResults.style.display = 'block';
        removeLoadMoreBtn();
        return;
    }

    resultsGrid.style.display = 'grid';
    noResults.style.display = 'none';

    if (options.onlyCardId) {
        const card = document.querySelector(`.exam-card[data-exam-id="${options.onlyCardId}"]`);
        if (card) {
            const exam = examData.find(ex => ex.codeName === options.onlyCardId);
            if (exam) {
                const isCompleted = completedExams.includes(exam.codeName);
                const isExpanded = expandedTags.has(exam.codeName);
                const newHtml = window.uiComponents.createExamCard(exam, isCompleted, isExpanded, 0, true);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newHtml;
                const newCard = tempDiv.firstElementChild;
                card.replaceWith(newCard);
                return;
            }
        }
    }

    const toRender = filteredExams.slice(0, visibleCount);
    const noAnimation = options.noAnimation || false;

    resultsGrid.innerHTML = toRender.map((exam, index) => {
        const isCompleted = completedExams.includes(exam.codeName);
        const isExpanded = expandedTags.has(exam.codeName);
        const delay = (index < 12 && !noAnimation) ? (index % CARDS_PER_PAGE) * 0.05 : 0;
        return window.uiComponents.createExamCard(exam, isCompleted, isExpanded, delay, noAnimation);
    }).join('');

    renderLoadMoreBtn();
}

function renderLoadMoreBtn() {
    removeLoadMoreBtn();
    if (visibleCount >= filteredExams.length) return;

    const remaining = filteredExams.length - visibleCount;
    const btn = document.createElement('button');
    btn.id = 'load-more-btn';
    btn.className = 'load-more-btn';
    btn.textContent = `Załaduj więcej (${remaining} pozostałych)`;
    btn.onclick = () => {
        visibleCount += CARDS_PER_PAGE;
        renderResults();
        updateResultsCount();
    };

    const resultsSection = document.querySelector('.results-section');
    if (resultsSection) {
        resultsSection.appendChild(btn);
        if (loadMoreObserver) loadMoreObserver.observe(btn);
    }
}

function removeLoadMoreBtn() {
    const existing = document.getElementById('load-more-btn');
    if (existing) {
        if (loadMoreObserver) loadMoreObserver.unobserve(existing);
        existing.remove();
    }
}

function setupInfiniteScroll() {
    loadMoreObserver = new IntersectionObserver((entries) => {
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


function handleKeyboardActivation(el, callback) {
    el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            callback(e);
        }
    });
}

function setupEventDelegation() {
    const grid = document.getElementById('results-grid');
    if (!grid) return;

    grid.onclick = (e) => {
        const target = e.target;

        const openModalEl = target.closest('[data-action="open-modal"]');
        if (openModalEl) {
            const card = openModalEl.closest('[data-exam-id]');
            const examId = card.dataset.examId;
            const exam = examData.find(ex => ex.codeName === examId);
            if (exam) window.openModal(exam);
            return;
        }

        const toggleCompletedEl = target.closest('[data-action="toggle-completed"]');
        if (toggleCompletedEl) {
            const card = toggleCompletedEl.closest('[data-exam-id]');
            toggleExamCompletedHandler(card.dataset.examId);
            return;
        }

        const copyCodeEl = target.closest('[data-action="copy-code"]');
        if (copyCodeEl) {
            window.appUtils.copyToClipboard(copyCodeEl.dataset.code, copyCodeEl);
            return;
        }

        const expandTagsEl = target.closest('.exam-tag-expand');
        if (expandTagsEl) {
            const card = expandTagsEl.closest('[data-exam-id]');
            const examId = card.dataset.examId;
            expandedTags.add(examId);
            renderResults({ onlyCardId: examId });
            return;
        }

        const collapseTagsEl = target.closest('.exam-tag-collapse');
        if (collapseTagsEl) {
            const card = collapseTagsEl.closest('[data-exam-id]');
            const examId = card.dataset.examId;
            expandedTags.delete(examId);
            renderResults({ onlyCardId: examId });
            return;
        }
    };
}

function toggleExamCompletedHandler(examId) {
    completedExams = toggleExamCompleted(examId);
    const isNowCompleted = completedExams.includes(examId);

    if (typeof gtag === 'function') {
        gtag('event', 'toggle_exam_status', { 'exam_id': examId, 'completed': isNowCompleted ? 'yes' : 'no' });
    }

    if (getFilters().hideCompleted) {
        handleFiltersChange(getFilters());
    } else {
        const card = document.querySelector(`.exam-card[data-exam-id="${examId}"]`);
        if (card) {
            card.classList.toggle('completed', isNowCompleted);
            const btn = card.querySelector('.completion-checkbox');
            if (btn) btn.classList.toggle('completed', isNowCompleted);
        }
        updateResultsCount();
    }
}

function updateResultsCount() {
    const resultsCount = document.getElementById('results-count');
    const showing = Math.min(visibleCount, filteredExams.length);
    if (resultsCount) {
        if (showing < filteredExams.length) {
            resultsCount.textContent = `Wyświetlono ${showing} z ${filteredExams.length} egzaminów (${examData.length} łącznie)`;
        } else {
            resultsCount.textContent = `${filteredExams.length} z ${examData.length} egzaminów`;
        }
    }
}

function handleFiltersChange(filts) {
    filteredExams = searchExams(examData, filts, completedExams);
    visibleCount = CARDS_PER_PAGE;
    renderResults();
    updateResultsCount();
    updateUrlFromFilters(filts);

    if (!filts.query) {
        const customBtnText = document.querySelector('#custom-tag-select .custom-select-text');
        if (customBtnText) customBtnText.textContent = 'Wszystkie tagi';
        document.querySelectorAll('#custom-tag-select .custom-select-option').forEach(o => o.classList.remove('selected'));
        const defaultTagBtn = document.querySelector('#custom-tag-select .custom-select-option[data-value=""]');
        if (defaultTagBtn) defaultTagBtn.classList.add('selected');
    }
}

setOnFiltersChangeCallback(handleFiltersChange);


function initTagFilter() {
    const customSelectWrapper = document.getElementById('custom-tag-select');
    if (!customSelectWrapper) return;

    const button = customSelectWrapper.querySelector('.custom-select-button');
    const buttonText = button.querySelector('.custom-select-text');
    const dropdown = customSelectWrapper.querySelector('.custom-select-dropdown');

    const tagCounts = {};
    examData.forEach(exam => {
        if (exam.tags && Array.isArray(exam.tags)) {
            exam.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    const sortedTags = Object.keys(tagCounts).sort((a, b) => {
        const countDiff = tagCounts[b] - tagCounts[a];
        return countDiff !== 0 ? countDiff : a.localeCompare(b, 'pl');
    });

    let optionsHtml = `<div class="custom-select-option selected" data-value="">Wszystkie tagi</div>`;
    optionsHtml += sortedTags.map(tag => `
        <div class="custom-select-option" data-value="${tag}">
            <span>${tag}</span>
            <span class="custom-select-tag-count">${tagCounts[tag]}</span>
        </div>
    `).join('');
    dropdown.innerHTML = optionsHtml;

    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', !expanded);
        button.classList.toggle('active');
        dropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!customSelectWrapper.contains(e.target)) {
            button.setAttribute('aria-expanded', 'false');
            button.classList.remove('active');
            dropdown.classList.remove('show');
        }
    });

    const options = dropdown.querySelectorAll('.custom-select-option');
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            const val = opt.dataset.value;
            options.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            buttonText.textContent = val ? val : 'Wszystkie';

            button.setAttribute('aria-expanded', 'false');
            button.classList.remove('active');
            dropdown.classList.remove('show');
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                setQuery(val);
                searchInput.value = val;
                updateSearchClearBtnVisibility();
            }
        });
    });
}

const debouncedSearch = window.appUtils.debounce((value) => {
    setQuery(value);
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

async function initApp() {
    try {
        const response = await fetch('data.json');
        examData = await response.json();
    } catch (error) {
        console.error('Error loading exam data:', error);
    }

    if (typeof initFuse === 'function') initFuse(examData);
    if (typeof bindFilterEvents === 'function') bindFilterEvents();

    initTagFilter();
    loadFiltersFromUrl();
    setupInfiniteScroll();
    setupBackToTop();
    setupEventDelegation();
    handleFiltersChange(getFilters());
}

initApp();