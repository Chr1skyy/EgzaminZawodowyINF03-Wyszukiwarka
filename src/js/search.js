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

const normalizeString = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");
const SESSIONS = ['styczen', 'czerwiec'];

function searchExams(data, filters, completedExams = []) {
    let results = data;

    if (filters.query && filters.query.trim() !== '') {
        const query = filters.query.trim().toLowerCase();
        
        const isExactCode = data.some(item => item.codeName.toLowerCase() === query);
        const isExactTag = data.some(item => item.tags?.some(t => normalizeString(t) === normalizeString(query)));
        
        if (isExactCode || isExactTag) {
            results = data.filter(item => 
                item.codeName.toLowerCase() === query || 
                item.tags?.some(t => normalizeString(t) === normalizeString(query))
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
                        if (isSession) return normalizeString(item.session).includes(normWord);
                        return false;
                    });
                } else {
                    const exactMatches = data.filter(item =>
                        item.codeName.toLowerCase() === word ||
                        item.tags?.some(t => t.toLowerCase() === word) ||
                        item.name.toLowerCase().includes(word)
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
        return true;
    });

    return filtered.sort((a, b) => {
        if (b.year !== a.year) {
            return b.year - a.year;
        }
        if (a.session !== b.session) {
            const sessionPriority = { "Czerwiec": 0, "Styczeń": 1 };
            return (sessionPriority[a.session] ?? 2) - (sessionPriority[b.session] ?? 2);
        }
        return parseInt(a.number) - parseInt(b.number);
    });
}