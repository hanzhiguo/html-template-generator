import { showToast, escapeHtml } from '../services/utils.js';
import { getHighlightIcon, renderMainImageTemplate } from './preview-template.js';

class ExportManager {
    constructor(getProduct, getToken) {
        this.getProduct = getProduct;
        this.getToken = getToken;
        this.currentPage = 0;
        this.totalPages = 1;
        this.currentTemplate = 'detail';
        this.getMainImageStyle = null;
    }

    setMainImageStyleGetter(getter) {
        this.getMainImageStyle = getter;
    }

    setTemplate(template) {
        this.currentTemplate = template;
    }

    setCurrentPage(page) {
        this.currentPage = page;
    }

    setTotalPages(total) {
        this.totalPages = total;
    }

    getManualPages(product) {
        const p = product;
        const highlights = p.highlights || [];
        const specs = p.specs || [];
        const features = p.features || [];
        const dimensions = p.dimensions || [];
        const accessories = p.accessories || [];

        const pages = [];

        if (p.name) {
            pages.push({
                type: 'cover',
                title: p.name || '产品名称',
                subtitle: p.subtitle || '',
                price: p.price ? this._formatPrice(p.price, p.currency) : '',
                image: true
            });
        }

        if (highlights.length > 0) {
            pages.push({
                type: 'highlights',
                title: '核心卖点',
                data: highlights.slice(0, 6),
                icon: true
            });
        }

        if (features.length > 0) {
            pages.push({
                type: 'features',
                title: '功能亮点',
                data: features.slice(0, 4),
                icon: true
            });
        }

        if (specs.length > 0) {
            pages.push({
                type: 'specs',
                title: '产品规格',
                data: specs.slice(0, 6)
            });
        }

        if (accessories.length > 0) {
            pages.push({
                type: 'accessories',
                title: '包装清单',
                data: accessories.slice(0, 6)
            });
        }

        if (dimensions.length > 0) {
            pages.push({
                type: 'dimensions',
                title: '尺寸规格',
                data: dimensions.slice(0, 4)
            });
        }

        if (p.description) {
            pages.push({
                type: 'description',
                title: '产品介绍',
                content: p.description
            });
        }

        return pages;
    }

    renderManualPage(pageIndex) {
        const product = this.getProduct();
        if (!product) return;

        const pages = this.getManualPages(product);
        if (pageIndex < 0 || pageIndex >= pages.length) return;

        const page = pages[pageIndex];
        const content = document.getElementById('previewContent');
        if (!content) return;

        content.innerHTML = this._renderManualPageHTML(page, pageIndex + 1, pages.length);

        document.getElementById('previewPageIndicator').textContent = `第 ${pageIndex + 1}/${pages.length} 页`;
        document.getElementById('prevPageBtn').style.display = pageIndex > 0 ? 'inline-block' : 'none';
        document.getElementById('nextPageBtn').style.display = pageIndex < pages.length - 1 ? 'inline-block' : 'none';
    }

    _renderManualPageHTML(page, pageNum, totalPages) {
        const bgColor = '#ffffff';
        const accentColor = '#1e40af';
        const textColor = '#333333';

        let pageContent = '';

        if (page.type === 'cover') {
            pageContent = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:40px;">
                    <div style="width:200px;height:200px;background:#f0f4f8;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:40px;">
                        <span style="font-size:80px;">📦</span>
                    </div>
                    <h1 style="font-size:42px;font-weight:700;color:${accentColor};margin:0 0 16px 0;">${escapeHtml(page.title)}</h1>
                    ${page.subtitle ? `<p style="font-size:22px;color:#666;margin:0 0 24px 0;">${escapeHtml(page.subtitle)}</p>` : ''}
                    ${page.price ? `<p style="font-size:28px;font-weight:600;color:#059669;margin:0;">${page.price}</p>` : ''}
                </div>
            `;
        } else if (page.type === 'highlights') {
            const cols = page.data.length <= 4 ? 2 : 3;
            pageContent = `
                <div style="padding:40px 30px;">
                    <h2 style="font-size:32px;font-weight:700;color:${accentColor};text-align:center;margin:0 0 40px 0;">${page.title}</h2>
                    <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:24px;">
                        ${page.data.map((h, i) => `
                            <div style="background:#f8fafc;padding:24px;border-radius:12px;text-align:center;">
                                <div style="font-size:36px;margin-bottom:12px;">${getHighlightIcon(i)}</div>
                                <div style="font-size:14px;color:#666;">${escapeHtml(h.highlight_key || '')}</div>
                                <div style="font-size:20px;font-weight:600;color:${accentColor};">${escapeHtml(h.highlight_value || '')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (page.type === 'features') {
            pageContent = `
                <div style="padding:40px 30px;">
                    <h2 style="font-size:32px;font-weight:700;color:${accentColor};text-align:center;margin:0 0 40px 0;">${page.title}</h2>
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px;">
                        ${page.data.map(f => `
                            <div style="background:linear-gradient(135deg,${accentColor},#3b82f6);color:#fff;padding:28px;border-radius:12px;">
                                <div style="font-size:32px;margin-bottom:12px;">${f.icon_emoji || '⭐'}</div>
                                <h3 style="font-size:18px;font-weight:600;margin:0 0 8px 0;">${escapeHtml(f.feature_title || '')}</h3>
                                <p style="font-size:14px;opacity:0.9;margin:0;line-height:1.5;">${escapeHtml(f.description || '')}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (page.type === 'specs') {
            pageContent = `
                <div style="padding:40px 30px;">
                    <h2 style="font-size:32px;font-weight:700;color:${accentColor};text-align:center;margin:0 0 40px 0;">${page.title}</h2>
                    <div style="background:#f8fafc;border-radius:12px;overflow:hidden;">
                        ${page.data.map((s, i) => `
                            <div style="display:flex;justify-content:space-between;padding:16px 20px;${i < page.data.length - 1 ? 'border-bottom:1px solid #e5e7eb;' : ''}">
                                <span style="font-size:16px;color:#666;">${escapeHtml(s.spec_label || '')}</span>
                                <span style="font-size:16px;font-weight:600;color:${textColor};">${escapeHtml(s.spec_value || '')} ${escapeHtml(s.spec_unit || '')}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (page.type === 'accessories') {
            pageContent = `
                <div style="padding:40px 30px;">
                    <h2 style="font-size:32px;font-weight:700;color:${accentColor};text-align:center;margin:0 0 40px 0;">${page.title}</h2>
                    <div style="display:flex;flex-direction:column;gap:16px;">
                        ${page.data.map(a => `
                            <div style="display:flex;align-items:center;gap:16px;background:#fff;border:1px solid #e5e7eb;padding:20px;border-radius:12px;">
                                <span style="font-size:40px;">📦</span>
                                <div style="flex:1;">
                                    <span style="font-size:18px;font-weight:500;color:${textColor};">${escapeHtml(a.accessory_name || '')}</span>
                                </div>
                                ${a.quantity ? `<span style="font-size:16px;color:#888;background:#f3f4f6;padding:4px 12px;border-radius:20px;">×${a.quantity}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (page.type === 'dimensions') {
            const col = page.data.length <= 2 ? 1 : 2;
            pageContent = `
                <div style="padding:40px 30px;">
                    <h2 style="font-size:32px;font-weight:700;color:${accentColor};text-align:center;margin:0 0 40px 0;">${page.title}</h2>
                    <div style="display:grid;grid-template-columns:repeat(${col},1fr);gap:20px;">
                        ${page.data.map(d => `
                            <div style="background:#f8fafc;padding:24px;border-radius:12px;text-align:center;">
                                <div style="font-size:14px;color:#666;margin-bottom:8px;">${escapeHtml(d.dim_label || '')}</div>
                                <div style="font-size:28px;font-weight:700;color:${accentColor};">${escapeHtml(d.dim_value || '')}</div>
                                <div style="font-size:14px;color:#888;">${escapeHtml(d.dim_unit || '')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (page.type === 'description') {
            pageContent = `
                <div style="padding:40px 30px;height:calc(100% - 100px);overflow:hidden;">
                    <h2 style="font-size:32px;font-weight:700;color:${accentColor};text-align:center;margin:0 0 30px 0;">${page.title}</h2>
                    <p style="font-size:18px;line-height:1.8;color:${textColor};text-align:justify;">${escapeHtml(page.content || '')}</p>
                </div>
            `;
        }

        return `
            <div class="manual-page-wrapper">
            <div class="manual-page" style="
                width: 100%;
                max-width: 540px;
                margin: 0 auto;
                aspect-ratio: 9 / 16;
                background: ${bgColor};
                display: flex;
                flex-direction: column;
                position: relative;
            ">
                <div class="manual-page-content" style="flex:1;overflow:hidden;">
                    ${pageContent}
                </div>
                <div style="
                    position: absolute;
                    bottom: 20px;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 14px;
                    color: #999;
                    padding: 0 30px;
                ">
                    <span style="color: ${accentColor}; font-weight: 600;">${pageNum} / ${totalPages}</span>
                </div>
            </div>
            <style>
                .manual-page { box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            </style>
            </div>
        `;
    }

    prevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.renderManualPage(this.currentPage);
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages - 1) {
            this.currentPage++;
            this.renderManualPage(this.currentPage);
        }
    }

    async exportManualPages(format) {
        const product = this.getProduct();
        if (!product) return;

        const pages = this.getManualPages(product);
        const productName = product?.name?.replace(/\s+/g, '-').toLowerCase() || 'product';
        const timestamp = new Date().toISOString().slice(0, 10);

        showToast(`正在导出 ${pages.length} 页...`);

        if (!window.html2canvas) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const canvases = [];

        for (let i = 0; i < pages.length; i++) {
            this.renderManualPage(i);
            await new Promise(resolve => setTimeout(resolve, 300));

            const content = document.getElementById('previewContent');
            const pageEl = content?.querySelector('.manual-page');

            if (pageEl) {
                const canvas = await html2canvas(pageEl, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff'
                });
                canvases.push(canvas);
            }

            showToast(`已导出第 ${i + 1}/${pages.length} 页`);
        }

        this.renderManualPage(this.currentPage);

        if (canvases.length > 0) {
            const pageWidth = 540;
            const pageHeight = 960;
            const totalHeight = canvases.length * pageHeight;
            const scale = 2;

            const mergedCanvas = document.createElement('canvas');
            mergedCanvas.width = pageWidth * scale;
            mergedCanvas.height = totalHeight * scale;
            const ctx = mergedCanvas.getContext('2d');

            canvases.forEach((canvas, i) => {
                ctx.drawImage(canvas, 0, i * pageHeight * scale, pageWidth * scale, pageHeight * scale);
            });

            const link = document.createElement('a');
            link.download = `${productName}-manual-${timestamp}.${format === 'jpg' ? 'jpg' : 'png'}`;
            link.href = mergedCanvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('导出成功！');
        }
    }

    async exportMainImagePages(format) {
        const product = this.getProduct();
        if (!product) return;

        const highlights = product.highlights || [];
        const productName = product?.name?.replace(/\s+/g, '-').toLowerCase() || 'product';
        const timestamp = new Date().toISOString().slice(0, 10);

        showToast('正在导出主图...');

        if (!window.html2canvas) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        // 加载产品图片
        const API_BASE = `${window.location.origin}/api`;
        let images = [];
        try {
            const resp = await fetch(`${API_BASE}/images/${product.id}/images`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            const data = await resp.json();
            images = data.images || [];
        } catch (err) {
            console.log('加载图片失败', err);
        }

        // 生成完整的主图模板
        const content = document.getElementById('previewContent');
        const originalHTML = content.innerHTML;
        const styleOptions = this.getMainImageStyle ? this.getMainImageStyle() : {};
        
        // 获取当前页码（从 previewManager 或全局状态）
        const currentPageIndex = window.app?.previewManager?.currentPage || 0;
        
        content.innerHTML = renderMainImageTemplate(product, images, { ...styleOptions, isExport: true });
        await new Promise(resolve => setTimeout(resolve, 300));

        // 找到所有页面
        const pages = content.querySelectorAll('.main-image-page');
        const targetPage = pages[currentPageIndex] || pages[0];
        
        if (!targetPage) {
            showToast('没有可导出的内容', 'error');
            content.innerHTML = originalHTML;
            return;
        }

        // 隐藏其他页面，显示目标页面
        pages.forEach(p => p.style.display = 'none');
        targetPage.style.display = '';
        targetPage.style.transform = 'none';
        targetPage.style.width = '1024px';
        targetPage.style.height = '1024px';

        // 确保内部样式正确应用
        const card = targetPage.querySelector('.main-image-card');
        if (card) {
            card.style.width = '100%';
            card.style.height = '100%';
            card.style.padding = '80px';
            card.style.boxSizing = 'border-box';
            
            // 应用文字大小和颜色
            const titleEl = card.querySelector('.main-image-big-title');
            if (titleEl) {
                titleEl.style.fontSize = (styleOptions.titleSize || 56) + 'px';
                titleEl.style.color = styleOptions.titleColor || '#ffffff';
                titleEl.style.fontWeight = styleOptions.titleBold !== false ? '900' : '600';
                titleEl.style.textShadow = styleOptions.textShadow !== false ? '0 4px 20px rgba(0,0,0,0.5)' : 'none';
                if (styleOptions.textStroke) {
                    titleEl.style.webkitTextStroke = '1.5px rgba(0,0,0,0.6)';
                    titleEl.style.paintOrder = 'stroke fill';
                }
            }
            
            const subtitleEl = card.querySelector('.main-image-small-title');
            if (subtitleEl) {
                subtitleEl.style.fontSize = (styleOptions.subtitleSize || 28) + 'px';
                subtitleEl.style.color = styleOptions.subtitleColor || 'rgba(255,255,255,0.85)';
                subtitleEl.style.textShadow = styleOptions.textShadow !== false ? '0 2px 10px rgba(0,0,0,0.5)' : 'none';
            }

            // 背景遮罩
            const overlay = card.querySelector('.main-image-overlay-dark');
            if (overlay) {
                overlay.style.display = styleOptions.bgOverlay ? '' : 'none';
            }

            // 文字背景面板
            const content = card.querySelector('.main-image-content');
            if (content) {
                if (styleOptions.textBg) {
                    content.classList.add('has-text-bg');
                } else {
                    content.classList.remove('has-text-bg');
                }
            }
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const canvas = await html2canvas(targetPage, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: 1024,
                height: 1024,
                logging: false,
                onclone: function(clonedDoc) {
                    // 在克隆的文档中再次确保样式正确
                    const clonedPage = clonedDoc.querySelector('.main-image-page');
                    if (clonedPage) {
                        clonedPage.style.transform = 'none';
                        clonedPage.style.width = '1024px';
                        clonedPage.style.height = '1024px';
                        
                        const clonedCard = clonedPage.querySelector('.main-image-card');
                        if (clonedCard) {
                            clonedCard.style.width = '100%';
                            clonedCard.style.height = '100%';
                            
                            const clonedTitle = clonedCard.querySelector('.main-image-big-title');
                            if (clonedTitle) {
                                clonedTitle.style.fontSize = (styleOptions.titleSize || 56) + 'px';
                                clonedTitle.style.color = styleOptions.titleColor || '#ffffff';
                                clonedTitle.style.fontWeight = styleOptions.titleBold !== false ? '900' : '600';
                                clonedTitle.style.textShadow = styleOptions.textShadow !== false ? '0 4px 20px rgba(0,0,0,0.5)' : 'none';
                                if (styleOptions.textStroke) {
                                    clonedTitle.style.webkitTextStroke = '1.5px rgba(0,0,0,0.6)';
                                    clonedTitle.style.paintOrder = 'stroke fill';
                                }
                            }
                            
                            const clonedSubtitle = clonedCard.querySelector('.main-image-small-title');
                            if (clonedSubtitle) {
                                clonedSubtitle.style.fontSize = (styleOptions.subtitleSize || 28) + 'px';
                                clonedSubtitle.style.color = styleOptions.subtitleColor || 'rgba(255,255,255,0.85)';
                                clonedSubtitle.style.textShadow = styleOptions.textShadow !== false ? '0 2px 10px rgba(0,0,0,0.5)' : 'none';
                            }

                            // 背景遮罩
                            const clonedOverlay = clonedCard.querySelector('.main-image-overlay-dark');
                            if (clonedOverlay) {
                                clonedOverlay.style.display = styleOptions.bgOverlay ? '' : 'none';
                            }

                            // 文字背景面板
                            const clonedContent = clonedCard.querySelector('.main-image-content');
                            if (clonedContent) {
                                if (styleOptions.textBg) {
                                    clonedContent.classList.add('has-text-bg');
                                } else {
                                    clonedContent.classList.remove('has-text-bg');
                                }
                            }
                        }
                    }
                }
            });

            // 恢复原始内容
            content.innerHTML = originalHTML;

            // 直接下载单张图片
            const link = document.createElement('a');
            link.download = `${productName}-main-${currentPageIndex + 1}-${timestamp}.${format === 'jpg' ? 'jpg' : 'png'}`;
            link.href = canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('导出成功！');
        } catch (err) {
            console.error('导出失败:', err);
            content.innerHTML = originalHTML;
            showToast('导出失败: ' + err.message, 'error');
        }
    }

    async exportPreview(format) {
        const content = document.getElementById('previewContent');
        if (!content) return;

        showToast('正在导出...');

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

            if (this.currentTemplate === 'manual' && this.totalPages > 1) {
                await this.exportManualPages(format);
                return;
            }

            if (this.currentTemplate === 'main-image') {
                await this.exportMainImagePages(format);
                return;
            }

            const scrollHeight = content.scrollHeight;
            const scrollWidth = content.scrollWidth;

            const tempContainer = document.createElement('div');
            tempContainer.style.cssText = `
                position: fixed;
                left: -9999px;
                top: 0;
                width: ${scrollWidth}px;
                height: ${scrollHeight + 100}px;
                background: #ffffff;
                z-index: -1;
            `;

            const clonedContent = content.cloneNode(true);
            clonedContent.style.cssText = `
                width: ${scrollWidth}px;
                height: ${scrollHeight + 100}px;
                overflow: visible;
            `;
            tempContainer.appendChild(clonedContent);
            document.body.appendChild(tempContainer);

            const images = tempContainer.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(tempContainer, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                x: 0,
                y: 0,
                width: scrollWidth,
                height: scrollHeight + 100,
                windowWidth: scrollWidth,
                windowHeight: scrollHeight + 150,
                scrollX: 0,
                scrollY: 0,
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedEl = clonedDoc.querySelector('[style*="position: fixed"]') || clonedDoc.body.firstChild;
                    if (clonedEl && clonedEl.style) {
                        clonedEl.style.position = 'absolute';
                        clonedEl.style.top = '0';
                        clonedEl.style.left = '0';
                    }
                }
            });

            document.body.removeChild(tempContainer);

            const link = document.createElement('a');
            const ts = new Date().toISOString().slice(0, 10);
            const productName = content.querySelector('.preview-title')?.textContent?.replace(/\s+/g, '-').toLowerCase() || content.querySelector('.main-image-title')?.textContent?.replace(/\s+/g, '-').toLowerCase() || 'product';

            if (format === 'jpg') {
                link.download = `${productName}-${ts}.jpg`;
                link.href = canvas.toDataURL('image/jpeg', 0.95);
            } else {
                link.download = `${productName}-${ts}.png`;
                link.href = canvas.toDataURL('image/png');
            }

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('导出成功');
        } catch (err) {
            console.error('导出失败:', err);
            showToast('导出失败: ' + err.message, 'error');
        }
    }

    _formatPrice(price, currency = 'USD') {
        const num = parseFloat(price);
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
    }
}

export { ExportManager };