import { initImageUpload } from '../../components/image-upload/image-upload.js';
import { eventBus } from '../../core/event-bus.js';

export class AttachmentsPage {
    constructor() {
        this._dragDropInitialized = false;
        this._initPageListener();
    }

    _initPageListener() {
        eventBus.on('page:loaded', (data) => {
            if (data.page === 'attachments') {
                this._initUploadAreas();
                this._initDragDrop();
            }
        });
    }

    _initUploadAreas() {
        initImageUpload('imageUploadArea', 'imageFileInput', (files) => {
            if (window.app) window.app.handleImageFiles(files);
        });

        initImageUpload('documentUploadArea', 'documentFileInput', (files) => {
            if (window.app) window.app.handleDocumentFiles(files);
        });
    }

    _initDragDrop() {
        if (this._dragDropInitialized) return;
        this._dragDropInitialized = true;

        let draggedId = null;

        document.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.pool-item');
            if (!item) return;

            draggedId = item.dataset.imageId;
            if (!draggedId) return;

            item.classList.add('dragging');
            e.dataTransfer.setData('text/plain', draggedId);
            e.dataTransfer.effectAllowed = 'move';
        });

        document.addEventListener('dragend', (e) => {
            const item = e.target.closest('.pool-item');
            if (item) {
                item.classList.remove('dragging');
            }
            draggedId = null;
        });

        document.addEventListener('dragover', (e) => {
            const dropzone = e.target.closest('.slot-dropzone');
            if (dropzone) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                dropzone.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', (e) => {
            const dropzone = e.target.closest('.slot-dropzone');
            if (dropzone) {
                dropzone.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', (e) => {
            const dropzone = e.target.closest('.slot-dropzone');
            if (!dropzone) return;

            e.preventDefault();
            dropzone.classList.remove('drag-over');

            const imageId = e.dataTransfer.getData('text/plain') || draggedId;
            if (!imageId) return;

            const slotName = dropzone.id.replace('slot-', '');
            if (window.app) {
                window.app.assignImageToSlot(imageId, slotName);
            }
        });
    }
}

new AttachmentsPage();
