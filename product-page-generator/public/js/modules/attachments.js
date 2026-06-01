import { showToast } from '../services/utils.js';
import { productsAPI } from '../api/index.js';

class AttachmentManager {
    constructor(getToken) {
        this.getToken = getToken;
        this.currentImages = [];
        this.currentDocuments = [];
        this.currentImageProductId = null;
        this.currentAttachmentTab = 'images';
        this._lightboxIndex = 0;
        this._handleLightboxKeydown = null;
    }

    switchAttachmentTab(tab) {
        this.currentAttachmentTab = tab;
        document.getElementById('attachmentImagesSection').classList.toggle('hidden', tab !== 'images');
        document.getElementById('attachmentDocumentsSection').classList.toggle('hidden', tab !== 'documents');

        const tabImagesBtn = document.getElementById('tabImagesBtn');
        const tabDocsBtn = document.getElementById('tabDocsBtn');
        if (tabImagesBtn) {
            tabImagesBtn.className = tab === 'images' ? 'btn btn-sm' : 'btn btn-sm btn-secondary';
        }
        if (tabDocsBtn) {
            tabDocsBtn.className = tab === 'documents' ? 'btn btn-sm' : 'btn btn-sm btn-secondary';
        }

        this.loadAttachments();
    }

    async loadImagesProducts(retries = 3) {
        const select = document.getElementById('imageProductSelect');
        if (!select) {
            if (retries > 0) {
                setTimeout(() => this.loadImagesProducts(retries - 1), 300);
            }
            return;
        }

        try {
            const data = await productsAPI.getAll(this.getToken());
            const products = data.products || [];

            select.innerHTML = '<option value="">-- 请选择产品 --</option>';
            products.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${p.sku || ''} - ${p.name}`;
                select.appendChild(opt);
            });

            if (products.length > 0) {
                select.value = products[0].id;
                this.loadAttachments();
            }
        } catch (err) {
            showToast('加载产品列表失败', 'error');
        }
    }

    async loadAttachments() {
        const productId = document.getElementById('imageProductSelect')?.value;
        if (!productId) return;

        this.currentImageProductId = productId;

        if (this.currentAttachmentTab === 'images') {
            await this.loadImages();
        } else {
            await this.loadDocuments();
        }
    }

    async loadImages() {
        const productId = this.currentImageProductId;
        if (!productId) return;

        const API_BASE = `${window.location.origin}/api`;

        try {
            const resp = await fetch(`${API_BASE}/images/${productId}/images`, {
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            const data = await resp.json();

            this.currentImages = data.images || [];
            this.renderImages();
        } catch (err) {
            showToast('加载图片失败', 'error');
        }
    }

    async loadDocuments() {
        const productId = this.currentImageProductId;
        if (!productId) return;

        try {
            const data = await productsAPI.getDocuments(productId, this.getToken());
            this.currentDocuments = data.documents || [];
            this.renderDocuments();
        } catch (err) {
            showToast('加载文档失败', 'error');
        }
    }

    renderImages() {
        const grid = document.getElementById('imagesGrid');
        if (!grid) return;

        if (this.currentImages.length === 0) {
            grid.innerHTML = '<p class="pool-empty">暂无图片，请上传</p>';
            return;
        }

        grid.innerHTML = this.currentImages.map((img, index) => `
            <div class="pool-item" draggable="true" data-image-id="${img.id}" data-index="${index}">
                <img src="${img.image_url}" alt="${img.alt_text || ''}" onerror="this.src='/placeholder.png'">
                <span class="pool-item-type">${img.image_type || '未分类'}</span>
                <button class="pool-item-delete" onclick="event.stopPropagation(); app.attachmentManager.deleteImage(${img.id})">×</button>
            </div>
        `).join('');

        this._updateSlotsFromImages();
    }

    _updateSlotsFromImages() {
        const slots = ['main', 'scene1', 'scene2', 'detail1', 'detail2', 'detail3', 'detail4', 'dimension', 'package'];

        slots.forEach(slotName => {
            const dropzone = document.getElementById(`slot-${slotName}`);
            if (!dropzone) return;

            const img = this.currentImages.find(i => i.image_type === slotName);
            if (img) {
                dropzone.innerHTML = `
                    <img src="${img.image_url}" alt="${img.alt_text || ''}">
                    <button class="slot-remove-btn" onclick="event.stopPropagation(); app.attachmentManager.removeImageFromSlot('${slotName}')">×</button>
                `;
            } else {
                dropzone.innerHTML = '<span class="slot-placeholder">+</span>';
            }
        });
    }

    assignImageToSlot(imageId, slotName) {
        const image = this.currentImages.find(i => i.id == imageId);
        if (!image) return;

        this.currentImages.forEach(img => {
            if (img.image_type === slotName) {
                img.image_type = 'unassigned';
            }
        });

        image.image_type = slotName;
        this._updateSlotsFromImages();
        showToast(`已分配到 ${this._getSlotLabel(slotName)}`);
    }

    removeImageFromSlot(slotName) {
        const image = this.currentImages.find(i => i.image_type === slotName);
        if (image) {
            image.image_type = 'unassigned';
            this._updateSlotsFromImages();
        }
    }

    _getSlotLabel(slotName) {
        const labels = {
            'main': '主图',
            'scene1': '场景图1',
            'scene2': '场景图2',
            'detail1': '细节图1',
            'detail2': '细节图2',
            'detail3': '细节图3',
            'detail4': '细节图4',
            'dimension': '尺寸图',
            'package': '包装清单图'
        };
        return labels[slotName] || slotName;
    }

    async saveImageSlots() {
        const productId = this.currentImageProductId;
        if (!productId) {
            showToast('请先选择产品', 'error');
            return;
        }

        let successCount = 0;
        let failCount = 0;

        try {
            for (const img of this.currentImages) {
                const resp = await fetch(`${window.location.origin}/api/images/${productId}/images/${img.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getToken()}`
                    },
                    body: JSON.stringify({ image_type: img.image_type })
                });

                if (resp.ok) {
                    successCount++;
                } else {
                    failCount++;
                    console.error(`保存图片 ${img.id} 失败:`, resp.status, resp.statusText);
                }
            }

            if (failCount > 0) {
                showToast(`保存完成，${successCount} 成功，${failCount} 失败`, 'error');
            } else {
                showToast(`图片分配已保存 (${successCount} 张)`);
            }

            await this.loadImages();

            if (window.app && window.app.previewManager && window.app.previewManager.getProduct()) {
                window.app.previewManager.render();
            }
        } catch (err) {
            showToast('保存失败: ' + err.message, 'error');
        }
    }

    clearImageSlots() {
        this.currentImages.forEach(img => {
            img.image_type = 'unassigned';
        });
        this._updateSlotsFromImages();
        showToast('已清空所有分配');
    }

    openImageLightbox(index) {
        if (!this.currentImages || this.currentImages.length === 0) return;

        this._lightboxIndex = index;

        let lightbox = document.getElementById('imageLightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'imageLightbox';
            lightbox.className = 'image-lightbox';
            lightbox.innerHTML = `
                <button class="image-lightbox-close" onclick="app.attachmentManager.closeImageLightbox()">×</button>
                <button class="image-lightbox-nav image-lightbox-prev" onclick="event.stopPropagation(); app.attachmentManager.prevImage()">‹</button>
                <img id="lightboxImage" src="" alt="">
                <button class="image-lightbox-nav image-lightbox-next" onclick="event.stopPropagation(); app.attachmentManager.nextImage()">›</button>
            `;
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) this.closeImageLightbox();
            });
            document.body.appendChild(lightbox);
        }

        const img = this.currentImages[index];
        document.getElementById('lightboxImage').src = img.image_url;
        lightbox.classList.add('active');

        document.addEventListener('keydown', this._handleLightboxKeydown = (e) => {
            if (e.key === 'Escape') this.closeImageLightbox();
            if (e.key === 'ArrowLeft') this.prevImage();
            if (e.key === 'ArrowRight') this.nextImage();
        });
    }

    closeImageLightbox() {
        const lightbox = document.getElementById('imageLightbox');
        if (lightbox) {
            lightbox.classList.remove('active');
        }
        if (this._handleLightboxKeydown) {
            document.removeEventListener('keydown', this._handleLightboxKeydown);
        }
    }

    prevImage() {
        if (!this.currentImages || this.currentImages.length === 0) return;
        this._lightboxIndex = (this._lightboxIndex - 1 + this.currentImages.length) % this.currentImages.length;
        document.getElementById('lightboxImage').src = this.currentImages[this._lightboxIndex].image_url;
    }

    nextImage() {
        if (!this.currentImages || this.currentImages.length === 0) return;
        this._lightboxIndex = (this._lightboxIndex + 1) % this.currentImages.length;
        document.getElementById('lightboxImage').src = this.currentImages[this._lightboxIndex].image_url;
    }

    renderDocuments() {
        const grid = document.getElementById('documentsGrid');
        if (!grid) return;

        if (this.currentDocuments.length === 0) {
            grid.innerHTML = '<p class="pool-empty">暂无文档，请上传</p>';
            return;
        }

        const typeIcons = {
            pdf: '📕', video: '▶️', manual: '📗', spec: '📘', other: '📄'
        };
        const typeLabels = {
            pdf: 'PDF', video: '视频', manual: '说明书', spec: '规格书', other: '其他'
        };
        const linkLabels = {
            upload: '已上传', local: '本地', external: '外部'
        };

        grid.innerHTML = this.currentDocuments.map(doc => `
            <div class="doc-item">
                <span class="doc-icon">${typeIcons[doc.doc_type] || '📄'}</span>
                <div class="doc-info">
                    <div class="doc-title">${doc.title || doc.file_path?.split('/').pop() || '未命名'}</div>
                    <div class="doc-type">${typeLabels[doc.doc_type] || '文档'} · ${linkLabels[doc.link_type] || '已上传'}</div>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="app.attachmentManager.deleteDocument(${doc.id})">删除</button>
            </div>
        `).join('');
    }

    async deleteImage(imageId) {
        if (!confirm('确定删除这张图片？')) return;

        const API_BASE = `${window.location.origin}/api`;
        try {
            const resp = await fetch(`${API_BASE}/images/${this.currentImageProductId}/images/${imageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });

            if (resp.ok) {
                this.currentImages = this.currentImages.filter(i => i.id !== imageId);
                this.renderImages();
                showToast('删除成功');
            }
        } catch (err) {
            showToast('删除失败', 'error');
        }
    }

    async deleteDocument(docId) {
        if (!confirm('确定删除此文档？')) return;

        try {
            await productsAPI.deleteDocument(this.currentImageProductId, docId, this.getToken());
            this.currentDocuments = this.currentDocuments.filter(d => d.id !== docId);
            this.renderDocuments();
            showToast('删除成功');
        } catch (err) {
            showToast('删除失败', 'error');
        }
    }

    async bindByNaming() {
        const btn = document.querySelector('[onclick*="bindByNaming"]');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '绑定中...';
        }

        const API_BASE = `${window.location.origin}/api`;
        try {
            const resp = await fetch(`${API_BASE}/images/bind-by-naming`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.getToken()}` }
            });
            const data = await resp.json();

            showToast(data.message || '绑定完成');
            this.loadImages();
        } catch (err) {
            showToast('绑定失败', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🔗 自动绑定';
            }
        }
    }

    async handleImageFiles(files) {
        if (!this.currentImageProductId) {
            showToast('请先选择产品', 'error');
            return;
        }

        const progress = document.getElementById('imageProgress');
        const progressBar = document.getElementById('imageProgressBar');
        if (progress) progress.style.display = 'block';

        const API_BASE = `${window.location.origin}/api`;
        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('image', file);
            formData.append('image_type', this.detectImageType(file.name));

            try {
                const resp = await fetch(`${API_BASE}/images/${this.currentImageProductId}/images`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.getToken()}` },
                    body: formData
                });

                if (resp.ok) {
                    const data = await resp.json();
                    this.currentImages.push(data);
                    successCount++;
                }
            } catch (err) {
                console.error('上传失败:', err);
            }

            if (progressBar) {
                progressBar.style.width = ((i + 1) / files.length * 100) + '%';
            }
        }

        if (progress) progress.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';

        this.renderImages();
        showToast(`成功上传 ${successCount} 张图片`);
    }

    async handleDocumentFiles(files) {
        if (!this.currentImageProductId) {
            showToast('请先选择产品', 'error');
            return;
        }

        const progress = document.getElementById('documentProgress');
        const progressBar = document.getElementById('documentProgressBar');
        if (progress) progress.style.display = 'block';

        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('document', file);
            formData.append('title', file.name);
            formData.append('doc_type', this.detectDocumentType(file.name));

            try {
                const resp = await productsAPI.uploadDocument(this.currentImageProductId, formData, this.getToken());
                if (resp.id) {
                    this.currentDocuments.push(resp);
                    successCount++;
                }
            } catch (err) {
                console.error('上传文档失败:', err);
            }

            if (progressBar) {
                progressBar.style.width = ((i + 1) / files.length * 100) + '%';
            }
        }

        if (progress) progress.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';

        this.renderDocuments();
        showToast(`成功上传 ${successCount} 个文档`);
    }

    async linkLocalDocument() {
        const productId = this.currentImageProductId;
        if (!productId) {
            showToast('请先选择产品', 'error');
            return;
        }

        const title = document.getElementById('localDocTitle').value.trim();
        const filePath = document.getElementById('localDocPath').value.trim();
        const docType = document.getElementById('localDocType').value;

        if (!title) {
            showToast('请输入文档标题', 'error');
            return;
        }
        if (!filePath) {
            showToast('请输入文件路径或URL', 'error');
            return;
        }

        try {
            const resp = await productsAPI.linkDocument(productId, {
                title,
                file_path: filePath,
                doc_type: docType
            }, this.getToken());

            if (resp.id) {
                this.currentDocuments.push(resp);
                this.renderDocuments();
                document.getElementById('localDocTitle').value = '';
                document.getElementById('localDocPath').value = '';
                showToast('链接添加成功');
            }
        } catch (err) {
            showToast('添加链接失败', 'error');
        }
    }

    detectImageType(filename) {
        const name = filename.toLowerCase();
        if (name.includes('main') || name.includes('hero') || name.includes('primary') || name.includes('主图')) return 'main';
        if (name.includes('scene') || name.includes('场景')) {
            if (name.includes('scene2') || name.includes('场景2')) return 'scene2';
            return 'scene1';
        }
        if (name.includes('dim') || name.includes('size') || name.includes('dimension') || name.includes('尺寸')) return 'dimension';
        if (name.includes('package') || name.includes('包装') || name.includes('清单')) return 'package';
        if (name.includes('detail') || name.includes('细节') || name.includes('功能')) {
            if (name.includes('detail2') || name.includes('细节2')) return 'detail2';
            if (name.includes('detail3') || name.includes('细节3')) return 'detail3';
            if (name.includes('detail4') || name.includes('细节4')) return 'detail4';
            return 'detail1';
        }
        return 'unassigned';
    }

    detectDocumentType(filename) {
        const name = filename.toLowerCase();
        if (name.includes('.pdf')) return 'pdf';
        if (name.includes('.mp4') || name.includes('.webm') || name.includes('.avi')) return 'video';
        if (name.includes('manual') || name.includes('说明书') || name.includes('guide')) return 'manual';
        if (name.includes('spec') || name.includes('规格')) return 'spec';
        return 'other';
    }
}

export { AttachmentManager };