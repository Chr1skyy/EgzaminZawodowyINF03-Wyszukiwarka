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

    const dynamicContent = document.getElementById('modal-dynamic-content');
    dynamicContent.innerHTML = window.uiComponents.createModalContent(exam);

    const img = document.getElementById('modal-image');
    if (img) {
        img.src = window.appUtils.getThumbnailUrl(exam);
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