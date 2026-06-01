export function initImageUpload(uploadAreaId, fileInputId, onFilesSelected) {
    const uploadArea = document.getElementById(uploadAreaId);
    const fileInput = document.getElementById(fileInputId);

    if (!uploadArea || !fileInput) return;

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (onFilesSelected) {
            onFilesSelected(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', () => {
        if (onFilesSelected && fileInput.files.length > 0) {
            onFilesSelected(fileInput.files);
            fileInput.value = '';
        }
    });
}