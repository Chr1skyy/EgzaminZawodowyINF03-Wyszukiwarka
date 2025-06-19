// Obługa przełączania motywu
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

// Funkcja generująca listę wyników na podstawie przefiltrowanych danych
function showResults(list) {
    const doneSet = getDoneSet();
    const filteredList = list;
    searchCountDiv.textContent = `Znaleziono ${filteredList.length} arkusz${filteredList.length === 1 ? '' : 'y'}.`;
    if (!filteredList.length) {
        resultsDiv.innerHTML = '<p>Brak wyników.</p>';
        return;
    }
    resultsDiv.innerHTML = list.map(exam => renderExam(exam, doneSet)).join('');
    setupCodeNameCopy();
    setupThumbnails();
    setupDoneCheckboxes();
}

// Funkcja pomocnicza do pobierania zaznaczonych wartości z checkboxów
function getCheckedValues(selector) {
    return Array.from(document.querySelectorAll(selector + ':checked')).map(cb => cb.value);
}

// Funkcja generująca bloki dla każdego egzaminu
function renderExam(exam, doneSet) {
    let difficultyClass = '';
    if (exam.difficulty === 'Easy') difficultyClass = 'difficulty-easy';
    if (exam.difficulty === 'Medium') difficultyClass = 'difficulty-medium';
    if (exam.difficulty === 'Hard') difficultyClass = 'difficulty-hard';
    const checked = doneSet.has(exam.codeName) ? 'checked' : '';
    return `
        <div class="exam">
            <div class="exam-content">
                <div class="exam-title">
                    ${exam.name} <span class="exam-lang">[${exam.language}]</span>
                </div>
                <div class="exam-meta">
                    <span class="formula">${exam.formula}</span> | ${exam.year} | ${exam.session} | ${exam.number} | Kod: 
                    <span class="codeName">${exam.codeName}</span> | <span class="difficulty ${difficultyClass}">${exam.difficulty || 'N/A'}</span>
                </div>
                <div class="exam-links">
                    ${exam.links.examSheet ? `<a href="${exam.links.examSheet}" target="_blank">Arkusz</a>` : ''}
                    ${exam.links.archive ? `<a href="${exam.links.archive}" target="_blank">Baza</a>` : ''}
                    ${exam.links.gradingRules ? `<a href="${exam.links.gradingRules}" target="_blank">Zasady oceny</a>` : ''}
                    ${exam.links.solution ? `<a href="${exam.links.solution}" target="_blank">Rozwiązanie</a>` : ''}
                    ${exam.links.solutionZIP ? `<a href="${exam.links.solutionZIP}" target="_blank">RozwiązanieZIP</a>` : ''}
                </div>
                <div class="exam-tags">${(exam.tags || []).join(', ')}</div>
            </div>
            <div class="exam-thumbnail">
                ${exam.thumbnail ? `<img src="${exam.thumbnail}" alt="Podgląd strony" class="exam-thumbnail-img">` : ''}
                <label class="exam-done"><input type="checkbox" class="done-checkbox" data-codename="${exam.codeName}" ${checked}> Wykonano</label>
            </div>
        </div>
    `;
}

// Funkcja do filtrowania egzaminów na podstawie wyszukiwania i filtrów
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

// Pobiera zestaw kodów arkuszy oznaczonych jako wykonane z localStorage
// Zwraca Set z kodami arkuszy
function getDoneSet() {
    return new Set(JSON.parse(localStorage.getItem('doneExams') || '[]'));
}

// Zapisuje zestaw kodów arkuszy oznaczonych jako wykonane do localStorage
// Przyjmuje Set z kodami arkuszy
function setDoneSet(doneSet) {
    localStorage.setItem('doneExams', JSON.stringify(Array.from(doneSet)));
}

// Wyświetla duży podgląd miniatury
function showBigThumbnail(src) {
    let bigThumbnail = document.getElementById('big-thumbnail');
    if (!bigThumbnail) {
        bigThumbnail = document.createElement('div');
        bigThumbnail.id = 'big-thumbnail';
        bigThumbnail.innerHTML = `
            <span id="big-thumbnail-close">&times;</span>
            <img id="big-thumbnail-img" src="" alt="Podgląd">
        `;
        document.body.appendChild(bigThumbnail);
        document.getElementById('big-thumbnail-close').onclick = () => bigThumbnail.style.display = 'none';
        bigThumbnail.onclick = e => { if (e.target === bigThumbnail) bigThumbnail.style.display = 'none'; };
    }
    document.getElementById('big-thumbnail-img').src = src;
    bigThumbnail.style.display = 'flex';
}

// Funkcja ustawiająca obsługę kopiowanie kodów arkuszy
function setupCodeNameCopy() {
    document.querySelectorAll('.codeName').forEach(e => {
        e.addEventListener('click', () => {
            navigator.clipboard.writeText(e.textContent);
        });
    });
}

// Dodaje obsługę kliknięcia na miniaturach egzaminów, aby wyświetlić powiększenie
function setupThumbnails() {
    document.querySelectorAll('.exam-thumbnail-img').forEach(img => {
        img.addEventListener('click', function () {
            showBigThumbnail(this.src);
        });
    });
}

// Funkcja ustawiająca obsługę checkboxów wykonania
function setupDoneCheckboxes() {
    document.querySelectorAll('.done-checkbox').forEach(cb => {
        cb.addEventListener('change', function () {
            const codeName = this.getAttribute('data-codename');
            const doneSet = getDoneSet();
            if (this.checked) doneSet.add(codeName);
            else doneSet.delete(codeName);
            setDoneSet(doneSet);
            filterExams();
        });
    });
}