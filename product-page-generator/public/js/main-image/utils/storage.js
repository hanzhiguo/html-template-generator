import { state } from '../core/state.js';
import { render } from '../core/canvas.js';
import { showToast } from '../utils/toast.js';

const STORAGE_KEY = 'mainImageTemplates';

export function saveTemplate() {
  const nameInput = document.getElementById('templateName');
  if (!nameInput) return;
  
  const name = nameInput.value.trim();
  if (!name) {
    showToast('请输入模板名称', true);
    return;
  }
  
  const templates = loadTemplatesFromStorage();
  
  const templateData = {
    name: name,
    createdAt: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(state))
  };
  
  const existingIndex = templates.findIndex(t => t.name === name);
  if (existingIndex !== -1) {
    templates[existingIndex] = templateData;
  } else {
    templates.push(templateData);
  }
  
  saveTemplatesToStorage(templates);
  renderTemplateList();
  showToast('模板保存成功');
  nameInput.value = '';
}

export function loadTemplate(name) {
  const templates = loadTemplatesFromStorage();
  const template = templates.find(t => t.name === name);
  
  if (!template) {
    showToast('模板不存在', true);
    return;
  }
  
  Object.assign(state, template.state);
  render();
  updateUIFromState();
  
  if (state.dimLayerVisible && typeof window.initKonvaOverlay === 'function') {
    window.initKonvaOverlay();
  }
  
  showToast('模板加载成功');
}

export function deleteTemplate(name) {
  const templates = loadTemplatesFromStorage();
  const filtered = templates.filter(t => t.name !== name);
  saveTemplatesToStorage(filtered);
  renderTemplateList();
  showToast('模板已删除');
}

export function renderTemplateList() {
  const container = document.getElementById('templateList');
  if (!container) return;
  
  const templates = loadTemplatesFromStorage();
  
  container.innerHTML = templates.map(t => `
    <div class="template-saved-item">
      <span class="template-name">${t.name}</span>
      <button class="btn-load" data-name="${t.name}">加载</button>
      <button class="btn-delete" data-name="${t.name}">删除</button>
    </div>
  `).join('');
  
  container.querySelectorAll('.btn-load').forEach(btn => {
    btn.addEventListener('click', () => loadTemplate(btn.dataset.name));
  });
  
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteTemplate(btn.dataset.name));
  });
}

function loadTemplatesFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load templates:', e);
    return [];
  }
}

function saveTemplatesToStorage(templates) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates:', e);
    showToast('保存失败，存储空间不足', true);
  }
}

function updateUIFromState() {
  const inputs = {
    mainTitle: document.getElementById('mainTitle'),
    subTitle: document.getElementById('subTitle'),
    titleColor: document.getElementById('titleColor'),
    subtitleColor: document.getElementById('subtitleColor'),
    bgColor: document.getElementById('bgColor'),
    titleSize: document.getElementById('titleSize'),
    imageGap: document.getElementById('imageGap'),
    imageRadius: document.getElementById('imageRadius')
  };
  
  if (inputs.mainTitle) inputs.mainTitle.value = state.mainTitle;
  if (inputs.subTitle) inputs.subTitle.value = state.subTitle;
  if (inputs.titleColor) inputs.titleColor.value = state.titleColor;
  if (inputs.subtitleColor) inputs.subtitleColor.value = state.subtitleColor;
  if (inputs.bgColor) inputs.bgColor.value = state.bgColor;
  if (inputs.titleSize) inputs.titleSize.value = state.titleSize;
  if (inputs.imageGap) inputs.imageGap.value = state.imageGap;
  if (inputs.imageRadius) inputs.imageRadius.value = state.imageRadius;
  
  
  const dragOverlay = document.getElementById('dragOverlay');
  if (dragOverlay) {
    dragOverlay.style.pointerEvents = state.dimLayerVisible ? 'none' : 'auto';
  }
  
  const dimColor = document.getElementById('dimColor');
  if (dimColor) dimColor.value = state.dimColor;
  
  const dimLineW = document.getElementById('dimLineW');
  const dimLineWVal = document.getElementById('dimLineWVal');
  if (dimLineW) {
    dimLineW.value = state.dimLineW;
    if (dimLineWVal) dimLineWVal.textContent = state.dimLineW + 'px';
  }
  
  const dimFontS = document.getElementById('dimFontS');
  const dimFontSVal = document.getElementById('dimFontSVal');
  if (dimFontS) {
    dimFontS.value = state.dimFontS;
    if (dimFontSVal) dimFontSVal.textContent = state.dimFontS + 'px';
  }
  
  const dimTextColor = document.getElementById('dimTextColor');
  if (dimTextColor) dimTextColor.value = state.dimTextColor;
  
  const dimEndStyle = document.getElementById('dimEndStyle');
  if (dimEndStyle) dimEndStyle.value = state.dimEndStyle;
  
  const dimTextBg = document.getElementById('dimTextBg');
  if (dimTextBg) dimTextBg.value = state.dimTextBg;
  
  const dimCount = document.getElementById('dimCount');
  if (dimCount) dimCount.textContent = state.dimensions.length;
  
  const exportSizeSelect = document.getElementById('exportSizeSelect');
  if (exportSizeSelect && state.exportSize) {
    exportSizeSelect.value = state.exportSize;
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.innerHTML = `<i data-lucide="camera" class="icon-inline"></i> 导出图片 (${state.exportSize}×${state.exportSize})`;
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [exportBtn] });
    }
    const previewTitle = document.querySelector('.preview-title');
    if (previewTitle) {
      previewTitle.textContent = `预览效果 · 输出尺寸: ${state.exportSize} × ${state.exportSize}`;
    }
  }
  
  updateDimList();
}

function updateDimList() {
  const dimList = document.getElementById('dimList');
  if (!dimList) return;
  
  dimList.innerHTML = state.dimensions.map(d => `
    <div class="dim-item" data-id="${d.id}" style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:#f8fafc;border-radius:4px;margin-bottom:4px;cursor:pointer;">
      <span style="flex:1;font-size:11px;">${d.value}${d.unit}</span>
      <button class="btn-delete-dim" data-id="${d.id}" style="background:#ef4444;color:white;border:none;width:18px;height:18px;border-radius:50%;cursor:pointer;font-size:10px;">×</button>
    </div>
  `).join('');
  
  dimList.querySelectorAll('.dim-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn-delete-dim')) {
        state.selectedDimId = item.dataset.id;
        const d = state.dimensions.find(d => d.id === state.selectedDimId);
        if (d) {
          const dimValue = document.getElementById('dimValue');
          if (dimValue) dimValue.value = d.value;
        }
        dimList.querySelectorAll('.dim-item').forEach(i => i.style.background = '#f8fafc');
        item.style.background = '#dbeafe';
      }
    });
  });
  
  dimList.querySelectorAll('.btn-delete-dim').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      state.dimensions = state.dimensions.filter(d => d.id !== id);
      if (state.selectedDimId === id) state.selectedDimId = null;
      updateDimList();
      const dimCount = document.getElementById('dimCount');
      if (dimCount) dimCount.textContent = state.dimensions.length;
      render();
    });
  });
}
