# 模块化拆分进度文档

## 目标
将 `public/index.html`（约1284行）拆分为低耦合、边界清晰的模块化架构，支持多人协作开发。

## 架构设计

```
public/
├── index.html                    # 入口文件（极简，仅加载模块）✅
├── css/                          # 已模块化 ✅
├── js/                           # 已模块化 ✅
│
├── pages/                        # 【新增】页面模块
│   ├── login/                    # 登录页 ✅
│   ├── products/                 # 产品列表 ✅
│   ├── image-to-product/         # 图片识别产品 ✅
│   ├── attachments/              # 附件管理 ✅
│   ├── agent/                    # AI助手 ✅
│   └── settings/                 # 设置页 ✅
│
├── components/                   # 【新增】可复用组件
│   ├── modal/                    # 通用模态框 ✅
│   ├── toast/                    # Toast提示 ✅
│   ├── data-section/             # 可折叠数据区 ✅
│   ├── image-upload/             # 图片上传 ✅
│   ├── preview-modal/            # 产品预览 ✅
│   ├── ai-chat/                  # AI聊天窗口 ✅
│   └── csv-import/               # CSV导入 ✅
│
└── core/                         # 【新增】核心框架
    ├── router.js                 # 页面路由 ✅
    ├── event-bus.js              # 跨模块通信 ✅
    └── page-loader.js            # 页面加载器 ✅
```

## 拆分进度

### 阶段一：基础设施
| 任务 | 状态 | 负责人 | 备注 |
|------|------|--------|------|
| 创建目录结构 | ✅ 已完成 | - | pages/, components/, core/ |
| core/router.js | ✅ 已完成 | - | 页面路由系统 |
| core/event-bus.js | ✅ 已完成 | - | 跨模块事件通信 |
| core/page-loader.js | ✅ 已完成 | - | 动态页面加载+缓存 |
| 重构 index.html 为入口 | ✅ 已完成 | - | 从1284行精简到364行 |

### 阶段二：公共组件
| 任务 | 状态 | 负责人 | 备注 |
|------|------|--------|------|
| components/toast/ | ✅ 已完成 | - | Toast提示组件 |
| components/modal/ | ✅ 已完成 | - | 通用模态框+产品表单 |
| components/data-section/ | ✅ 已完成 | - | 可折叠数据区(5种类型) |
| components/image-upload/ | ✅ 已完成 | - | 图片上传组件 |
| components/preview-modal/ | ✅ 已完成 | - | 产品预览模态框 |
| components/ai-chat/ | ✅ 已完成 | - | AI聊天窗口 |
| components/csv-import/ | ✅ 已完成 | - | CSV导入模态框 |

### 阶段三：页面模块
| 任务 | 状态 | 负责人 | 备注 |
|------|------|--------|------|
| pages/login/ | ✅ 已完成 | - | 登录页面 |
| pages/products/ | ✅ 已完成 | - | 产品列表+详情 |
| pages/image-to-product/ | ✅ 已完成 | - | 图片识别产品 |
| pages/attachments/ | ✅ 已完成 | - | 附件管理 |
| pages/agent/ | ✅ 已完成 | - | AI助手页面 |
| pages/settings/ | ✅ 已完成 | - | 设置页面 |

### 阶段四：集成与验证
| 任务 | 状态 | 负责人 | 备注 |
|------|------|--------|------|
| app.js 集成路由 | ✅ 已完成 | - | init/switchTab/logout 已适配 |
| 全局组件动态加载 | ✅ 已完成 | - | _loadGlobalComponents() |
| Tab事件绑定 | ✅ 已完成 | - | data-page 属性驱动 |
| 功能回归测试 | ⬜ 待测试 | - | 启动服务器验证 |
| 样式一致性检查 | ⬜ 待测试 | - | 主题切换正常 |

## 模块职责边界

| 模块 | 文件范围 | 职责 | 依赖 |
|------|----------|------|------|
| core/ | core/*.js | 路由、通信、加载 | 无 |
| components/ | components/*/ | 可复用UI组件 | core/event-bus.js |
| pages/login/ | pages/login/* | 用户认证 | js/api/auth.js |
| pages/products/ | pages/products/* | 产品CRUD | js/api/products.js, components/ |
| pages/image-to-product/ | pages/image-to-product/* | OCR识别 | js/api/, components/ |
| pages/attachments/ | pages/attachments/* | 文件管理 | js/api/, components/ |
| pages/agent/ | pages/agent/* | AI对话 | js/api/agent.js, components/ |
| pages/settings/ | pages/settings/* | 系统配置 | js/api/settings.js |

## 通信规范
- 页面间通信：通过 `core/event-bus.js` 发布/订阅事件
- 页面内通信：直接调用模块方法
- 全局状态：通过 `js/stores/appState.js` 管理
- API调用：通过 `js/api/` 模块统一调用

## 命名规范
- 页面文件：`{page-name}.html`, `{page-name}.css`, `{page-name}.js`
- 组件文件：`{component-name}.html`, `{component-name}.css`, `{component-name}.js`
- CSS类名：沿用现有 BEM 风格
- JS导出：每个模块 export 一个主类

## 文件统计

| 指标 | 拆分前 | 拆分后 |
|------|--------|--------|
| index.html 行数 | 1284 | 364 |
| 模块文件数 | 1 | 28 |
| 最大单文件行数 | 1284 | ~200 (settings.html) |
| 可并行开发人数 | 1 | 6+ |

---
*最后更新：2026-05-10*