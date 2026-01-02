let fuse;

function initFuse(data) {
    const options = {
        includeScore: true,
        threshold: 0.3,
        ignoreLocation: true,
        keys: [
            { name: 'name', weight: 0.4 },
            { name: 'codeName', weight: 0.3 },
            { name: 'tags', weight: 0.2 },
            'year',
            'session',
            'formula',
            'language'
        ]
    };
    fuse = new Fuse(data, options);
}

function searchExams(data, filters, completedExams = []) {
    if (!fuse) {
        initFuse(data);
    }

    let results = data;

    if (filters.query && filters.query.trim() !== '') {
        const fuseResults = fuse.search(filters.query);
        results = fuseResults.map(result => result.item);
    }
    return results.filter(exam => {
        if (filters.hideCompleted && completedExams.includes(exam.codeName)) return false;
        if (filters.formulas.length && !filters.formulas.includes(exam.formula)) return false;
        if (filters.difficulties.length && !filters.difficulties.includes(exam.difficulty)) return false;
        if (filters.languages.length && !filters.languages.includes(exam.language)) return false;
        return true;
    });
}