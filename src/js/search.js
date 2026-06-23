const normalizeString = window.appUtils.normalizeString;

function searchExams(data, filters, completedExams = []) {
    let results = data;

    if (filters.query && filters.query.trim() !== '') {
        const query = filters.query.trim().toLowerCase();
        const normalizedQuery = normalizeString(query);
        
        const isExactCode = data.some(item => item._normalizedCode === normalizedQuery);
        const isExactTag = data.some(item => item._normalizedTags.includes(normalizedQuery));
        
        if (isExactCode || isExactTag) {
            results = data.filter(item => 
                item._normalizedCode === normalizedQuery || 
                item._normalizedTags.includes(normalizedQuery)
            );
        } else {
            const words = query.split(/\s+/);
            let filteredResults = data;

            words.forEach(word => {
                const normWord = normalizeString(word);
                const isYear = /^\d{4}$/.test(word);
                
                const sessionNames = Object.values(window.appUtils.SESSION_NAMES).map(name => normalizeString(name));
                const isSession = sessionNames.includes(normWord);

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
                        item._normalizedCode === normWord ||
                        item._normalizedTags.includes(normWord) ||
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