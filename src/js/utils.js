/**
 * Funkcje pomocnicze niezależne od UI
 */

// Kontekst dla zasobów
export const GITHUB_BASE = "https://github.com/Chr1skyy/Egzamin-Zawodowy-E14-EE09-INF03/tree/main";
export const GITHUB_BASE_PDF = "https://chr1skyy.github.io/Egzamin-Zawodowy-E14-EE09-INF03";
const CDN_BASE = "https://cdn.ezinf.it";

/**
 * Słownik mapujący numery sesji na nazwy wyświetlane
 */
export const SESSION_NAMES = {
    1: "Styczeń",
    6: "Czerwiec"
};

/**
 * Debounce - ogranicza częstość wywoływania funkcji
 */
export function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Kopiowanie do schowka
 */
export function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHtml = element.innerHTML;
        element.querySelector('svg').outerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>';
        element.classList.add('copied');
        setTimeout(() => {
            element.innerHTML = originalHtml;
            element.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Błąd kopiowania: ', err);
    });
}

export function track(name, data) {
    if (window.umami) window.umami.track(name, data);
}

export function cleanTag(tag) {
    const parts = tag.split(': ');
    return parts.length > 1 ? parts[1] : tag;
}

export function groupTagsByCategory(tags) {
    const categories = { 'SQL': [], 'Grafika': [], 'HTML': [], 'CSS': [], 'PHP': [], 'JS': [], 'Inne': [] };
    tags.forEach(tag => {
        const parts = tag.split(': ');
        if (parts.length > 1 && categories[parts[0]] !== undefined) {
            categories[parts[0]].push({ full: tag, clean: parts[1] });
        } else {
            categories['Inne'].push({ full: tag, clean: tag });
        }
    });
    return categories;
}

/**
 * Generuje URL miniatury dla egzaminu
 */
export function getThumbnailUrl(exam, large = false) {
    const formulaPath = exam.formula.toLowerCase().replace('.', '');
    const fileName = large ? exam.codeName : `${exam.codeName}_tb`;
    return `${CDN_BASE}/thumbnails/${formulaPath}/${fileName}.webp`;
}

/**
 * Normalizuje znaki (usuwa polskie diakrytyki)
 */
export function normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");
}
