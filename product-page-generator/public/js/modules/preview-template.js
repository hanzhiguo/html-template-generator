import { escapeHtml } from '../services/utils.js';
import { t } from '../core/i18n.js';

const getHighlightIcon = (index) => {
    const icons = ['✓', '★', '◆', '●', '▲', '♦'];
    return icons[index % icons.length];
};

const getFeatureIcon = (index) => {
    const icons = [
        '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        '<path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M12 3v9l4 4"/>',
        '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8V6a5 5 0 0110 0v2"/>',
        '<path d="M8 6v12M16 6v12M12 4v16"/><path d="M4 12h16"/>'
    ];
    return icons[index % icons.length];
};

const renderStyles = () => `
<style>
    .preview-page {
        max-width: 1200px;
        margin: 0 auto;
        background: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .preview-hero {
        display: flex;
        padding: 60px 80px;
        gap: 60px;
        align-items: center;
    }
    .preview-hero-content { flex: 1; }
    .preview-title {
        font-size: 56px;
        font-weight: 900;
        letter-spacing: -2px;
        line-height: 1.1;
        margin-bottom: 16px;
        color: #000;
    }
    .preview-subtitle {
        font-size: 22px;
        color: #1e40af;
        margin-bottom: 12px;
        font-weight: 600;
    }
    .preview-description {
        font-size: 20px;
        color: #555;
        margin-bottom: 32px;
        line-height: 1.5;
    }
    .preview-features-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
    }
    .preview-feature-item {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .preview-feature-icon {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
    }
    .preview-feature-icon svg {
        width: 100%;
        height: 100%;
    }
    .preview-feature-text {
        font-size: 16px;
        font-weight: 500;
        color: #333;
    }
    .preview-hero-image {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        background: #ffffff;
        border-radius: 8px;
    }
    .preview-hero-image img {
        max-width: 100%;
        max-height: 500px;
        object-fit: contain;
    }
    .preview-image-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
        gap: 8px;
    }
    .preview-image-placeholder span:first-child {
        font-size: 64px;
    }
    .preview-scene-section { padding: 0 80px 30px; }
    .preview-scene-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .preview-scene-item { 
        background: #f5f5f5; 
        border-radius: 12px; 
        aspect-ratio: 1/1; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        overflow: hidden;
    }
    .preview-scene-item img { width: 100%; height: 100%; object-fit: cover; }
    .preview-image-placeholder-small { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        color: #999; 
        font-size: 14px; 
        gap: 8px; 
    }
    .preview-image-placeholder-small span:first-child { font-size: 48px; }
    .preview-feature-card-image { 
        width: 100%; 
        aspect-ratio: 1; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 48px; 
        background: #f5f5f5;
        position: relative;
        overflow: hidden;
    }
    .preview-feature-card-image img { 
        width: 100%; 
        height: 100%; 
        object-fit: cover; 
        position: absolute;
        top: 0;
        left: 0;
    }
    .preview-image-placeholder-card { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        color: #999; 
        font-size: 12px; 
        gap: 4px; 
        z-index: 1;
    }
    .preview-image-placeholder-card span:first-child { font-size: 36px; }
    .preview-dimensions-layout { display: flex; gap: 40px; align-items: flex-start; }
    .preview-dimensions-image { 
        width: 50%; 
        flex-shrink: 0; 
        background: #f5f5f5; 
        border-radius: 8px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        min-height: 400px;
    }
    .preview-dimensions-image img { max-width: 100%; max-height: 400px; object-fit: contain; }
    .preview-dimensions-grid { display: flex; flex-direction: column; gap: 12px; flex: 1; }
    .preview-image-placeholder-dim { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        color: #999; 
        font-size: 14px; 
        gap: 8px; 
    }
    .preview-image-placeholder-dim span:first-child { font-size: 48px; }
    .preview-image-placeholder-pkg { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        color: #999; 
        font-size: 14px; 
        gap: 8px; 
    }
    .preview-image-placeholder-pkg span:first-child { font-size: 48px; }
    .preview-section-title {
        text-align: center;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 3px;
        margin: 50px 0 35px;
        color: #1e40af;
    }
    .preview-features-section {
        padding: 0 80px 50px;
    }
    .preview-features-cards {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
    }
    .preview-feature-card {
        background: #fafafa;
        border-radius: 8px;
        overflow: hidden;
    }
    .preview-feature-card-content {
        padding: 20px;
    }
    .preview-feature-card-title {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #1e40af;
    }
    .preview-feature-card-description {
        font-size: 14px;
        color: #666;
        line-height: 1.5;
    }
    .preview-specs-section { padding: 0 80px 50px; }
    .preview-specs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .preview-spec-item { display: flex; justify-content: space-between; padding: 16px 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #1e40af; }
    .preview-dimensions-section { padding: 0 80px 50px; }
    .preview-dim-item { display: flex; justify-content: space-between; padding: 16px 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #059669; }
    .preview-accessories-section { padding: 0 80px 50px; }
    .preview-accessories-layout { display: flex; flex-direction: column; gap: 30px; align-items: stretch; }
    .preview-accessories-image { 
        width: 100%; 
        background: #f5f5f5; 
        border-radius: 8px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        min-height: 500px;
    }
    .preview-accessories-image img { width: 100%; height: auto; object-fit: cover; }
    .preview-accessories-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .preview-accessory-item { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: #f8fafc; border-radius: 8px; }
    .preview-accessory-icon { font-size: 20px; }
    .preview-accessory-name { font-size: 14px; color: #333; flex: 1; }
    .preview-accessory-qty { font-size: 14px; color: #1e40af; font-weight: 600; background: #eff6ff; padding: 2px 8px; border-radius: 4px; }
    .preview-footer { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 50px 80px; margin-top: 20px; }
    .preview-highlights-section { max-width: 900px; margin: 0 auto; }
    .preview-highlights-title { color: #fff; font-size: 18px; font-weight: 600; margin-bottom: 24px; letter-spacing: 2px; }
    .preview-highlights-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .preview-highlight-item { display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.1); padding: 16px 20px; border-radius: 8px; }
    .preview-highlight-icon { font-size: 24px; color: #fbbf24; }
    .preview-highlight-content { display: flex; flex-direction: column; gap: 4px; }
    .preview-highlight-key { font-size: 14px; color: rgba(255,255,255,0.8); }
    .preview-highlight-value { font-size: 16px; color: #fff; font-weight: 600; }
    /* 主图模板样式 */
    .main-image-container {
        width: 800px;
        height: 800px;
        max-width: 100%;
        position: relative;
        overflow: hidden;
        background: #f5f5f5;
    }
    .main-image-bg {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
    .main-image-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 60px 50px;
        background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.3) 80%, transparent 100%);
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .main-image-title-bg {
        background: linear-gradient(135deg, rgba(30,64,175,0.95) 0%, rgba(59,130,246,0.9) 100%);
        padding: 20px 30px;
        border-radius: 16px;
        display: inline-block;
        align-self: flex-start;
        max-width: 90%;
        box-shadow: 0 8px 32px rgba(30,64,175,0.4);
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255,255,255,0.3);
    }
    .main-image-title {
        font-size: 36px;
        font-weight: 800;
        color: #fff;
        letter-spacing: -1px;
        line-height: 1.2;
        text-shadow: 2px 2px 8px rgba(0,0,0,0.3);
    }
    .main-image-subtitle-bg {
        background: rgba(255,255,255,0.95);
        padding: 14px 24px;
        border-radius: 12px;
        display: inline-block;
        align-self: flex-start;
        max-width: 80%;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        border-left: 4px solid #1e40af;
    }
    .main-image-subtitle {
        font-size: 20px;
        font-weight: 600;
        color: #1e40af;
    }
    .main-image-highlights {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 8px;
    }
    .main-image-highlight-badge {
        background: rgba(255,255,255,0.95);
        padding: 10px 18px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        border: 1px solid rgba(30,64,175,0.2);
    }
    .main-image-highlight-key {
        font-size: 13px;
        color: #666;
    }
    .main-image-highlight-value {
        font-size: 15px;
        font-weight: 700;
        color: #1e40af;
    }
    .main-image-highlight-icon {
        width: 20px;
        height: 20px;
        background: #1e40af;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 12px;
    }
    .main-image-price {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        padding: 12px 24px;
        border-radius: 12px;
        display: inline-block;
        align-self: flex-start;
        margin-top: 8px;
        box-shadow: 0 4px 16px rgba(5,150,105,0.4);
    }
    .main-image-price-value {
        font-size: 28px;
        font-weight: 800;
        color: #fff;
        text-shadow: 1px 1px 4px rgba(0,0,0,0.2);
    }
    .main-image-brand {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255,255,255,0.95);
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #1e40af;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .main-image-logo {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 60px;
        height: 60px;
        background: rgba(30,64,175,0.9);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 28px;
        box-shadow: 0 4px 16px rgba(30,64,175,0.4);
    }
</style>`;

const renderProductPreview = (product, templateType = 'detail', pageNum = 0, lang = 'zh') => {
    const p = product;
    const highlights = p.highlights || [];
    const specs = p.specs || [];
    const features = p.features || [];
    const dimensions = p.dimensions || [];
    const accessories = p.accessories || [];

    const quickFeatures = highlights.slice(0, 4);
    const featureCards = features.slice(0, 4);
    const priceDisplay = p.price ? `$${parseFloat(p.price).toFixed(2)}` : '';

    return `
    <div class="preview-page">
        <div class="preview-hero">
            <div class="preview-hero-content">
                <h1 class="preview-title">${escapeHtml(p.name || '产品名称')}</h1>
                <p class="preview-subtitle">${escapeHtml(p.subtitle || '')}</p>
                ${priceDisplay ? `<p class="preview-price">${priceDisplay}</p>` : ''}
                <p class="preview-description">${escapeHtml(p.description || '')}</p>

                <div class="preview-features-grid">
                    ${quickFeatures.map((h, i) => `
                        <div class="preview-feature-item">
                            <div class="preview-feature-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2">
                                    ${getFeatureIcon(i)}
                                </svg>
                            </div>
                            <div class="preview-feature-text">${escapeHtml(h.highlight_key || '')}<br><strong>${escapeHtml(h.highlight_value || '')}</strong></div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="preview-hero-image">
                <img id="previewMainImage" src="/placeholder.png" alt="${escapeHtml(p.name)}" onerror="this.style.display='none'">
                <div id="previewImagePlaceholder" class="preview-image-placeholder">
                    <span>📷</span>
                    <span>主图（白底）</span>
                </div>
            </div>
        </div>

        <div class="preview-scene-section">
            <h2 class="preview-section-title">产品场景</h2>
            <div class="preview-scene-grid">
                <div class="preview-scene-item">
                    <img id="previewSceneImage1" src="/placeholder.png" alt="场景图1" onerror="this.style.display='none'">
                    <div id="previewScenePlaceholder1" class="preview-image-placeholder-small">
                        <span>🏞️</span>
                        <span>场景图 1</span>
                    </div>
                </div>
                <div class="preview-scene-item">
                    <img id="previewSceneImage2" src="/placeholder.png" alt="场景图2" onerror="this.style.display='none'">
                    <div id="previewScenePlaceholder2" class="preview-image-placeholder-small">
                        <span>🏞️</span>
                        <span>场景图 2</span>
                    </div>
                </div>
            </div>
        </div>

        ${featureCards.length > 0 ? `
        <h2 class="preview-section-title">${t(lang, 'features')}</h2>
        <div class="preview-features-section">
            <div class="preview-features-cards">
                ${featureCards.map((f, i) => `
                    <div class="preview-feature-card">
                        <div class="preview-feature-card-image" id="previewDetailImageContainer${i+1}">
                            <img id="previewDetailImage${i+1}" src="/placeholder.png" alt="细节图${i+1}" onerror="this.style.display='none'">
                            <div id="previewDetailPlaceholder${i+1}" class="preview-image-placeholder-card">
                                <span>${f.icon_emoji || '⭐'}</span>
                                <span>细节图 ${i+1}</span>
                            </div>
                        </div>
                        <div class="preview-feature-card-content">
                            <h4 class="preview-feature-card-title">${escapeHtml(f.feature_title || f.feature_name || '功能')}</h4>
                            <p class="preview-feature-card-description">${escapeHtml(f.description || '')}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${specs.length > 0 ? `
        <h2 class="preview-section-title">${t(lang, 'specifications')}</h2>
        <div class="preview-specs-section">
            <div class="preview-specs-grid">
                ${specs.map(s => `
                    <div class="preview-spec-item">
                        <span class="preview-spec-label">${escapeHtml(s.spec_label || s.spec_name || '规格')}</span>
                        <span class="preview-spec-value">${escapeHtml(s.spec_value || '')} ${escapeHtml(s.spec_unit || '')}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${dimensions.length > 0 ? `
        <h2 class="preview-section-title">${t(lang, 'dimensions')}</h2>
        <div class="preview-dimensions-section">
            <div class="preview-dimensions-layout">
                <div class="preview-dimensions-image">
                    <img id="previewDimensionImage" src="/placeholder.png" alt="尺寸图" onerror="this.style.display='none'">
                    <div id="previewDimPlaceholder" class="preview-image-placeholder-dim">
                        <span>📐</span>
                        <span>尺寸图</span>
                    </div>
                </div>
                <div class="preview-dimensions-grid">
                    ${dimensions.map(d => `
                        <div class="preview-dim-item">
                            <span class="preview-dim-label">${escapeHtml(d.dim_label || d.dim_name || '')}</span>
                            <span class="preview-dim-value">${escapeHtml(d.dim_value || '')} ${escapeHtml(d.dim_unit || '')}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        ` : ''}

        ${accessories.length > 0 ? `
        <h2 class="preview-section-title">${t(lang, 'package-includes')}</h2>
        <div class="preview-accessories-section">
            <div class="preview-accessories-layout">
                <div class="preview-accessories-image">
                    <img id="previewPackageImage" src="/placeholder.png" alt="包装清单图" onerror="this.style.display='none'">
                    <div id="previewPackagePlaceholder" class="preview-image-placeholder-pkg">
                        <span>📦</span>
                        <span>包装清单图</span>
                    </div>
                </div>
                <div class="preview-accessories-list">
                    ${accessories.map(a => `
                        <div class="preview-accessory-item">
                            <span class="preview-accessory-icon">✓</span>
                            <span class="preview-accessory-name">${escapeHtml(a.accessory_name || '')}</span>
                            ${a.quantity ? `<span class="preview-accessory-qty">×${a.quantity}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        ` : ''}

        <div class="preview-footer">
            <div class="preview-highlights-section">
                <h3 class="preview-highlights-title">${t(lang, 'key-highlights')}</h3>
                <div class="preview-highlights-grid">
                    ${highlights.map((h, i) => `
                        <div class="preview-highlight-item">
                            <div class="preview-highlight-icon">${getHighlightIcon(i)}</div>
                            <div class="preview-highlight-content">
                                <span class="preview-highlight-key">${escapeHtml(h.highlight_key || '')}</span>
                                <span class="preview-highlight-value">${escapeHtml(h.highlight_value || '')}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
    ${renderStyles()}`;
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
    
    /* 文字背景面板 */
    .has-text-bg {
        padding: 30px 40px;
    }
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

export { renderProductPreview, getHighlightIcon, getFeatureIcon, renderStyles, renderMainImageTemplate };