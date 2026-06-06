// 全局状态 - 简化版
export const S = {
  // 素材库
  library: [],           // [{id, img, name, src}]

  // 当前模板
  templateCount: 1,      // 1-9
  slots: [],             // 当前模板槽位 [{libraryId, scale, offsetX, offsetY}]

  // 文字
  mainTitle: '',
  subTitle: '',
  titleColor: '#ffffff',
  subtitleColor: '#ffffff',
  bgColor: '#f5f5f5',
  titleSize: 48,
  shadow: true,
  stroke: false,
  bold: true,
  textBg: false,
  preset: 'center',

  // 图片设置
  imageGap: 4,
  imageRadius: 0,

  // 样式
  maskStyle: 'normal',

  // 批量生成
  batchMode: '1to1',    // '1to1' | '1toN' | 'NtoN'
  batchSelectedLibIds: [],

  // 拖拽
  dragLibId: null,
  dragSlotIndex: -1,

  // 自增ID
  _nextId: 1,
};

export function getState() { return S; }

export function addLibraryItem(img, name, src) {
  const item = { id: S._nextId++, img, name, src };
  S.library.push(item);
  return item;
}

export function removeLibraryItem(id) {
  S.library = S.library.filter(i => i.id !== id);
  // 清理槽位引用
  S.slots.forEach(slot => {
    if (slot.libraryId === id) slot.libraryId = null;
  });
}

export function getLibraryItem(id) {
  return S.library.find(i => i.id === id);
}

export function setTemplateCount(count) {
  S.templateCount = count;
  // 调整槽位数组
  while (S.slots.length < count) {
    S.slots.push({ libraryId: null, scale: 1, offsetX: 0, offsetY: 0 });
  }
  if (S.slots.length > count) {
    S.slots.length = count;
  }
}

export function setSlotImage(slotIndex, libraryId) {
  if (slotIndex >= 0 && slotIndex < S.slots.length) {
    S.slots[slotIndex].libraryId = libraryId;
    S.slots[slotIndex].scale = 1;
    S.slots[slotIndex].offsetX = 0;
    S.slots[slotIndex].offsetY = 0;
  }
}

export function clearSlot(slotIndex) {
  if (slotIndex >= 0 && slotIndex < S.slots.length) {
    S.slots[slotIndex].libraryId = null;
    S.slots[slotIndex].scale = 1;
    S.slots[slotIndex].offsetX = 0;
    S.slots[slotIndex].offsetY = 0;
  }
}

export function autoFillSlots() {
  // 自动按顺序填充空槽位
  let libIdx = 0;
  S.slots.forEach(slot => {
    if (!slot.libraryId && libIdx < S.library.length) {
      slot.libraryId = S.library[libIdx].id;
      slot.scale = 1;
      slot.offsetX = 0;
      slot.offsetY = 0;
      libIdx++;
    }
  });
}

export function clearAllSlots() {
  S.slots.forEach(slot => {
    slot.libraryId = null;
    slot.scale = 1;
    slot.offsetX = 0;
    slot.offsetY = 0;
  });
}

export function resetState() {
  S.library = [];
  S.templateCount = 1;
  S.slots = [{ libraryId: null, scale: 1, offsetX: 0, offsetY: 0 }];
  S.mainTitle = '';
  S.subTitle = '';
  S.titleColor = '#ffffff';
  S.subtitleColor = '#ffffff';
  S.bgColor = '#f5f5f5';
  S.titleSize = 48;
  S.shadow = true;
  S.stroke = false;
  S.bold = true;
  S.textBg = false;
  S.preset = 'center';
  S.imageGap = 4;
  S.imageRadius = 0;
  S.maskStyle = 'normal';
  S.batchMode = '1to1';
  S.batchSelectedLibIds = [];
  S.dragLibId = null;
  S.dragSlotIndex = -1;
}
