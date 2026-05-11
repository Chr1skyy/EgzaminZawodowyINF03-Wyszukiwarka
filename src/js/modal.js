function bindModalEvents() {
    const modal = document.getElementById('exam-modal');
    if (!modal) return;

    const closeBtn = document.getElementById('modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
            return;
        }

        const copyBtn = e.target.closest('[data-action="copy-code"]');
        if (copyBtn) {
            window.appUtils.copyToClipboard(copyBtn.dataset.code, copyBtn);
        }
    });

    modal.addEventListener('close', () => {
        document.body.style.overflow = '';
    });
}
function openModal(exam) {
    if (!exam) return;
    const modal = document.getElementById('exam-modal');
    modal.querySelector('#modal-dynamic-content').innerHTML = window.uiComponents.createModalContent(exam);
    modal.querySelector('#modal-image').src = window.appUtils.getThumbnailUrl(exam, true);
    modal.showModal();
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    const modal = document.getElementById('exam-modal');
    if (modal) modal.close();
}

bindModalEvents();