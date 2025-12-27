function bindModalEvents() {
    const modal = document.getElementById('exam-modal');
    if (!modal) return;
    const closeBtn = document.getElementById('modal-close');
    if (closeBtn) closeBtn.onclick = closeModal;
    const backdrop = modal.querySelector('.modal-backdrop');
    if (backdrop) backdrop.onclick = closeModal;
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });
}
function openModal(exam) {
    const modal = document.getElementById('exam-modal');
    if (!modal || !exam) return;
    
    document.getElementById('modal-exam-name').textContent = exam.name;
    document.getElementById('modal-exam-code').innerHTML = `
        <span>${exam.codeName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    `;
    document.getElementById('modal-exam-formula').textContent = exam.formula;
    
    const examLanguage = exam.language && exam.language.trim() !== '' ? exam.language : 'N/A';
    const examDifficulty = exam.difficulty && exam.difficulty.trim() !== '' ? exam.difficulty : 'N/A';
    
    document.getElementById('modal-metadata').innerHTML = `
        <div class="exam-metadata-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Nr ${exam.number} | ${exam.session} ${exam.year}</span>
        </div>
        <div class="exam-metadata-item">
            <span class="exam-badge language-${examLanguage.toLowerCase().replace('+', '')}">${examLanguage}</span>
            <span class="exam-badge difficulty-${examDifficulty.toLowerCase()}">${examDifficulty}</span>
        </div>
    `;
    document.getElementById('modal-tags').innerHTML = window.getTagsHtml(exam, true, true);
    document.getElementById('modal-links').innerHTML = window.createLinksHtml(exam.links);

    const img = document.getElementById('modal-image');
    if (img) { 
        img.src = exam.thumbnail; 
        img.alt = exam.name; 
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    const modal = document.getElementById('exam-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
}
bindModalEvents();