/*
 * utils.js — общие вспомогательные функции: форматирование цены,
 * склонение слов и безопасное создание DOM-элементов.
 */

const priceFormatter = new Intl.NumberFormat('ru-RU');

function formatPrice(value) {
    return `${priceFormatter.format(value)} ₽`;
}

// pluralize(5, ['товар', 'товара', 'товаров']) → «товаров»
function pluralize(count, forms) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) {
        return forms[0];
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return forms[1];
    }
    return forms[2];
}

/*
 * Создаёт элемент и наполняет его через textContent и append.
 * Текст никогда не вставляется через innerHTML, поэтому данные из формы
 * или из адресной строки не могут превратиться в HTML-код.
 */
function createElement(tag, options = {}, children = []) {
    const element = document.createElement(tag);
    if (options.className) {
        element.classList.add(...options.className.split(' ').filter(Boolean));
    }
    if (options.text !== undefined) {
        element.textContent = options.text;
    }
    if (options.attrs) {
        Object.entries(options.attrs).forEach(([name, value]) => {
            if (value !== undefined && value !== null && value !== false) {
                element.setAttribute(name, value === true ? '' : String(value));
            }
        });
    }
    element.append(...children.filter(Boolean));
    return element;
}

function getProductById(id) {
    return PRODUCTS.find((product) => product.id === Number(id)) || null;
}

function getCategoryTitle(categoryId) {
    const category = CATEGORIES.find((item) => item.id === categoryId);
    return category ? category.title : '';
}

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}
