let fuse;

function initFuse(data) {
    const options = {
        includeScore: true,
        threshold: 0.3,
        ignoreLocation: true,
        keys: [
            { name: 'name', weight: 0.6 },
            { name: 'tags', weight: 0.4 }
        ]
    };
    fuse = new Fuse(data, options);
}

const normalizeString = window.appUtils.normalizeString;
const SESSIONS = ['styczen', 'czerwiec'];

function searchExams(data, filters, completedExams = []) {
    let results = data;

    if (filters.query && filters.query.trim() !== '') {
        const query = filters.query.trim().toLowerCase();
        const normalizedQuery = normalizeString(query);
        
        const isExactCode = data.some(item => normalizeString(item.codeName) === normalizedQuery);
        const isExactTag = data.some(item => item.tags?.some(t => normalizeString(t) === normalizedQuery));
        
        if (isExactCode || isExactTag) {
            results = data.filter(item => 
                normalizeString(item.codeName) === normalizedQuery || 
                item.tags?.some(t => normalizeString(t) === normalizedQuery)
            );
        } else {
            const words = query.split(/\s+/);
            let filteredResults = data;

            words.forEach(word => {
                const normWord = normalizeString(word);
                const isYear = /^\d{4}$/.test(word);
                const isSession = SESSIONS.includes(normWord);

                if (isYear || isSession) {
                    filteredResults = filteredResults.filter(item => {
                        if (isYear) return item.year.toString() === word;
                        if (isSession) {
                            const sessionName = window.appUtils.SESSION_NAMES[item.session] || '';
                            return normalizeString(sessionName).includes(normWord);
                        }
                        return false;
                    });
                } else {
                    const exactMatches = data.filter(item =>
                        normalizeString(item.codeName) === normWord ||
                        item.tags?.some(t => normalizeString(t) === normWord) ||
                        normalizeString(item.name).includes(normWord)
                    );

                    if (exactMatches.length > 0) {
                        filteredResults = filteredResults.filter(item => exactMatches.includes(item));
                    } else if (fuse) {
                        const wordResults = fuse.search(word);
                        const wordItems = wordResults.map(r => r.item);
                        filteredResults = filteredResults.filter(item => wordItems.includes(item));
                    } else {
                        filteredResults = [];
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
        return true;
    });

    return filtered.sort((a, b) => {
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