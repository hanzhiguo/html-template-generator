# main-image-init.js 拆分计划

## 现状
- `main-image-app.js` (141KB) — 未使用的合并文件，可删除
- `main-image-init.js` (69KB) — **实际需要拆分的文件**
- 其他拆分文件已就绪：render, dimension, comfyui, image-manager, batch 等

## main-image-init.js 功能分布（约1900行）

| 功能域 | 行范围 | 行数 | 目标文件 |
|--------|--------|------|----------|
| 常量/配置 | 散落各处 | ~20 | → constants.js |
| 初始化 init() | 8-67 | ~60 | → 保留在 init.js |
| 字体加载 | 68-170 | ~100 | → font-loader.js |
| Tab眼睛同步 | 171-193 | ~20 | → ui-layer-toggle.js |
| 拖拽交互 | 194-600 | ~400 | → interactions/drag-manager.js |
| UI事件绑定 | 601-890 | ~290 | → ui/bind-events.js |
| 遮罩样式绑定 | 891-983 | ~90 | → ui/bind-mask-events.js |
| AI文案生成 | 984-1130 | ~150 | → 已有 ai-copy.js，需迁移 |
| UI同步/切换 | 1131-1340 | ~210 | → ui/ui-sync-local.js |
| 文档管理 | 1341-1700 | ~360 | → document/doc-manager.js |
| 设置弹窗 | 1701-1900 | ~200 | → 已有 settings.js，需迁移 |

## 拆分顺序（简单→复杂）

### Phase 1: 纯数据提取（无逻辑依赖）
- [x] 1.1 创建 `constants.js` — 集中硬编码值
- [ ] 1.2 删除未使用的 `main-image-app.js`

### Phase 2: 独立功能提取（低耦合）
- [ ] 2.1 创建 `font-loader.js` — 字体加载/填充下拉框
- [ ] 2.2 创建 `document/doc-manager.js` — 文档加载/搜索/解析
- [ ] 2.3 创建 `document/dim-parser.js` — 尺寸数据解析

### Phase 3: 交互逻辑提取（中耦合）
- [ ] 3.1 创建 `interactions/drag-manager.js` — 拖拽交互整合
- [ ] 3.2 创建 `ui/bind-events.js` — UI事件绑定
- [ ] 3.3 创建 `ui/bind-mask-events.js` — 遮罩样式绑定

### Phase 4: UI同步与整合（高耦合）
- [ ] 4.1 创建 `ui/ui-sync-local.js` — UI状态同步
- [ ] 4.2 精简 `main-image-init.js` — 只保留 init() 入口

### Phase 5: 清理与验证
- [ ] 5.1 更新 HTML script 加载顺序
- [ ] 5.2 删除冗余代码
- [ ] 5.3 功能验证

## 硬编码修复清单

| 硬编码 | 出现次数 | 修复方式 |
|--------|---------|---------|
| 1024 (画布尺寸) | 12 | → CANVAS.SIZE |
| 颜色值 (#3b82f6等) | 90+ | → THEME 常量 |
| API路径 (/api/jimeng/...) | 10+ | → API 路径常量 |
| 提示词 (WHITE_BG_PROMPT) | 3 | → PROMPTS 常量 |
| localhost:8000 | 1 | → API.DEFAULT_URL |
