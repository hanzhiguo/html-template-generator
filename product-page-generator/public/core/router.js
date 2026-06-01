import { eventBus } from './event-bus.js';

const ROUTES = {
    'login': 'pages/login/login.html',
    'products': 'pages/products/products.html',
    'image-to-product': 'pages/image-to-product/image-to-product.html',
    'attachments': 'pages/attachments/attachments.html',
    'agent': 'pages/agent/agent.html',
    'settings': 'pages/settings/settings.html'
};

class Router {
    constructor() {
        this._currentPage = null;
        this._container = null;
        this._loadedScripts = new Set();
    }

    init(containerId = 'app-container') {
        this._container = document.getElementById(containerId);
        if (!this._container) {
            console.error('[Router] Container not found:', containerId);
            return;
        }
    }

    async loadPage(pageName) {
        console.log(`[Router] loadPage called: ${pageName}`);
        const pagePath = ROUTES[pageName];
        if (!pagePath) {
            console.error(`[Router] Unknown page: ${pageName}`);
            return;
        }

        if (this._currentPage === pageName) {
            console.log(`[Router] Page ${pageName} already loaded, skipping`);
            return;
        }

        eventBus.emit('page:beforeUnload', { page: this._currentPage });
        eventBus.emit('page:beforeLoad', { page: pageName });

        try {
            console.log(`[Router] Fetching ${pagePath}...`);
            const response = await fetch(pagePath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const html = await response.text();
            console.log(`[Router] HTML loaded, length: ${html.length}`);

            this._container.innerHTML = html;
            console.log(`[Router] HTML inserted into container`);

            const scriptPath = pagePath.replace('.html', '.js');
            if (!this._loadedScripts.has(scriptPath)) {
                this._loadedScripts.add(scriptPath);
                console.log(`[Router] Loading script: ${scriptPath}`);
                await this._loadScript(scriptPath);
                console.log(`[Router] Script loaded: ${scriptPath}`);
            }

            this._currentPage = pageName;
            eventBus.emit('page:loaded', { page: pageName });
            console.log(`[Router] Page ${pageName} loaded successfully`);
        } catch (error) {
            console.error(`[Router] Failed to load page "${pageName}":`, error);
            this._container.innerHTML = `<div style="text-align:center;padding:60px;color:#ef4444;">
                <p>页面加载失败: ${pageName}</p>
                <p style="font-size:13px;color:#94a3b8;">${error.message}</p>
            </div>`;
        }
    }

    _loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load: ${src}`));
            document.body.appendChild(script);
        });
    }

    getCurrentPage() {
        return this._currentPage;
    }
}

export const router = new Router();