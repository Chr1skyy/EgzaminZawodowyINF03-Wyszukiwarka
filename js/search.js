let fuse;

function initFuse(data) {
    const options = {
        includeScore: true,
        threshold: 0.3,
        ignoreLocation: true,
        keys: [
            { name: 'name', weight: 0.6 },
            { name: 'tags', weight: 0.1 }
        ]
    };
    fuse = new Fuse(data, options);
}

function searchExams(data, filters, completedExams = []) {
    if (!fuse) initFuse(data);
    let results = data;

    if (filters.query && filters.query.trim() !== '') {
        const words = filters.query.trim().split(/\s+/);
        let filteredResults = data;

        const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");

        words.forEach(word => {
            const normWord = normalize(word);
            const sessions = ['styczen', 'czerwiec'];
            const isYear = /^\d{4}$/.test(word);
            const isSession = sessions.includes(normWord);

            if (isYear || isSession) {
                filteredResults = filteredResults.filter(item => {
                    if (isYear) return item.year.toString() === word;
                    if (isSession) return normalize(item.session).includes(normWord);
                    return false;
                });
            } else {
                const normWord = word.toLowerCase();
                const exactMatches = data.filter(item =>
                    item.codeName.toLowerCase() === normWord
                );
                let wordItems;
                if (exactMatches.length > 0) {
                    wordItems = exactMatches;
                } else {
                    const wordResults = fuse.search(word);
                    wordItems = wordResults.map(r => r.item);
                }
                filteredResults = filteredResults.filter(item => wordItems.includes(item));
            }
        });
        results = filteredResults;
    }
    return results.filter(exam => {
        if (filters.hideCompleted && completedExams.includes(exam.codeName)) return false;
        if (filters.formulas.length && !filters.formulas.includes(exam.formula)) return false;
        if (filters.difficulties.length && !filters.difficulties.includes(exam.difficulty)) return false;
        if (filters.languages.length && !filters.languages.includes(exam.language)) return false;
        return true;
    });
}