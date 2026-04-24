function bindModalEvents() {
    const modal = document.getElementById('exam-modal');
    if (!modal) return;

    const closeBtn = document.getElementById('modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    modal.addEventListener('close', () => {
        document.body.style.overflow = '';
    });
}
function openModal(exam) {
    const modal = document.getElementById('exam-modal');
    if (!modal || !exam) return;

    const dynamicContent = document.getElementById('modal-dynamic-content');
    dynamicContent.innerHTML = window.uiComponents.createModalContent(exam);

    const imageContainer = modal.querySelector('.modal-image');
    if (imageContainer) {
        const thumbUrl = window.appUtils.getThumbnailUrl(exam);
        imageContainer.innerHTML = `
            <img id="modal-image" src="${thumbUrl}" alt="${exam.name}" loading="lazy" onerror="this.onerror=null;this.parentElement.replaceChild(Object.assign(document.createElement('div'),{className:'no-thumbnail',textContent:'Brak miniatury'}),this)">
        `;
    }

    modal.showModal();
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    const modal = document.getElementById('exam-modal');
    if (modal) modal.close();
}

bindModalEvents();