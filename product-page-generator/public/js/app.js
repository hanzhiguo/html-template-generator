/**
 * 应用入口文件
 * 参考 Novel Board AI 的架构设计
 */

import { showToast } from './services/utils.js';
import { appState } from './stores/appState.js';
import { router } from '../core/router.js';
import { AppBase } from './core/AppBase.js';
import { translationManager } from './modules/translation.js';
import { PreviewManager } from './modules/preview.js';
import { ExportManager } from './modules/export.js';
import { AgentManager } from './modules/agent.js';
import { DataManager } from './modules/data-manager.js';
import { CsvManager } from './modules/csv-manager.js';
import { AttachmentManager } from './modules/attachments.js';
import { IconManager } from './modules/icons.js';
import { ImageRecognitionManager } from './modules/image-recognition.js';
import { ProductManager } from './modules/product-manager.js';
import { SettingsManager } from './modules/settings-manager.js';

class App extends AppBase {
    constructor() {
        super();
        this.previewManager = new PreviewManager(() => this.token);
        this.exportManager = new ExportManager(() => this.previewManager.getProduct(), () => this.token);
        this.previewManager.setExportManager(this.exportManager);
        this.exportManager.setMainImageStyleGetter(() => this.previewManager.mainImageStyle);
        this.agentManager = new AgentManager(() => this.token);
        this.dataManager = new DataManager(() => this.token);
        this.csvManager = new CsvManager(() => this.token);
        this.attachmentManager = new AttachmentManager(() => this.token);
        this.iconManager = new IconManager(() => this.token);
        this.imageRecognitionManager = new ImageRecognitionManager(() => this.token);
        this.productManager = new ProductManager(() => this.token, this.dataManager, this.previewManager);
        this.settingsManager = new SettingsManager(() => this.token);
    }

    async switchPreviewLanguage(lang) {
        if (lang === this.previewLang) return;
        
        const previousLang = this.previewLang;
        this.previewLang = lang;
        this.previewManager.setLang(lang);
        translationManager.setLang(lang);
        
        if (!this.previewManager.getProduct()) return;

        if (lang === 'zh') {
            this.previewManager.setProduct(this.previewManager.getOriginalProduct());
            this.previewManager.render();
            return;
        }

        translationManager.showLoading(true);

        try {
            const translatedProduct = await translationManager.translate(
                this.previewManager.getProduct(), 
                lang, 
                this.previewManager.getOriginalProduct()
            );
            this.previewManager.setProduct(translatedProduct);
            this.previewManager.render();
        } catch (err) {
            console.error('翻译失败:', err);
            showToast('翻译失败: ' + err.message, 'error');
            this.previewLang = previousLang;
            document.getElementById('previewLang').value = previousLang;
        } finally {
            translationManager.showLoading(false);
        }
    }

    renderCurrentProduct() {
        this.previewManager.render();
    }

    async switchTab(tab) {
        const tabButtons = document.querySelectorAll('.tab');
        const tabMap = ['products', 'image-to-product', 'attachments', 'agent', 'settings'];
        tabButtons.forEach((t, i) => {
            t.classList.toggle('active', tabMap[i] === tab);
        });

        await router.loadPage(tab);
        appState.setCurrentTab(tab);

        if (tab === 'products') {
            this.loadProducts();
        }

        if (tab === 'agent') {
            this.loadAgentTools();
            this.loadKBStats();
            this.loadConversations();
        }

        if (tab === 'settings') {
            this.loadSettings();
        }

        if (tab === 'attachments') {
            this.loadImagesProducts();
        }
    }

    // 产品CRUD方法 - 委托给 productManager
    async viewProduct(id) { await this.productManager.viewProduct(id); }
    async editProduct(id) { await this.productManager.editProduct(id); }
    async deleteProduct(id) { await this.productManager.deleteProduct(id); }
    async handleProductSubmit(e) { await this.productManager.handleProductSubmit(e); }

    // 预览方法 - 委托给 previewManager
    openPreview(product) { this.previewManager.open(product); }
    switchTemplate(templateType) { this.previewManager.switchTemplate(templateType); }
    closePreview() { this.previewManager.close(); }
    updateMainImageStyle() { this.previewManager.updateMainImageStyle(); }
    setMainImagePosition(position) { this.previewManager.setMainImagePosition(position); }
    setMainImageVPosition(vposition) { this.previewManager.setMainImageVPosition(vposition); }
    setPresetColor(target, color) { this.previewManager.setPresetColor(target, color); }
    setCustomColor(target, color) { this.previewManager.setCustomColor(target, color); }
    setTitleSize(size) { this.previewManager.setTitleSize(size); }
    setSubtitleSize(size) { this.previewManager.setSubtitleSize(size); }
    toggleTextShadow(enabled) { this.previewManager.toggleTextShadow(enabled); }
    toggleTextStroke(enabled) { this.previewManager.toggleTextStroke(enabled); }
    toggleTitleBold(enabled) { this.previewManager.toggleTitleBold(enabled); }
    toggleBgOverlay(enabled) { this.previewManager.toggleBgOverlay(enabled); }
    toggleTextBg(enabled) { this.previewManager.toggleTextBg(enabled); }
    toggleStyle(key) { this.previewManager.toggleStyle(key); }
    setBgColor(color) { this.previewManager.setBgColor(color); }
    setOverlayType(type) { this.previewManager.setOverlayType(type); }
    setLayoutStyle(style) { this.previewManager.setLayoutStyle(style); }
    renderMainImage() { this.previewManager.renderMainImage(); }

    // 导出方法 - 委托给 exportManager
    get currentTemplate() { return this.previewManager?.currentTemplate || this._currentTemplate; }
    set currentTemplate(v) { 
        if (this.previewManager) {
            this.previewManager.currentTemplate = v; 
        } else {
            this._currentTemplate = v;
        }
    }
    get currentPage() { return this.previewManager?.currentPage || this._currentPage; }
    set currentPage(v) { 
        if (this.previewManager) {
            this.previewManager.currentPage = v; 
        } else {
            this._currentPage = v;
        }
    }
    get totalPages() { return this.previewManager?.totalPages || this._totalPages; }
    set totalPages(v) { 
        if (this.previewManager) {
            this.previewManager.totalPages = v; 
        } else {
            this._totalPages = v;
        }
    }

    getManualPages(product) { return this.exportManager.getManualPages(product); }
    renderManualPage(pageIndex) { this.exportManager.renderManualPage(pageIndex); }
    prevPage() {
        this.previewManager.prevPage();
    }
    nextPage() {
        this.previewManager.nextPage();
    }
    async exportManualPages(format) {
        this.exportManager.setTemplate(this.currentTemplate);
        this.exportManager.setCurrentPage(this.currentPage);
        this.exportManager.setTotalPages(this.totalPages);
        await this.exportManager.exportManualPages(format);
        this.currentPage = this.exportManager.currentPage;
    }
    async exportPreview(format) {
        this.exportManager.setTemplate(this.currentTemplate);
        this.exportManager.setCurrentPage(this.currentPage);
        this.exportManager.setTotalPages(this.totalPages);
        await this.exportManager.exportPreview(format);
        this.currentPage = this.exportManager.currentPage;
    }

    // 组件加载完成后初始化AIChat
    async _onComponentsLoaded() {
        if (window.AIChat) {
            window.AIChat.init({
                getToken: () => this.token || localStorage.getItem('token'),
                conversationIdKey: 'aiConversationId'
            });
            // 注册首页工具处理器
            window.AIChat.registerToolHandler('get_product_attachments', (r) => {
                if (r.data?.attachments) window.AIChat.addAttachmentCard(r.data.attachments);
            });
            window.AIChat.registerToolHandler('get_download_link', (r) => {
                if (r.data) window.AIChat.addAttachmentCard([r.data]);
            });
            console.log('[App] AIChat组件已初始化');
        }
    }

    // Agent相关方法 - 委托给 agentManager（数据加载）和 AIChat（UI渲染）
    async loadAgentTools() {
        await this.agentManager.loadTools();
    }

    async loadKBStats() {
        await this.agentManager.loadKBStats();
    }

    async loadConversations() {
        await this.agentManager.loadConversations();
    }

    newConversation() {
        this.agentManager.newConversation();
    }

    async loadConversation(conversationId) {
        await this.agentManager.loadConversation(conversationId);
    }

    addMessageToUI(role, content) {
        if (window.AIChat) return window.AIChat.addMessage(role, content);
        return this.agentManager.addMessageToUI(role, content);
    }

    renderMessageContent(content) {
        return this.agentManager.renderMessageContent(content);
    }

    addAttachmentCard(attachments) {
        if (window.AIChat) return window.AIChat.addAttachmentCard(attachments);
        return this.agentManager.addAttachmentCard(attachments);
    }

    addStreamingMessage() {
        if (window.AIChat) return window.AIChat.addStreamingMessage();
        return this.agentManager.addStreamingMessage();
    }

    appendStreamingContent(msgEl, content) {
        if (window.AIChat) return window.AIChat.appendStreamingContent(msgEl, content);
        return this.agentManager.appendStreamingContent(msgEl, content);
    }

    finalizeStreamingMessage(msgEl, errorContent) {
        if (window.AIChat) return window.AIChat.finalizeStreamingMessage(msgEl, errorContent);
        return this.agentManager.finalizeStreamingMessage(msgEl, errorContent);
    }

    addToolStep(toolCalls) {
        if (window.AIChat) return window.AIChat.addToolStep(toolCalls);
        return this.agentManager.addToolStep(toolCalls);
    }

    completeToolStep(stepEl, results) {
        if (window.AIChat) return window.AIChat.completeToolStep(stepEl, results);
        return this.agentManager.completeToolStep(stepEl, results);
    }

    showStopButton() {
        if (window.AIChat) return window.AIChat.showStopButton();
        return this.agentManager.showStopButton();
    }

    hideStopButton() {
        if (window.AIChat) return window.AIChat.hideStopButton();
        return this.agentManager.hideStopButton();
    }

    // 设置相关方法 - 委托给 settingsManager
    async loadSettings() { await this.settingsManager.loadSettings(); }
    onProviderChange() { this.settingsManager.onProviderChange(); }
    toggleCustomModel() { this.settingsManager.toggleCustomModel(); }
    getOllamaModel() { return this.settingsManager.getOllamaModel(); }
    setOllamaModel(modelName) { this.settingsManager.setOllamaModel(modelName); }

    // 数据管理方法 - 委托给 dataManager
    clearAllDataLists() {
        this.dataManager.clearAllDataLists();
    }

    renderDataList(type, items) {
        this.dataManager.renderDataList(type, items);
    }

    getFieldsByType(type, item) {
        return this.dataManager.getFieldsByType(type, item);
    }

    async saveDataItem(type, id) {
        await this.dataManager.saveDataItem(type, id);
    }

    async delDataItem(type, id) {
        await this.dataManager.delDataItem(type, id);
    }

    async addDataItem(type) {
        await this.dataManager.addDataItem(type);
    }

    async loadProductData(productId) {
        await this.dataManager.loadProductData(productId);
    }

    toggleSection(type) {
        this.dataManager.toggleSection(type);
    }

    showAddForm(type) {
        this.dataManager.showAddForm(type);
    }

    hideAddForm(type) {
        this.dataManager.hideAddForm(type);
    }

    clearAddForm(type) {
        this.dataManager.clearAddForm(type);
    }

    // CSV 管理方法 - 委托给 csvManager
    openImportModal() {
        this.csvManager.openImportModal();
    }

    closeImportModal() {
        this.csvManager.closeImportModal();
    }

    handleFileSelect(event) {
        this.csvManager.handleFileSelect(event);
    }

    parseAndPreviewCsv(content) {
        this.csvManager.parseAndPreviewCsv(content);
    }

    parseCSVLine(line) {
        return this.csvManager.parseCSVLine(line);
    }

    async importCsvData() {
        await this.csvManager.importCsvData();
    }

    downloadTemplate() {
        this.csvManager.downloadTemplate();
    }

    // ========== 附件管理功能（图片 + 文档）==========
    get currentImages() { return this.attachmentManager.currentImages; }
    set currentImages(v) { this.attachmentManager.currentImages = v; }
    get currentDocuments() { return this.attachmentManager.currentDocuments; }
    set currentDocuments(v) { this.attachmentManager.currentDocuments = v; }
    get currentImageProductId() { return this.attachmentManager.currentImageProductId; }
    set currentImageProductId(v) { this.attachmentManager.currentImageProductId = v; }
    get currentAttachmentTab() { return this.attachmentManager.currentAttachmentTab; }
    set currentAttachmentTab(v) { this.attachmentManager.currentAttachmentTab = v; }

    switchAttachmentTab(tab) { this.attachmentManager.switchAttachmentTab(tab); }
    async loadImagesProducts(retries) { await this.attachmentManager.loadImagesProducts(retries); }
    async loadAttachments() { await this.attachmentManager.loadAttachments(); }
    async loadImages() { await this.attachmentManager.loadImages(); }
    async loadDocuments() { await this.attachmentManager.loadDocuments(); }
    renderImages() { this.attachmentManager.renderImages(); }
    _updateSlotsFromImages() { this.attachmentManager._updateSlotsFromImages(); }
    assignImageToSlot(imageId, slotName) { this.attachmentManager.assignImageToSlot(imageId, slotName); }
    removeImageFromSlot(slotName) { this.attachmentManager.removeImageFromSlot(slotName); }
    _getSlotLabel(slotName) { return this.attachmentManager._getSlotLabel(slotName); }
    async saveImageSlots() { await this.attachmentManager.saveImageSlots(); }
    clearImageSlots() { this.attachmentManager.clearImageSlots(); }
    openImageLightbox(index) { this.attachmentManager.openImageLightbox(index); }
    closeImageLightbox() { this.attachmentManager.closeImageLightbox(); }
    prevImage() { this.attachmentManager.prevImage(); }
    nextImage() { this.attachmentManager.nextImage(); }
    renderDocuments() { this.attachmentManager.renderDocuments(); }
    async deleteImage(imageId) { await this.attachmentManager.deleteImage(imageId); }
    async deleteDocument(docId) { await this.attachmentManager.deleteDocument(docId); }
    async bindByNaming() { await this.attachmentManager.bindByNaming(); }
    async handleImageFiles(files) { await this.attachmentManager.handleImageFiles(files); }
    async handleDocumentFiles(files) { await this.attachmentManager.handleDocumentFiles(files); }
    async linkLocalDocument() { await this.attachmentManager.linkLocalDocument(); }
    detectImageType(filename) { return this.attachmentManager.detectImageType(filename); }
    detectDocumentType(filename) { return this.attachmentManager.detectDocumentType(filename); }

    // ========== 图标管理方法 ==========
    get allIcons() { return this.iconManager.allIcons; }
    set allIcons(v) { this.iconManager.allIcons = v; }
    get selectedIcon() { return this.iconManager.selectedIcon; }
    set selectedIcon(v) { this.iconManager.selectedIcon = v; }

    switchSettingsSubTab(tab) { this.iconManager.switchSettingsSubTab(tab); }
    async loadIcons() { await this.iconManager.loadIcons(); }
    async loadIconCategories() { await this.iconManager.loadIconCategories(); }
    renderIconsGrid(icons) { this.iconManager.renderIconsGrid(icons); }
    selectIcon(iconId) { this.iconManager.selectIcon(iconId); }
    searchIcons(query) { this.iconManager.searchIcons(query); }
    filterIconsByCategory(categoryId) { this.iconManager.filterIconsByCategory(categoryId); }
    copyIconCode() { this.iconManager.copyIconCode(); }
    useIconInTemplate() { this.iconManager.useIconInTemplate(); }

    // ========== CSV导出功能 ==========
    async exportFullCsv() { await this.csvManager.exportFullCsv(); }
    async exportSimpleCsv() { await this.csvManager.exportSimpleCsv(); }

    // ============ 从图片添加产品功能 ============
    get imageToProductFiles() { return this.imageRecognitionManager.imageToProductFiles; }
    set imageToProductFiles(v) { this.imageRecognitionManager.imageToProductFiles = v; }
    get imageToProductData() { return this.imageRecognitionManager.imageToProductData; }
    set imageToProductData(v) { this.imageRecognitionManager.imageToProductData = v; }

    handleImageToProductFiles(files) { this.imageRecognitionManager.handleImageToProductFiles(files); }
    removeImageToProductFile(index) { this.imageRecognitionManager.removeImageToProductFile(index); }
    renderImageToProductPreview() { this.imageRecognitionManager.renderImageToProductPreview(); }
    openDataUrlLightbox(dataUrl, index) { this.imageRecognitionManager.openDataUrlLightbox(dataUrl, index); }
    closeDataUrlLightbox() { this.imageRecognitionManager.closeDataUrlLightbox(); }
    updateImageToProductStatus() { this.imageRecognitionManager.updateImageToProductStatus(); }
    async startImageToProductProcess() { await this.imageRecognitionManager.startImageToProductProcess(); }
    async confirmAndCreateProduct() { await this.imageRecognitionManager.confirmAndCreateProduct(); }
    async bindImagesToProduct(productId) { await this.imageRecognitionManager.bindImagesToProduct(productId); }
    async regenerateProductInfo() { await this.imageRecognitionManager.regenerateProductInfo(); }
    resetImageToProduct() { this.imageRecognitionManager.resetImageToProduct(); }
}

// 创建全局应用实例
window.app = new App();

// 导出供其他模块使用
export default App;
