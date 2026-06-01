import { renderProductPreview } from './preview-template.js';
import { translationManager } from './translation.js';
import { t } from '../core/i18n.js';
import { renderMainImageTemplate } from './preview-template.js';

class PreviewManager {
    constructor(getToken) {
        this.getToken = getToken;
        this.currentProduct = null;
        this.originalProduct = null;
        this.currentTemplate = 'detail';
        this.currentPage = 0;
        this.totalPages = 1;
        this.previewLang = 'zh';
        this.mainImageStyle = {
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
        };
    }

    open(product) {
        this.originalProduct = JSON.parse(JSON.stringify(product));
        this.currentProduct = product;
        this.currentTemplate = 'detail';
        this.currentPage = 0;
        this.totalPages = 1;
        this.previewLang = 'zh';

        const modal = document.getElementById('previewModal');
        const content = document.getElementById('previewContent');
        const title = document.getElementById('previewTitle');

        title.textContent = product.name || t(this.previewLang, 'preview-title');

        const templateSelect = document.getElementById('templateType');
        if (templateSelect) templateSelect.value = 'detail';

        const langSelect = document.getElementById('previewLang');
        if (langSelect) langSelect.value = 'zh';

        document.getElementById('prevPageBtn').style.display = 'none';
        document.getElementById('nextPageBtn').style.display = 'none';
        document.getElementById('previewPageIndicator').textContent = '第 1/1 页';

        this.hideMainImageSettings();

        content.innerHTML = renderProductPreview(product, 'detail', 0, this.previewLang);
        modal.classList.add('active');

        this.loadImages(product.id);
    }

    close() {
        document.getElementById('previewModal')?.classList.remove('active');
        this.hideMainImageSettings();
    }

    render() {
        const content = document.getElementById('previewContent');
        content.innerHTML = renderProductPreview(
            this.currentProduct, 
            this.currentTemplate, 
            this.currentPage, 
            this.previewLang
        );
        this.loadImages(this.currentProduct.id);
    }

    async loadImages(productId) {
        const API_BASE = `${window.location.origin}/api`;
        try {
            const resp = await fetch(`${API_BASE}/images/${productId}/images`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            const data = await resp.json();
            const images = data.images || [];
            this.loadedImages = images;

            const mainImage = images.find(i => i.image_type === 'main');
            if (mainImage) {
                const img = document.getElementById('previewMainImage');
                if (img) {
                    img.src = mainImage.image_url;
                    img.style.display = 'block';
                    const placeholder = document.getElementById('previewImagePlaceholder');
                    if (placeholder) placeholder.style.display = 'none';
                }
            }

            const sceneImages = images.filter(i => i.image_type === 'scene1' || i.image_type === 'scene2');
            sceneImages.slice(0, 2).forEach((sceneImg, index) => {
                const img = document.getElementById(`previewSceneImage${index + 1}`);
                if (img) {
                    img.src = sceneImg.image_url;
                    img.style.display = 'block';
                    const placeholder = document.getElementById(`previewScenePlaceholder${index + 1}`);
                    if (placeholder) placeholder.style.display = 'none';
                }
            });

            let detailImages = images.filter(i =>
                i.image_type === 'detail1' || i.image_type === 'detail2' ||
                i.image_type === 'detail3' || i.image_type === 'detail4'
            );

            if (detailImages.length === 0) {
                detailImages = images.filter(i => i.image_type === 'detail');
            }

            detailImages.slice(0, 4).forEach((detailImg, index) => {
                const img = document.getElementById(`previewDetailImage${index + 1}`);
                if (img) {
                    img.src = detailImg.image_url;
                    img.style.display = 'block';
                    const placeholder = document.getElementById(`previewDetailPlaceholder${index + 1}`);
                    if (placeholder) placeholder.style.display = 'none';
                }
            });

            const dimImage = images.find(i => i.image_type === 'dimension');
            if (dimImage) {
                const img = document.getElementById('previewDimensionImage');
                if (img) {
                    img.src = dimImage.image_url;
                    img.style.display = 'block';
                    const placeholder = document.getElementById('previewDimPlaceholder');
                    if (placeholder) placeholder.style.display = 'none';
                }
            }

            const packageImage = images.find(i => i.image_type === 'package');
            if (packageImage) {
                const img = document.getElementById('previewPackageImage');
                if (img) {
                    img.src = packageImage.image_url;
                    img.style.display = 'block';
                    const placeholder = document.getElementById('previewPackagePlaceholder');
                    if (placeholder) placeholder.style.display = 'none';
                }
            }
        } catch (err) {
            console.log('加载预览图片失败', err);
        }
    }

    setLang(lang) {
        this.previewLang = lang;
    }

    getLang() {
        return this.previewLang;
    }

    getProduct() {
        return this.currentProduct;
    }

    setProduct(product) {
        this.currentProduct = product;
    }

    getOriginalProduct() {
        return this.originalProduct;
    }

    showMainImageSettings() {
        const settings = document.getElementById('mainImageSettings');
        if (settings) {
            settings.style.display = 'block';
            this.syncSettingsUI();
        }
    }

    hideMainImageSettings() {
        const settings = document.getElementById('mainImageSettings');
        if (settings) settings.style.display = 'none';
    }

    syncSettingsUI() {
        const titleColorInput = document.getElementById('mainImageTitleColor');
        const subtitleColorInput = document.getElementById('mainImageSubtitleColor');
        const titleSizeInput = document.getElementById('mainImageTitleSize');
        const titleSizeValue = document.getElementById('titleSizeValue');
        const subtitleSizeInput = document.getElementById('mainImageSubtitleSize');
        const subtitleSizeValue = document.getElementById('subtitleSizeValue');
        const bgColorInput = document.getElementById('mainImageBgColor');

        if (titleColorInput) titleColorInput.value = this.mainImageStyle.titleColor;
        if (subtitleColorInput) subtitleColorInput.value = this.mainImageStyle.subtitleColor;
        if (titleSizeInput) titleSizeInput.value = this.mainImageStyle.titleSize;
        if (titleSizeValue) titleSizeValue.textContent = this.mainImageStyle.titleSize + 'px';
        if (subtitleSizeInput) subtitleSizeInput.value = this.mainImageStyle.subtitleSize;
        if (subtitleSizeValue) subtitleSizeValue.textContent = this.mainImageStyle.subtitleSize + 'px';
        if (bgColorInput) bgColorInput.value = this.mainImageStyle.bgColor;

        document.querySelectorAll('.pos-btn[data-position]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.position === this.mainImageStyle.position);
        });
        document.querySelectorAll('.pos-btn[data-vposition]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.vposition === this.mainImageStyle.vposition);
        });

        document.querySelectorAll('.color-preset').forEach(btn => {
            const isActive = btn.dataset.color === this.mainImageStyle[btn.dataset.target + 'Color'];
            btn.classList.toggle('active', isActive);
        });

        document.querySelectorAll('.toggle-btn[data-key]').forEach(btn => {
            btn.classList.toggle('active', !!this.mainImageStyle[btn.dataset.key]);
        });

        document.querySelectorAll('.bg-color-preset[data-bg-color]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bgColor === this.mainImageStyle.bgColor);
        });

        document.querySelectorAll('.overlay-btn[data-overlay]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.overlay === this.mainImageStyle.overlayType);
        });

        document.querySelectorAll('.layout-btn[data-layout]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layout === this.mainImageStyle.layoutStyle);
        });
    }

    toggleStyle(key) {
        this.mainImageStyle[key] = !this.mainImageStyle[key];
        document.querySelectorAll('.toggle-btn[data-key="' + key + '"]').forEach(btn => {
            btn.classList.toggle('active', !!this.mainImageStyle[key]);
        });
        this.renderMainImage();
    }

    setPresetColor(target, color) {
        this.mainImageStyle[target + 'Color'] = color;
        const input = document.getElementById('mainImage' + target.charAt(0).toUpperCase() + target.slice(1) + 'Color');
        if (input) input.value = color;
        
        document.querySelectorAll(`.color-preset[data-target="${target}"]`).forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === color);
        });
        
        this.renderMainImage();
    }

    setCustomColor(target, color) {
        this.mainImageStyle[target + 'Color'] = color;
        
        document.querySelectorAll(`.color-preset[data-target="${target}"]`).forEach(btn => {
            btn.classList.remove('active');
        });
        
        this.renderMainImage();
    }

    setTitleSize(size) {
        this.mainImageStyle.titleSize = parseInt(size);
        const titleSizeValue = document.getElementById('titleSizeValue');
        if (titleSizeValue) titleSizeValue.textContent = size + 'px';
        this.renderMainImage();
    }

    setSubtitleSize(size) {
        this.mainImageStyle.subtitleSize = parseInt(size);
        const subtitleSizeValue = document.getElementById('subtitleSizeValue');
        if (subtitleSizeValue) subtitleSizeValue.textContent = size + 'px';
        this.renderMainImage();
    }

    toggleTextShadow(enabled) {
        this.mainImageStyle.textShadow = enabled;
        this.renderMainImage();
    }

    toggleTextStroke(enabled) {
        this.mainImageStyle.textStroke = enabled;
        this.renderMainImage();
    }

    toggleTitleBold(enabled) {
        this.mainImageStyle.titleBold = enabled;
        this.renderMainImage();
    }

    toggleBgOverlay(enabled) {
        this.mainImageStyle.bgOverlay = enabled;
        this.renderMainImage();
    }

    toggleTextBg(enabled) {
        this.mainImageStyle.textBg = enabled;
        this.renderMainImage();
    }

    updateMainImageStyle() {
        const titleColorInput = document.getElementById('mainImageTitleColor');
        const subtitleColorInput = document.getElementById('mainImageSubtitleColor');
        const titleSizeInput = document.getElementById('mainImageTitleSize');

        if (titleColorInput) this.mainImageStyle.titleColor = titleColorInput.value;
        if (subtitleColorInput) this.mainImageStyle.subtitleColor = subtitleColorInput.value;
        if (titleSizeInput) {
            this.mainImageStyle.titleSize = parseInt(titleSizeInput.value);
        }

        this.renderMainImage();
    }

    setMainImagePosition(position) {
        this.mainImageStyle.position = position;
        document.querySelectorAll('.pos-btn[data-position]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.position === position);
        });
        this.renderMainImage();
    }

    setMainImageVPosition(vposition) {
        this.mainImageStyle.vposition = vposition;
        document.querySelectorAll('.pos-btn[data-vposition]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.vposition === vposition);
        });
        this.renderMainImage();
    }

    renderMainImage() {
        const content = document.getElementById('previewContent');
        content.innerHTML = renderMainImageTemplate(
            this.currentProduct, 
            this.loadedImages || [], 
            this.mainImageStyle
        );
        this.updateMainImagePage();
    }

    setBgColor(color) {
        this.mainImageStyle.bgColor = color;
        const input = document.getElementById('mainImageBgColor');
        if (input) input.value = color;
        document.querySelectorAll('.bg-color-preset[data-bg-color]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bgColor === color);
        });
        this.renderMainImage();
    }

    setOverlayType(type) {
        this.mainImageStyle.overlayType = type;
        document.querySelectorAll('.overlay-btn[data-overlay]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.overlay === type);
        });
        this.renderMainImage();
    }

    setLayoutStyle(style) {
        this.mainImageStyle.layoutStyle = style;
        document.querySelectorAll('.layout-btn[data-layout]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layout === style);
        });
        this.renderMainImage();
    }

    switchTemplate(templateType) {
        this.currentTemplate = templateType;
        this.currentPage = 0;

        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageIndicator = document.getElementById('previewPageIndicator');
        const content = document.getElementById('previewContent');

        if (templateType === 'main-image') {
            const highlights = this.currentProduct?.highlights || [];
            this.totalPages = 1 + highlights.length;
            prevBtn.style.display = this.totalPages > 1 ? '' : 'none';
            nextBtn.style.display = this.totalPages > 1 ? '' : 'none';
            pageIndicator.textContent = `第 ${this.currentPage + 1}/${this.totalPages} 页`;
            this.showMainImageSettings();
            this.renderMainImage();
        } else if (templateType === 'manual') {
            this.hideMainImageSettings();
            const pages = this.exportManager?.getManualPages(this.currentProduct) || [];
            this.totalPages = pages.length;
            prevBtn.style.display = this.totalPages > 1 ? '' : 'none';
            nextBtn.style.display = this.totalPages > 1 ? '' : 'none';
            pageIndicator.textContent = `第 ${this.currentPage + 1}/${this.totalPages} 页`;
            this.exportManager?.renderManualPage(0);
        } else {
            this.hideMainImageSettings();
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            pageIndicator.textContent = '第 1/1 页';
            this.render();
        }
    }

    async loadMainImagesForTemplate() {
        const pages = document.querySelectorAll('.main-image-page');
        const mainImg = this.loadedImages?.find(i => i.image_type === 'main');
        const sceneImgs = this.loadedImages?.filter(i => i.image_type?.startsWith('scene')) || [];
        const detailImgs = this.loadedImages?.filter(i => i.image_type?.startsWith('detail')) || [];
        const allBgImgs = [...(mainImg ? [mainImg] : []), ...sceneImgs, ...detailImgs];

        pages.forEach((page, i) => {
            const card = page.querySelector('.main-image-card');
            if (card) {
                const bgImg = allBgImgs[i] || allBgImgs[i % (allBgImgs.length || 1)];
                if (bgImg?.image_url) {
                    card.style.backgroundImage = `url('${bgImg.image_url}')`;
                    card.style.backgroundSize = 'cover';
                    card.style.backgroundPosition = 'center';
                }
            }
        });
    }

    async loadMainImage() {
        const API_BASE = `${window.location.origin}/api`;
        try {
            const resp = await fetch(`${API_BASE}/images/${this.currentProduct.id}/images`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            const data = await resp.json();
            const images = data.images || [];
            const mainImage = images.find(i => i.image_type === 'main');
            if (mainImage) {
                const coverCard = document.querySelector('.main-image-page[data-page="cover"] .main-image-card');
                if (coverCard) {
                    coverCard.style.backgroundImage = `url(${mainImage.image_url})`;
                    coverCard.style.backgroundSize = 'cover';
                    coverCard.style.backgroundPosition = 'center';
                }
            }
        } catch (err) {
            console.log('加载主图失败', err);
        }
    }

    setExportManager(exportManager) {
        this.exportManager = exportManager;
    }

    prevPage() {
        if (this.currentTemplate === 'main-image') {
            if (this.currentPage > 0) {
                this.currentPage--;
                this.updateMainImagePage();
            }
        } else if (this.currentTemplate === 'manual' && this.exportManager) {
            this.exportManager.prevPage();
        }
    }

    nextPage() {
        if (this.currentTemplate === 'main-image') {
            if (this.currentPage < this.totalPages - 1) {
                this.currentPage++;
                this.updateMainImagePage();
            }
        } else if (this.currentTemplate === 'manual' && this.exportManager) {
            this.exportManager.nextPage();
        }
    }

    updateMainImagePage() {
        const pages = document.querySelectorAll('.main-image-page');
        const pageIndicator = document.getElementById('previewPageIndicator');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        pages.forEach((page, i) => {
            page.style.display = i === this.currentPage ? '' : 'none';
        });

        pageIndicator.textContent = `第 ${this.currentPage + 1}/${this.totalPages} 页`;
        prevBtn.style.display = this.currentPage > 0 ? '' : 'none';
        nextBtn.style.display = this.currentPage < this.totalPages - 1 ? '' : 'none';
    }
}

export { PreviewManager };