function searchExams(data, filters, completedExams = []) {
    return data.filter(exam => {
        if (filters.hideCompleted && completedExams.includes(exam.codeName)) return false;
        if (filters.query) {
            const terms = filters.query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
            const text = [exam.name, exam.codeName, exam.year, exam.session, exam.formula, exam.language, ...(exam.tags || [])].join(' ').toLowerCase();
            if (!terms.every(term => text.includes(term))) return false;
        }
        if (filters.formulas.length && !filters.formulas.includes(exam.formula)) return false;
        if (filters.difficulties.length && !filters.difficulties.includes(exam.difficulty)) return false;
        if (filters.languages.length && !filters.languages.includes(exam.language)) return false;
        return true;
    });
}