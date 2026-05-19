# ProjectClassmate 🧑‍🏫

> VS Code 扩展 — 面向编程初学者的项目分析学习助手

打开任意 Python 项目，一键生成 **教学式分析报告**：技术栈、架构设计、模块拆解、学习难点、延申推荐。像有一位导师陪伴你阅读代码。

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🔍 **项目全景扫描** | 自动解析目录结构、模块划分、类/函数统计、入口文件 |
| 🤖 **AI 教学报告** | LLM 驱动，按"概览 → 架构 → 模块 → 难点 → 延申"五章流式输出 |
| 🛠 **技术栈识别** | 解析 requirements.txt / pyproject.toml / setup.py，按 Web/数据库/ML 等分类 |
| 🚀 **延申学习推荐** | 基于当前技术栈，自动推荐可升级、替代、补充的进阶方向 |
| 💬 **交互式问答** | 在报告中直接追问，深入理解任意技术点 |
| 📊 **流式渐进展示** | 分析过程实时可见，边等边学，不是空白等待 |

---

## 🎯 MVP 范围 (v0.1.0)

| 维度 | 当前支持 |
|------|----------|
| 编程语言 | Python |
| LLM 后端 | OpenAI / Anthropic / Ollama / 自建兼容端点 |
| 分析深度 | 项目级 + 模块级 |
| 报告语言 | 中文 / English |
| 触发方式 | 手动命令（`Ctrl+Shift+P`） |

---

## 📥 安装

### 方式一：从 .vsix 安装（推荐）

```bash
# 1. 先打包（如果还没有 .vsix）
cd ProjectClassmate
npm install
cd webview-ui && npm install && npm run build && cd ..
npm run compile
npx vsce package --allow-missing-repository --no-dependencies

# 2. 安装
code --install-extension projectclassmate-0.1.0.vsix
```

### 方式二：F5 开发模式

```bash
cd ProjectClassmate
code .
# 按 F5 启动 Extension Development Host
```

---

## 🚀 使用

### 第一步：配置 API Key

1. `Ctrl+Shift+P` → 输入 `ProjectClassmate` → 选择 **"设置 API Key"**
2. 选择你的 LLM 提供商（OpenAI / Anthropic / Ollama / 自定义）
3. 输入 API Key 并确认

### 第二步：分析项目

1. 在 VS Code 中打开任意 Python 项目文件夹
2. `Ctrl+Shift+P` → **"ProjectClassmate: 分析项目"**
3. 右侧弹出分析面板，流式展示报告（约 10-30 秒完成）
4. 点击技术栈标签或使用底部输入框进行追问

---

## ⚙️ 配置项

在 VS Code `settings.json` 中：

```jsonc
{
  // ── LLM ──
  "projectclassmate.llm.provider": "openai",       // openai | anthropic | ollama | custom
  "projectclassmate.llm.model": "gpt-4o",           // 模型名
  "projectclassmate.llm.endpoint": "",              // 自定义端点（Ollama: http://localhost:11434/v1）

  // ── 分析 ──
  "projectclassmate.analysis.maxDepth": "module",   // module | function（后续）
  "projectclassmate.analysis.maxFileSize": 5000,    // 跳过超过此行数的文件
  "projectclassmate.analysis.includeTests": true,   // 是否包含测试目录

  // ── UI ──
  "projectclassmate.ui.language": "zh"              // zh | en
}
```

API Key 存储在 VS Code 的配置中（`projectclassmate.llm.apiKeys.<provider>`）。

---

## 🏗 技术架构

```
ProjectClassmate/
│
├── src/                          # VS Code Extension (TypeScript)
│   ├── extension.ts              # 入口，注册两条命令
│   ├── types.ts                  # 全量类型定义
│   ├── config/settings.ts        # 配置读取、API Key 管理
│   ├── pipeline/
│   │   ├── static-analyzer.ts    # Python 目录扫描、AST-lite、依赖解析、模式检测
│   │   ├── prompt-builder.ts     # 系统提示词 & 用户报告 prompt 构建
│   │   └── orchestrator.ts       # 流水线调度：静态分析 → LLM 分析 → 延申推荐
│   ├── llm/
│   │   └── provider.ts           # OpenAI / Anthropic / Ollama 三套流式 API 实现
│   └── webview/
│       ├── panel.ts              # Webview Panel 生命周期 & 消息路由
│       └── messaging.ts          # Extension ↔ Webview 类型安全消息协议
│
├── webview-ui/                   # React 前端 (TypeScript + Vite)
│   └── src/
│       ├── App.tsx               # 主布局：Header / 侧边栏 / 报告区 / 追问栏
│       ├── components/
│       │   ├── OutlineTree.tsx   # 左侧模块树 & 技术栈分类树
│       │   ├── ReportView.tsx    # 流式 Markdown 报告渲染（react-markdown）
│       │   ├── TechBadge.tsx     # 技术栈彩色标签
│       │   ├── ExtensionPanel.tsx # 延申学习推荐卡片
│       │   └── AskPanel.tsx      # 底部追问输入框
│       ├── hooks/
│       │   └── useStreamReport.ts # 流式消息状态管理
│       ├── types.ts              # 前端类型（与扩展侧镜像）
│       ├── styles.css            # 完整 UI 样式（适配 VS Code 亮/暗主题）
│       └── main.tsx              # React 入口
│
├── test/fixtures/sample-flask-app/  # 测试用 Flask + SQLAlchemy 示例项目
├── package.json                     # VS Code 扩展清单（命令、配置项、激活事件）
├── tsconfig.json
└── .vscode/                         # F5 调试配置
```

### 数据流

```
                     Ctrl+Shift+P 触发
                          │
          ┌───────────────▼───────────────┐
          │   orchestrator.ts (Pipeline)   │
          │                                │
          │  Phase 1: static-analyzer.ts   │──▶ 目录扫描 / AST解析 / 依赖识别
          │  Phase 2: LLM stream report    │──▶ 流式输出到 Webview
          │  Phase 3: extension recommend  │──▶ 技术延申推荐
          └───────────────┬───────────────┘
                          │ postMessage (ExtensionMessage)
          ┌───────────────▼───────────────┐
          │   Webview Panel (React)        │
          │   useStreamReport Hook          │
          │   ReportView (react-markdown)   │
          │   OutlineTree / TechBadge ...   │
          └───────────────────────────────┘
```

### 分析引擎细节

**静态分析层**（纯本地，无需网络）：
- 递归扫描 Python 文件，跳过 `__pycache__`、`node_modules`、隐藏目录
- 正则 + 缩进推断解析顶层 `class`/`def`、装饰器、docstring、方法列表
- 解析 `requirements.txt`、`pyproject.toml`、`setup.py` 提取依赖
- 将 100+ 常见 Python 库归入 8 个类别（Web / 数据库 / ML / 测试 / CLI 等）
- 检测代码模式：ORM 模型、Pydantic 模型、路由注册、端点函数、异步任务、入口点

**LLM 分析层**：
- 将静态分析结果构建为结构化 prompt
- 要求 LLM 以 `[SECTION:xxx]` 标记分段输出
- 流式解析响应，实时推送到 Webview
- 延申推荐通过独立 short prompt 获取，解析为 JSON 卡片

---

## 🛠 开发

```bash
# 编译 Extension
npm run watch

# 启动 Webview 开发服务器
cd webview-ui && npm run dev

# 构建 Webview 生产包
npm run build:webview

# 完整打包
npx vsce package --allow-missing-repository --no-dependencies
```

> 开发 Webview 时，需将 `panel.ts` 中 `isDev` 设为 `true` 以连接 Vite dev server。

---

## 🗺 路线图

- [x] v0.1 — Python 项目全景分析 + 多 LLM 后端 + 流式报告 + 交互问答
- [ ] v0.2 — 学习记录/进度追踪（记录已学模块、标记掌握度）
- [ ] v0.3 — 函数级分析深度、关键代码片段高亮
- [ ] v0.4 — 多语言支持（JavaScript/TypeScript）
- [ ] v1.0 — 项目对比分析、团队学习协作

---

## 📄 License

MIT
