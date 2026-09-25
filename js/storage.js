/*
 * storage.js — работа с localStorage.
 * Все обращения обёрнуты в try/catch: в приватном режиме браузера хранилище
 * может быть недоступно, а сайт при этом должен работать.
 */

const STORAGE_KEYS = {
    cart: 'rekord-cart',
    promo: 'rekord-promo',
    lastOrder: 'rekord-last-order',
};

function loadFromStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
        console.warn(`Не удалось прочитать «${key}» из localStorage`, error);
        return fallback;
    }
}

function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Не удалось сохранить «${key}» в localStorage`, error);
    }
}

function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.warn(`Не удалось удалить «${key}» из localStorage`, error);
    }
}
