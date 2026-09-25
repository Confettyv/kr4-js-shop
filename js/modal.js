/*
 * modal.js — модальное окно <dialog>, всплывающие уведомления и мобильное меню.
 */

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && !modal.open) {
        modal.showModal();
    }
}

function closeModal(modal) {
    if (modal && modal.open) {
        modal.close();
    }
}

function initModals() {
    document.querySelectorAll('[data-modal-open]').forEach((button) => {
        button.addEventListener('click', () => openModal(button.dataset.modalOpen));
    });

    // Клик по подложке: у <dialog> подложка — сам элемент, поэтому сравниваем target.
    // Esc браузер обрабатывает сам, а фокус после закрытия возвращается на кнопку открытия.
    document.querySelectorAll('dialog.modal').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    });
}

// Короткое уведомление внизу экрана, например «Товар в корзине».
let toastTimer = null;

function showToast(text) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = createElement('div', { className: 'toast', attrs: { role: 'status', 'aria-live': 'polite' } });
        document.body.append(toast);
    }
    toast.textContent = text;
    toast.classList.add('toast--visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), 2500);
}

function initNavigation() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const nav = document.getElementById('main-nav');
    if (!toggle || !nav) {
        return;
    }
    const label = toggle.querySelector('.visually-hidden');

    const setOpen = (isOpen) => {
        toggle.setAttribute('aria-expanded', String(isOpen));
        label.textContent = isOpen ? 'Закрыть меню' : 'Открыть меню';
        nav.classList.toggle('nav--open', isOpen);
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && nav.classList.contains('nav--open')) {
            setOpen(false);
            toggle.focus();
        }
    });
}
