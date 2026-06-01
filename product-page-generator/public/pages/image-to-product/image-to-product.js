import { initImageUpload } from '../../components/image-upload/image-upload.js';

export class ImageToProductPage {
    constructor() {
        console.log('[ImageToProductPage] constructor called');
        
        setTimeout(() => {
            this._initUploadArea();
        }, 0);
    }

    _initUploadArea() {
        console.log('[ImageToProductPage] _initUploadArea called');
        
        const uploadArea = document.getElementById('imageToProductUploadArea');
        const fileInput = document.getElementById('imageToProductFileInput');
        console.log('[ImageToProductPage] uploadArea:', !!uploadArea, 'fileInput:', !!fileInput);

        initImageUpload('imageToProductUploadArea', 'imageToProductFileInput', (files) => {
            console.log('[ImageToProductPage] files selected:', files.length);
            if (window.app) window.app.handleImageToProductFiles(files);
        });
    }
}

new ImageToProductPage();