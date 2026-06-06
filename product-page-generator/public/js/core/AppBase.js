import { storage } from '../services/storage.js';
import { showToast, formatPrice, getStatusText, escapeHtml } from '../services/utils.js';
import { authAPI, productsAPI } from '../api/index.js';
import { appState } from '../stores/appState.js';
import { router } from '../../core/router.js';
import { pageLoader } from '../../core/page-loader.js';
import { t } from './i18n.js';

class AppBase {
    constructor() {
        console.log('App constructor called');
        this.token = storage.getToken();
        this._currentTemplate = 'detail';
        this._currentPage = 0;
        this._totalPages = 1;
        this.currentProduct = null;
        this.previewLang = localStorage.getItem('preview-lang') || 'zh';
        this.originalProduct = null;
        this.init();
    }

    t(key) {
        return t(this.previewLang, key);
    }

    formatPrice(price, currency = 'USD') {
        return formatPrice(price, currency);
    }

    getStatusText(status) {
        return getStatusText(status);
    }

    escapeHtml(str) {
        return escapeHtml(str);
    }

    init() {
        console.log('[AppBase] init called');
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('[AppBase] DOMContentLoaded fired');
            router.init('app-container');
            await this._loadGlobalComponents();
            this._bindTabEvents();

            if (this.token) {
                console.log('[AppBase] Token exists, verifying...');
                const valid = await this.verifyToken();
                if (valid) {
                    console.log('[AppBase] Token valid, showing main interface');
                    await this.showMainInterface();
                    this.loadProducts();
                } else {
                    console.log('[AppBase] Token invalid, clearing');
                    this.token = null;
                    storage.removeToken();
                }
            }

            // 绑定登录表单事件
            const loginForm = document.getElementById('loginForm');
            console.log('[AppBase] loginForm found:', !!loginForm);
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => this.handleLogin(e));
                console.log('[AppBase] Login form event listener attached');
            }
            document.getElementById('productForm')?.addEventListener('submit', (e) => this.handleProductSubmit(e));
        });
    }

    async _loadGlobalComponents() {
        const components = [
            { name: 'toast', container: 'toast-container' },
            { name: 'modal', container: 'modal-container' },
            { name: 'data-section', container: 'modal-container', append: true },
            { name: 'preview-modal', container: 'preview-container' },
            { name: 'ai-chat', container: 'ai-chat-container', scriptOptions: { module: false } },
            { name: 'csv-import', container: 'csv-import-container' }
        ];

        for (const comp of components) {
            try {
                const html = await pageLoader.loadComponent(comp.name);
                const container = document.getElementById(comp.container);
                if (container) {
                    if (comp.append) {
                        const productDataSections = document.getElementById('productDataSections');
                        if (productDataSections) {
                            productDataSections.innerHTML += html;
                        }
                    } else {
                        container.innerHTML = html;
                    }
                    await pageLoader.loadComponentScript(comp.name, comp.scriptOptions || {});
                }
            } catch (e) {
                console.warn(`Failed to load component: ${comp.name}`, e);
            }
        }

        // 组件加载完成后触发初始化钩子
        if (typeof this._onComponentsLoaded === 'function') {
            await this._onComponentsLoaded();
        }
    }

    _bindTabEvents() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const page = tab.dataset.page;
                if (page) this.switchTab(page);
            });
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        console.log('handleLogin called, username:', username);

        // 显示加载状态
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = '登录中...';
        btn.disabled = true;

        try {
            console.log('Calling authAPI.login...');
            console.log('window.authAPI exists:', typeof window.authAPI !== 'undefined');
            const data = await authAPI.login(username, password);
            console.log('handleLogin received data:', data);

            if (data.token) {
                console.log('Token is valid, setting up...');
                this.token = data.token;
                storage.setToken(data.token);
                storage.setUsername(data.user.username);
                appState.setUser(data.user);
                appState.setToken(data.token);

                console.log('Token saved to localStorage:', storage.getToken() ? 'yes' : 'no');
                console.log('Token in app instance:', this.token ? 'yes' : 'no');

                await this.showMainInterface();
                this.loadProducts();
                showToast('登录成功');
            } else {
                console.error('No token in response:', data);
                showToast(data.error || '登录失败', 'error');
                btn.textContent = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            console.error('Login error:', err);
            showToast('网络错误: ' + err.message, 'error');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    logout() {
        this.token = null;
        storage.removeToken();
        storage.removeUsername();
        appState.logout();

        document.getElementById('navbar')?.classList.add('hidden');
        document.getElementById('loginContainer')?.classList.remove('hidden');
        document.getElementById('mainContent')?.classList.add('hidden');
        document.getElementById('app-container').innerHTML = '';
    }

    async handleProductSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = Object.fromEntries(formData.entries());
        // 处理表单提交
        console.log('handleProductSubmit called', productData);
        showToast('产品保存中...');
    }

    async verifyToken() {
        try {
            const data = await authAPI.verify(this.token);
            return !!(data && data.user);
        } catch (err) {
            return false;
        }
    }

    async showMainInterface() {
        console.log('[showMainInterface] starting...');
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        document.getElementById('username').textContent = storage.getUsername();
        console.log('[showMainInterface] loading products page...');
        await router.loadPage('products');
        console.log('[showMainInterface] products page loaded');
    }

    async loadProducts() {
        try {
            console.log('loadProducts called, token:', this.token ? 'exists' : 'missing');
            const data = await productsAPI.getAll(this.token);
            console.log('API response:', data);
            const products = data.products || [];
            console.log('Products count:', products.length);
            appState.setProducts(products);
            this.renderProducts(products);
        } catch (err) {
            console.error('loadProducts error:', err);
            showToast('加载失败: ' + err.message, 'error');
        }
    }

    renderProducts(products) {
        const tbody = document.getElementById('productsBody');
        console.log('[renderProducts] tbody found:', !!tbody, 'products count:', products?.length);
        if (!tbody) {
            console.error('[renderProducts] productsBody not found!');
            return;
        }

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">暂无产品</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.sku || '-'}</td>
                <td>${p.name}</td>
                <td>${p.price ? this.formatPrice(p.price, p.currency) : '-'}</td>
                <td><span class="status-badge status-${p.status}">${this.getStatusText(p.status)}</span></td>
                <td class="actions">
                    <button onclick="app.viewProduct('${p.id}')" class="view">查看</button>
                    <button onclick="app.editProduct('${p.id}')">编辑</button>
                    <button onclick="app.deleteProduct('${p.id}')">删除</button>
                </td>
            </tr>
        `).join('');
    }
}

export { AppBase };