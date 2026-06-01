import { state } from '../core/state.js';
import { render } from '../core/canvas.js';
import { showToast } from '../utils/toast.js';

export function handleFiles(files) {
  const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  
  if (validFiles.length === 0) {
    showToast('请选择有效的图片文件', true);
    return;
  }
  
  validFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.images.push({
          img: img,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          name: file.name
        });
        renderImageList();
        autoSelectTemplate();
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function deleteImage(index) {
  state.images.splice(index, 1);
  state.selectedImages = state.selectedImages.filter(i => i !== index);
  renderImageList();
  render();
}

export function renderImageList() {
  const container = document.getElementById('imageList');
  if (!container) return;
  
  container.innerHTML = '';
  
  state.images.forEach((imgObj, i) => {
    const div = document.createElement('div');
    div.className = 'image-item' + (state.selectedImages.includes(i) ? ' selected' : '');
    div.innerHTML = `
      <input type="checkbox" ${state.selectedImages.includes(i) ? 'checked' : ''}>
      <img src="${imgObj.img.src}" alt="">
      <span class="order">${i + 1}</span>
      ${imgObj.scale !== 1 ? `<span class="scale-badge">${(imgObj.scale * 100).toFixed(0)}%</span>` : ''}
      <button class="delete-btn">×</button>
    `;
    
    div.querySelector('input').addEventListener('change', (e) => {
      e.stopPropagation();
      toggleImageSelection(i);
    });
    
    div.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteImage(i);
    });
    
    div.addEventListener('click', () => {
      toggleImageSelection(i);
    });
    
    container.appendChild(div);
  });
}

export function toggleImageSelection(index) {
  const idx = state.selectedImages.indexOf(index);
  if (idx === -1) {
    state.selectedImages.push(index);
  } else {
    state.selectedImages.splice(idx, 1);
  }
  renderImageList();
  updateBatchControls();
}

export function selectAllImages() {
  state.selectedImages = state.images.map((_, i) => i);
  renderImageList();
  updateBatchControls();
}

export function deselectAllImages() {
  state.selectedImages = [];
  renderImageList();
  updateBatchControls();
}

export function updateBatchControls() {
  const panel = document.getElementById('batchScalePanel');
  if (!panel) return;
  
  if (state.selectedImages.length > 0) {
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

export function applyBatchScale() {
  const scaleInput = document.getElementById('batchScale');
  if (!scaleInput) return;
  
  const scale = parseFloat(scaleInput.value) || 1;
  
  state.selectedImages.forEach(i => {
    if (state.images[i]) {
      state.images[i].scale = scale;
    }
  });
  
  renderImageList();
  render();
  showToast('批量缩放已应用');
}

export function resetBatchScale() {
  state.selectedImages.forEach(i => {
    if (state.images[i]) {
      state.images[i].scale = 1;
      state.images[i].offsetX = 0;
      state.images[i].offsetY = 0;
    }
  });
  
  renderImageList();
  render();
  showToast('已重置图片设置');
}

function autoSelectTemplate() {
  const count = state.images.length;
  if (count <= 9 && count >= 1) {
    state.templateCount = count;
    const templateItems = document.querySelectorAll('.template-item');
    templateItems.forEach((item, i) => {
      item.classList.toggle('active', i + 1 === count);
    });
  }
}

export { autoSelectTemplate };
