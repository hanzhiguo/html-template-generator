# 产品附件管理与AI分发功能 - 实施计划

## 一、功能概述

### 1.1 目标

1. **附件管理**：为每个产品统一管理图片、说明书、视频等附件，支持上传和本地文件链接
2. **AI分发**：AI Agent 能够查询产品附件，并将可下载的链接发送给用户

### 1.2 核心流程

```
用户上传/链接文件 → 数据库记录 → AI Agent可查询 → 用户通过AI聊天下载
       │                │               │                   │
       ▼                ▼               ▼                   ▼
  文件存储          product_images   get_product_       聊天窗口渲染
  (按产品分目录)    product_documents attachments 工具   下载按钮
```

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        前端 (index-new.html)                         │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   附件管理标签页      │  │     AI聊天窗口 (增强)                │  │
│  │  ├─ 🖼️ 图片管理      │  │  ├─ 文字消息                       │  │
│  │  ├─ 📄 文档管理      │  │  ├─ 🖼️ 图片预览+下载按钮            │  │
│  │  └─ 🔗 本地文件链接   │  │  ├─ 📄 PDF/文档下载按钮            │  │
│  └─────────────────────┘  │  └─ ▶️ 视频播放+下载按钮            │  │
│                            └─────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP / SSE
┌──────────────────────────▼──────────────────────────────────────────┐
│                        后端 (Express)                                │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   API 路由           │  │   AI Agent                          │  │
│  │  ├─ /api/images/*    │  │  ├─ query_products                 │  │
│  │  ├─ /api/documents/* │  │  ├─ get_product_attachments (新增)  │  │
│  │  └─ /api/agent/*     │  │  └─ get_download_link (新增)       │  │
│  └─────────────────────┘  └─────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                     数据库 + 文件系统                                │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   SQLite             │  │   public/uploads/products/{id}/     │  │
│  │  ├─ product_images   │  │  ├─ images/                       │  │
│  │  └─ product_documents│  │  └─ documents/                    │  │
│  └─────────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据库设计

#### product_images 表（已有，无需修改）

```sql
CREATE TABLE product_images (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id      INTEGER NOT NULL,
    image_type      TEXT,         -- main, detail, dimension, gallery, banner
    image_url       TEXT,         -- 访问URL (/uploads/products/...)
    alt_text        TEXT,
    sort_order      INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

#### product_documents 表（已有，需扩展字段）

```sql
-- 当前表结构
CREATE TABLE product_documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id      INTEGER NOT NULL,
    doc_type        TEXT,         -- pdf, video, manual, other
    title           TEXT,
    file_path       TEXT,         -- 访问URL 或 本地文件路径
    sort_order      INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 需新增字段（通过ALTER TABLE）
ALTER TABLE product_documents ADD COLUMN file_size INTEGER DEFAULT 0;
ALTER TABLE product_documents ADD COLUMN link_type TEXT DEFAULT 'upload';
  -- link_type: 'upload'=已上传, 'local'=本地链接, 'external'=外部链接
ALTER TABLE product_documents ADD COLUMN mime_type TEXT DEFAULT '';
```

### 2.3 文件存储结构

```
public/uploads/
└── products/
    └── {product_id}/
        ├── images/
        │   ├── main.jpg
        │   ├── detail_1.jpg
        │   └── ...
        └── documents/
            ├── manual.pdf
            ├── video.mp4
            └── ...
```

---

## 三、实施阶段

### 第一阶段：后端文档管理API（预计 1 天）

#### 3.1.1 新增文件：`server/routes/documents.js`

文档上传、链接、删除的完整 CRUD API。

| API | 方法 | 功能 |
|-----|------|------|
| `POST /api/documents/:productId/upload` | POST | 上传文档文件 |
| `GET /api/documents/:productId/documents` | GET | 获取产品文档列表 |
| `DELETE /api/documents/:productId/documents/:docId` | DELETE | 删除文档 |
| `POST /api/documents/:productId/link` | POST | 链接本地/外部文件 |
| `GET /api/attachments/:productId/all` | GET | 获取产品所有附件（图片+文档合并） |

#### 3.1.2 修改文件：`server/index.js`

注册新路由。

#### 3.1.3 修改文件：`server/db/init.js`

执行 ALTER TABLE 添加新字段（兼容已有数据库）。

### 第二阶段：前端附件管理界面（预计 1.5 天）

#### 3.2.1 修改文件：`public/index-new.html`

- 将"图片管理"标签页 → "附件管理"
- 增加子标签切换：图片 / 文档
- 文档上传区域（拖拽上传PDF/视频）
- 本地文件链接表单
- 附件列表展示（带类型图标、大小、下载按钮）

#### 3.2.2 修改文件：`public/js/app.js`

- 新增文档管理相关方法
- 附件列表渲染
- 文件上传/链接/删除操作

#### 3.2.3 修改文件：`public/js/api/products.js`

- 新增文档API调用方法

### 第三阶段：AI Agent 工具扩展（预计 0.5 天）

#### 3.3.1 修改文件：`server/agent/tools/definitions.js`

新增 2 个工具定义：

```javascript
{
  name: 'get_product_attachments',
  description: '查询指定产品的所有附件（图片、文档、视频等），返回可直接访问的下载链接',
  parameters: {
    type: 'object',
    properties: {
      product_id: { type: 'number', description: '产品ID' },
      types: { type: 'string', description: '附件类型筛选，可选：images, documents, all，默认all' }
    },
    required: ['product_id']
  }
}
```

```javascript
{
  name: 'get_download_link',
  description: '获取指定附件的直接下载链接',
  parameters: {
    type: 'object',
    properties: {
      attachment_id: { type: 'number', description: '附件ID' },
      type: { type: 'string', description: '附件类型：image 或 document' }
    },
    required: ['attachment_id', 'type']
  }
}
```

#### 3.3.2 修改文件：`server/agent/tools/executor.js`

实现 `get_product_attachments` 和 `get_download_link` 的执行逻辑。

#### 3.3.3 修改文件：`server/agent/index.js`

更新 SYSTEM_PROMPT，告知 AI 新工具的用法。

### 第四阶段：AI聊天窗口增强（预计 1 天）

#### 3.4.1 修改文件：`public/index-new.html`

改造聊天窗口的消息渲染逻辑：

- 检测 AI 回复中的文件 URL（图片、PDF、视频）
- 图片 URL → 渲染为缩略图 + 下载按钮
- PDF/文档 URL → 渲染为文件图标 + 下载按钮
- 视频 URL → 渲染为播放器 + 下载按钮
- 本地文件路径 → 渲染为链接（带"本地文件"标识）

#### 3.4.2 修改文件：`public/js/app.js`

- 新增 `renderMessageWithAttachments()` 方法
- 增强 `addMessageToUI()` 支持附件渲染

### 第五阶段：数据库迁移与兼容（预计 0.5 天）

#### 3.5.1 修改文件：`server/db/init.js`

- 执行 ALTER TABLE 添加 `product_documents` 新字段
- 创建 `uploads/products/{id}/images/` 和 `uploads/products/{id}/documents/` 目录结构
- 迁移现有文件到新目录结构（可选）

### 第六阶段：测试与验证（预计 0.5 天）

#### 测试用例

| 编号 | 测试内容 | 预期结果 |
|------|---------|---------|
| TC01 | 上传PDF说明书 | 文件存入 documents 目录，数据库记录正确 |
| TC02 | 链接本地文件 | 数据库记录 link_type='local'，前端显示标识 |
| TC03 | AI查询附件 | Agent 返回附件列表和下载链接 |
| TC04 | 聊天窗口下载 | 点击下载按钮可获取文件 |
| TC05 | 删除附件 | 文件删除，数据库记录清除 |
| TC06 | 视频文件上传与播放 | 支持 mp4 格式，聊天窗口可播放 |

---

## 四、文件修改清单

| 文件 | 操作 | 预估改动量 | 阶段 |
|------|------|-----------|------|
| `server/routes/documents.js` | **新增** | ~180行 | 一 |
| `server/index.js` | 修改 | +3行 | 一 |
| `server/db/init.js` | 修改 | +15行 | 一、五 |
| `public/index-new.html` | 修改 | ~200行 | 二、四 |
| `public/js/app.js` | 修改 | ~250行 | 二、四 |
| `public/js/api/products.js` | 修改 | +30行 | 二 |
| `server/agent/tools/definitions.js` | 修改 | +50行 | 三 |
| `server/agent/tools/executor.js` | 修改 | +80行 | 三 |
| `server/agent/index.js` | 修改 | +10行 | 三 |

**总计新增/修改：~820 行代码，涉及 9 个文件**

---

## 五、进度管理

### 5.1 甘特图

```
阶段                    | 天数 | D1 | D2 | D3 | D4 | D5 |
------------------------|------|----|----|----|----|----|
一、后端文档API         |  1   | ██ |    |    |    |    |
二、前端附件管理界面     |  1.5 |    | ██ | █  |    |    |
三、AI Agent工具扩展    |  0.5 |    |    |    | █  |    |
四、AI聊天窗口增强      |  1   |    |    |    | ██ |    |
五、数据库迁移与兼容     |  0.5 |    |    |    |    | █  |
六、测试与验证          |  0.5 |    |    |    |    | █  |
```

### 5.2 进度跟踪表

| 阶段 | 文件 | 状态 | 完成日期 | 备注 |
|------|------|------|---------|------|
| 一 | `server/routes/documents.js` | ⬜ 待开始 | | |
| 一 | `server/index.js` | ⬜ 待开始 | | |
| 一 | `server/db/init.js` | ⬜ 待开始 | | |
| 二 | `public/index-new.html` (附件管理) | ⬜ 待开始 | | |
| 二 | `public/js/app.js` (附件管理) | ⬜ 待开始 | | |
| 二 | `public/js/api/products.js` | ⬜ 待开始 | | |
| 三 | `server/agent/tools/definitions.js` | ⬜ 待开始 | | |
| 三 | `server/agent/tools/executor.js` | ⬜ 待开始 | | |
| 三 | `server/agent/index.js` | ⬜ 待开始 | | |
| 四 | `public/index-new.html` (聊天增强) | ⬜ 待开始 | | |
| 四 | `public/js/app.js` (聊天增强) | ⬜ 待开始 | | |
| 五 | `server/db/init.js` (迁移) | ⬜ 待开始 | | |
| 六 | 测试验证 | ⬜ 待开始 | | |

### 5.3 状态标识

| 标识 | 含义 |
|------|------|
| ⬜ 待开始 | 尚未开始 |
| 🔄 进行中 | 正在实施 |
| ✅ 已完成 | 实施完成 |
| ❌ 已阻塞 | 遇到问题需要解决 |
| 📌 待验证 | 需要测试确认 |

---

## 六、风险与应对

| 风险 | 影响 | 概率 | 应对方案 |
|------|------|------|---------|
| 现有数据库已有 product_documents 表但无新字段 | 功能不完整 | 高 | 使用 ALTER TABLE 添加字段，兼容旧数据 |
| 大文件上传超时 | 用户体验差 | 中 | 前端显示上传进度条，后端增加文件大小限制提示 |
| 本地文件链接跨平台路径问题 | 链接失效 | 中 | 存储时统一转为相对路径，前端提示"本地文件"性质 |
| AI Agent 返回格式不稳定 | 前端解析失败 | 低 | 前端做容错处理，无法解析时显示原始文本 |
| 视频文件过大导致浏览器卡顿 | 性能问题 | 中 | 视频默认不自动播放，点击后才加载 |

---

## 七、验收标准

- [ ] 每个产品可以独立管理图片和文档附件
- [ ] 支持上传 PDF、图片、视频文件
- [ ] 支持链接本地文件（不复制，仅记录路径）
- [ ] 文件按产品ID分目录存储
- [ ] AI Agent 可以查询产品附件并返回下载链接
- [ ] 聊天窗口中的文件链接可点击下载/预览
- [ ] 删除产品时可选是否清理附件文件
- [ ] 所有 API 有权限验证