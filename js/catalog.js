/*
 * catalog.js — карточки товаров и страница каталога:
 * генерация карточек из массива, поиск, фильтр по категории,
 * сортировка, фильтр «в наличии», постраничный вывод и пустое состояние.
 */

const PAGE_SIZE = 6;

const catalogState = {
    search: '',
    category: 'all',
    sort: 'default',
    onlyAvailable: false,
    page: 1,
};

// ---------- Карточка товара ----------

function createCartButton(product) {
    const quantity = getCartQuantity(product.id);
    const button = createElement('button', {
        className: quantity > 0 ? 'button button--small button--added' : 'button button--small',
        text: quantity > 0 ? `В корзине: ${quantity}` : 'В корзину',
        attrs: { type: 'button', 'data-add-to-cart': product.id, 'aria-label': `Добавить в корзину: ${product.title}` },
    });
    return button;
}

function createProductCard(product) {
    const url = `product.html?id=${product.id}`;
    const card = createElement('article', {
        className: product.isAvailable ? 'product-card' : 'product-card product-card--unavailable',
    });

    const image = createElement('img', {
        className: 'product-card__image',
        attrs: {
            src: `images/${product.image}-400.jpg`,
            srcset: `images/${product.image}-400.jpg 400w, images/${product.image}.jpg 800w`,
            sizes: '(min-width: 1024px) 25vw, (min-width: 480px) 50vw, 100vw',
            alt: '',
            width: 400,
            height: 300,
            loading: 'lazy',
        },
    });
    card.append(createElement('a', {
        className: 'product-card__image-link',
        attrs: { href: url, tabindex: '-1', 'aria-hidden': 'true' },
    }, [image]));

    if (product.badge) {
        card.append(createElement('span', {
            className: `product-card__badge badge badge--${product.badge}`,
            text: BADGE_LABELS[product.badge],
        }));
    }

    const price = createElement('p', { className: 'product-card__price', text: formatPrice(product.price) });
    if (product.oldPrice) {
        price.append(' ', createElement('s', { className: 'product-card__old-price', text: formatPrice(product.oldPrice) }));
    }

    const action = product.isAvailable
        ? createCartButton(product)
        : createElement('span', { className: 'product-card__status', text: 'Нет в наличии' });

    card.append(createElement('div', { className: 'product-card__body' }, [
        createElement('p', { className: 'product-card__category', text: getCategoryTitle(product.category) }),
        createElement('h3', { className: 'product-card__title' }, [
            createElement('a', { className: 'product-card__link', text: product.title, attrs: { href: url } }),
        ]),
        createElement('p', { className: 'product-card__text', text: product.short }),
        createElement('p', { className: 'product-card__rating' }, [
            createElement('span', { text: '★', attrs: { 'aria-hidden': 'true' } }),
            ` ${String(product.rating).replace('.', ',')}`,
            createElement('span', { className: 'visually-hidden', text: ' из 5' }),
        ]),
        createElement('div', { className: 'product-card__footer' }, [price, action]),
    ]));
    return card;
}

function renderProductList(container, products) {
    container.replaceChildren(...products.map(createProductCard));
}

// Один обработчик на весь контейнер (делегирование): работает и для карточек,
// созданных после загрузки страницы.
function handleAddToCartClick(event) {
    const button = event.target.closest('[data-add-to-cart]');
    if (!button) {
        return;
    }
    const product = getProductById(button.dataset.addToCart);
    if (product && addToCart(product.id)) {
        button.replaceWith(createCartButton(product));
        showToast(`«${product.title}» в корзине`);
    }
}

function refreshCartButtons(container) {
    container.querySelectorAll('[data-add-to-cart]').forEach((button) => {
        const product = getProductById(button.dataset.addToCart);
        button.replaceWith(createCartButton(product));
    });
}

// ---------- Поиск, фильтрация, сортировка ----------

function getVisibleProducts(state) {
    const query = state.search.trim().toLowerCase();

    const filtered = PRODUCTS.filter((product) => {
        const matchesSearch = query === '' || product.title.toLowerCase().includes(query);
        const matchesCategory = state.category === 'all' || product.category === state.category;
        const matchesAvailability = !state.onlyAvailable || product.isAvailable;
        return matchesSearch && matchesCategory && matchesAvailability;
    });

    // sort меняет массив на месте, поэтому сортируем копию — исходный PRODUCTS не трогаем.
    const sorted = [...filtered];
    if (state.sort === 'price-asc') {
        sorted.sort((a, b) => a.price - b.price);
    } else if (state.sort === 'price-desc') {
        sorted.sort((a, b) => b.price - a.price);
    } else if (state.sort === 'title') {
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    } else if (state.sort === 'rating') {
        sorted.sort((a, b) => b.rating - a.rating);
    }
    return sorted;
}

function renderPagination(nav, totalPages) {
    nav.replaceChildren();
    nav.hidden = totalPages <= 1;
    for (let page = 1; page <= totalPages; page += 1) {
        const isCurrent = page === catalogState.page;
        const button = createElement('button', {
            className: isCurrent ? 'pagination__button pagination__button--active' : 'pagination__button',
            text: String(page),
            attrs: { type: 'button', 'aria-label': `Страница ${page}`, 'aria-current': isCurrent ? 'page' : null },
        });
        button.addEventListener('click', () => {
            catalogState.page = page;
            renderCatalog();
            document.querySelector('.catalog__content').scrollIntoView({ block: 'start' });
        });
        nav.append(button);
    }
}

function renderCatalog() {
    const list = document.querySelector('[data-catalog-list]');
    const empty = document.querySelector('[data-catalog-empty]');
    const count = document.querySelector('[data-catalog-count]');
    const pagination = document.querySelector('[data-pagination]');

    const products = getVisibleProducts(catalogState);
    const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
    catalogState.page = Math.min(catalogState.page, totalPages);
    const start = (catalogState.page - 1) * PAGE_SIZE;
    const pageItems = products.slice(start, start + PAGE_SIZE);

    renderProductList(list, pageItems);
    empty.hidden = products.length > 0;
    count.textContent = products.length > 0
        ? `Найдено ${products.length} ${pluralize(products.length, ['товар', 'товара', 'товаров'])}`
        : 'Ничего не найдено';
    renderPagination(pagination, products.length > 0 ? totalPages : 0);

    // Для отладки: в консоли видно состояние фильтров и сколько товаров прошло.
    console.debug('Каталог:', { ...catalogState }, 'найдено:', products.length);
}

function initCatalogPage() {
    const form = document.querySelector('[data-catalog-form]');
    const list = document.querySelector('[data-catalog-list]');
    if (!form || !list) {
        return;
    }

    // Ссылка вида catalog.html#run сразу открывает нужную категорию —
    // и при загрузке страницы, и при смене якоря без перезагрузки.
    const applyHashCategory = () => {
        const hashCategory = window.location.hash.slice(1);
        if (CATEGORIES.some((category) => category.id === hashCategory)) {
            form.elements.category.value = hashCategory;
            catalogState.category = hashCategory;
            catalogState.page = 1;
            return true;
        }
        return false;
    };
    applyHashCategory();
    window.addEventListener('hashchange', () => {
        if (applyHashCategory()) {
            renderCatalog();
        }
    });

    const applyFilters = () => {
        catalogState.search = form.elements.search.value;
        catalogState.category = form.elements.category.value;
        catalogState.sort = form.elements.sort.value;
        catalogState.onlyAvailable = form.elements.onlyAvailable.checked;
        catalogState.page = 1;
        renderCatalog();
    };

    // Поиск реагирует на каждый введённый символ (input),
    // а категория, сортировка и флажок наличия — на изменение значения (change).
    form.elements.search.addEventListener('input', applyFilters);
    form.addEventListener('change', (event) => {
        if (event.target !== form.elements.search) {
            applyFilters();
        }
    });

    form.addEventListener('submit', (event) => event.preventDefault());

    // После reset поля ещё не сброшены, поэтому перерисовываем на следующем тике.
    form.addEventListener('reset', () => {
        setTimeout(() => form.dispatchEvent(new Event('input')), 0);
    });

    document.querySelectorAll('.filter__anchor').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const categoryId = link.getAttribute('href').slice(1);
            form.elements.category.value = categoryId;
            form.dispatchEvent(new Event('input'));
            history.replaceState(null, '', `#${categoryId}`);
        });
    });

    list.addEventListener('click', handleAddToCartClick);
    document.addEventListener('cart:change', () => refreshCartButtons(list));
    renderCatalog();
}

// Популярные товары на главной и похожие на странице товара.
function initProductShelf(selector, ids) {
    const shelf = document.querySelector(selector);
    if (!shelf) {
        return;
    }
    renderProductList(shelf, ids.map(getProductById).filter(Boolean));
    shelf.addEventListener('click', handleAddToCartClick);
    document.addEventListener('cart:change', () => refreshCartButtons(shelf));
}
