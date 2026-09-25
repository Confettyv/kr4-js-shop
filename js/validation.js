/*
 * validation.js — проверка форм: заявки, обратной связи и консультации.
 * Ошибки выводятся под полем (textContent), поле получает aria-invalid,
 * alert() не используется. Отправка имитируется — сервера пока нет.
 */

const PHONE_DIGITS_MIN = 10;
const PHONE_DIGITS_MAX = 11;

// Каждое правило возвращает текст ошибки или пустую строку.
const rules = {
    name(value) {
        const name = value.trim();
        if (name === '') {
            return 'Введите имя.';
        }
        if (name.length < 2) {
            return 'Имя должно быть не короче 2 символов.';
        }
        if (!/^[A-Za-zА-Яа-яЁё\s-]+$/.test(name)) {
            return 'Имя может содержать только буквы, пробел и дефис.';
        }
        return '';
    },
    phone(value) {
        const digits = value.replace(/\D/g, '');
        if (digits === '') {
            return 'Введите телефон.';
        }
        if (digits.length < PHONE_DIGITS_MIN || digits.length > PHONE_DIGITS_MAX) {
            return 'Телефон должен содержать 10–11 цифр.';
        }
        return '';
    },
    email(value, { required = false } = {}) {
        const email = value.trim();
        if (email === '') {
            return required ? 'Введите адрес почты.' : '';
        }
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? '' : 'Проверьте адрес почты: например, name@example.ru.';
    },
    quantity(value) {
        const quantity = Number(value);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
            return 'Количество — целое число от 1 до 10.';
        }
        return '';
    },
    address(value, { required = false } = {}) {
        if (!required) {
            return '';
        }
        return value.trim().length >= 5 ? '' : 'Укажите адрес доставки: улицу и дом.';
    },
    message(value) {
        return value.trim().length >= 10 ? '' : 'Напишите сообщение — хотя бы 10 символов.';
    },
    consent(checked) {
        return checked ? '' : 'Нужно согласие на обработку данных.';
    },
};

// Ищем элемент для текста ошибки; если его нет в разметке — создаём и связываем с полем.
function getErrorElement(field) {
    let error = document.getElementById(`${field.id}-error`);
    if (!error) {
        error = createElement('p', { className: 'form-field__error', attrs: { id: `${field.id}-error` } });
        const anchor = field.closest('.checkbox') || field;
        anchor.after(error);
        const describedBy = field.getAttribute('aria-describedby');
        field.setAttribute('aria-describedby', describedBy ? `${describedBy} ${error.id}` : error.id);
    }
    return error;
}

function setFieldError(field, message) {
    const error = getErrorElement(field);
    error.textContent = message;
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    field.classList.toggle('form-field__input--invalid', Boolean(message));
    return message === '';
}

function showFormMessage(form, type, text) {
    const box = form.querySelector('[data-form-message]');
    if (!box) {
        return;
    }
    box.textContent = text;
    box.className = `form-message form-message--${type}`;
    box.hidden = false;
}

function hideFormMessage(form) {
    const box = form.querySelector('[data-form-message]');
    if (box) {
        box.hidden = true;
    }
}

/*
 * Проверяет набор полей: checks — массив пар [поле, функция проверки].
 * Возвращает true, если ошибок нет; иначе переводит фокус на первое неверное поле.
 */
function validateFields(checks) {
    let firstInvalid = null;
    checks.forEach(([field, check]) => {
        const valid = setFieldError(field, check());
        if (!valid && !firstInvalid) {
            firstInvalid = field;
        }
    });
    if (firstInvalid) {
        firstInvalid.focus();
    }
    return firstInvalid === null;
}

// После ошибки поле перепроверяется при вводе, чтобы сообщение исчезало сразу после исправления.
function revalidateOnInput(form, checksFactory) {
    form.addEventListener('input', (event) => {
        const field = event.target;
        if (field.getAttribute('aria-invalid') !== 'true') {
            return;
        }
        const pair = checksFactory().find(([candidate]) => candidate === field);
        if (pair) {
            setFieldError(field, pair[1]());
        }
    });
}

// Имитация запроса к серверу: в следующем семестре здесь будет fetch к API.
function simulateSubmit(button, busyText) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = busyText;
    return new Promise((resolve) => {
        setTimeout(() => {
            button.disabled = false;
            button.textContent = originalText;
            resolve();
        }, 900);
    });
}

// ---------- Форма заявки ----------

function renderOrderCart(container) {
    const items = getCartItems();
    if (items.length === 0) {
        container.replaceChildren(createElement('p', { className: 'order-summary__empty', text: 'Корзина пуста — выберите товар в форме.' }));
        return;
    }
    const list = createElement('ul', { className: 'order-summary__list' }, items.map((item) =>
        createElement('li', { className: 'order-summary__item' }, [
            createElement('span', { text: `${item.product.title} × ${item.quantity}` }),
            createElement('span', { text: formatPrice(item.sum) }),
        ]),
    ));
    container.replaceChildren(
        createElement('h3', { className: 'order-summary__subtitle', text: 'В корзине' }),
        list,
        createElement('p', { className: 'order-summary__total', text: `Итого: ${formatPrice(getCartTotal())}` }),
    );
}

function initOrderForm() {
    const form = document.querySelector('[data-order-form]');
    if (!form) {
        return;
    }
    const f = form.elements;
    const summary = document.querySelector('[data-order-cart]');

    // Товар из адреса (order.html?id=5) или первый товар из корзины.
    const preselected = getProductById(getQueryParam('id')) || (getCartItems()[0] && getCartItems()[0].product);
    if (preselected && preselected.isAvailable) {
        f.product.value = String(preselected.id);
    }

    const isCourier = () => f.delivery.value === 'courier';
    const checks = () => [
        [f.name, () => rules.name(f.name.value)],
        [f.phone, () => rules.phone(f.phone.value)],
        [f.email, () => rules.email(f.email.value)],
        [f.quantity, () => rules.quantity(f.quantity.value)],
        [f.address, () => rules.address(f.address.value, { required: isCourier() })],
        [f.consent, () => rules.consent(f.consent.checked)],
    ];
    revalidateOnInput(form, checks);

    // При самовывозе адрес не нужен: убираем с него ошибку и помечаем как необязательный.
    form.querySelectorAll('input[name="delivery"]').forEach((radio) => {
        radio.addEventListener('change', () => {
            f.address.required = isCourier();
            if (!isCourier()) {
                setFieldError(f.address, '');
            }
        });
    });
    f.address.required = isCourier();

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideFormMessage(form);
        if (!validateFields(checks())) {
            showFormMessage(form, 'error', 'Проверьте поля, отмеченные красным.');
            return;
        }
        await simulateSubmit(form.querySelector('[type="submit"]'), 'Отправляем…');

        const orderNumber = `R-${Date.now().toString().slice(-6)}`;
        saveToStorage(STORAGE_KEYS.lastOrder, {
            number: orderNumber,
            productId: Number(f.product.value),
            quantity: Number(f.quantity.value),
            delivery: f.delivery.value,
            createdAt: new Date().toISOString(),
        });
        showFormMessage(form, 'success', `Заявка ${orderNumber} принята. Менеджер перезвонит в течение 15 минут.`);
        form.reset();
        f.address.required = isCourier();
        clearCart();
    });

    if (summary) {
        renderOrderCart(summary);
        document.addEventListener('cart:change', () => renderOrderCart(summary));
    }
}

// ---------- Обратная связь ----------

function initFeedbackForm() {
    const form = document.querySelector('[data-feedback-form]');
    if (!form) {
        return;
    }
    const f = form.elements;
    const checks = () => [
        [f.name, () => rules.name(f.name.value)],
        [f.email, () => rules.email(f.email.value, { required: true })],
        [f.message, () => rules.message(f.message.value)],
    ];
    revalidateOnInput(form, checks);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideFormMessage(form);
        if (!validateFields(checks())) {
            return;
        }
        await simulateSubmit(form.querySelector('[type="submit"]'), 'Отправляем…');
        showFormMessage(form, 'success', 'Спасибо! Ответим на почту в течение рабочего дня.');
        form.reset();
    });
}

// ---------- Консультация в модальном окне ----------

function initConsultForm() {
    const form = document.querySelector('[data-consult-form]');
    if (!form) {
        return;
    }
    const f = form.elements;
    const message = form.querySelector('[data-consult-message]');
    const checks = () => [
        [f.name, () => rules.name(f.name.value)],
        [f.phone, () => rules.phone(f.phone.value)],
    ];
    revalidateOnInput(form, checks);
    // Проверку делает скрипт, поэтому встроенную браузерную отключаем.
    form.noValidate = true;

    form.addEventListener('submit', (event) => {
        // Кнопка «×» закрывает окно без проверки.
        if (event.submitter && event.submitter.value === 'cancel') {
            return;
        }
        event.preventDefault();
        if (!validateFields(checks())) {
            return;
        }
        message.textContent = `Спасибо, ${f.name.value.trim()}! Перезвоним в течение 15 минут.`;
        message.hidden = false;
        form.reset();
        setTimeout(() => {
            closeModal(form.closest('dialog'));
            message.hidden = true;
        }, 1800);
    });
}
