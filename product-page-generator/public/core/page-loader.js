class PageLoader {
    constructor() {
        this._cache = new Map();
        this._loadedScripts = new Set();
        this._loadedCSS = new Set();
    }

    async loadHTML(url) {
        if (this._cache.has(url)) {
            return this._cache.get(url);
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
        const html = await response.text();
        this._cache.set(url, html);
        return html;
    }

    async loadComponent(name) {
        const htmlUrl = `components/${name}/${name}.html`;
        const cssUrl = `components/${name}/${name}.css`;

        const html = await this.loadHTML(htmlUrl);

        if (!this._loadedCSS.has(name)) {
            this._loadedCSS.add(name);
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${cssUrl}?v=${Date.now()}`;
            document.head.appendChild(link);
        }

        return html;
    }

    async loadComponentScript(name) {
        const jsUrl = `components/${name}/${name}.js`;
        
        if (this._loadedScripts.has(jsUrl)) {
            return;
        }
        
        this._loadedScripts.add(jsUrl);
        await this._loadScript(jsUrl);
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

    clearCache() {
        this._cache.clear();
    }
}

export const pageLoader = new PageLoader();