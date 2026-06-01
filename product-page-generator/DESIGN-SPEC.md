# 统一设计规范

> 版本 2.1.0 | 极简三色系统 | 放大字体

---

## 设计原则

### 极简主义

仅使用 **3种颜色**，严格控制比例：

| 颜色 | 占比 | 用途 |
|------|------|------|
| **白色** | 50% | 背景、卡片、表面 |
| **灰色** | 35% | 文字、边框、分隔 |
| **蓝色** | 15% | 点缀、强调、交互 |

---

## 颜色系统

### 白色系 (50%)

```
--color-white:       #ffffff   纯白 - 卡片、输入框背景
--color-white-soft:  #f8f9fa   柔和白 - 页面背景
--color-white-muted: #f1f3f5   弱化白 - 禁用态背景
```

### 灰色系 (35%)

```
--color-gray-900:    #111827   最深 - 主文字
--color-gray-700:    #374151   深灰 - 强调文字
--color-gray-500:    #6b7280   中灰 - 次级文字
--color-gray-300:    #d1d5db   浅灰 - 边框
--color-gray-200:    #e5e7eb   更浅 - 细边框
--color-gray-100:    #f3f4f6   最浅 - 悬浮背景
```

### 蓝色系 (15%)

```
--color-blue-700:    #1d4ed8   深蓝 - 悬停态
--color-blue-600:    #2563eb   主蓝 - 按钮、链接
--color-blue-500:    #3b82f6   亮蓝 - 焦点边框
--color-blue-100:    #dbeafe   浅蓝 - 选中背景
--color-blue-50:     #eff6ff   极浅蓝 - 悬浮背景
```

---

## 字体系统 (已放大)

### 字体大小

| 令牌 | 大小 | 用途 |
|------|------|------|
| `--text-xs` | 14px | 最小文字（标签、提示） |
| `--text-sm` | 16px | 小号文字（描述、说明） |
| `--text-base` | 18px | 基础文字（正文、规格） |
| `--text-lg` | 20px | 大号文字（卖点、标题） |
| `--text-xl` | 24px | 副标题 |
| `--text-2xl` | 32px | 区块标题 |
| `--text-3xl` | 42px | 页面副标题 |
| `--text-4xl` | 56px | 页面主标题 |

### 字体对比（优化前 vs 优化后）

| 元素 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 最小文字 | 12px | 14px | +2px |
| 描述文字 | 14px | 16px | +2px |
| 正文 | 16px | 18px | +2px |
| 卖点 | 18px | 20px | +2px |
| 功能标题 | 19px | 20px | +1px |
| 区块标题 | 32px | 32px | - |

---

## 语义令牌

### 背景

| 令牌 | 浅色值 | 用途 |
|------|--------|------|
| `--bg-page` | `#f8f9fa` | 页面背景 |
| `--bg-surface` | `#ffffff` | 卡片、模态框 |
| `--bg-input` | `#ffffff` | 输入框背景 |
| `--bg-hover` | `#f3f4f6` | 悬浮态背景 |

### 文字

| 令牌 | 浅色值 | 用途 |
|------|--------|------|
| `--text-primary` | `#111827` | 主文字 |
| `--text-secondary` | `#6b7280` | 次级文字 |
| `--text-tertiary` | `#d1d5db` | 占位文字 |
| `--text-inverse` | `#ffffff` | 反色文字(深色底) |

### 边框

| 令牌 | 浅色值 | 用途 |
|------|--------|------|
| `--border-light` | `#e5e7eb` | 细边框 |
| `--border-default` | `#d1d5db` | 默认边框 |
| `--border-focus` | `#3b82f6` | 焦点边框 |

### 强调色

| 令牌 | 浅色值 | 用途 |
|------|--------|------|
| `--accent` | `#2563eb` | 主按钮、链接 |
| `--accent-hover` | `#1d4ed8` | 悬停态 |
| `--accent-light` | `#eff6ff` | 浅蓝背景 |
| `--accent-soft` | `#dbeafe` | 选中背景 |

---

## 组件规范

### 按钮

```html
<!-- 主要操作 - 蓝色 -->
<button class="btn btn-primary">保存</button>

<!-- 次要操作 - 白底灰边 -->
<button class="btn btn-secondary">取消</button>

<!-- 小尺寸 -->
<button class="btn btn-primary btn-sm">小按钮</button>
```

**规则：**
- 主按钮：蓝底白字，用于主要操作
- 次按钮：白底灰边黑字，用于次要操作
- 每个界面最多1个主按钮
- 按钮文字简洁，2-4个字

### 表单

```html
<div class="form-group">
    <label>标签</label>
    <input type="text" placeholder="请输入">
</div>
```

**规则：**
- 输入框白底灰边
- 聚焦时蓝色边框
- placeholder 使用 `--text-tertiary`

### 卡片

```html
<div class="card">
    <div class="card-header">
        <h3>标题</h3>
    </div>
    <!-- 内容 -->
</div>
```

**规则：**
- 白底、浅灰边框、微阴影
- 标题与内容用细线分隔

### 表格

**规则：**
- 表头浅灰背景
- 行悬浮浅灰背景
- 边框使用 `--border-light`

### 标签页

**规则：**
- 容器浅灰背景
- 激活项白底黑字
- 未激活项灰色文字

### 细节图片卡片

```html
<div class="detail-images-grid">
    <div class="detail-image-card">
        <div class="detail-image-wrapper">
            <img src="[DETAIL_IMAGE]" alt="[DETAIL_TITLE]">
        </div>
        <div class="detail-image-caption">
            <h4 class="detail-image-title">[DETAIL_TITLE]</h4>
            <p class="detail-image-desc">[DETAIL_DESC]</p>
        </div>
    </div>
</div>
```

**规则：**
- 2列网格布局，响应式单列
- 图片比例 4:3
- 悬浮时图片微放大
- 标题 20px，描述 16px
- 边框浅灰，悬浮变蓝

---

## 多语言支持

### 大模型实时翻译（推荐）

使用AI大模型实时翻译产品数据，支持任意语言，无需修改数据库。

### 预览界面语言切换

在产品预览模态框的工具栏中，用户可以切换预览语言：

**位置：** 预览模态框 → 模板选择器右侧

```
模板: [详情页 ▼]  语言: [🇨🇳 中文 ▼]
```

### 支持的语言

| 语言代码 | 语言名称 | 国旗 |
|----------|----------|------|
| `zh` | 中文 | 🇨🇳 |
| `en` | English | 🇺🇸 |
| `ja` | 日本語 | 🇯🇵 |
| `de` | Deutsch | 🇩🇪 |
| `fr` | Français | 🇫🇷 |
| `es` | Español | 🇪🇸 |
| `ko` | 한국어 | 🇰🇷 |
| `ru` | Русский | 🇷🇺 |

### 翻译流程

```
1. 用户打开产品预览（默认中文）
2. 选择目标语言（如 English）
3. 显示加载动画
4. 调用 /api/translate 接口
5. 大模型翻译产品数据
6. 缓存翻译结果
7. 渲染翻译后的预览
```

### 翻译API

**请求：**
```javascript
POST /api/translate
{
    "content": {
        "name": "自行车维修架",
        "subtitle": "专业级维修工具",
        "highlights": [{ "key": "承重", "value": "50kg" }],
        "specs": [{ "label": "材质", "value": "铝合金" }]
    },
    "targetLang": "en",
    "sourceLang": "zh"
}
```

**响应：**
```javascript
{
    "translated": {
        "name": "Bike Repair Stand",
        "subtitle": "Professional Maintenance Tool",
        "highlights": [{ "key": "Load Capacity", "value": "50kg" }],
        "specs": [{ "label": "Material", "value": "Aluminum Alloy" }]
    }
}
```

### 翻译缓存

- 每个产品+语言组合只翻译一次
- 缓存在浏览器内存中（Map对象）
- 关闭预览后缓存清除
- 同一会话内切换语言即时显示

### 翻译内容

| 数据类型 | 字段 |
|----------|------|
| 产品信息 | name, subtitle, description |
| 核心卖点 | highlight_key, highlight_value |
| 产品规格 | spec_label, spec_value |
| 功能亮点 | feature_title, description |
| 适配尺寸 | dim_label, dim_value |
| 包装清单 | accessory_name |

### 预览界面翻译对照表

| 键名 | 中文 | English |
|------|------|---------|
| `features` | 功能亮点 | FEATURES |
| `specifications` | 产品规格 | SPECIFICATIONS |
| `dimensions` | 适配尺寸 | DIMENSIONS |
| `package-includes` | 包装清单 | PACKAGE INCLUDES |
| `key-highlights` | 核心卖点 | KEY HIGHLIGHTS |
| `preview-title` | 产品详情预览 | Product Preview |

### 模板文件语言切换器

右上角固定位置的语言切换按钮：

```html
<div class="lang-switcher">
    <button class="lang-btn active" data-lang="zh">中文</button>
    <button class="lang-btn" data-lang="en">EN</button>
</div>
```

### 模板翻译对照表

| 键名 | 中文 | English |
|------|------|---------|
| `page-title` | 产品详情 | Product Details |
| `section-features` | 核心卖点 | Key Features |
| `section-specs` | 产品规格 | Specifications |
| `section-details` | 细节展示 | Details |
| `section-highlights` | 功能亮点 | Highlights |

### 使用方法

**预览界面：**
- 点击产品列表中的"查看"按钮打开预览
- 在预览工具栏中选择语言下拉框
- 选择目标语言，等待1-3秒完成翻译
- 翻译结果自动缓存

**模板文件：**
```html
<h2 class="section-title" data-i18n="section-specs">产品规格</h2>
```

- 添加 `data-i18n` 属性标记需要翻译的元素
- 默认显示中文文本
- JavaScript 自动根据语言切换内容

### 语言持久化

- 用户选择的语言会保存到 `localStorage`
- 刷新页面后自动恢复上次选择的语言
- 预览界面：`preview-lang`
- 模板文件：`product-lang`

### 成本分析

| 项目 | 说明 |
|------|------|
| Ollama本地模型 | **免费** ✅ |
| 每次翻译 | 约500-1000 tokens |
| 延迟 | 1-3秒 |
| 缓存后 | 即时显示 |

---

## 间距系统

```
--space-1:  4px   紧凑间距
--space-2:  8px   元素内间距
--space-3:  12px  组件内间距
--space-4:  16px  相关元素间距
--space-5:  20px  区块内间距
--space-6:  24px  卡片内边距
--space-8:  32px  区块间距
--space-10: 40px  大区块间距
--space-12: 48px  页面级间距
```

---

## 圆角系统

```
--radius-sm:  4px   小按钮、标签
--radius-md:  6px   输入框、按钮
--radius-lg:  8px   卡片
--radius-xl:  12px  模态框
--radius-full: 9999px 徽章、头像
```

---

## 阴影系统

```
--shadow-xs:  0 1px 2px rgba(0,0,0,0.04)   极微
--shadow-sm:  0 1px 3px rgba(0,0,0,0.06)   轻微
--shadow-md:  0 4px 6px rgba(0,0,0,0.06)   中等
--shadow-lg:  0 10px 15px rgba(0,0,0,0.06)  较大
--shadow-xl:  0 20px 25px rgba(0,0,0,0.08)  最大
```

---

## 对比度检查

| 组合 | 对比度 | 评级 |
|------|--------|------|
| `--text-primary` on `--bg-surface` | 16.7:1 | AAA ✅ |
| `--text-secondary` on `--bg-surface` | 5.9:1 | AA ✅ |
| `--text-inverse` on `--accent` | 5.1:1 | AA ✅ |
| `--text-tertiary` on `--bg-surface` | 1.8:1 | ❌ 仅装饰用 |

---

## 文件结构

```
public/css/
├── design-tokens.css      # 设计令牌（颜色、间距、圆角等）
├── themes-light-dark.css  # 主题切换（过渡动画、切换按钮）
├── main.css               # 主样式（布局、表单、卡片、表格）
├── components.css         # 组件样式（按钮、标签页、模态框、Excel表）
└── themes.css             # 主题样式（AI助手、Toast、状态指示器）
```

---

## 使用示例

### 正确 ✅

```css
.element {
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border-light);
}
```

### 错误 ❌

```css
.element {
    background: #ffffff;      /* 不要硬编码颜色 */
    color: #000000;           /* 不要硬编码颜色 */
}
```

---

*文档版本: 2.0.0 | 更新日期: 2026-05-10*