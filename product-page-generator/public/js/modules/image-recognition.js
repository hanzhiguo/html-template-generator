import { showToast } from '../services/utils.js';

class ImageRecognitionManager {
    constructor(getToken) {
        this.getToken = getToken;
        this.imageToProductFiles = [];
        this.imageToProductData = { recognizedTexts: [], imagesBase64: [], productInfo: null };
        this._currentDataUrlIndex = 0;
        this._handleDataUrlLightboxKeydown = null;
    }

    handleImageToProductFiles(files) {
        if (!files || files.length === 0) return;

        const progressContainer = document.getElementById('imageToProductProgress');
        const progressBar = document.getElementById('imageToProductProgressBar');

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const validFiles = Array.from(files).filter(f => validTypes.includes(f.type));

        if (validFiles.length === 0) {
            showToast('请上传 JPG/PNG/GIF/WebP 格式的图片', 'error');
            return;
        }

        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';

        const previewGrid = document.getElementById('imageToProductPreviewGrid');
        previewGrid.innerHTML = '';

        let processed = 0;

        validFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgData = {
                    file: file,
                    dataUrl: e.target.result,
                    name: file.name,
                    size: file.size
                };
                this.imageToProductFiles.push(imgData);

                const card = document.createElement('div');
                card.className = 'image-item';
                card.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <button class="delete-btn" onclick="app.imageRecognitionManager.removeImageToProductFile(${index})">×</button>
                    <div class="image-info">${file.name}</div>
                `;
                previewGrid.appendChild(card);

                processed++;
                progressBar.style.width = `${(processed / validFiles.length) * 100}%`;

                if (processed === validFiles.length) {
                    setTimeout(() => {
                        progressContainer.style.display = 'none';
                        showToast(`已上传 ${validFiles.length} 张图片`);
                        this.updateImageToProductStatus();
                    }, 500);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    removeImageToProductFile(index) {
        this.imageToProductFiles.splice(index, 1);
        this.renderImageToProductPreview();
        this.updateImageToProductStatus();
    }

    renderImageToProductPreview() {
        const previewGrid = document.getElementById('imageToProductPreviewGrid');
        if (this.imageToProductFiles.length === 0) {
            previewGrid.innerHTML = '<p style="color: #999; text-align: center; grid-column: 1/-1;">请上传产品图片</p>';
            return;
        }

        previewGrid.innerHTML = '';
        this.imageToProductFiles.forEach((imgData, index) => {
            const card = document.createElement('div');
            card.className = 'image-item';
            card.style.cursor = 'pointer';
            card.onclick = () => this.openDataUrlLightbox(imgData.dataUrl, index);
            card.innerHTML = `
                <img src="${imgData.dataUrl}" alt="${imgData.name}">
                <button class="delete-btn" onclick="event.stopPropagation(); app.imageRecognitionManager.removeImageToProductFile(${index})">×</button>
                <div class="image-info">${imgData.name}</div>
            `;
            previewGrid.appendChild(card);
        });
    }

    openDataUrlLightbox(dataUrl, index) {
        let lightbox = document.getElementById('dataUrlLightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'dataUrlLightbox';
            lightbox.className = 'image-lightbox';
            lightbox.innerHTML = `
                <button class="image-lightbox-close" onclick="app.imageRecognitionManager.closeDataUrlLightbox()">×</button>
                <img id="dataUrlLightboxImg" src="" alt="">
            `;
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) this.closeDataUrlLightbox();
            });
            document.body.appendChild(lightbox);
        }

        document.getElementById('dataUrlLightboxImg').src = dataUrl;
        lightbox.classList.add('active');
        this._currentDataUrlIndex = index;

        document.addEventListener('keydown', this._handleDataUrlLightboxKeydown = (e) => {
            if (e.key === 'Escape') this.closeDataUrlLightbox();
        });
    }

    closeDataUrlLightbox() {
        const lightbox = document.getElementById('dataUrlLightbox');
        if (lightbox) {
            lightbox.classList.remove('active');
        }
        if (this._handleDataUrlLightboxKeydown) {
            document.removeEventListener('keydown', this._handleDataUrlLightboxKeydown);
        }
    }

    updateImageToProductStatus() {
        const statusEl = document.getElementById('imageToProductStatus');
        const count = this.imageToProductFiles.length;
        if (count === 0) {
            statusEl.textContent = '';
        } else {
            statusEl.textContent = `已上传 ${count} 张图片`;
        }
    }

    async startImageToProductProcess() {
        if (this.imageToProductFiles.length === 0) {
            showToast('请先上传产品图片', 'error');
            return;
        }

        const statusEl = document.getElementById('imageToProductStatus');
        const ocrResultEl = document.getElementById('imageToProductOcrResult');
        const generatedInfoEl = document.getElementById('imageToProductGeneratedInfo');

        statusEl.textContent = '正在识别图片文字...';
        ocrResultEl.innerHTML = '<span style="color: #3b82f6;">正在识别图片内容 (Step 1/3)...</span>';
        generatedInfoEl.innerHTML = '<div style="color: #94a3b8;">等待处理...</div>';

        try {
            const formData = new FormData();
            for (const fileData of this.imageToProductFiles) {
                formData.append('images', fileData.file);
            }

            const recognizeResponse = await fetch('/api/image-to-product/recognize', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.getToken()}` },
                body: formData
            });

            if (!recognizeResponse.ok) {
                const errData = await recognizeResponse.json();
                throw new Error(errData.error || '识别失败');
            }

            const recognizeData = await recognizeResponse.json();

            let ocrText = '';
            const recognizedTexts = [];
            for (const result of recognizeData.results) {
                if (result.success) {
                    ocrText += `\n【图片: ${result.filename}】\n${result.text}\n`;
                    recognizedTexts.push(result);
                } else {
                    ocrText += `\n【图片: ${result.filename}】\n识别失败: ${result.error}\n`;
                }
            }

            ocrResultEl.innerHTML = `<pre style="white-space: pre-wrap; font-size: 12px; line-height: 1.5; max-height: 300px; overflow-y: auto;">${ocrText}</pre>`;

            this.imageToProductData = {
                recognizedTexts: recognizedTexts,
                imagesBase64: this.imageToProductFiles.map(f => f.dataUrl.split(',')[1])
            };

            statusEl.textContent = '正在生成产品信息 (Step 2/3)...';
            generatedInfoEl.innerHTML = '<span style="color: #3b82f6;">正在生成产品信息...</span>';

            const generateResponse = await fetch('/api/image-to-product/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({
                    recognizedTexts: recognizedTexts.map(r => ({ text: r.text })),
                    images: this.imageToProductData.imagesBase64
                })
            });

            if (!generateResponse.ok) {
                const errData = await generateResponse.json();
                throw new Error(errData.error || '生成产品信息失败');
            }

            const generateData = await generateResponse.json();
            const productInfo = generateData.productData;

            if (!productInfo) {
                throw new Error(generateData.error || '无法从AI响应中提取产品JSON');
            }

            this.imageToProductData.productInfo = productInfo;

            generatedInfoEl.innerHTML = `
                <div style="margin-bottom: 8px;"><strong>SKU:</strong> ${productInfo.sku || '无'}</div>
                <div style="margin-bottom: 8px;"><strong>名称:</strong> ${productInfo.name || '无'}</div>
                <div style="margin-bottom: 8px;"><strong>副标题:</strong> ${productInfo.subtitle || '无'}</div>
                <div style="margin-bottom: 8px;"><strong>价格:</strong> ${productInfo.currency || 'USD'} ${productInfo.price || '无'}</div>
                <div style="margin-top: 12px; padding: 8px; background: white; border-radius: 4px;">
                    <strong>核心卖点 (${(productInfo.highlights || []).length}条)</strong>
                    <div style="margin-top: 4px; font-size: 12px;">
                        ${(productInfo.highlights || []).map(h => `• ${h.key}: ${h.value}`).join('<br>') || '无'}
                    </div>
                </div>
                <div style="margin-top: 8px; padding: 8px; background: white; border-radius: 4px;">
                    <strong>产品规格 (${(productInfo.specs || []).length}条)</strong>
                    <div style="margin-top: 4px; font-size: 12px;">
                        ${(productInfo.specs || []).map(s => `• ${s.label}: ${s.value} ${s.unit || ''}`).join('<br>') || '无'}
                    </div>
                </div>
                <div style="margin-top: 8px; padding: 8px; background: white; border-radius: 4px;">
                    <strong>包装清单 (${(productInfo.accessories || []).length}条)</strong>
                    <div style="margin-top: 4px; font-size: 12px;">
                        ${(productInfo.accessories || []).map(a => `• ${a.name} x${a.quantity || 1}`).join('<br>') || '无'}
                    </div>
                </div>
                <div style="margin-top: 8px; padding: 8px; background: white; border-radius: 4px;">
                    <strong>功能亮点 (${(productInfo.features || []).length}条)</strong>
                    <div style="margin-top: 4px; font-size: 12px;">
                        ${(productInfo.features || []).map(f => `• ${f.title}`).join('<br>') || '无'}
                    </div>
                </div>
                <div style="margin-top: 8px; padding: 8px; background: white; border-radius: 4px;">
                    <strong>适配尺寸 (${(productInfo.dimensions || []).length}条)</strong>
                    <div style="margin-top: 4px; font-size: 12px;">
                        ${(productInfo.dimensions || []).map(d => `• ${d.label}: ${d.value} ${d.unit || ''}`).join('<br>') || '无'}
                    </div>
                </div>
            `;

            statusEl.textContent = '产品信息已生成，请确认后添加 (Step 3/3)';
            showToast('图片识别和产品生成完成！');

        } catch (err) {
            console.error('处理失败:', err);
            statusEl.textContent = '处理失败';
            ocrResultEl.innerHTML = `<span style="color: #ef4444;">处理失败: ${err.message}</span>`;
            generatedInfoEl.innerHTML = `<span style="color: #ef4444;">生成失败: ${err.message}</span>`;
            showToast('处理失败: ' + err.message, 'error');
        }
    }

    async confirmAndCreateProduct() {
        if (!this.imageToProductData.productInfo) {
            showToast('请先生成产品信息', 'error');
            return;
        }

        const productInfo = this.imageToProductData.productInfo;

        try {
            const createResponse = await fetch('/api/image-to-product/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getToken()}`
                },
                body: JSON.stringify({
                    productData: productInfo,
                    images: this.imageToProductData.imagesBase64 || []
                })
            });

            if (!createResponse.ok) {
                const errData = await createResponse.json();
                throw new Error(errData.error || '创建产品失败');
            }

            showToast('产品创建成功！', 'success');
            this.resetImageToProduct();

            if (window.app && window.app.loadProducts) {
                window.app.loadProducts();
            }
            if (window.app && window.app.switchTab) {
                window.app.switchTab('products');
            }
        } catch (err) {
            console.error('创建产品失败:', err);
            showToast('创建产品失败: ' + err.message, 'error');
        }
    }

    async bindImagesToProduct(productId) {
        if (this.imageToProductFiles.length === 0) {
            showToast('产品已创建成功！但没有图片需要绑定。', 'success');
            this.resetImageToProduct();
            return;
        }

        try {
            for (let i = 0; i < this.imageToProductFiles.length; i++) {
                const imgData = this.imageToProductFiles[i];
                const formData = new FormData();
                formData.append('file', imgData.file);
                formData.append('productId', productId);

                let imageType = 'detail';
                if (i === 0) imageType = 'main';
                else if (imgData.name.toLowerCase().includes('dimension') || imgData.name.toLowerCase().includes('dim')) {
                    imageType = 'dimension';
                } else if (imgData.name.toLowerCase().includes('banner')) {
                    imageType = 'banner';
                }
                formData.append('imageType', imageType);

                const uploadResponse = await fetch('/api/images/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.getToken()}` },
                    body: formData
                });

                if (!uploadResponse.ok) {
                    console.error(`上传图片失败: ${imgData.name}`);
                }
            }

            showToast('产品创建成功，图片已绑定！', 'success');
            this.resetImageToProduct();

            if (window.app && window.app.loadProducts) {
                window.app.loadProducts();
            }
        } catch (err) {
            console.error('绑定图片失败:', err);
            showToast('产品已创建，但图片绑定失败: ' + err.message, 'warning');
            this.resetImageToProduct();
        }
    }

    async regenerateProductInfo() {
        await this.startImageToProductProcess();
    }

    resetImageToProduct() {
        this.imageToProductFiles = [];
        this.imageToProductData = { recognizedTexts: [], imagesBase64: [], productInfo: null };
        this.renderImageToProductPreview();
        const ocrEl = document.getElementById('imageToProductOcrResult');
        if (ocrEl) ocrEl.innerHTML = '<span style="color: #94a3b8;">等待上传图片...</span>';
        const infoEl = document.getElementById('imageToProductGeneratedInfo');
        if (infoEl) infoEl.innerHTML = '<div style="color: #94a3b8;">等待处理...</div>';
        this.updateImageToProductStatus();
    }
}

export { ImageRecognitionManager };