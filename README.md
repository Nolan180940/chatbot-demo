# Chatbot Demo — BYOK 简易聊天控制台

> 自带 API Key 的极简 Chatbot 应用：配置三项参数即可连接任意 OpenAI 兼容服务。
> 定位为 [NextChat](https://github.com/ChatGPTNextWeb/NextChat) 的**简化版** —— 无用户系统、无插件、无多模型管理，只聚焦「聊天 + 配置」。

![tech](https://img.shields.io/badge/Next.js-14.2.35-black) ![ts](https://img.shields.io/badge/TypeScript-5.5-blue) ![tailwind](https://img.shields.io/badge/Tailwind-3.4-06b6d4) ![zustand](https://img.shields.io/badge/Zustand-4.5-orange)

---

## ✨ 项目概述与技术栈

### 它能做什么

- 💬 **多轮对话**：新建 / 切换 / 删除会话，历史消息本地持久化
- ⚡ **流式响应**：SSE 逐字输出，支持「停止生成」
- 🔑 **BYOK 模式**：仅需 `Base URL` / `API Key` / `Model ID` 三项参数
- 🧪 **连接测试**：一键 `ping` 验证配置可用性
- 📄 **Markdown 渲染**：代码块、表格、LaTeX 排版
- 💾 **会话导出**：单个会话 / 全部会话导出为 JSON
- 📊 **Token 统计**：本地启发式估算与按会话排行

### 技术栈

| 分类 | 选型 |
|------|------|
| 框架 | Next.js 14（App Router）+ TypeScript |
| UI | React 18 + Tailwind CSS（夜间控制台主题） |
| 状态 | Zustand（含 persist 中间件） |
| Markdown | react-markdown + remark-gfm |
| 字体 | Space Grotesk / IBM Plex Sans / IBM Plex Mono（next/font 自托管） |
| 后端 | Next.js Route Handler 同源代理（无独立后端） |

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

**核心设计**：浏览器不直连第三方模型（规避 CORS），而是请求**同源代理** `/api/chat`，由代理转发到用户指定的 `baseUrl`。这样既统一了错误/超时处理，也**无需任何服务端环境变量** —— 密钥只存在于浏览器 localStorage。

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
│   └── api/chat/route.ts             # ★ 后端代理：转发 LLM 请求
│
├── components/                       # UI 组件
│   ├── chat/
│   │   ├── ChatWindow.tsx            # 顶部状态栏 + 单会话导出 + 组合列表/输入
│   │   ├── MessageList.tsx           # 消息滚动容器 + 空态欢迎屏
│   │   ├── MessageItem.tsx           # 单条消息（用户 ❯ / 助手终端卡片）
│   │   └── ChatInput.tsx             # 控制台式输入框（发送/停止）
│   ├── sidebar/Sidebar.tsx           # 左栏：logo、导航、会话列表、导出全部
│   ├── settings/
│   │   ├── SettingsPanel.tsx         # 三项参数表单 + 预设地址 + 保存
│   │   └── ConnectionTest.tsx        # 连接测试状态卡片
│   ├── stats/StatsPanel.tsx          # Token 统计与会话排行
│   └── ui/Button.tsx                 # 通用按钮
│
├── lib/                              # 业务逻辑
│   ├── types.ts                      # 类型定义（Session/Message/Config）
│   ├── config.ts                     # 默认配置 + 预设 base URL + 超时常量
│   ├── llm.ts                        # ★ streamChat / testConnection 封装
│   ├── token.ts                      # Token 启发式估算
│   └── export.ts                     # 会话 JSON 导出
│
├── store/                            # Zustand 状态
│   ├── chat-store.ts                 # 会话/消息 CRUD + autoTitle + persist
│   └── config-store.ts               # 三项参数 + isReady + persist
│
├── types/css.d.ts                    # CSS 副作用导入声明
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

---

## 🚀 可运行示例 / 适用场景

### 本地快速体验

```bash
cd chatbot-demo
npm install
npm run dev        # 打开 http://localhost:3000
```

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

---

## 📜 License

MIT
