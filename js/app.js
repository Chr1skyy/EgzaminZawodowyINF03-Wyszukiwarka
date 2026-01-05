const GITHUB_BASE = "https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/tree/main";
let completedExams = getCompletedExams();
let filteredExams = [];
let expandedTags = new Set();
let hideCompleted = false;

function renderResults() {
    const resultsGrid = document.getElementById('results-grid');
    const noResults = document.getElementById('no-results');
    if (!resultsGrid || !noResults) return;
    if (filteredExams.length === 0) {
        resultsGrid.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    resultsGrid.style.display = 'grid';
    noResults.style.display = 'none';
    resultsGrid.innerHTML = filteredExams.map(createExamCard).join('');
    bindCardEvents();
    document.querySelectorAll('.exam-card').forEach(card => {
        const examId = card.querySelector('[data-exam-id]').dataset.examId;
        const tagsDiv = card.querySelector('.exam-tags');
        if (tagsDiv && examId) bindTagExpandCollapseEvents(tagsDiv, examId);
    });
}

function getTagsHtml(exam, isExpanded) {
    const maxVisibleTags = 3;
    const visibleTags = isExpanded ? exam.tags : exam.tags.slice(0, maxVisibleTags);
    const remainingTags = exam.tags.length - maxVisibleTags;
    return `
        <div class="exam-tags-list">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            ${visibleTags.map(tag => `<span class="exam-tag">${tag}</span>`).join('')}
            ${!isExpanded && remainingTags > 0 ? `<button class="exam-tag exam-tag-expand" data-exam-id="${exam.codeName}">+${remainingTags}</button>` : ''}
            ${isExpanded && exam.tags.length > maxVisibleTags ? `<button class="exam-tag exam-tag-collapse" data-exam-id="${exam.codeName}">Ukryj</button>` : ''}
        </div>
    `;
}

function createExamCard(exam) {
    const isCompleted = completedExams.includes(exam.codeName);
    const isExpanded = expandedTags.has(exam.codeName);
    const examName = exam.name && exam.name.trim() !== '' ? exam.name : 'Undefined';
    const examLanguage = exam.language && exam.language.trim() !== '' ? exam.language : 'N/A';
    const examDifficulty = exam.difficulty && exam.difficulty.trim() !== '' ? exam.difficulty : 'N/A';
    return `
        <div class="exam-card${isCompleted ? ' completed' : ''}">
            <div class="exam-thumbnail">
                ${exam.thumbnail
            ? `<img src="${exam.thumbnail}" alt="${examName}" data-exam-id="${exam.codeName}" loading="lazy">`
            : `<div class="no-thumbnail" data-exam-id="${exam.codeName}">No official picture</div>`}
                <div class="thumbnail-overlay" data-exam-id="${exam.codeName}">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                </div>
                <button class="completion-checkbox${isCompleted ? ' completed' : ''}" data-exam-id="${exam.codeName}" aria-label="Oznacz jako ukończone">
                    ${isCompleted ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
                </button>
            </div>
            <div class="exam-content">
                <div class="exam-header">
                    <div class="exam-title">
                        <h3>${examName}</h3>
                        <button class="exam-code" data-code="${exam.codeName}">
                            <span>${exam.codeName}</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                    </div>
                    <div class="exam-formula">${exam.formula}</div>
                </div>
                <div class="exam-metadata">
                    <div class="exam-metadata-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span>Nr ${exam.number} | ${exam.session} ${exam.year}</span>
                    </div>
                    <div class="exam-metadata-item">
                        <span class="exam-badge language-${examLanguage.toLowerCase().replace('+', '')}">${examLanguage}</span>
                        <span class="exam-badge difficulty-${examDifficulty.toLowerCase()}">${examDifficulty}</span>
                    </div>
                </div>
                <div class="exam-tags">
                    ${getTagsHtml(exam, isExpanded)}
                </div>
                <div class="exam-links">
                    ${createLinksHtml(exam.links)}
                </div>
            </div>
        </div>
    `;
}

function createLinksHtml(links) {
    const linkConfigs = [
        { key: 'examSheet', label: 'Arkusz', class: 'exam-link-exam' },
        { key: 'archive', label: 'Załącznik', class: 'exam-link-resources' },
        { key: 'solution', label: 'Rozwiązanie', class: 'exam-link-solutions' },
        { key: 'solutionZIP', label: 'Rozwiązanie ZIP', class: 'exam-link-zip' },
        { key: 'gradingRules', label: 'Zasady oceniania', class: 'exam-link-grading' }
    ];
    return linkConfigs.filter(cfg => links[cfg.key] && links[cfg.key].trim() !== '').map(cfg => {
        let url = GITHUB_BASE + links.mainFolder + '/' + links[cfg.key];
        return `
        <a href="${url}" class="exam-link ${cfg.class}" target="_blank" rel="noopener noreferrer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>${cfg.label}</span>
        </a>
    `}).join('');
}

function bindCardEvents() {
    document.querySelectorAll('.exam-thumbnail img, .thumbnail-overlay').forEach(el => {
        el.onclick = e => {
            const examId = el.dataset.examId || el.closest('[data-exam-id]').dataset.examId;
            const exam = examData.find(ex => ex.codeName === examId);
            if (exam && exam.thumbnail && exam.thumbnail.trim() !== '') openModal(exam);
        };
    });
    document.querySelectorAll('.completion-checkbox').forEach(checkbox => {
        checkbox.onclick = e => {
            e.stopPropagation();
            const examId = checkbox.closest('[data-exam-id]').dataset.examId;
            toggleExamCompletedHandler(examId);
        };
    });
    document.querySelectorAll('.exam-code').forEach(btn => {
        btn.onclick = async e => {
            e.preventDefault();
            const code = btn.closest('[data-code]').dataset.code;
            try {
                await navigator.clipboard.writeText(code);
                const orig = btn.innerHTML;
                btn.innerHTML = `<span>${code}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>`;
                setTimeout(() => { btn.innerHTML = orig; }, 2000);
            } catch { }
        };
    });
}

function bindTagExpandCollapseEvents(tagsDiv, examId) {
    tagsDiv.querySelectorAll('.exam-tag-expand, .exam-tag-collapse').forEach(btn => {
        btn.onclick = e => {
            e.preventDefault();
            toggleTagsExpansion(examId);
        };
    });
}

function toggleTagsExpansion(examId) {
    if (expandedTags.has(examId)) expandedTags.delete(examId); else expandedTags.add(examId);
    const card = document.querySelector(`.exam-card [data-exam-id='${examId}']`).closest('.exam-card');
    const exam = examData.find(ex => ex.codeName === examId);
    if (!card || !exam) return;
    const isExpanded = expandedTags.has(examId);
    const tagsDiv = card.querySelector('.exam-tags');
    if (tagsDiv) {
        tagsDiv.innerHTML = getTagsHtml(exam, isExpanded);
        bindTagExpandCollapseEvents(tagsDiv, examId);
    }
}

function toggleExamCompletedHandler(examId) {
    completedExams = toggleExamCompleted(examId);
    const isNowCompleted = completedExams.includes(examId);
    if (typeof gtag === 'function') {
        gtag('event', 'toggle_exam_status', {
            'exam_id': examId,
            'completed': isNowCompleted ? 'yes' : 'no'
        });
    }
    if (hideCompleted) handleFiltersChange(getFilters());
    else {
        const card = document.querySelector(`.exam-card [data-exam-id='${examId}']`).closest('.exam-card');
        if (card) {
            card.classList.toggle('completed', completedExams.includes(examId));
            const checkbox = card.querySelector('.completion-checkbox');
            if (checkbox) {
                const isCompleted = completedExams.includes(examId);
                checkbox.classList.toggle('completed', isCompleted);
                checkbox.innerHTML = isCompleted ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>' : '';
            }
        }
        updateResultsCount();
    }
}

function updateResultsCount() {
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) resultsCount.textContent = `${filteredExams.length} z ${examData.length} egzaminów`;
}

function handleFiltersChange(filts) {
    hideCompleted = filts.hideCompleted;
    filteredExams = searchExams(examData, filts, completedExams);
    renderResults();
    updateResultsCount();
}

setOnFiltersChangeCallback(handleFiltersChange);

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Tagi wybrane ręcznie do wyświetlania
const TAGS_LIST = [
    "cookies/ciasteczka",
    "animacja",
    "favicon",
    "logowanie/rejestracja",
    "galeria zdjęć",
    "plik video/wideo/film",
    "odświeżanie strony",
    "pokazywanie/ukrywanie elementów",
    "responsywność strony (@media query)",
    "efekty przejścia CSS"
];

function renderPopularTags() {
    const tagsContainer = document.getElementById('popular-tags');
    if (!tagsContainer) return;

    tagsContainer.innerHTML = TAGS_LIST.map(tag => `
        <button class="filter-pill" data-tag="${tag}">
            ${tag}
        </button>
    `).join('');

    tagsContainer.querySelectorAll('.filter-pill').forEach(btn => {
        btn.onclick = () => {
            const tag = btn.dataset.tag;
            const currentQuery = document.getElementById('search-input').value;
            if (currentQuery.includes(tag)) {
                const newQuery = currentQuery.replace(tag, '').trim();
                setQuery(newQuery);
                document.getElementById('search-input').value = newQuery;
                btn.classList.remove('active');
            } else {
                const newQuery = currentQuery ? `${currentQuery} ${tag}` : tag;
                setQuery(newQuery);
                document.getElementById('search-input').value = newQuery;
                btn.classList.add('active');
            }
        };
    });
}

const debouncedSearch = debounce((value) => setQuery(value), 200);

const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.oninput = e => debouncedSearch(e.target.value);
}

const hideBtn = document.getElementById('hide-completed-toggle');
if (hideBtn) hideBtn.onclick = () => {
    hideCompleted = !hideCompleted;
    hideBtn.classList.toggle('active', hideCompleted);
    handleFiltersChange(getFilters());
};

renderPopularTags();
handleFiltersChange(getFilters());