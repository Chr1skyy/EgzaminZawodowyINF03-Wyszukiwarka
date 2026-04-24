/**
 * Komponenty UI generujące strukturę HTML
 */

const components = {
    /**
     * Badge trudności lub języka
     */
    createBadge: (type, value) => {
        if (!value) return '';
        const className = type === 'difficulty'
            ? `difficulty-${value.toLowerCase()}`
            : `language-${value.toLowerCase().replace('+', '-')}`;
        return `<span class="exam-badge ${className}">${value}</span>`;
    },

    /**
     * Zbiorcze generowanie odznak
     */
    createAllBadges: (exam) => {
        return components.createBadge('difficulty', exam.difficulty) +
            components.createBadge('language', exam.language);
    },

    /**
     * Nagłówek egzaminu
     */
    createExamHeader: (exam, options = {}) => {
        return `
            <div class="exam-header">
                <div class="exam-title">
                    <h3>${exam.name}</h3>
                </div>
                ${options.showCode ? `
                <span class="exam-code" data-action="copy-code" data-code="${exam.codeName}" title="Kliknij aby skopiować kod">
                    ${exam.codeName}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </span>` : ''}
            </div>
        `;
    },


    /**
     * Lista tagów z logiką zwijania
     */
    createTagList: (exam, isExpanded, hideControls = false) => {
        if (!exam.tags || exam.tags.length === 0) return '';
        const visibleTags = (isExpanded || hideControls) ? exam.tags : exam.tags.slice(0, 4);
        const hasMore = exam.tags.length > 4 && !hideControls;

        return `
            <div class="exam-tags">
                <span>🏷️</span>
                <div class="exam-tags-list">
                    ${visibleTags.map(tag => `<span class="exam-tag">${tag}</span>`).join('')}
                    ${!isExpanded && hasMore ? `<span class="exam-tag-expand" data-exam-id="${exam.codeName}">+${exam.tags.length - 4}</span>` : ''}
                    ${isExpanded && hasMore ? `<span class="exam-tag-collapse" data-exam-id="${exam.codeName}" title="Zwiń tagi">Zwiń</span>` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Grupa linków do pobrania/podglądu
     */
    createLinkButtons: (l) => {
        if (!l) return '';

        const { GITHUB_BASE, GITHUB_BASE_PDF } = window.appUtils;

        const linkConfigs = [
            { key: 'examSheet', class: 'exam-link-exam', icon: '📄', label: 'Arkusz', base: GITHUB_BASE_PDF },
            { key: 'archive', class: 'exam-link-resources', icon: '🔒', label: 'Załącznik', base: GITHUB_BASE_PDF },
            { key: 'gradingRules', class: 'exam-link-grading', icon: '📋', label: 'Zasady', base: GITHUB_BASE_PDF },
            { key: 'solution', class: 'exam-link-solutions', icon: '✅', label: 'Rozwiązanie', base: GITHUB_BASE },
            { key: 'solutionZIP', class: 'exam-link-zip', icon: '📦', label: 'Rozwiązanie ZIP', base: GITHUB_BASE_PDF }
        ];

        return linkConfigs.map(config => {
            const fileName = l[config.key];
            if (!fileName) return '';

            const url = `${config.base}${l.mainFolder}/${fileName}`;

            return `
                <a href="${url}" class="exam-link ${config.class}" target="_blank" rel="noopener">
                    ${config.icon}
                    <span>${config.label}</span>
                </a>
            `;
        }).join('');
    },

    /**
     * Karta egzaminu
     */
    createExamCard: (exam, isCompleted, isExpanded, animationDelay = 0, noAnimation = false) => {
        const thumbUrl = window.appUtils.getThumbnailUrl(exam);
        const badgesHtml = components.createAllBadges(exam);

        const style = animationDelay ? ` style="animation-delay: ${animationDelay}s"` : '';

        const animationClass = noAnimation ? ' no-entrance' : '';
        return `
            <article class="exam-card${isCompleted ? ' completed' : ''}${animationClass}" data-exam-id="${exam.codeName}"${style}>
                <div class="exam-thumbnail">
                    <img src="${thumbUrl}" alt="${exam.name}" data-action="open-modal" loading="lazy" width="320" height="200" onerror="this.onerror=null;this.parentElement.replaceChild(Object.assign(document.createElement('div'),{className:'no-thumbnail',textContent:'Brak miniatury'}),this)">
                    <div class="thumbnail-overlay" data-action="open-modal" role="button" tabindex="0" aria-label="Powiększ miniaturę">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="9" x2="11" y2="13"/><line x1="9" y1="11" x2="13" y2="11"/></svg>
                    </div>
                    <div class="completion-checkbox${isCompleted ? ' completed' : ''}" data-action="toggle-completed" role="checkbox" aria-checked="${isCompleted}" title="Oznacz jako ukończone">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
                    </div>
                </div>

                <div class="exam-content">
                    ${components.createExamHeader(exam, { showCode: true })}

                    <div class="exam-metadata">
                        <div class="exam-metadata-item">
                            <span>📅 Nr ${exam.number} | ${exam.session} ${exam.year}</span>
                        </div>
                        <div class="exam-metadata-item">
                            ${badgesHtml}
                        </div>
                    </div>

                    ${components.createTagList(exam, isExpanded)}

                    <div class="exam-links">
                        ${components.createLinkButtons(exam.links)}
                    </div>
                </div>
            </article>
        `;
    },

    /**
     * Zawartość modalu
     */
    createModalContent: (exam) => {
        const badgesHtml = components.createAllBadges(exam);

        return `
            ${components.createExamHeader(exam, { showCode: false })}

            <div class="exam-metadata">
                <div class="exam-metadata-item">
                    <span>📅 Nr ${exam.number} | ${exam.session} ${exam.year}</span>
                </div>
                <div class="exam-metadata-item">
                    <span class="exam-code" title="Kliknij aby skopiować kod" data-action="copy-code" data-code="${exam.codeName}">
                    ${exam.codeName}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </span>
                </div>
                <div class="exam-metadata-item">
                    ${badgesHtml}
                </div>
            </div>

            ${components.createTagList(exam, true, true)}

            <div class="modal-links">
                ${components.createLinkButtons(exam.links)}
            </div>
        `;
    },
    /**
     * Karta skeleton (placeholder)
     */
    createSkeletonCard: () => {
        return `
            <div class="exam-card skeleton">
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
};

window.uiComponents = components;
