let exams = [];
let resultsDiv = document.getElementById('results');
let searchCountDiv = document.getElementById('searchCount');
let searchInput = document.getElementById('search');

fetch('exams.json')
    .then(res => res.json())
    .then(data => {
        exams = data;
        showResults(exams);
    });

searchInput.addEventListener('input', function () {
    const query = this.value.trim().toLowerCase();
    if (!query) return showResults(exams);
    const queryWords = query.split(/[\s,]+/);
    const filtered = exams.filter(exam => {
        const fields = [
            exam.name,
            exam.language,
            exam.formula,
            exam.codeName,
            exam.session,
            exam.year,
            ...(exam.tags || []),
            exam.difficulty
        ].join(' ').toLowerCase();
        return queryWords.every(word => fields.includes(word));
    });
    showResults(filtered);
});

function showResults(list) {
	searchCountDiv.textContent = `Znaleziono ${list.length} arkusz${list.length === 1 ? '' : 'y'}.`;
    if (!list.length) {
        resultsDiv.innerHTML = '<p>Brak wyników.</p>';
        return;
    }
    resultsDiv.innerHTML = list.map(exam => {
        let difficultyClass = '';
        if (exam.difficulty === 'easy') {
            difficultyClass = 'difficulty-easy';
        }
        if (exam.difficulty === 'medium') {
            difficultyClass = 'difficulty-medium';
        }
        if (exam.difficulty === 'hard') {
            difficultyClass = 'difficulty-hard';
        }
        return `
        <div class="exam">
          <div class="exam-title">
            ${exam.name} <span class="tags">[${exam.language}]</span>
          </div>
          <div class="exam-meta">
            <b>${exam.formula}</b> | ${exam.year} | ${exam.session} | ${exam.number} | Nazwa kodowa: <b>${exam.codeName}</b> | Trudność: <b class="${difficultyClass}">${exam.difficulty || 'N/A'}</b>
          </div>
          <div class="links">
            ${exam.links.examSheet ? `<a href="${exam.links.examSheet}" target="_blank">Arkusz</a>` : ''}
            ${exam.links.archive ? `<a href="${exam.links.archive}" target="_blank">Baza</a>` : ''}
            ${exam.links.gradingRules ? `<a href="${exam.links.gradingRules}" target="_blank">Zasady oceny</a>` : ''}
            ${exam.links.solution ? `<a href="${exam.links.solution}" target="_blank">Rozwiązanie</a>` : ''}
            ${exam.links.solutionZIP ? `<a href="${exam.links.solutionZIP}" target="_blank">RozwiązanieZIP</a>` : ''}
          </div>
          <div class="tags">${exam.tags.join(', ')}</div>
        </div>
      `}).join('');
}