/*
 * cart.js — корзина.
 * Корзина — массив объектов { id, quantity }. Он хранится в localStorage,
 * поэтому переживает перезагрузку страницы и переход между страницами.
 */

const MAX_QUANTITY = 10;

let cart = normalizeCart(loadFromStorage(STORAGE_KEYS.cart, []));
let activePromo = loadFromStorage(STORAGE_KEYS.promo, null);

// Защита от «сломанных» данных: неизвестные товары и неверные количества отбрасываются.
function normalizeCart(items) {
    if (!Array.isArray(items)) {
        return [];
    }
    return items
        .filter((item) => {
            const product = getProductById(item.id);
            return product && product.isAvailable;
        })
        .map((item) => ({
            id: Number(item.id),
            quantity: Math.min(Math.max(Math.round(Number(item.quantity)) || 1, 1), MAX_QUANTITY),
        }));
}

function saveCart() {
    saveToStorage(STORAGE_KEYS.cart, cart);
    updateCartCounter();
    // Сообщаем остальным модулям, что корзина изменилась: каталог перерисует кнопки, форма — сводку.
    document.dispatchEvent(new CustomEvent('cart:change'));
}

function getCartQuantity(productId) {
    const item = cart.find((entry) => entry.id === productId);
    return item ? item.quantity : 0;
}

function addToCart(productId, quantity = 1) {
    const product = getProductById(productId);
    if (!product || !product.isAvailable) {
        return false;
    }
    const item = cart.find((entry) => entry.id === product.id);
    if (item) {
        item.quantity = Math.min(item.quantity + quantity, MAX_QUANTITY);
    } else {
        cart.push({ id: product.id, quantity: Math.min(quantity, MAX_QUANTITY) });
    }
    saveCart();
    return true;
}

function setCartQuantity(productId, quantity) {
    if (quantity < 1) {
        removeFromCart(productId);
        return;
    }
    const item = cart.find((entry) => entry.id === productId);
    if (item) {
        item.quantity = Math.min(quantity, MAX_QUANTITY);
        saveCart();
    }
}

function removeFromCart(productId) {
    cart = cart.filter((entry) => entry.id !== productId);
    saveCart();
}

function clearCart() {
    cart = [];
    activePromo = null;
    removeFromStorage(STORAGE_KEYS.promo);
    saveCart();
}

// Товары корзины вместе с данными из каталога и суммой по строке.
function getCartItems() {
    return cart.map((item) => {
        const product = getProductById(item.id);
        return { product, quantity: item.quantity, sum: product.price * item.quantity };
    });
}

function getCartCount() {
    return cart.reduce((total, item) => total + item.quantity, 0);
}

function getCartSubtotal() {
    return getCartItems().reduce((total, item) => total + item.sum, 0);
}

function getDiscount(subtotal) {
    const promo = activePromo ? PROMO_CODES[activePromo] : null;
    if (!promo) {
        return 0;
    }
    if (promo.type === 'percent') {
        return Math.round((subtotal * promo.value) / 100);
    }
    if (promo.type === 'fixed' && subtotal >= promo.minTotal) {
        return promo.value;
    }
    return 0;
}

function getCartTotal() {
    const subtotal = getCartSubtotal();
    return subtotal - getDiscount(subtotal);
}

function applyPromoCode(rawCode) {
    const code = rawCode.trim().toUpperCase();
    if (code === '') {
        return { ok: false, message: 'Введите промокод.' };
    }
    const promo = PROMO_CODES[code];
    if (!promo) {
        return { ok: false, message: `Промокод «${code}» не найден.` };
    }
    if (promo.minTotal && getCartSubtotal() < promo.minTotal) {
        return { ok: false, message: `Промокод действует при заказе от ${formatPrice(promo.minTotal)}.` };
    }
    activePromo = code;
    saveToStorage(STORAGE_KEYS.promo, code);
    return { ok: true, message: `Промокод применён: ${promo.label.toLowerCase()}.` };
}

function updateCartCounter() {
    const count = getCartCount();
    document.querySelectorAll('[data-cart-count]').forEach((counter) => {
        counter.textContent = String(count);
        counter.classList.toggle('header__cart-count--empty', count === 0);
    });
}

// ---------- Страница корзины ----------

function createCartRow(item) {
    const { product, quantity, sum } = item;

    const minus = createElement('button', {
        className: 'quantity__button',
        text: '−',
        attrs: { type: 'button', 'aria-label': `Уменьшить количество: ${product.title}` },
    });
    const plus = createElement('button', {
        className: 'quantity__button',
        text: '+',
        attrs: { type: 'button', 'aria-label': `Увеличить количество: ${product.title}`, disabled: quantity >= MAX_QUANTITY },
    });
    const value = createElement('span', { className: 'quantity__value', text: String(quantity), attrs: { 'aria-live': 'polite' } });
    minus.addEventListener('click', () => setCartQuantity(product.id, quantity - 1));
    plus.addEventListener('click', () => setCartQuantity(product.id, quantity + 1));

    const remove = createElement('button', {
        className: 'cart-item__remove',
        text: 'Удалить',
        attrs: { type: 'button', 'aria-label': `Удалить из корзины: ${product.title}` },
    });
    remove.addEventListener('click', () => removeFromCart(product.id));

    return createElement('li', { className: 'cart-item' }, [
        createElement('img', {
            className: 'cart-item__image',
            attrs: { src: `images/${product.image}-400.jpg`, alt: '', width: 120, height: 90 },
        }),
        createElement('div', { className: 'cart-item__info' }, [
            createElement('a', { className: 'cart-item__title', text: product.title, attrs: { href: `product.html?id=${product.id}` } }),
            createElement('p', { className: 'cart-item__price', text: `${formatPrice(product.price)} за шт.` }),
        ]),
        createElement('div', { className: 'quantity', attrs: { role: 'group', 'aria-label': `Количество: ${product.title}` } }, [minus, value, plus]),
        createElement('p', { className: 'cart-item__sum', text: formatPrice(sum) }),
        remove,
    ]);
}

function renderCartPage() {
    const root = document.querySelector('[data-cart-root]');
    if (!root) {
        return;
    }
    const list = root.querySelector('[data-cart-list]');
    const empty = root.querySelector('[data-cart-empty]');
    const items = getCartItems();

    list.replaceChildren(...items.map(createCartRow));
    empty.hidden = items.length > 0;
    list.hidden = items.length === 0;

    const subtotal = getCartSubtotal();
    const discount = getDiscount(subtotal);
    root.querySelector('[data-cart-subtotal]').textContent = formatPrice(subtotal);
    root.querySelector('[data-cart-discount]').textContent = `−${formatPrice(discount)}`;
    root.querySelector('[data-cart-discount-row]').hidden = discount === 0;
    root.querySelector('[data-cart-total]').textContent = formatPrice(subtotal - discount);

    const checkout = root.querySelector('[data-cart-checkout]');
    checkout.classList.toggle('button--disabled', items.length === 0);
    checkout.setAttribute('aria-disabled', String(items.length === 0));
    root.querySelector('[data-cart-clear]').hidden = items.length === 0;
}

function initCartPage() {
    const root = document.querySelector('[data-cart-root]');
    if (!root) {
        return;
    }
    const promoForm = root.querySelector('[data-promo-form]');
    const promoMessage = root.querySelector('[data-promo-message]');

    promoForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const result = applyPromoCode(promoForm.elements.code.value);
        promoMessage.textContent = result.message;
        promoMessage.classList.toggle('promo__message--error', !result.ok);
        promoMessage.classList.toggle('promo__message--success', result.ok);
        renderCartPage();
    });

    root.querySelector('[data-cart-clear]').addEventListener('click', () => {
        clearCart();
        promoMessage.textContent = '';
    });

    root.querySelector('[data-cart-checkout]').addEventListener('click', (event) => {
        if (cart.length === 0) {
            event.preventDefault();
        }
    });

    if (activePromo) {
        promoForm.elements.code.value = activePromo;
    }
    document.addEventListener('cart:change', renderCartPage);
    renderCartPage();
}
