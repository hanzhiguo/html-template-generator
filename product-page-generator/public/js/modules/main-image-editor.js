const escapeHtml = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

const generateLayoutCSS = (layoutStyle) => {
    const layouts = {
        'none': '',
        'line-left': `
    .main-image-content::before {
        content: '';
        position: absolute;
        left: -24px;
        top: 0;
        bottom: 0;
        width: 3px;
        background: currentColor;
        opacity: 0.5;
        border-radius: 2px;
    }`,
        'line-top': `
    .main-image-big-title::before {
        content: '';
        display: block;
        width: 50px;
        height: 3px;
        background: currentColor;
        opacity: 0.5;
        margin-bottom: 18px;
        border-radius: 2px;
    }
    .text-align-center .main-image-big-title::before { margin-left: auto; margin-right: auto; }
    .text-align-right .main-image-big-title::before { margin-left: auto; }`,
        'bracket': `
    .main-image-big-title::before {
        content: '「';
        opacity: 0.35;
        margin-right: 6px;
        font-weight: 300;
    }
    .main-image-big-title::after {
        content: '」';
        opacity: 0.35;
        margin-left: 6px;
        font-weight: 300;
    }`,
        'dot-frame': `
    .main-image-content::before {
        content: '◆';
        display: block;
        font-size: 12px;
        margin-bottom: 18px;
        opacity: 0.45;
        letter-spacing: 0;
    }
    .main-image-content::after {
        content: '◆';
        display: block;
        font-size: 12px;
        margin-top: 18px;
        opacity: 0.45;
        letter-spacing: 0;
    }
    .text-align-center .main-image-content::before,
    .text-align-center .main-image-content::after { text-align: center; }`
    };
    return layouts[layoutStyle] || '';
};

const renderMainImageStyles = (style = {}, isExport = false) => {
    const titleColor = style.titleColor || '#ffffff';
    const subtitleColor = style.subtitleColor || 'rgba(255,255,255,0.85)';
    const titleSize = style.titleSize || 56;
    const subtitleSize = style.subtitleSize || 28;
    const textShadow = style.textShadow !== false;
    const textStroke = style.textStroke || false;
    const titleBold = style.titleBold !== false;
    const bgOverlay = style.bgOverlay || false;
    const textBg = style.textBg || false;
    const bgColor = style.bgColor || '#f5f5f5';
    const overlayType = style.overlayType || 'dark';
    const layoutStyle = style.layoutStyle || 'none';

    const wrapperScale = isExport ? 1 : 0.72;
    const marginBottom = isExport ? 0 : -287;

    const shadowStyle = textShadow ? 'text-shadow: 0 4px 20px rgba(0,0,0,0.5);' : 'text-shadow: none;';
    const strokeStyle = textStroke ? '-webkit-text-stroke: 1.5px rgba(0,0,0,0.6); paint-order: stroke fill;' : '';
    const fontWeight = titleBold ? '900' : '600';

    const overlayCSS = {
        'none': '',
        'dark': 'background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.55) 100%);',
        'light': 'background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.4) 100%);',
        'gradient': 'background: linear-gradient(135deg, rgba(37,99,235,0.45) 0%, rgba(139,92,246,0.35) 50%, rgba(236,72,153,0.45) 100%);'
    };

    const layoutCSS = generateLayoutCSS(layoutStyle);

    return `
<style>
    .main-image-wrapper {
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
        padding: 20px;
        background: #f0f0f0;
        min-height: 100vh;
    }
    .main-image-page {
        width: 1024px;
        aspect-ratio: 1 / 1;
        position: relative;
        flex-shrink: 0;
    }
    .main-image-card {
        width: 100%;
        height: 100%;
        background-color: ${bgColor};
        background-size: cover;
        background-position: center;
        display: flex;
        flex-direction: column;
        padding: 80px;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
    }
    .main-image-card::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        ${overlayCSS[overlayType] || overlayCSS['dark']}
    }
    .main-image-card.text-align-left { align-items: flex-start; }
    .main-image-card.text-align-center { align-items: center; }
    .main-image-card.text-align-right { align-items: flex-end; }
    .main-image-card.vposition-top { justify-content: flex-start; padding-top: 150px; }
    .main-image-card.vposition-center { justify-content: center; }
    .main-image-card.vposition-bottom { justify-content: flex-end; padding-bottom: 150px; }
    .main-image-overlay-dark { ${bgOverlay ? '' : 'display: none;'} }
    .main-image-logo-sm {
        position: absolute;
        top: 50px;
        left: 50px;
        width: 80px;
        height: 80px;
        background: rgba(255,255,255,0.95);
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        font-weight: 800;
        color: #111;
        z-index: 5;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .main-image-highlight-num {
        position: absolute;
        top: 50px;
        left: 50px;
        font-size: 100px;
        font-weight: 900;
        color: rgba(255,255,255,0.2);
        line-height: 1;
        z-index: 5;
    }
    .main-image-content {
        text-align: inherit;
        max-width: 85%;
        z-index: 5;
        position: relative;
    }
    .main-image-card.text-align-left .main-image-content { text-align: left; }
    .main-image-card.text-align-center .main-image-content { text-align: center; }
    .main-image-card.text-align-right .main-image-content { text-align: right; }
    .has-text-bg { padding: 30px 40px; }
    .text-bg-panel {
        display: inline-block;
        background: rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 20px;
        padding: 32px 48px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }
    .text-align-center .text-bg-panel { text-align: center; }
    .text-align-left .text-bg-panel { text-align: left; }
    .text-align-right .text-bg-panel { text-align: right; }
    .main-image-big-title {
        font-size: ${titleSize}px;
        font-weight: ${fontWeight};
        color: ${titleColor};
        letter-spacing: -2px;
        line-height: 1.1;
        margin-bottom: 24px;
        ${shadowStyle}
        ${strokeStyle}
    }
    .main-image-small-title {
        font-size: ${subtitleSize}px;
        font-weight: 400;
        color: ${subtitleColor};
        line-height: 1.4;
        ${shadowStyle}
    }
    .main-image-price-tag {
        position: absolute;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
        padding: 18px 48px;
        border-radius: 60px;
        font-size: 40px;
        font-weight: 800;
        color: #fff;
        z-index: 5;
        box-shadow: 0 8px 32px rgba(37, 99, 235, 0.5);
    }
    ${layoutCSS}
    .main-image-wrapper { transform: scale(${wrapperScale}); transform-origin: top center; }
    .main-image-wrapper > * { margin-bottom: ${marginBottom}px; }
</style>`;
};

const renderMainImageTemplate = (product, images = [], options = {}) => {
    const p = product;
    const highlights = p.highlights || [];
    const priceDisplay = p.price ? `$${parseFloat(p.price).toFixed(2)}` : '';
    const isExport = options.isExport || false;

    const style = {
        titleColor: options.titleColor || '#ffffff',
        subtitleColor: options.subtitleColor || 'rgba(255,255,255,0.85)',
        position: options.position || 'center',
        vposition: options.vposition || 'center',
        titleSize: options.titleSize || 56,
        subtitleSize: options.subtitleSize || 28,
        textShadow: options.textShadow !== false,
        textStroke: options.textStroke || false,
        titleBold: options.titleBold !== false,
        bgOverlay: options.bgOverlay || false,
        textBg: options.textBg || false,
        bgColor: options.bgColor || '#f5f5f5',
        overlayType: options.overlayType || 'dark',
        layoutStyle: options.layoutStyle || 'none'
    };

    const mainImg = images.find(i => i.image_type === 'main');
    const sceneImgs = images.filter(i => i.image_type?.startsWith('scene'));
    const detailImgs = images.filter(i => i.image_type?.startsWith('detail'));
    const allBgImgs = [...(mainImg ? [mainImg] : []), ...sceneImgs, ...detailImgs];

    const textAlignClass = `text-align-${style.position}`;
    const vpositionClass = `vposition-${style.vposition}`;

    return `
    <div class="main-image-wrapper">
        <div class="main-image-page" data-page="cover">
            <div class="main-image-card ${textAlignClass} ${vpositionClass}" style="background-image: url('${mainImg?.image_url || ''}');">
                <div class="main-image-logo-sm">${(p.name || 'P').charAt(0).toUpperCase()}</div>
                <div class="main-image-content ${style.textBg ? 'has-text-bg' : ''}">
                    ${style.textBg ? '<div class="text-bg-panel">' : ''}
                    <div class="main-image-big-title">${escapeHtml(p.name || 'Product')}</div>
                    ${p.subtitle ? `<div class="main-image-small-title">${escapeHtml(p.subtitle)}</div>` : ''}
                    ${style.textBg ? '</div>' : ''}
                </div>
                ${priceDisplay ? `<div class="main-image-price-tag">${priceDisplay}</div>` : ''}
                <div class="main-image-overlay-dark"></div>
            </div>
        </div>
        ${highlights.slice(0, 6).map((h, i) => {
            const bgImg = allBgImgs[i + 1] || allBgImgs[i % (allBgImgs.length || 1)] || {};
            return `
        <div class="main-image-page" data-page="${i + 1}">
            <div class="main-image-card ${textAlignClass} ${vpositionClass}" style="background-image: url('${bgImg.image_url || ''}');">
                <div class="main-image-highlight-num">0${i + 1}</div>
                <div class="main-image-content ${style.textBg ? 'has-text-bg' : ''}">
                    ${style.textBg ? '<div class="text-bg-panel">' : ''}
                    <div class="main-image-big-title">${escapeHtml(h.highlight_key || 'Feature')}</div>
                    <div class="main-image-small-title">${escapeHtml(h.highlight_value || '')}</div>
                    ${style.textBg ? '</div>' : ''}
                </div>
                <div class="main-image-overlay-dark"></div>
            </div>
        </div>
        `}).join('')}
    </div>
    ${renderMainImageStyles(style, isExport)}`;
};

const MainImageEditor = {
    style: {
        titleColor: '#ffffff',
        subtitleColor: 'rgba(255,255,255,0.85)',
        position: 'center',
        vposition: 'center',
        titleSize: 56,
        subtitleSize: 28,
        textShadow: true,
        textStroke: false,
        titleBold: true,
        bgOverlay: false,
        textBg: false,
        bgColor: '#f5f5f5',
        overlayType: 'dark',
        layoutStyle: 'none'
    },

    product: null,
    images: [],
    currentPage: 0,
    totalPages: 1,
    _initialized: false,

    init() {
        if (this._initialized) return;
        this._initialized = true;
        this._bindEvents();
        this._syncUI();
    },

    _bindEvents() {
        const $ = (id) => document.getElementById(id);
        if (!$) return;

        const titleColor = $('mainImageTitleColor');
        const subtitleColor = $('mainImageSubtitleColor');
        const titleSize = $('mainImageTitleSize');
        const subtitleSize = $('mainImageSubtitleSize');

        if (titleColor) titleColor.addEventListener('input', () => { this.style.titleColor = titleColor.value; this._render(); });
        if (subtitleColor) subtitleColor.addEventListener('input', () => { this.style.subtitleColor = subtitleColor.value; this._render(); });
        if (titleSize) titleSize.addEventListener('input', () => { this.style.titleSize = parseInt(titleSize.value); $('titleSizeValue').textContent = titleSize.value + 'px'; this._render(); });
        if (subtitleSize) subtitleSize.addEventListener('input', () => { this.style.subtitleSize = parseInt(subtitleSize.value); $('subtitleSizeValue').textContent = subtitleSize.value + 'px'; this._render(); });

        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.target;
                const color = btn.dataset.color;
                this.style[target + 'Color'] = color;
                const input = $('mainImage' + target.charAt(0).toUpperCase() + target.slice(1) + 'Color');
                if (input) input.value = color;
                document.querySelectorAll('.color-preset[data-target="' + target + '"]').forEach(b => b.classList.toggle('active', b.dataset.color === color));
                this._render();
            });
        });

        document.querySelectorAll('.pos-btn[data-position]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.style.position = btn.dataset.position;
                document.querySelectorAll('.pos-btn[data-position]').forEach(b => b.classList.toggle('active', b.dataset.position === this.style.position));
                this._render();
            });
        });

        document.querySelectorAll('.pos-btn[data-vposition]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.style.vposition = btn.dataset.vposition;
                document.querySelectorAll('.pos-btn[data-vposition]').forEach(b => b.classList.toggle('active', b.dataset.vposition === this.style.vposition));
                this._render();
            });
        });
    },

    _syncUI() {
        const $ = (id) => document.getElementById(id);
        if ($('mainImageTitleColor')) $('mainImageTitleColor').value = this.style.titleColor;
        if ($('mainImageSubtitleColor')) $('mainImageSubtitleColor').value = this.style.subtitleColor;
        if ($('mainImageTitleSize')) $('mainImageTitleSize').value = this.style.titleSize;
        if ($('titleSizeValue')) $('titleSizeValue').textContent = this.style.titleSize + 'px';
        if ($('mainImageSubtitleSize')) $('mainImageSubtitleSize').value = this.style.subtitleSize;
        if ($('subtitleSizeValue')) $('subtitleSizeValue').textContent = this.style.subtitleSize + 'px';

        document.querySelectorAll('.toggle-btn[data-key]').forEach(btn => {
            btn.classList.toggle('active', !!this.style[btn.dataset.key]);
        });

        document.querySelectorAll('.pos-btn[data-position]').forEach(b => b.classList.toggle('active', b.dataset.position === this.style.position));
        document.querySelectorAll('.pos-btn[data-vposition]').forEach(b => b.classList.toggle('active', b.dataset.vposition === this.style.vposition));
        document.querySelectorAll('.color-preset').forEach(b => b.classList.toggle('active', b.dataset.color === this.style[b.dataset.target + 'Color']));
        document.querySelectorAll('.bg-color-preset[data-bg-color]').forEach(b => b.classList.toggle('active', b.dataset.bgColor === this.style.bgColor));
        document.querySelectorAll('.overlay-btn[data-overlay]').forEach(b => b.classList.toggle('active', b.dataset.overlay === this.style.overlayType));
        document.querySelectorAll('.layout-btn[data-layout]').forEach(b => b.classList.toggle('active', b.dataset.layout === this.style.layoutStyle));
        if ($('mainImageBgColor')) $('mainImageBgColor').value = this.style.bgColor;
    },

    setProduct(product, images) {
        this.product = product;
        this.images = images || [];
        this.currentPage = 0;
        const highlights = product?.highlights || [];
        this.totalPages = 1 + highlights.length;
        this._render();
        this._updatePagination();
    },

    _render() {
        const content = document.getElementById('previewContent');
        if (!content || !this.product) return;
        content.innerHTML = renderMainImageTemplate(this.product, this.images, this.style);
        this._updatePageDisplay();
    },

    _updatePageDisplay() {
        const pages = document.querySelectorAll('.main-image-page');
        pages.forEach((page, i) => {
            page.style.display = i === this.currentPage ? '' : 'none';
        });
    },

    _updatePagination() {
        const pageIndicator = document.getElementById('previewPageIndicator');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        if (pageIndicator) pageIndicator.textContent = `第 ${this.currentPage + 1}/${this.totalPages} 页`;
        if (prevBtn) prevBtn.style.display = this.totalPages > 1 ? '' : 'none';
        if (nextBtn) nextBtn.style.display = this.totalPages > 1 ? '' : 'none';
    },

    prevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this._updatePageDisplay();
            this._updatePagination();
        }
    },

    nextPage() {
        if (this.currentPage < this.totalPages - 1) {
            this.currentPage++;
            this._updatePageDisplay();
            this._updatePagination();
        }
    },

    async exportImage(format) {
        if (!this.product) return;

        const content = document.getElementById('previewContent');
        const originalHTML = content.innerHTML;

        content.innerHTML = renderMainImageTemplate(this.product, this.images, { ...this.style, isExport: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        const pages = content.querySelectorAll('.main-image-page');
        const targetPage = pages[this.currentPage] || pages[0];
        if (!targetPage) { content.innerHTML = originalHTML; return; }

        pages.forEach(p => p.style.display = 'none');
        targetPage.style.display = '';
        targetPage.style.transform = 'none';
        targetPage.style.width = '1024px';
        targetPage.style.height = '1024px';

        const card = targetPage.querySelector('.main-image-card');
        if (card) {
            card.style.width = '100%';
            card.style.height = '100%';
            card.style.padding = '80px';
            card.style.boxSizing = 'border-box';
            const titleEl = card.querySelector('.main-image-big-title');
            if (titleEl) {
                titleEl.style.fontSize = (this.style.titleSize || 56) + 'px';
                titleEl.style.color = this.style.titleColor || '#ffffff';
                titleEl.style.fontWeight = this.style.titleBold !== false ? '900' : '600';
                titleEl.style.textShadow = this.style.textShadow !== false ? '0 4px 20px rgba(0,0,0,0.5)' : 'none';
                if (this.style.textStroke) {
                    titleEl.style.webkitTextStroke = '1.5px rgba(0,0,0,0.6)';
                    titleEl.style.paintOrder = 'stroke fill';
                }
            }
            const subtitleEl = card.querySelector('.main-image-small-title');
            if (subtitleEl) {
                subtitleEl.style.fontSize = (this.style.subtitleSize || 28) + 'px';
                subtitleEl.style.color = this.style.subtitleColor || 'rgba(255,255,255,0.85)';
                subtitleEl.style.textShadow = this.style.textShadow !== false ? '0 2px 10px rgba(0,0,0,0.5)' : 'none';
            }
            const overlay = card.querySelector('.main-image-overlay-dark');
            if (overlay) overlay.style.display = this.style.bgOverlay ? '' : 'none';
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            if (!window.html2canvas) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            const canvas = await html2canvas(targetPage, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: 1024,
                height: 1024,
                logging: false,
                onclone: (clonedDoc) => {
                    const cp = clonedDoc.querySelector('.main-image-page');
                    if (cp) {
                        cp.style.transform = 'none';
                        cp.style.width = '1024px';
                        cp.style.height = '1024px';
                        const cc = cp.querySelector('.main-image-card');
                        if (cc) {
                            cc.style.width = '100%';
                            cc.style.height = '100%';
                            const ct = cc.querySelector('.main-image-big-title');
                            if (ct) {
                                ct.style.fontSize = (this.style.titleSize || 56) + 'px';
                                ct.style.color = this.style.titleColor || '#ffffff';
                                ct.style.fontWeight = this.style.titleBold !== false ? '900' : '600';
                                ct.style.textShadow = this.style.textShadow !== false ? '0 4px 20px rgba(0,0,0,0.5)' : 'none';
                                if (this.style.textStroke) {
                                    ct.style.webkitTextStroke = '1.5px rgba(0,0,0,0.6)';
                                    ct.style.paintOrder = 'stroke fill';
                                }
                            }
                            const cs = cc.querySelector('.main-image-small-title');
                            if (cs) {
                                cs.style.fontSize = (this.style.subtitleSize || 28) + 'px';
                                cs.style.color = this.style.subtitleColor || 'rgba(255,255,255,0.85)';
                                cs.style.textShadow = this.style.textShadow !== false ? '0 2px 10px rgba(0,0,0,0.5)' : 'none';
                            }
                        }
                    }
                }
            });

            content.innerHTML = originalHTML;

            const productName = (this.product?.name || 'product').replace(/\s+/g, '-').toLowerCase();
            const timestamp = new Date().toISOString().slice(0, 10);
            const link = document.createElement('a');
            link.download = `${productName}-main-${this.currentPage + 1}-${timestamp}.${format}`;
            link.href = canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('导出失败:', err);
            content.innerHTML = originalHTML;
        }
    }
};

export { MainImageEditor, renderMainImageTemplate };