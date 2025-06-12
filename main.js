document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const btn = document.getElementById('themeToggle');
    body.classList.remove('light');
    btn.textContent = '🌙 Tryb jasny';

    btn.addEventListener('click', () => {
        body.classList.toggle('light');
        if (body.classList.contains('light')) {
            btn.textContent = '🌞 Tryb ciemny';
        } else {
            btn.textContent = '🌙 Tryb jasny';
        }
    });
});

let exams = [];
let resultsDiv = document.getElementById('results');
let searchCountDiv = document.getElementById('searchCount');
let searchInput = document.getElementById('search');

searchInput.addEventListener('input', filterExams);

document.querySelectorAll('.difficulty-filter, .lang-filter, .formula-filter').forEach(cb => {
    cb.addEventListener('change', filterExams);
});


fetch('exams.json')
    .then(res => res.json())
    .then(data => {
        exams = data;
        showResults(exams);
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
            ${exam.name} <span class="exam-lang">[${exam.language}]</span>
          </div>
          <div class="exam-meta">
            <span class="formula">${exam.formula}</span> | ${exam.year} | ${exam.session} | ${exam.number} | Nazwa kodowa: <span class="codeName">${exam.codeName}</span> | Trudność: <span class="difficulty ${difficultyClass}">${exam.difficulty || 'N/A'}</span>
          </div>
          <div class="exam-links">
            ${exam.links.examSheet ? `<a href="${exam.links.examSheet}" target="_blank">Arkusz</a>` : ''}
            ${exam.links.archive ? `<a href="${exam.links.archive}" target="_blank">Baza</a>` : ''}
            ${exam.links.gradingRules ? `<a href="${exam.links.gradingRules}" target="_blank">Zasady oceny</a>` : ''}
            ${exam.links.solution ? `<a href="${exam.links.solution}" target="_blank">Rozwiązanie</a>` : ''}
            ${exam.links.solutionZIP ? `<a href="${exam.links.solutionZIP}" target="_blank">RozwiązanieZIP</a>` : ''}
          </div>
          <div class="exam-tags">${exam.tags.join(', ')}</div>
        </div>
      `}).join('');
}

function getCheckedValues(selector) {
    return Array.from(document.querySelectorAll(selector + ':checked')).map(cb => cb.value);
}

function filterExams() {
    const query = searchInput.value.trim().toLowerCase();
    const queryWords = query.split(/[\s,]+/).filter(Boolean);
    const selectedDifficulties = getCheckedValues('.difficulty-filter').map(v => v.toLowerCase());
    const selectedLangs = getCheckedValues('.lang-filter').map(v => v.toLowerCase());
    const selectedFormulas = getCheckedValues('.formula-filter').map(v => v.toLowerCase());
    const filtered = exams.filter(exam => {
        if (selectedDifficulties.length && !selectedDifficulties.includes((exam.difficulty || '').toLowerCase())) return false;
        if (selectedLangs.length && !selectedLangs.includes((exam.language || '').toLowerCase())) return false;
        if (selectedFormulas.length && !selectedFormulas.includes((exam.formula || '').toLowerCase())) return false;
        if (!query) return true;
        const fields = [
            exam.name,
            exam.codeName,
            exam.session,
            exam.year,
            ...(exam.tags || [])
        ].join(' ').toLowerCase();
        return queryWords.every(word => fields.includes(word));
    });
    showResults(filtered);
}






