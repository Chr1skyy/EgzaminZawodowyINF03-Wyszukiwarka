function searchExams(data, filters, completedExams = []) {
    return data.filter(exam => {
        if (filters.hideCompleted && completedExams.includes(exam.codeName)) return false;
        if (filters.query) {
            const q = filters.query.toLowerCase();
            const text = [exam.name, exam.codeName, exam.year, exam.session, exam.formula, exam.language, ...(exam.tags || [])].join(' ').toLowerCase();
            if (!text.includes(q)) return false;
        }
        if (filters.formulas.length && !filters.formulas.includes(exam.formula)) return false;
        if (filters.difficulties.length && !filters.difficulties.includes(exam.difficulty)) return false;
        if (filters.languages.length && !filters.languages.includes(exam.language)) return false;
        return true;
    });
}