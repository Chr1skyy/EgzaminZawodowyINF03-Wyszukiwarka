/**
 * Funkcje pomocnicze niezależne od UI
 */

const utils = {
    // Kontekst dla zasobów
    GITHUB_BASE: "https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/tree/main",
    GITHUB_BASE_PDF: "https://chr1skyy.github.io/Egzamin-Zawodowy-E14-EE09-INF03",
    CDN_BASE: "https://cdn.ezinf.it",

    /**
     * Debounce - ogranicza częstość wywoływania funkcji
     */
    debounce: (fn, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        }
    },

    /**
     * Kopiowanie do schowka
     */
    copyToClipboard: (text, element) => {
        navigator.clipboard.writeText(text).then(() => {
            const originalHtml = element.innerHTML;
            const icon = element.querySelector('svg');
            const checkmark = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>';

            if (icon) {
                const originalIconHtml = icon.outerHTML;
                icon.outerHTML = checkmark;
                element.classList.add('copied');
                setTimeout(() => {
                    const currentIcon = element.querySelector('svg');
                    if (currentIcon) currentIcon.outerHTML = originalIconHtml;
                    element.classList.remove('copied');
                }, 2000);
            } else {
                element.innerHTML = checkmark;
                element.classList.add('copied');
                setTimeout(() => {
                    element.innerHTML = originalHtml;
                    element.classList.remove('copied');
                }, 2000);
            }
        }).catch(err => {
            console.error('Błąd kopiowania: ', err);
        });
    },

    /**
     * Generuje URL miniatury dla egzaminu
     */
    getThumbnailUrl: (exam, large = false) => {
        const formulaPath = exam.formula.toLowerCase().replace('.', '');
        const fileName = large ? exam.codeName : `${exam.codeName}_tb`;
        return `${utils.CDN_BASE}/thumbnails/${formulaPath}/${fileName}.webp`;
    },
    /**
     * Normalizuje znaki (usuwa polskie diakrytyki)
     */
    normalizeString: (str) => {
        if (!str) return '';
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");
    },
    /**
     * Słownik mapujący numery sesji na nazwy wyświetlane
     */
    SESSION_NAMES: {
        1: "Styczeń",
        6: "Czerwiec"
    },
};

window.appUtils = utils;
