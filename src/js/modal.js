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
    
    const imgContainer = modal.querySelector('.modal-image');
    imgContainer.innerHTML = ''; // Wyczyść stare zdjęcie oraz komunikaty o braku podglądu
    
    const img = document.createElement('img');
    img.id = 'modal-image';
    img.alt = 'Podgląd zadania';
    img.loading = 'lazy';

    img.onerror = () => {
        img.remove();
        if (!imgContainer.querySelector('.no-thumbnail')) {
            const div = Object.assign(document.createElement('div'), {
                className: 'no-thumbnail',
                textContent: 'Brak podglądu'
            });
            imgContainer.appendChild(div);
        }
    };

    imgContainer.appendChild(img);
    img.src = window.appUtils.getThumbnailUrl(exam, true);
    
    modal.querySelector('#modal-dynamic-content').innerHTML = window.uiComponents.createModalContent(exam);
    modal.showModal();
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    const modal = document.getElementById('exam-modal');
    if (modal) modal.close();
}

bindModalEvents();