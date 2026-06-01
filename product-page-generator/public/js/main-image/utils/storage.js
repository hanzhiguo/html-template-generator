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
}
