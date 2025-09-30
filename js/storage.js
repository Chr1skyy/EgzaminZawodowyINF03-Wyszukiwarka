function storageGet(key, def) {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : def;
}
function storageSet(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}
function storageRemove(key) {
    localStorage.removeItem(key);
}

const STORAGE_COMPLETED = 'completed-exams';

function getCompletedExams() {
    return storageGet(STORAGE_COMPLETED, []);
}
function setCompletedExams(arr) {
    storageSet(STORAGE_COMPLETED, arr);
}
function toggleExamCompleted(examId) {
    const completed = getCompletedExams();
    const idx = completed.indexOf(examId);
    if (idx > -1) completed.splice(idx, 1); else completed.push(examId);
    setCompletedExams(completed);
    return completed;
}