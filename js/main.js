/*
 * main.js — точка входа. Скрипты подключены с defer, поэтому к моменту запуска
 * разметка уже разобрана. Каждая функция сама проверяет, есть ли на странице
 * нужный ей блок, — один набор файлов обслуживает все страницы.
 */

function initApp() {
    updateCartCounter();
    initNavigation();
    initModals();

    initProductShelf('[data-popular-list]', [1, 5, 7, 10]);
    initCatalogPage();
    initProductPage();
    initCartPage();

    initOrderForm();
    initFeedbackForm();
    initConsultForm();

    console.info(`Рекорд: скрипты запущены, в корзине ${getCartCount()} шт.`);
}

initApp();
