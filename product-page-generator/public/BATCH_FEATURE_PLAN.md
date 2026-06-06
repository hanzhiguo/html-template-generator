# 批量生成功能开发计划

> **状态：全部完成** ✅ | 完成日期：2026-06-03

## 一、需求概述

1. **图片分类上传**：支持场景图/白底图/套装图/细节图四种类型
2. **模板保存/另存**：点击加载模板后可直接覆盖保存，区分"保存"和"另存"
3. **固定组+更换组批量生成**：固定组图片不变，更换组图片逐个替换生成多张图

---

## 二、数据结构变更

### 2.1 图片对象增加 type 字段

```javascript
// 当前结构
image = { src, img, name, scale, offsetX, offsetY }

// 新结构
image = { src, img, name, scale, offsetX, offsetY, type }
// type: 'scene' | 'white' | 'set' | 'detail' | null (未分类)
```

### 2.2 按类型分组的图片索引

```javascript
// 新增 state 字段
state.imageTypes = {
  scene: [],    // 场景图索引数组，如 [0, 3, 5]
  white: [],    // 白底图索引数组
  set: [],      // 套装图索引数组
  detail: []    // 细节图索引数组
}
```

### 2.3 批量生成配置

```javascript
// 新增 state 字段
state.batchConfig = {
  enabled: false,         // 是否启用批量模式
  fixedPositions: [],     // 固定组占用的位置索引，如 [0]
  replacementPosition: 1, // 更换组占用的位置索引
  replacementImages: [],  // 更换组图片在 images 数组中的索引，如 [1,2,3,4,5,6]
  fixedImageType: null,   // 固定组图片类型（可选筛选）
  replacementImageType: 'detail', // 更换组图片类型
  currentPreviewIndex: 0  // 当前预览的更换图片索引
}
```

### 2.4 当前加载的模板名

```javascript
// 新增 state 字段
state.currentTemplateName: null  // 当前加载的模板名称
```

---

## 三、UI 布局设计

### 3.1 左侧参数栏新增区域

```
┌──────────────────────────────────────────────────┐
│ 📷 图片上传                                       │
│ ┌──────────────────────────────────────────────┐ │
│ │ [场景图] [白底图] [套装图] [细节图] [全部]    │ │  ← 类型Tab
│ │                                              │ │
│ │  📁 点击或拖拽上传 (当前类型: 场景图)          │ │  ← 上传区域
│ │                                              │ │
│ │ ┌───┐ ┌───┐ ┌───┐                           │ │
│ │ │ S │ │ W │ │ D │  ← 缩略图+类型标记         │ │
│ │ └───┘ └───┘ └───┘                           │ │
│ │                                              │ │
│ │ 场景图(2) 白底图(1) 套装图(0) 细节图(6)       │ │  ← 统计
│ └──────────────────────────────────────────────┘ │
│                                                   │
│ ─────────────── 批量生成 ────────────────────     │
│ ┌──────────────────────────────────────────────┐ │
│ │ ☑ 启用批量生成                                │ │
│ │                                              │ │
│ │ 固定组:                                      │ │
│ │ [场景图 ▼] 选择图片: ○ 场景图1 ○ 场景图2      │ │
│ │                                              │ │
│ │ 更换组:                                      │ │
│ │ [细节图 ▼] 已选 6 张: 细1 细2 细3 ...         │ │
│ │                                              │ │
│ │ 生成数量: 6 张                                │ │
│ │ [批量生成] [预览上一张] [预览下一张]           │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 3.2 顶部模板管理栏变更

```
┌──────────────────────────────────────────────────┐
│ 模板名称: [________]  [💾 保存] [📋 另存为]       │  ← 当前模板名显示
│ 已保存: 3  [模板A] [模板B] [模板C]                │
└──────────────────────────────────────────────────┘
```

---

## 四、功能模块详细设计

### 4.1 图片分类上传

**流程：**
1. 用户点击类型Tab选择当前上传类型（如"细节图"）
2. 上传图片时，自动标记为当前选中的类型
3. 缩略图显示类型标记（S=场景, W=白底, T=套装, D=细节）
4. 支持在缩略图上右键切换类型，或点击类型标签切换
5. 按类型筛选显示图片列表

**实现要点：**
- 修改 `handleFiles()` 函数，增加 `uploadType` 参数
- 修改 `renderImageList()` 函数，支持按类型筛选和显示类型标记
- 新增 `setUploadType(type)` 函数
- 新增 `changeImageType(index, type)` 函数

### 4.2 模板保存/另存

**当前行为：**
- 只有"保存"按钮，输入名称后保存
- 同名覆盖，不同名新建

**新行为：**
- 加载模板后，UI显示"当前模板: xxx"
- "保存"按钮：如果已加载模板，直接覆盖当前模板；否则弹出输入框
- "另存为"按钮：始终弹出输入框，新建模板
- 跟踪 `state.currentTemplateName`

**实现要点：**
- 修改 `saveTemplate()` 函数，增加 `saveAs` 参数
- 新增 `saveAsTemplate()` 函数
- 修改 `loadTemplate()` 函数，设置 `state.currentTemplateName`
- 修改模板管理器UI，显示当前模板名

### 4.3 固定组+更换组批量生成

**核心逻辑：**

```
给定：
  - 模板有 N 个图片位置 (state.templateCount)
  - 固定组: M 个图片 (固定位置)
  - 更换组: K 个图片 (更换位置)
  - 总共 N = M + 1 (更换组每次只替换1个位置)

批量生成流程：
  for each 更换图片 in 更换组:
    1. 构建临时图片数组: 固定组图片 + 当前更换图片
    2. 渲染到临时 canvas
    3. 导出为图片
    4. 收集到结果数组
  返回 K 张图片
```

**位置映射：**
- 用户在模板中指定哪些位置是"固定位置"，哪个是"更换位置"
- 例如2图模板：位置0=固定，位置1=更换
- 例如3图模板：位置0,1=固定，位置2=更换

**实现要点：**
- 新增 `batchGenerate()` 函数
- 新增 `buildBatchImages(fixedImages, replacementImage)` 构建临时图片数组
- 新增 `batchRender(stateSnapshot)` 离线渲染
- 新增 `batchExport()` 批量导出

### 4.4 批量导出

**导出方式：**
- 单张下载：导出当前预览的那张
- 批量打包：将所有生成的图片打包为ZIP下载（使用JSZip库）
- 单张预览：在画布上预览当前更换图片的效果

**实现要点：**
- 引入 JSZip 库用于打包下载
- 新增 `downloadBatchZip(images)` 函数
- 修改 `exportImage()` 支持批量模式

---

## 五、实施步骤

### 阶段 1：模板保存/另存 ✅ 已完成
- [x] 1.1 新增 `state.currentTemplateName` 字段
- [x] 1.2 修改 `saveTemplate()` 支持直接覆盖
- [x] 1.3 新增 `saveAsTemplate()` 函数
- [x] 1.4 修改 `loadTemplate()` 记录当前模板名
- [x] 1.5 更新模板管理栏UI

### 阶段 2：图片分类上传 ✅ 已完成
- [x] 2.1 新增 `state.imageTypes` 和图片 `type` 字段
- [x] 2.2 新增类型Tab切换UI
- [x] 2.3 修改 `handleFiles()` 支持类型标记
- [x] 2.4 修改 `renderImageList()` 显示类型标记和按类型筛选
- [x] 2.5 新增 `cycleImageType()` 和 `updateImageTypeStats()` 函数

### 阶段 3：批量生成核心逻辑 ✅ 已完成
- [x] 3.1 新增 `state.batchMode`, `fixedGroup`, `replaceGroup`, `batchResults` 配置
- [x] 3.2 新增批量生成配置UI（固定组/更换组显示、进度条、结果展示）
- [x] 3.3 新增 `executeBatchGenerate()` 核心函数
- [x] 3.4 新增 `renderBatchImage()` 离线渲染（含 drawImagesToCanvas / drawTextToCanvas / drawLogoToCanvas / drawArrowsToCanvas）
- [x] 3.5 新增 `toggleBatchMode()`, `addToFixedGroup()`, `addToReplaceGroup()`, `removeFromBatchGroup()`, `updateBatchGroupDisplay()` 交互函数

### 阶段 4：批量导出 ✅ 已完成
- [x] 4.1 直接使用 Canvas API 单张导出，无需 JSZip（简化方案）
- [x] 4.2 新增 `downloadSingleBatch()` 单张下载
- [x] 4.3 新增 `downloadAllBatch()` 批量下载
- [x] 4.4 批量生成结果缩略图预览 + 点击下载单张

---

## 六、文件变更清单

| 文件 | 变更内容 |
|------|----------|
| `main-image-template.html` | 主要变更：UI结构、CSS样式、批量生成逻辑 |
| `js/main-image/utils/storage.js` | 模板保存/另存逻辑 |
| `js/main-image/core/state.js` | 如有模块化版本，同步状态定义 |

---

## 七、技术注意事项

1. **画布渲染复用**：批量生成时不需要显示在屏幕上，使用离屏 Canvas 渲染
2. **图片预加载**：确保所有更换组图片在批量生成前已加载完成
3. **内存管理**：批量生成大量图片时注意及时释放离屏 Canvas
4. **ZIP 打包**：使用 JSZip 库，按需动态加载（CDN 引入）
5. **模板兼容性**：批量生成不影响现有单图预览和导出功能