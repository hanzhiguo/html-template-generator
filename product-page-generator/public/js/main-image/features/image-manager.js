import { S, addLibraryItem, removeLibraryItem, setTemplateCount, setSlotImage, clearSlot, autoFillSlots, clearAllSlots } from '../core/state.js';
import { render } from '../core/canvas.js';
import { showToast } from '../utils/toast.js';

// 批量加载图片到素材库
export function handleFiles(files) {
  const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (validFiles.length === 0) {
    showToast('请选择有效的图片文件', true);
    return;
  }

  let loaded = 0;
  validFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        addLibraryItem(img, file.name, e.target.result);
        loaded++;
        if (loaded === validFiles.length) {
          renderLibrary();
          render();
          showToast(`已加载 ${loaded} 张图片`);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// 渲染素材库
export function renderLibrary() {
  const container = document.getElementById('libraryList');
  if (!container) return;

  container.innerHTML = '';

  S.library.forEach(item => {
    const div = document.createElement('div');
    div.className = 'lib-item' + (S.batchSelectedLibIds.includes(item.id) ? ' selected' : '');
    div.draggable = true;
    div.dataset.libId = item.id;
    div.innerHTML = `
      <img src="${item.src}" alt="${item.name}" draggable="false">
      <span class="lib-name" title="${item.name}">${item.name}</span>
      <button class="lib-del" title="删除">&times;</button>
    `;

    // 拖拽开始
    div.addEventListener('dragstart', (e) => {
      S.dragLibId = item.id;
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', item.id);
      div.classList.add('dragging');
    });
    div.addEventListener('dragend', () => {
      S.dragLibId = null;
      div.classList.remove('dragging');
    });

    // 点击选中（用于批量操作）
    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('lib-del')) return;
      toggleBatchSelect(item.id);
    });

    // 删除
    div.querySelector('.lib-del').addEventListener('click', (e) => {
      e.stopPropagation();
      removeLibraryItem(item.id);
      S.batchSelectedLibIds = S.batchSelectedLibIds.filter(id => id !== item.id);
      renderLibrary();
      renderSlotIndicators();
      render();
    });

    container.appendChild(div);
  });

  updateBatchCount();
}

// 切换批量选中
function toggleBatchSelect(id) {
  const idx = S.batchSelectedLibIds.indexOf(id);
  if (idx === -1) {
    S.batchSelectedLibIds.push(id);
  } else {
    S.batchSelectedLibIds.splice(idx, 1);
  }
  renderLibrary();
}

// 全选素材
export function selectAllLibrary() {
  S.batchSelectedLibIds = S.library.map(i => i.id);
  renderLibrary();
}

// 取消全选
export function deselectAllLibrary() {
  S.batchSelectedLibIds = [];
  renderLibrary();
}

// 更新批量计数
function updateBatchCount() {
  const el = document.getElementById('batchCount');
  if (el) el.textContent = S.batchSelectedLibIds.length;
  const libCount = document.getElementById('libCount');
  if (libCount) libCount.textContent = S.library.length;
}

// 渲染槽位指示器（显示哪些素材在哪个槽位）
export function renderSlotIndicators() {
  const container = document.getElementById('slotIndicators');
  if (!container) return;

  container.innerHTML = '';
  S.slots.forEach((slot, i) => {
    const div = document.createElement('div');
    div.className = 'slot-indicator';
    div.dataset.slotIndex = i;

    if (slot.libraryId) {
      const item = S.library.find(l => l.id === slot.libraryId);
      if (item) {
        div.innerHTML = `
          <img src="${item.src}" alt="">
          <span class="slot-num">${i + 1}</span>
          <button class="slot-clear" title="移除">&times;</button>
        `;
        div.querySelector('.slot-clear').addEventListener('click', (e) => {
          e.stopPropagation();
          clearSlot(i);
          renderSlotIndicators();
          render();
        });
      }
    } else {
      div.innerHTML = `<span class="slot-num">${i + 1}</span><span class="slot-empty">拖入图片</span>`;
    }

    // 拖放目标
    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      div.classList.add('drag-over');
    });
    div.addEventListener('dragleave', () => {
      div.classList.remove('drag-over');
    });
    div.addEventListener('drop', (e) => {
      e.preventDefault();
      div.classList.remove('drag-over');
      const libId = parseInt(e.dataTransfer.getData('text/plain'));
      if (libId) {
        setSlotImage(i, libId);
        renderSlotIndicators();
        render();
      }
    });

    container.appendChild(div);
  });
}

// 自动填充
export function autoFill() {
  autoFillSlots();
  renderSlotIndicators();
  render();
  showToast('已自动填充');
}

// 清空所有槽位
export function clearSlots() {
  clearAllSlots();
  renderSlotIndicators();
  render();
}
