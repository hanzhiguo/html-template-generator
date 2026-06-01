import { showToast } from '../services/utils.js';

class TranslationManager {
    constructor() {
        this.cache = new Map();
        this.currentLang = localStorage.getItem('preview-lang') || 'zh';
        this._loadCache();
    }

    _loadCache() {
        try {
            const keys = Object.keys(localStorage);
            const cacheKeys = keys.filter(k => k.startsWith('trans_cache_'));
            for (const key of cacheKeys) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data.product) {
                        const mapKey = key.replace('trans_cache_', '');
                        this.cache.set(mapKey, data.product);
                    }
                } catch (e) {}
            }
            if (cacheKeys.length > 0) {
                console.log(`已加载 ${cacheKeys.length} 条翻译缓存`);
            }
        } catch (e) {
            console.warn('加载翻译缓存失败:', e);
        }
    }

    getFromStorage(cacheKey) {
        try {
            const data = JSON.parse(localStorage.getItem(`trans_cache_${cacheKey}`));
            return data?.product || null;
        } catch (e) {
            return null;
        }
    }

    saveToStorage(cacheKey, product) {
        try {
            localStorage.setItem(`trans_cache_${cacheKey}`, JSON.stringify({
                product,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('保存翻译缓存失败:', e);
        }
    }

    getFromMemory(cacheKey) {
        return this.cache.get(cacheKey);
    }

    setToMemory(cacheKey, product) {
        this.cache.set(cacheKey, product);
    }

    extractContent(product) {
        return {
            name: product.name || '',
            subtitle: product.subtitle || '',
            description: product.description || '',
            highlights: (product.highlights || []).map(h => ({
                key: h.highlight_key || '',
                value: h.highlight_value || ''
            })),
            specs: (product.specs || []).map(s => ({
                label: s.spec_label || '',
                value: s.spec_value || ''
            })),
            features: (product.features || []).map(f => ({
                title: f.feature_title || '',
                description: f.description || ''
            })),
            dimensions: (product.dimensions || []).map(d => ({
                label: d.dim_label || '',
                value: d.dim_value || ''
            })),
            accessories: (product.accessories || []).map(a => ({
                name: a.accessory_name || ''
            }))
        };
    }

    apply(original, translated) {
        const product = JSON.parse(JSON.stringify(original));
        
        product.name = translated.name || product.name;
        product.subtitle = translated.subtitle || product.subtitle;
        product.description = translated.description || product.description;
        
        if (translated.highlights && product.highlights) {
            product.highlights = product.highlights.map((h, i) => ({
                ...h,
                highlight_key: translated.highlights[i]?.key || h.highlight_key,
                highlight_value: translated.highlights[i]?.value || h.highlight_value
            }));
        }
        
        if (translated.specs && product.specs) {
            product.specs = product.specs.map((s, i) => ({
                ...s,
                spec_label: translated.specs[i]?.label || s.spec_label,
                spec_value: translated.specs[i]?.value || s.spec_value
            }));
        }
        
        if (translated.features && product.features) {
            product.features = product.features.map((f, i) => ({
                ...f,
                feature_title: translated.features[i]?.title || f.feature_title,
                description: translated.features[i]?.description || f.description
            }));
        }
        
        if (translated.dimensions && product.dimensions) {
            product.dimensions = product.dimensions.map((d, i) => ({
                ...d,
                dim_label: translated.dimensions[i]?.label || d.dim_label,
                dim_value: translated.dimensions[i]?.value || d.dim_value
            }));
        }
        
        if (translated.accessories && product.accessories) {
            product.accessories = product.accessories.map((a, i) => ({
                ...a,
                accessory_name: translated.accessories[i]?.name || a.accessory_name
            }));
        }
        
        return product;
    }

    async translate(product, targetLang, originalProduct) {
        if (targetLang === 'zh') {
            return originalProduct;
        }

        const cacheKey = `${product.id}_${targetLang}`;
        
        const cached = this.getFromMemory(cacheKey);
        if (cached) return cached;

        const stored = this.getFromStorage(cacheKey);
        if (stored) {
            this.setToMemory(cacheKey, stored);
            return stored;
        }

        const contentToTranslate = this.extractContent(originalProduct);
        
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: contentToTranslate,
                targetLang: targetLang,
                sourceLang: 'zh'
            })
        });

        const data = await response.json();
        
        if (data.translated) {
            const translatedProduct = this.apply(originalProduct, data.translated);
            this.setToMemory(cacheKey, translatedProduct);
            this.saveToStorage(cacheKey, translatedProduct);
            return translatedProduct;
        } else {
            throw new Error(data.error || '翻译失败');
        }
    }

    showLoading(show) {
        const loading = document.getElementById('translationLoading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    setLang(lang) {
        this.currentLang = lang;
        localStorage.setItem('preview-lang', lang);
    }

    getLang() {
        return this.currentLang;
    }
}

export const translationManager = new TranslationManager();
export { TranslationManager };