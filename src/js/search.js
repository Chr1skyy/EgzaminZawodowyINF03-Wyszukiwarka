import { normalizeString, SESSION_NAMES } from './utils.js';

const LANGUAGES = { php: 'PHP', js: 'JS', javascript: 'JS' };
const SEP = '[\\s._/-]+';
const FORMULA = '\\b(inf|ee|e)[\\s._-]*(03|09|14)';
// INF.03-11-26.01, INF 03.09.26.01
const CODE_PATTERN = new RegExp(`${FORMULA}${SEP}(\\d{2})${SEP}(\\d{2})${SEP}(\\d{2})(?!\\d)`);
// inf_03_2026_06_11
const FILE_PATTERN = new RegExp(`${FORMULA}${SEP}(\\d{4})${SEP}(\\d{2})${SEP}(\\d{2})(?!\\d)`);

function findByExamCode(data, query) {
    let letters, digits, number, year, session;
    const file = query.match(FILE_PATTERN);
    const code = !file && query.match(CODE_PATTERN);
    if (file) {
        [, letters, digits, year, session, number] = file;
    } else if (code) {
        [, letters, digits, number, year, session] = code;
        year = '20' + year;
    } else {
        return [];
    }
    const formula = `${letters.toUpperCase()}.${digits}`;
    return data.filter(item =>
        item.formula === formula &&
        item.year === Number(year) &&
        item.session === Number(session) &&
        Number(item.number) === Number(number)
    );
}

export function searchExams(data, filters, completedExams = []) {
    let results = data;

    if (filters.query && filters.query.trim() !== '') {
        const query = filters.query.trim().toLowerCase();
        const normalizedQuery = normalizeString(query);
        const codeMatches = findByExamCode(data, query);

        const tagMatches = LANGUAGES[normalizedQuery] ? [] : data.filter(item => item._normalizedTags.includes(normalizedQuery));

        if (codeMatches.length) {
            results = codeMatches;
        } else if (tagMatches.length) {
            results = tagMatches;
        } else {
            const words = query.split(/\s+/);
            let filteredResults = data;

            words.forEach(word => {
                const normWord = normalizeString(word);
                const language = LANGUAGES[normWord];
                const session = Object.keys(SESSION_NAMES).find(key => normalizeString(SESSION_NAMES[key]) === normWord);

                if (language) {
                    filteredResults = filteredResults.filter(item =>
                        item.language.split('+').includes(language) ||
                        item._normalizedTags.some(t => t.includes(normWord))
                    );
                } else if (/^\d{4}$/.test(word)) {
                    filteredResults = filteredResults.filter(item => item.year === Number(word));
                } else if (session) {
                    filteredResults = filteredResults.filter(item => item.session === Number(session));
                } else {
                    const exactMatches = data.filter(item =>
                        item._normalizedCode === normWord ||
                        item._normalizedTags.some(t => t.split(/[^a-z0-9]+/).includes(normWord)) ||
                        item._normalizedName.includes(normWord)
                    );

                    if (exactMatches.length > 0) {
                        filteredResults = filteredResults.filter(item => exactMatches.includes(item));
                    } else {
                        const partialMatches = data.filter(item =>
                            item._normalizedCode.includes(normWord) ||
                            item._normalizedTags.some(t => t.includes(normWord)) ||
                            item._normalizedName.includes(normWord)
                        );
                        filteredResults = filteredResults.filter(item => partialMatches.includes(item));
                    }
                }
            });
            results = filteredResults;
        }
    }
    const filtered = results.filter(exam => {
        if (filters.hideCompleted && completedExams.includes(exam.codeName)) return false;
        if (filters.formulas.length && !filters.formulas.includes(exam.formula)) return false;
        if (filters.difficulties.length && !filters.difficulties.includes(exam.difficulty)) return false;
        if (filters.languages.length && !filters.languages.includes(exam.language)) return false;
        if (filters.sessions && filters.sessions.length && !filters.sessions.map(Number).includes(exam.session)) return false;
        if (filters.years && filters.years.length && !filters.years.map(Number).includes(exam.year)) return false;
        return true;
    });

    return filtered.sort((a, b) => {
        if (filters.sortBy === 'difficulty-asc' || filters.sortBy === 'difficulty-desc') {
            const diffOrder = { "Easy": 0, "Medium": 1, "Hard": 2 };
            const valA = diffOrder[a.difficulty] ?? 9;
            const valB = diffOrder[b.difficulty] ?? 9;
            if (valA !== valB) {
                return filters.sortBy === 'difficulty-asc' ? valA - valB : valB - valA;
            }
        } else if (filters.sortBy === 'tags-count-asc' || filters.sortBy === 'tags-count-desc') {
            const lenA = a.tags?.length || 0;
            const lenB = b.tags?.length || 0;
            if (lenA !== lenB) {
                return filters.sortBy === 'tags-count-asc' ? lenA - lenB : lenB - lenA;
            }
        } else if (filters.sortBy === 'name-asc' || filters.sortBy === 'name-desc') {
            const comp = a.name.localeCompare(b.name, 'pl');
            if (comp !== 0) {
                return filters.sortBy === 'name-asc' ? comp : -comp;
            }
        }

        if (b.year !== a.year) {
            return b.year - a.year;
        }
        if (b.session !== a.session) {
            return b.session - a.session;
        }
        if (a.formula !== b.formula) {
            const formulaPriority = { "INF.03": 0, "EE.09": 1, "E.14": 2 };
            const priorityA = formulaPriority[a.formula] ?? 9;
            const priorityB = formulaPriority[b.formula] ?? 9;
            return priorityA - priorityB;
        }
        return parseInt(a.number) - parseInt(b.number);
    });
}