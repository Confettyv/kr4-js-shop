/*
 * product.js — страница товара. Товар выбирается по параметру адреса:
 * product.html?id=5. Без параметра показывается первый товар,
 * с неизвестным id — сообщение «товар не найден».
 */

function createSpecsTable(product) {
    const rows = [{ name: 'Категория', value: getCategoryTitle(product.category) }, ...product.specs].map((spec) =>
        createElement('tr', {}, [
            createElement('th', { text: spec.name, attrs: { scope: 'row' } }),
            createElement('td', { text: spec.value }),
        ]),
    );
    return createElement('div', {
        className: 'table-wrapper',
        attrs: { tabindex: '0', role: 'region', 'aria-label': 'Характеристики товара' },
    }, [
        createElement('table', { className: 'specs-table' }, [
            createElement('caption', { className: 'visually-hidden', text: `Характеристики товара «${product.title}»` }),
            createElement('tbody', {}, rows),
        ]),
    ]);
}

function createQuantityPicker(onChange) {
    let quantity = 1;
    const value = createElement('span', { className: 'quantity__value', text: '1', attrs: { 'aria-live': 'polite' } });
    const minus = createElement('button', { className: 'quantity__button', text: '−', attrs: { type: 'button', 'aria-label': 'Уменьшить количество' } });
    const plus = createElement('button', { className: 'quantity__button', text: '+', attrs: { type: 'button', 'aria-label': 'Увеличить количество' } });
    const update = (next) => {
        quantity = Math.min(Math.max(next, 1), MAX_QUANTITY);
        value.textContent = String(quantity);
        minus.disabled = quantity === 1;
        plus.disabled = quantity === MAX_QUANTITY;
        onChange(quantity);
    };
    minus.addEventListener('click', () => update(quantity - 1));
    plus.addEventListener('click', () => update(quantity + 1));
    minus.disabled = true;
    return createElement('div', { className: 'quantity', attrs: { role: 'group', 'aria-label': 'Количество' } }, [minus, value, plus]);
}

function renderProduct(root, product) {
    let quantity = 1;

    const gallery = createElement('div', { className: 'product__gallery' }, [
        createElement('img', {
            className: 'product__image',
            attrs: {
                src: `images/${product.image}.jpg`,
                srcset: `images/${product.image}-400.jpg 400w, images/${product.image}.jpg 800w`,
                sizes: '(min-width: 1024px) 50vw, 100vw',
                alt: product.title,
                width: 800,
                height: 600,
            },
        }),
    ]);
    if (product.badge) {
        gallery.append(createElement('span', { className: `product__badge badge badge--${product.badge}`, text: BADGE_LABELS[product.badge] }));
    }

    const price = createElement('p', { className: 'product__price', text: formatPrice(product.price) });
    if (product.oldPrice) {
        price.append(' ', createElement('s', { className: 'product__old-price', text: formatPrice(product.oldPrice) }));
    }

    const actions = createElement('div', { className: 'product__actions' });
    if (product.isAvailable) {
        const addButton = createElement('button', { className: 'button button--large', text: 'В корзину', attrs: { type: 'button' } });
        const status = createElement('p', { className: 'product__added', attrs: { role: 'status' } });
        addButton.addEventListener('click', () => {
            addToCart(product.id, quantity);
            status.textContent = `Добавлено: ${quantity} шт. В корзине: ${getCartQuantity(product.id)} шт.`;
            showToast(`«${product.title}» в корзине`);
        });
        actions.append(
            createQuantityPicker((next) => { quantity = next; }),
            addButton,
            createElement('a', { className: 'button button--large button--ghost', text: 'Оформить заявку', attrs: { href: `order.html?id=${product.id}` } }),
            status,
        );
    } else {
        actions.append(createElement('p', { className: 'product__unavailable', text: 'Товар закончился. Оставьте заявку — сообщим о поступлении.' }));
    }

    root.replaceChildren(
        gallery,
        createElement('div', { className: 'product__info' }, [
            createElement('p', { className: 'product__category', text: getCategoryTitle(product.category) }),
            createElement('h1', { className: 'product__title', text: product.title }),
            createElement('p', { className: 'product__meta' }, [
                createElement('span', { className: 'product__rating', text: `★ ${String(product.rating).replace('.', ',')} из 5` }),
                createElement('span', {
                    className: product.isAvailable ? 'product__stock product__stock--in' : 'product__stock product__stock--out',
                    text: product.isAvailable ? 'В наличии' : 'Нет в наличии',
                }),
            ]),
            price,
            createElement('p', { className: 'product__text', text: product.description }),
            actions,
        ]),
        createElement('section', { className: 'product__specs', attrs: { 'aria-labelledby': 'specs-title' } }, [
            createElement('h2', { className: 'product__subtitle', text: 'Характеристики', attrs: { id: 'specs-title' } }),
            createSpecsTable(product),
        ]),
    );
}

function renderProductNotFound(root, rawId) {
    root.replaceChildren(createElement('div', { className: 'not-found' }, [
        createElement('h1', { className: 'not-found__title', text: 'Товар не найден' }),
        createElement('p', { className: 'not-found__text', text: `Товара с номером «${rawId}» нет в каталоге. Возможно, ссылка устарела.` }),
        createElement('a', { className: 'button', text: 'Перейти в каталог', attrs: { href: 'catalog.html' } }),
    ]));
}

function initProductPage() {
    const root = document.querySelector('[data-product-root]');
    if (!root) {
        return;
    }
    const rawId = getQueryParam('id') || '1';
    const product = getProductById(rawId);

    if (!product) {
        renderProductNotFound(root, rawId);
        document.title = 'Товар не найден — Рекорд';
        document.querySelector('[data-related]')?.remove();
        return;
    }

    renderProduct(root, product);
    document.title = `${product.title} — Рекорд`;

    const crumbCategory = document.querySelector('[data-breadcrumb-category]');
    const crumbCurrent = document.querySelector('[data-breadcrumb-current]');
    if (crumbCategory) {
        crumbCategory.textContent = getCategoryTitle(product.category);
        crumbCategory.href = `catalog.html#${product.category}`;
    }
    if (crumbCurrent) {
        crumbCurrent.textContent = product.title;
    }

    // Похожие: сначала товары той же категории, затем любые другие, всего три.
    const related = [
        ...PRODUCTS.filter((item) => item.category === product.category && item.id !== product.id),
        ...PRODUCTS.filter((item) => item.category !== product.category),
    ].slice(0, 3).map((item) => item.id);
    initProductShelf('[data-related-list]', related);
}
