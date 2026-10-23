const STORAGE_COMPLETED = 'completed-exams';

export function getCompletedExams() {
    const item = localStorage.getItem(STORAGE_COMPLETED);
    return item ? JSON.parse(item) : [];
}

export function toggleExamCompleted(examId) {
    const completed = getCompletedExams();
    const idx = completed.indexOf(examId);
    if (idx > -1) completed.splice(idx, 1); else completed.push(examId);
    localStorage.setItem(STORAGE_COMPLETED, JSON.stringify(completed));
    return completed;
}
