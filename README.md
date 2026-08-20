# Chatbot Demo — BYOK 简易聊天控制台

> 自带 API Key 的极简 Chatbot 应用：配置三项参数即可连接任意 OpenAI 兼容服务。
> 定位为 [NextChat](https://github.com/ChatGPTNextWeb/NextChat) 的**简化版** —— 无用户系统、无插件、无多模型管理，只聚焦「聊天 + 配置」。

![tech](https://img.shields.io/badge/Vite-6-purple) ![ts](https://img.shields.io/badge/TypeScript-5.5-blue) ![react](https://img.shields.io/badge/React-19-61dafb) ![tailwind](https://img.shields.io/badge/Tailwind-3.4-06b6d4) ![zustand](https://img.shields.io/badge/Zustand-4.5-orange) ![electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white) [![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel)](https://chatbot-eight-theta-30.vercel.app/chat)

## 🚀 在线 Demo

👉 **[Chatbot Demo — BYOK 简易聊天](https://chatbot-eight-theta-30.vercel.app/chat)**

打开后点击「参数设置」，填入你的 Base URL / API Key / Model 即可开始使用。

## 📦 仓库地址

- **GitHub**: https://github.com/Nolan180940/chatbot-demo
- **在线 Demo**: https://chatbot-eight-theta-30.vercel.app/chat
- **部署指南**: 见 [USER-SETUP.md](./USER-SETUP.md)
- **逆向分析**: 见 [PROMPT.md](./PROMPT.md)
- **技术方案**: 见 [PLAN.md](./PLAN.md)

快速开始：

```bash
git clone https://github.com/Nolan180940/chatbot-demo.git
cd chatbot-demo
npm install
npm run dev          # Web 开发：http://localhost:3015
npm run electron:dev # 桌面端开发：自动拉起 Vite + Electron 窗口
npm run build        # 构建：输出 dist/（静态站 + Vercel 部署）
```

> 📘 **打包 / 调试教程**：见 [USER-SETUP.md](./USER-SETUP.md)（含如何把桌面版打包成 Windows 安装包）。

---

## ✨ 项目概述与技术栈

### 它能做什么

- 💬 **多轮对话**：新建 / 切换 / 删除会话，历史消息本地持久化
- ⚡ **流式响应**：SSE 逐字输出，支持「停止生成」
- 🔑 **BYOK 模式**：仅需 `Base URL` / `API Key` / `Model ID` 三项参数
- 🧪 **连接测试**：一键 `ping` 验证配置可用性
- 📄 **Markdown 渲染**：代码块、表格、GFM；**LaTeX 数学公式**（KaTeX，行内 `$...$` + 块级 `$$...$$`）
- 💾 **会话导出**：单个会话 / 全部会话导出为 JSON
- 📊 **Token 统计**：本地启发式估算与按会话排行
- 📐 **响应式侧边栏**：桌面端可折叠/展开，手机端自动变为抽屉菜单（汉堡按钮 + 遮罩）
- 🧩 **SKILL 管理系统**：导入 / 编辑 / AI 创建 AgentSkills（`SKILL.md`），遵循 colleague-skill 开放标准
- 🖥️ **桌面应用**：Electron 封装同一套代码，可打包 Windows 安装包（NSIS .exe），无需浏览器

### 技术栈

| 分类 | 选型 |
|------|------|
| 框架 | Next.js 14（App Router）+ TypeScript |
| UI | React 18 + Tailwind CSS（夜间控制台主题） |
| 状态 | Zustand（含 persist 中间件） |
| Markdown | react-markdown + remark-gfm + remark-math + rehype-katex（KaTeX 渲染 LaTeX） |
| 字体 | Space Grotesk / IBM Plex Sans / IBM Plex Mono（next/font 自托管） |
| 后端 | Next.js Route Handler 同源代理（无独立后端） |
| 桌面端 | Electron 33 + electron-builder（Windows NSIS 安装包） |

---

## 🧩 SKILL 管理系统

遵循 [colleague-skill](https://github.com/titanwings/colleague-skill)（AgentSkills 开放标准）的 SKILL 管理，位于 `/skills` 页面：

- **📥 导入**：拖拽 / 点击选择本地 `SKILL.md`（多文件批量），自动解析 frontmatter 并做**格式校验**（必填字段、命名规范、PART A/B 结构）；slug 冲突时提示覆盖或重命名。**桌面端**额外支持「从本机选择文件」和「递归扫描目录（`**/SKILL.md`）」
- **✨ AI 创建**：多轮对话收集需求（人格类 / 功能性向导）→ 按 colleague-skill 规范自动生成 `SKILL.md` → 自动校验（不合格自动修正，最多 2 轮）→ 预览确认后入库
- **✏️ 编辑器**：CodeMirror 6 Markdown 编辑（语法高亮、自动补全、撤销/重做）+ 结构化模板插入 + **实时预览**（同一套 KaTeX 渲染管线）+ 行级校验提示
- **🕘 版本历史**：每次保存自动追加版本快照（上限 50），支持一键回滚
- **💾 存储**：本地 `localStorage`（`skill-docs-v1`），无服务端依赖；桌面端可导出 `.md` 到本地文件

### SKILL.md 格式

```markdown
---
name: colleague_zhangsan   # 小写字母/数字/下划线
description: 一句话描述
user-invocable: true
---

# 显示名称

## PART A: Work      ← 功能性 SKILL（功能描述/使用方法/参数配置/工作流程）
## PART B: Persona    ← 人格类 SKILL（硬规则/身份/表达风格/决策模式/人际行为/Correction）
## Operating Rules
```

---

## 🏗️ 整体架构

采用**前后端一体**的单一 Next.js 应用：

```
浏览器 (React 组件)
   │  ① 用户输入 → 写入 Zustand store
   │  ② streamChat() 发起请求
   ▼
/api/chat (Next.js Route Handler)  ← 唯一后端
   │  ③ 校验参数 / SSRF 白名单 / 120s 超时
   ▼
{baseUrl}/v1/chat/completions  ← 任意 OpenAI 兼容服务
   ▲  ④ SSE 流原样透传（剥 CORS 头、禁缓冲）
```

**核心设计**：浏览器不直连第三方模型（规避 CORS），而是请求**同源代理** `/api/chat`，由代理转发到用户指定的 `baseUrl`。这样既统一了错误/超时处理，也**无需任何服务端环境变量** —— 密钥只存在于浏览器 localStorage。点击「停止生成」时客户端会 abort 请求，代理监听 `req.signal` **同步取消上游调用**，避免模型继续生成浪费 token。

### 桌面端（Electron 封装）

同一套 Next.js 应用被 Electron 复用为桌面程序：

```
Electron 主进程 (electron/main.js)
   │  ① 启动 Next.js standalone 服务（.next/standalone/server.js，纯 Node 运行）
   ▼
BrowserWindow 加载 http://127.0.0.1:<随机端口>  ← 渲染同一套 Web UI
```

- 桌面版**复用完全相同的前端代码**，只是用系统窗口承载，数据仍存浏览器 localStorage
- `next.config.mjs` 的 `output: "standalone"` 让 `next build` 额外产出可独立运行的 Node 服务；**与 Vercel 网页部署兼容，互不影响**
- 打包链路：`next build` → `scripts/copy-standalone.mjs` 拷贝静态资源 → `electron-builder` 产出 NSIS 安装包

---

## 📂 目录结构详解

```
chatbot-demo/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # 根布局：加载三个字体、引入全局样式
│   ├── page.tsx                      # 根路由：重定向到 /chat
│   ├── globals.css                   # Tailwind 指令 + 主题变量 + Markdown 样式
│   ├── chat/page.tsx                 # 聊天页：无会话时自动创建
│   ├── settings/page.tsx             # 设置页：Sidebar + SettingsPanel
│   ├── stats/page.tsx                # 统计页：Sidebar + StatsPanel
│   ├── skills/page.tsx               # SKILL 库：列表 + 搜索/筛选 + 导入入口
│   ├── skills/create/page.tsx        # AI 创建向导
│   ├── skills/[id]/page.tsx          # SKILL 编辑器页（编辑/预览/校验/版本）
│   └── api/chat/route.ts             # ★ 后端代理：转发 LLM 请求
│
├── components/                       # UI 组件
│   ├── chat/
│   │   ├── ChatWindow.tsx            # 顶部状态栏 + 单会话导出 + 组合列表/输入
│   │   ├── MessageList.tsx           # 消息滚动容器 + 空态欢迎屏
│   │   ├── MessageItem.tsx           # 单条消息（KaTeX 渲染 LaTeX）
│   │   └── ChatInput.tsx             # 控制台式输入框（发送/停止）
│   ├── sidebar/
│   │   ├── Sidebar.tsx               # 左栏：logo、导航、会话列表、导出全部（可折叠）
│   │   └── SidebarLayout.tsx         # 页面外壳：桌面侧边栏 + 手机汉堡按钮/抽屉
│   ├── settings/
│   │   ├── SettingsPanel.tsx         # 三项参数表单 + 预设地址 + 保存
│   │   └── ConnectionTest.tsx        # 连接测试状态卡片
│   ├── stats/StatsPanel.tsx          # Token 统计与会话排行
│   ├── skills/                       # SKILL 管理（colleague-skill 标准）
│   │   ├── SkillImport.tsx           # 导入对话框：拖拽/文件选择/桌面端本机导入
│   │   ├── SkillList.tsx             # SKILL 列表：搜索 + 类型筛选 + 删除
│   │   ├── SkillEditor.tsx           # 编辑器：CodeMirror + 实时预览 + 校验面板
│   │   ├── CodeEditor.tsx            # CodeMirror 6 Markdown 编辑器封装
│   │   ├── SkillPreview.tsx          # Markdown 预览（react-markdown + KaTeX）
│   │   ├── SkillValidationPanel.tsx  # 校验结果（错误/警告，点击跳行）
│   │   ├── SkillVersionHistory.tsx   # 版本时间线 + 回滚
│   │   └── SkillCreateWizard.tsx     # AI 创建向导（选类型→对话→生成→预览）
│   └── ui/Button.tsx                 # 通用按钮
│
├── lib/                              # 业务逻辑
│   ├── types.ts                      # 类型定义（Session/Message/Config）
│   ├── config.ts                     # 默认配置 + 预设 base URL + 超时常量
│   ├── llm.ts                        # ★ streamChat / testConnection 封装
│   ├── token.ts                      # Token 启发式估算
│   ├── export.ts                     # 会话 JSON 导出
│   └── skill/                        # SKILL 领域逻辑
│       ├── types.ts                  # SkillDoc / SkillMeta / ImportResult 等类型
│       ├── schema.ts                 # 命名规则 / 章节常量 / toSlug / makeId
│       ├── parser.ts                 # SKILL.md 解析（gray-matter）
│       ├── validate.ts               # 格式校验（错误/警告分级）
│       ├── template.ts               # 人格类/功能性模板生成
│       ├── storage.ts                # localStorage 持久化 + 版本管理
│       └── prompts.ts                # LLM 提示词（生成/修正/输出解析）
│
├── store/                            # Zustand 状态
│   ├── chat-store.ts                 # 会话/消息 CRUD + autoTitle + persist
│   ├── config-store.ts               # 三项参数 + isReady + persist
│   ├── skill-store.ts                # SKILL 文档 CRUD + 导入（slug 冲突处理）
│   └── ui-store.ts                   # 侧边栏折叠 / 手机抽屉状态（折叠偏好 persist）
│
├── types/css.d.ts                    # CSS 副作用导入声明
├── electron/                         # Electron 桌面壳（main.js 主进程 + preload.js）
├── scripts/
│   └── copy-standalone.mjs           # 把 .next/static、public 拷入 standalone 产物
├── electron-builder.yml              # 桌面打包配置（Windows NSIS 安装包）
├── mock-server.mjs                   # 本地 mock OpenAI 服务（测试流式 / LaTeX）
├── PLAN.md                           # 技术实现方案
├── PROMPT.md                         # 逆向分析文档
├── README.md                         # 本文件
├── USER-SETUP.md                     # 部署与开发指南
├── tailwind.config.ts                # Tailwind 主题（ink/gold/mint 色板 + 字体）
├── postcss.config.mjs
├── next.config.mjs
├── tsconfig.json
└── package.json
```

---

## 🔄 工作流程与模块协作

### 状态流（单一数据源）

```
用户操作 → useChatStore / useConfigStore (Zustand)
                │  persist 自动写 localStorage
                ▼
       组件订阅（useChatStore(s => ...)）→ 响应式重渲染
```

### 一次对话的协作

1. **ChatInput** 校验 `config.isReady()`，未配置则跳 `/settings`
2. 追加用户消息 + 空 assistant 占位，置 `streaming=true`
3. **llm.streamChat** 组装 `{ baseUrl, apiKey, model, messages }` 请求 `/api/chat`
4. **route.ts** 校验 → 转发 → 透传 SSE
5. 每个 delta 触发 **chat-store.updateLastMessage** 增量更新
6. 完成后置 `streaming=false`；出错则在最后一条消息追加错误提示

### 关键约定

- **不可变更新**：`updateLastMessage` 用 `map` 复制数组，保证 React 重渲染
- **错误契约**：所有错误统一为 `{ error: { code, message } }`，客户端据此展示
- **超时**：后端 120s AbortController；连接测试 30s
- **停止生成**：`ChatInput.stop()` 强制复位流式状态；路由监听 `req.signal` 取消上游请求
- **LaTeX 兼容**：单行 `$$...$$` 在渲染前由 `normalizeLatex()` 转为围栏式，确保被 KaTeX 以 display 模式识别

---

## 🚀 可运行示例 / 适用场景

### 本地快速体验

```bash
cd chatbot-demo
npm install
npm run dev          # Web 开发：http://localhost:3000
npm run electron:dev # 桌面端开发（自动启动 Next + Electron 窗口）
npm run dist         # 打包 Windows 安装包（产物在 release/，详见 USER-SETUP.md）
node mock-server.mjs # (可选) 本地 mock 服务：http://localhost:9998
```

> 💡 **无真实 API 也能体验**：另开一个终端运行 `node mock-server.mjs`，在「参数设置」把 Base URL 填 `http://localhost:9998`（API Key / Model 任意）。mock 为**回显模式**：把你输入的内容原样流式返回，方便调试任意内容的渲染（含 LaTeX：`\(...\)`、`\[...\]`、`$...$`、`$$...$$` 均已支持）。

### 使用任意兼容服务（示例）

| 服务 | Base URL | 示例 Model |
|------|----------|-----------|
| OpenAI | `https://api.openai.com` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |
| SiliconFlow | `https://api.siliconflow.cn` | `Qwen/Qwen2.5-7B-Instruct` |
| 本地 Ollama | `http://localhost:11434` | `llama2` |

1. 打开「参数设置」
2. 填入三项参数（或用预设快捷按钮）
3. 点击「连接测试」验证
4. 回到聊天页开始对话

### 适用场景

- 🎓 计算机课程教学演示（BYOK 概念、SSE 流式、前后端代理）
- 🧪 快速对比多家模型服务
- 🔒 隐私敏感场景（密钥不离开浏览器）
- 📖 学习 Next.js 全栈架构的示例项目

---

## ❓ 常见问题与注意事项

| 问题 | 说明 |
|------|------|
| 密钥安全 | 密钥存于浏览器 localStorage，请勿在公共电脑使用；它不会上传到服务端 |
| 数据存储 | 仅本地 localStorage，**不会跨设备同步**（有意为之的简化） |
| Token 估算 | `lib/token.ts` 为启发式估算，实际消耗以服务商账单为准 |
| 流式超时 | Vercel 免费版函数执行时长有限，长推理可能被中断 |
| `next build` 与 `next dev` | 不要同时运行（共用 `.next` 目录），切换时先停掉另一个 |
| 字体加载 | `next/font/google` 首次构建需联网下载字体，之后自托管 |
| SSRF 限制 | 代理仅放行 `http/https` 协议，防止内网地址探测 |
| 网页版 vs 桌面版 | Electron 只复用前端代码；`electron/`、`electron-builder.yml` 是开发期资源，**不影响 Vercel 网页部署**（`output: "standalone"` 与 Vercel 兼容，已用 `npm run build` 验证） |
| 桌面打包失败 / Electron 下载慢 | 见 [USER-SETUP.md](./USER-SETUP.md)「常见问题」；国内可配置 Electron 镜像 |
| `.npmrc` | 本地 `cache` 指向 Windows 绝对路径，仅本地生效；若 Vercel 构建异常，优先删除/调整该文件 |

---

## 📜 License

MIT
