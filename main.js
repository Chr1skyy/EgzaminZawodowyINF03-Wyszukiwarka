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
let filtersCheckboxes = document.querySelectorAll('.difficulty-filter, .lang-filter, .formula-filter, .hideDone-filter');
filtersCheckboxes.forEach(cb => {
    cb.addEventListener('change', filterExams);
});

fetch('exams.json')
    .then(res => res.json())
    .then(data => {
        exams = data;
        showResults(exams);
    });

function showResults(list) {
    const doneSet = getDoneSet();
    const filteredList = list;
    searchCountDiv.textContent = `Znaleziono ${filteredList.length} arkusz${filteredList.length === 1 ? '' : 'y'}.`;
    if (!filteredList.length) {
        resultsDiv.innerHTML = '<p>Brak wyników.</p>';
        return;
    }
    resultsDiv.innerHTML = filteredList.map(exam => {
        let difficultyClass = '';
        if (exam.difficulty === 'Easy') difficultyClass = 'difficulty-easy';
        if (exam.difficulty === 'Medium') difficultyClass = 'difficulty-medium';
        if (exam.difficulty === 'Hard') difficultyClass = 'difficulty-hard';
        const checked = doneSet.has(exam.codeName) ? 'checked' : '';
        return `
        <div class="exam">
          <label style="float:right"><input type="checkbox" class="done-checkbox" data-codename="${exam.codeName}" ${checked}> Wykonane</label>
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
      `;
    }).join('');
    // Obsługa checkboxów wykonania
    document.querySelectorAll('.done-checkbox').forEach(cb => {
        cb.addEventListener('change', function () {
            const codeName = this.getAttribute('data-codename');
            const doneSet = getDoneSet();
            if (this.checked) doneSet.add(codeName);
            else doneSet.delete(codeName);
            setDoneSet(doneSet);
            if (document.getElementById('hideDone')?.checked) filterExams();
        });
    });
}

function getCheckedValues(selector) {
    return Array.from(document.querySelectorAll(selector + ':checked')).map(cb => cb.value);
}

function filterExams() {
    const query = searchInput.value.trim().toLowerCase();
    const queryWords = query.split(/[\s,]+/).filter(Boolean);
    const selectedDifficulties = getCheckedValues('.difficulty-filter');
    const selectedLangs = getCheckedValues('.lang-filter');
    const selectedFormulas = getCheckedValues('.formula-filter');
    const hideDone = document.getElementById('hideDone')?.checked;
    const doneSet = getDoneSet();

    let filtered = exams.filter(exam => {
        if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(exam.difficulty || '')) return false;
        if (selectedLangs.length > 0 && !selectedLangs.includes(exam.language || '')) return false;
        if (selectedFormulas.length > 0 && !selectedFormulas.includes(exam.formula || '')) return false;
        if (hideDone && doneSet.has(exam.codeName)) return false;
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

function getDoneSet() {
    return new Set(JSON.parse(localStorage.getItem('doneExams') || '[]'));
}
function setDoneSet(doneSet) {
    localStorage.setItem('doneExams', JSON.stringify(Array.from(doneSet)));
}