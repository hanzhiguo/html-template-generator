import { eventBus } from '../../core/event-bus.js';

export class ProductsPage {
    constructor() {
        this._bindEvents();
    }

    _bindEvents() {
        eventBus.on('product:created', () => {
            if (window.app) window.app.loadProducts();
        });

        eventBus.on('product:updated', () => {
            if (window.app) window.app.loadProducts();
        });
    }
}

new ProductsPage();