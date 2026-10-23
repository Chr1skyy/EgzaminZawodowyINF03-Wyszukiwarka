/**
 * Komponenty UI generujące strukturę HTML
 */

import { GITHUB_BASE, GITHUB_BASE_PDF, SESSION_NAMES, cleanTag, getThumbnailUrl, groupTagsByCategory } from './utils.js';

/**
 * Badge trudności lub języka
 */
function createBadge(type, value) {
    if (!value) return '';
    return `<span class="exam-badge" data-filter="${type}" data-value="${value}">${value}</span>`;
}

export function createAllBadges(exam) {
    return createBadge('difficulty', exam.difficulty) +
        createBadge('language', exam.language);
}

/**
 * Nagłówek egzaminu
 */
function createExamHeader(exam, options = {}) {
    return `
        <div class="exam-header">
            <div class="exam-title">
                <h3>${exam.name}</h3>
            </div>
            ${options.showCode ? createCopyCode(exam) : ''}
        </div>
    `;
}

function createCopyCode(exam) {
    return `
        <span class="exam-code" data-action="copy-code" data-code="${exam.codeName}" title="Kliknij aby skopiować kod" role="button" tabindex="0" aria-label="Skopiuj kod ${exam.codeName}">
            ${exam.codeName}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </span>`;
}

function createTagList(exam, limit = 4) {
    if (!exam.tags?.length) return '';

    const sortedTags = [...exam.tags].sort((a, b) => cleanTag(a).length - cleanTag(b).length);

    let tagsToDisplay = sortedTags;
    let hiddenCount = 0;
    let hiddenTags = [];

    if (limit && sortedTags.length > limit) {
        tagsToDisplay = sortedTags.slice(0, limit);
        hiddenTags = sortedTags.slice(limit);
        hiddenCount = hiddenTags.length;
    }

    return `
        <div class="exam-tags">
            <span aria-hidden="true">🏷️</span>
            <div class="exam-tags-list">
                ${tagsToDisplay.map(tag => `<span class="exam-tag" title="${tag}">${cleanTag(tag)}</span>`).join('')}
                ${hiddenCount > 0 ? `<span class="exam-tag-more" data-action="open-modal" role="button" tabindex="0" title="Kliknij, aby zobaczyć wszystkie. Pozostałe: ${hiddenTags.map(cleanTag).join(', ')}">+${hiddenCount}</span>` : ''}
            </div>
        </div>
    `;
}

/**
 * Grupowanie tagów według kategorii w modalu
 */
function createCategorizedTagGroups(exam) {
    if (!exam.tags?.length) return '';

    const categories = groupTagsByCategory(exam.tags);

    let html = '<div class="modal-tag-groups">';
    for (const [category, items] of Object.entries(categories)) {
        if (items.length === 0) continue;
        const catClass = `tag-cat-${category.toLowerCase()}`;
        html += `
            <div class="modal-tag-group">
                <span class="modal-tag-group-label ${catClass}">${category}</span>
                <div class="modal-tag-group-items">
                    ${items.map(item => `<span class="exam-tag ${catClass}" title="${item.full}">${item.clean}</span>`).join('')}
                </div>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

const LINK_CONFIGS = [
    { key: 'examSheet', class: 'exam-link-exam', icon: '📄', label: 'Arkusz', base: GITHUB_BASE_PDF, aria: 'Pobierz arkusz egzaminacyjny' },
    { key: 'archive', class: 'exam-link-resources', icon: '🔒', label: 'Załącznik', base: GITHUB_BASE_PDF, aria: 'Pobierz załączniki do egzaminu' },
    { key: 'gradingRules', class: 'exam-link-grading', icon: '📋', label: 'Zasady', base: GITHUB_BASE_PDF, aria: 'Pobierz zasady oceniania' },
    { key: 'solution', class: 'exam-link-solutions', icon: '✅', label: 'Rozwiązanie', base: GITHUB_BASE, aria: 'Zobacz rozwiązanie na GitHub' },
    { key: 'solutionZIP', class: 'exam-link-zip', icon: '📦', label: 'Rozwiązanie ZIP', base: GITHUB_BASE_PDF, aria: 'Pobierz rozwiązanie w formacie ZIP' }
];

/**
 * Grupa linków do pobrania/podglądu
 */
function createLinkButtons(exam) {
    const l = exam.links;
    if (!l) return '';

    return LINK_CONFIGS.map(config => {
        const fileName = l[config.key];

        if (!fileName) {
            return `
                <div class="exam-link disabled ${config.class}" title="Brak ${config.label.toLowerCase()}">
                    <span aria-hidden="true">${config.icon}</span>
                    <span>${config.label}</span>
                </div>
            `;
        }

        const url = `${config.base}${l.mainFolder}/${fileName}`;

        return `
            <a href="${url}" class="exam-link ${config.class}" target="_blank" rel="noopener" aria-label="${config.aria}" 
                data-exam-id="${exam.codeName}" data-link-type="${config.key}"
                data-umami-event="Resource link"
                data-umami-event-type="${config.key}"
                data-umami-event-exam="${exam.codeName}">
                <span aria-hidden="true">${config.icon}</span>
                <span>${config.label}</span>
            </a>
        `;
    }).join('');
}

function createMetadataLine(exam) {
    return `📅 Nr ${exam.number} | ${SESSION_NAMES[exam.session] || exam.session} ${exam.year}`;
}

export function createExamCard(exam, index = 0, { skipAnimation = false, isCompleted = false } = {}) {
    const delay = index < 12 ? index * 0.05 : 0;
    const imgAttributes = index < 6 ? 'fetchpriority="high"' : 'loading="lazy"';

    return `
        <article class="exam-card${isCompleted ? ' completed' : ''}${skipAnimation ? ' no-entrance' : ''}" data-exam-id="${exam.codeName}" style="${skipAnimation ? '' : `animation-delay: ${delay}s`}">
            <div class="exam-thumbnail">
                <img src="${getThumbnailUrl(exam)}" alt="${exam.name}" data-action="open-modal" ${imgAttributes} width="320" height="200" onerror="this.onerror=null;this.parentElement.replaceChild(Object.assign(document.createElement('div'),{className:'no-thumbnail',textContent:'Brak miniatury'}),this)">
                <div class="thumbnail-overlay" data-action="open-modal" role="button" tabindex="0" aria-label="Pokaż szczegóły i obrazek egzaminu">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="9" x2="11" y2="13"/><line x1="9" y1="11" x2="13" y2="11"/></svg>
                </div>
                <div class="completion-checkbox${isCompleted ? ' completed' : ''}" data-action="toggle-completed" role="checkbox" aria-checked="${isCompleted}" tabindex="0" aria-label="Oznacz egzamin jako ukończony" title="Oznacz egzamin jako ukończony">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                </div>
            </div>

            <div class="exam-content">
                ${createExamHeader(exam, { showCode: true })}
                <div class="exam-metadata">
                    <div class="exam-metadata-item">
                        <span>${createMetadataLine(exam)}</span>
                    </div>
                    <div class="exam-metadata-item">
                        ${createAllBadges(exam)}
                    </div>
                </div>
                ${createTagList(exam)}
                <div class="exam-links">
                    ${createLinkButtons(exam)}
                </div>
            </div>
        </article>
    `;
}

/**
 * Zawartość modalu
 */
export function createModalContent(exam) {
    return `
        ${createExamHeader(exam, { showCode: false })}
        <div class="exam-metadata">
            <div class="exam-metadata-item">
                <span>${createMetadataLine(exam)}</span>
            </div>
            <div class="exam-metadata-item">
                ${createCopyCode(exam)}
            </div>
            <div class="exam-metadata-item">
                ${createAllBadges(exam)}
            </div>
        </div>
        ${createCategorizedTagGroups(exam)}
        <div class="modal-links">
            ${createLinkButtons(exam)}
        </div>
    `;
}

/**
 * Karta skeleton (placeholder)
 */
export function createSkeletonCard() {
    return `
        <div class="exam-card skeleton" aria-hidden="true">
            <div class="exam-thumbnail skeleton-shimmer"></div>
            <div class="exam-content">
                <div class="skeleton-line skeleton-title skeleton-shimmer"></div>
                <div class="skeleton-line skeleton-meta skeleton-shimmer"></div>
                <div class="skeleton-line skeleton-tags skeleton-shimmer"></div>
                <div class="skeleton-links">
                    <div class="skeleton-link skeleton-shimmer"></div>
                    <div class="skeleton-link skeleton-shimmer"></div>
                    <div class="skeleton-link skeleton-shimmer"></div>
                </div>
            </div>
        </div>
    `;
}
