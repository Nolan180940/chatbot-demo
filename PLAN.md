# chatbot-demo 技术实现方案（PLAN）

> 一个简易版 Chatbot 应用：BYOK（自带密钥）模式，三项参数即可连接任意 AI 服务
> 定位：[NextChat](https://github.com/ChatGPTNextWeb/NextChat) 的简化版 —— 无用户系统、无插件、无多模型管理，只聚焦「聊天 + 配置」

---

## 0. [Agent Prompt](https://prompt.always200.com/#/basic/user)

我要在名为 chatbot-demo 的现有项目中开发一个简易版 chatbot 应用。该应用需支持 BYOK（自带密钥）模式，用户仅需配置三项参数——base URL、API key 和 model ID——即可连接任意 AI 服务（兼容 OpenAI API 格式，并支持自定义 base URL）。技术栈要求：前端可部署至 Vercel，后端逻辑集成其中。应用功能应包含聊天界面、参数配置面板（含连接测试）、历史会话记录（本地存储）、流式响应支持。整体功能目标为 [ChatGPTNextWeb/NextChat](https://github.com/ChatGPTNextWeb/NextChat) 的简化版，即去除用户系统、插件、多模型管理，仅聚焦于聊天与配置。请以开发者身份，输出一份详细的技术实现方案（PLAN），包括：项目结构设计、前端路由与组件划分、API 调用封装方式（含错误处理与超时机制）、Vercel 部署配置说明（如环境变量未使用时的替代方案）、数据存储方案，以及开发步骤与关键实现代码片段。方案需具体、可执行。

## 1. 项目概述

### 1.1 要解决的问题

用户希望搭建一个「开箱即用、自己带 Key」的聊天应用：

- 用户**自己拥有 API Key**（BYOK = Bring Your Own Key）
- 只需配置 **3 项参数** 即可使用：
  - `base URL`（API 地址，兼容 OpenAI 格式，支持自定义）
  - `API Key`（用户自己的密钥）
  - `Model ID`（模型名，如 `gpt-4o`、`deepseek-chat`、`Qwen/Qwen2.5-7B-Instruct`）
- 前端部署到 **Vercel**，后端逻辑（API 代理）集成在同一个 Next.js 项目中

### 1.2 功能范围

| 功能 | 说明 |
|------|------|
| ✅ 聊天界面 | 多轮对话、Markdown 渲染、流式输出 |
| ✅ 参数配置面板 | 三项参数 + **连接测试**按钮 |
| ✅ 历史会话记录 | localStorage 本地持久化、会话切换/删除 |
| ✅ 流式响应 | SSE 逐字输出 |
| ❌ 用户系统 | 不需要 |
| ❌ 插件系统 | 不需要 |
| ❌ 多模型管理 | 不需要（只用一个 Model ID） |

### 1.3 技术栈

| 层级 | 选型 | 理由 |
|------|------|------|
| 框架 | **Next.js 14 (App Router)** + TypeScript | 前后端一体、可部署 Vercel、NextChat 同款 |
| 样式 | **Tailwind CSS** | 快速开发、现代 UI |
| 状态管理 | **Zustand** | 轻量、NextChat 同款、支持 persist 中间件 |
| 流式渲染 | **react-markdown** + remark-gfm | Markdown 渲染 |
| 存储 | **localStorage**（Zustand persist） | 无需后端数据库 |
| API 代理 | **Next.js Route Handlers**（`/api/chat`） | 解决 CORS、统一错误处理 |

---

## 2. 项目结构设计

```
chatbot-demo/
├── app/
│   ├── layout.tsx              # 根布局（引入全局样式）
│   ├── page.tsx                # 聊天主页面（默认路由 → /chat）
│   ├── chat/
│   │   └── page.tsx            # 聊天界面路由
│   ├── settings/
│   │   └── page.tsx            # 配置面板路由
│   └── api/
│       └── chat/
│           └── route.ts        # 后端代理：转发 LLM 请求（含流式/错误/超时）
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx      # 聊天主容器
│   │   ├── MessageList.tsx     # 消息列表
│   │   ├── MessageItem.tsx     # 单条消息（含 Markdown 渲染）
│   │   ├── ChatInput.tsx       # 输入框（发送/停止）
│   │   └── TypingIndicator.tsx # 流式输出中的光标提示
│   ├── sidebar/
│   │   ├── Sidebar.tsx         # 侧边栏（会话列表）
│   │   └── SessionItem.tsx     # 单个会话条目
│   ├── settings/
│   │   ├── SettingsPanel.tsx   # 配置面板主体
│   │   └── ConnectionTest.tsx  # 连接测试组件
│   └── ui/
│       ├── Button.tsx          # 通用按钮
│       └── Modal.tsx           # 通用弹窗
├── lib/
│   ├── types.ts                # 类型定义（Message/Session/Config）
│   ├── config.ts               # 默认配置常量
│   ├── llm.ts                  # 客户端 LLM 调用封装
│   ├── parse-sse.ts            # SSE 流解析器
│   └── storage.ts              # localStorage 工具
├── store/
│   ├── chat-store.ts           # 聊天状态（会话/消息）
│   └── config-store.ts         # 配置状态（三项参数）
├── public/
│   └── favicon.ico
├── .env.local.example          # 示例环境变量（实际无需配置）
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

> **核心思路**：`/api/chat` 作为**唯一后端**。客户端把三项参数放进请求体发送到同源代理，代理再转发到用户指定的 `base URL`。这样：① 规避浏览器 CORS 限制；② 统一处理超时/错误；③ **不需要任何服务端环境变量**（密钥只存在于浏览器 localStorage，随请求转发）。

---

## 3. 前端路由与组件划分

### 3.1 路由设计

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | `page.tsx` | 重定向到 `/chat` |
| `/chat` | `ChatWindow` | 主聊天界面（含侧边栏） |
| `/settings` | `SettingsPanel` | 参数配置 + 连接测试 |

采用 **App Router** 的文件路由，无需额外路由库。

### 3.2 组件层级关系

```mermaid
graph TD
    A[app/chat/page.tsx] --> B[Sidebar]
    A --> C[ChatWindow]
    C --> D[MessageList]
    C --> E[ChatInput]
    D --> F[MessageItem]
    F --> G[react-markdown]
    E --> H[useChat hook]
    H --> I[lib/llm.ts]
    I --> J[/api/chat]
```

### 3.3 关键组件职责

| 组件 | 职责 |
|------|------|
| `Sidebar` | 展示会话列表、新建会话、删除会话、进入设置 |
| `ChatWindow` | 组合消息列表与输入框，持有当前会话状态 |
| `MessageItem` | 区分 user/assistant，渲染 Markdown，支持复制 |
| `ChatInput` | 输入、Enter 发送、Shift+Enter 换行、停止生成 |
| `SettingsPanel` | 三项参数表单 + 保存 + 连接测试 |
| `ConnectionTest` | 调用测试接口，显示成功/失败/耗时 |

---

## 4. API 调用封装（含错误处理与超时机制）

### 4.1 总体调用链路

```
浏览器 (ChatInput)
   ↓ fetch POST /api/chat   (body: { baseUrl, apiKey, model, messages })
Next.js 代理路由 (app/api/chat/route.ts)
   ↓ fetch POST {baseUrl}/v1/chat/completions   (stream: true)
   ↓ 转发 SSE 流回浏览器
浏览器 逐块解析 SSE → 更新消息 UI
```

### 4.2 后端代理 `app/api/chat/route.ts`（核心）

```typescript
// app/api/chat/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs"; // 使用 Node 运行时以支持更长的流式连接

const DEFAULT_TIMEOUT_MS = 120_000; // 120s，覆盖推理模型的思考时间

export async function POST(req: NextRequest) {
  // 1. 解析客户端传入的三项参数 + 消息
  const { baseUrl, apiKey, model, messages } = await req.json();

  // 2. 参数校验
  if (!baseUrl || !apiKey || !model || !messages?.length) {
    return Response.json(
      { error: { code: "invalid_params", message: "缺少 baseUrl / apiKey / model / messages" } },
      { status: 400 },
    );
  }

  // 3. 规范化 baseUrl（容忍用户粘贴时末尾带 /）
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const url = `${normalizedBase}/v1/chat/completions`;

  // 4. 超时控制：AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
      signal: controller.signal,
    });

    // 5. 上游非 2xx：读取错误体并原样返回
    if (!upstream.ok) {
      const errBody = await upstream.text();
      return Response.json(
        { error: { code: "upstream_error", status: upstream.status, message: errBody } },
        { status: upstream.status },
      );
    }

    // 6. 成功：剥离 CORS 头、禁用缓冲，直接转发 SSE 流
    const res = new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // 禁用 nginx 缓冲，保证流式即时性
      },
    });

    res.headers.delete("WWW-Authenticate"); // 防止浏览器弹认证框
    return res;
  } catch (e: any) {
    // 6. 超时/网络错误
    if (e?.name === "AbortError") {
      return Response.json(
        { error: { code: "timeout", message: "请求超时，请检查网络或 base URL" } },
        { status: 504 },
      );
    }
    return Response.json(
      { error: { code: "network_error", message: e?.message ?? "网络错误" } },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 4.3 客户端封装 `lib/llm.ts`

```typescript
// lib/llm.ts
import { useConfigStore } from "@/store/config-store";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** 解析 SSE 流：把 `data: {...}` 一行行喂给 onDelta */
export async function streamChat(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { baseUrl, apiKey, model } = useConfigStore.getState();

  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ baseUrl, apiKey, model, messages }),
    signal, // 支持用户点击「停止」
  });

  // 非 2xx：解析错误信息
  if (!resp.ok) {
    let message = `HTTP ${resp.status}`;
    try {
      const data = await resp.json();
      message = data?.error?.message ?? message;
    } catch {}
    throw new Error(message);
  }

  // 2xx：读取 SSE 流
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // 按行切分，处理可能跨块的 `data:`
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue; // 流结束标记

      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        // 忽略无法解析的行
      }
    }
  }
  return full;
}
```

### 4.4 错误处理策略汇总

| 场景 | 处理方式 | 用户看到 |
|------|----------|----------|
| 参数缺失 | 后端 400，前端表单校验 | 红色提示 |
| base URL 错误/网络不可达 | 后端 502 | 弹窗提示检查地址 |
| API Key 无效 | 上游 401，透传 | 提示密钥无效 |
| 模型名错误 | 上游 404，透传 | 提示模型不存在 |
| 超时（120s） | AbortController → 504 | 提示超时 |
| 用户主动停止 | 前端 AbortSignal | 保留已生成部分 |
| JSON 解析失败 | 客户端 try/catch 忽略 | 跳过脏数据行 |

---

## 5. 数据存储方案

### 5.1 方案选型

采用 **localStorage + Zustand persist**，无需后端数据库：

- ✅ 契合 BYOK 隐私理念（数据/密钥只在浏览器本地）
- ✅ 零成本、零配置
- ✅ 刷新页面不丢失
- ⚠️ 局限：不跨设备同步（本简化版不要求）

### 5.2 状态设计

```typescript
// store/config-store.ts —— 三项参数
interface ConfigState {
  baseUrl: string; // 默认 https://api.openai.com
  apiKey: string;  // 默认 ""
  model: string;   // 默认 gpt-4o
  setBaseUrl: (v: string) => void;
  setApiKey: (v: string) => void;
  setModel: (v: string) => void;
}
```

```typescript
// store/chat-store.ts —— 会话与消息
interface ChatState {
  sessions: Session[];      // 所有会话
  activeSessionId: string | null;
  // 会话
  createSession: () => void;
  deleteSession: (id: string) => void;
  switchSession: (id: string) => void;
  // 消息
  appendMessage: (sessionId: string, msg: ChatMessage) => void;
  updateLastMessage: (sessionId: string, content: string) => void;
  setStreaming: (sessionId: string, v: boolean) => void;
}

interface Session {
  id: string;          // crypto.randomUUID()
  title: string;       // 首条用户消息前 20 字
  createdAt: number;
  messages: ChatMessage[];
  streaming: boolean;
}
```

### 5.3 持久化配置

```typescript
// store/chat-store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({ /* ...实现 */ }),
    {
      name: "chatbot-demo-sessions", // localStorage key
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
```

> ⚠️ **注意**：API Key 存 localStorage 属于「可接受但不绝对安全」。为降低风险，建议在设置面板中使用 `type="password"` 输入框，并提示用户勿在公共电脑使用。

---

## 6. Vercel 部署配置说明

### 6.1 关键点：**无需任何环境变量**

因为采用 BYOK + 同源代理方案，**密钥不落在服务端**，因此：

- ❌ 不需要在 Vercel 后台配置 `OPENAI_API_KEY`
- ❌ 不需要 `.env`
- ✅ 用户直接在浏览器里填三项参数即可

> 这是与 NextChat「部署者配置 Key」模式最大的不同：**部署者只是托管了一个壳，密钥永远属于使用者。**

### 6.2 部署步骤

```bash
# 1. 本地开发
npm install
npm run dev          # http://localhost:3000

# 2. 构建验证
npm run build
npm start

# 3. 推送 GitHub
git init && git add . && git commit -m "init chatbot-demo"
git remote add origin https://github.com/<you>/chatbot-demo.git
git push -u origin main

# 4. 去 vercel.com → Import Project → 选择该仓库 → Deploy
#    无需填任何环境变量，直接 Deploy 即可
```

### 6.3 环境变量替代方案（可选增强）

若将来想支持「部署者统一配置 Key」（非 BYOK），可加以下环境变量作为**兜底**：

```typescript
// lib/config.ts
export const SERVER_DEFAULTS = {
  baseUrl: process.env.DEFAULT_BASE_URL ?? "https://api.openai.com",
  apiKey: process.env.DEFAULT_API_KEY ?? "",
  model: process.env.DEFAULT_MODEL ?? "gpt-4o",
};
```

逻辑：`用户填入的 Key` 优先于 `服务端默认 Key`；用户 Key 为空时才回退到环境变量。

### 6.4 注意事项

| 事项 | 说明 |
|------|------|
| 流式超时 | Vercel 免费版函数默认最大执行时间有限，长推理可能被中断；建议推理模型选短超时或提示用户 |
| `runtime` | 本项目流式代理用 `nodejs` 运行时（更稳定）；若想用边缘运行时需自测 |
| 域名 | 默认 `xxx.vercel.app` 即可，无需自定义域名 |

---

## 7. 开发步骤（里程碑）

| 阶段 | 任务 | 产出 |
|------|------|------|
| **M1 脚手架** | 初始化 Next.js + TS + Tailwind | 空项目可运行 |
| **M2 状态层** | 实现 config-store、chat-store（含 persist） | 刷新不丢数据 |
| **M3 后端代理** | 实现 `/api/chat` 路由（流式 + 错误 + 超时） | curl 可测通 |
| **M4 聊天 UI** | ChatWindow / MessageList / MessageItem / ChatInput | 可对话（流式） |
| **M5 Markdown** | 接入 react-markdown + code highlight | 代码块渲染 |
| **M6 会话管理** | 侧边栏：新建/切换/删除会话 | 多会话 |
| **M7 配置面板** | SettingsPanel + 连接测试 | 三项参数 + 测试 |
| **M8 打磨** | 停止生成、复制、空态、移动端适配 | 完整可用 |
| **M9 部署** | Vercel 部署 + README | 上线 |

---

## 8. 关键实现代码片段

### 8.1 聊天页面组合

```typescript
// app/chat/page.tsx（'use client'）
export default function ChatPage() {
  const activeSession = useChatStore((s) =>
    s.sessions.find((x) => x.id === s.activeSessionId),
  );

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        {activeSession ? (
          <>
            <MessageList messages={activeSession.messages} />
            <ChatInput sessionId={activeSession.id} />
          </>
        ) : (
          <EmptyState onCreate={() => useChatStore.getState().createSession()} />
        )}
      </main>
    </div>
  );
}
```

### 8.2 发送消息 + 流式更新（核心交互）

```typescript
// components/chat/ChatInput.tsx（核心逻辑）
const handleSend = async () => {
  const text = input.trim();
  if (!text || streaming) return;

  const sessionId = useChatStore.getState().activeSessionId!;
  const abort = new AbortController();
  setAbortCtrl(abort);
  setStreaming(true);

  // 1. 追加用户消息
  useChatStore.getState().appendMessage(sessionId, { role: "user", content: text });
  // 2. 追加空的 assistant 占位
  useChatStore.getState().appendMessage(sessionId, { role: "assistant", content: "" });

  const history = useChatStore.getState().sessions
    .find((s) => s.id === sessionId)!.messages;

  try {
    // 3. 流式调用：每收到一段 delta 就更新最后一条消息
    await streamChat(history, (delta) => {
      useChatStore.getState().updateLastMessage(sessionId, delta);
    }, abort.signal);
  } catch (e: any) {
    useChatStore.getState().updateLastMessage(
      sessionId,
      `\n\n> ⚠️ 出错：${e.message}`,
    );
  } finally {
    useChatStore.getState().setStreaming(sessionId, false);
    setInput("");
  }
};
```

### 8.3 连接测试

```typescript
// components/settings/ConnectionTest.tsx
const testConnection = async () => {
  setState("testing");
  const start = Date.now();
  try {
    const { baseUrl, apiKey, model } = useConfigStore.getState();
    // 发一条极短消息验证连通性
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl, apiKey, model,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data?.error?.message ?? `HTTP ${resp.status}`);
    }
    setState("success");
    setLatency((Date.now() - start) / 1000);
  } catch (e: any) {
    setState("error");
    setError(e.message);
  }
};
```

---

## 9. 测试与验证清单

| # | 用例 | 预期 |
|---|------|------|
| 1 | 未配置参数直接发送 | 前端拦截，提示去设置 |
| 2 | 配置 OpenAI 官方（api.openai.com + gpt-4o） | 流式正常返回 |
| 3 | 配置第三方（如 DeepSeek / SiliconFlow 自定义 baseUrl） | 流式正常返回（验证自定义 URL 能力） |
| 4 | 填入错误 Key | 收到 401 错误提示，不崩溃 |
| 5 | 填入错误 baseUrl | 收到网络错误提示 |
| 6 | 点击停止生成 | 立即中止，保留已输出内容 |
| 7 | 刷新页面 | 会话与消息仍存在 |
| 8 | 新建/删除会话 | 列表正确、可切换 |
| 9 | 长回复 Markdown/代码块 | 正确渲染 |
| 10 | Vercel 部署后访问 | 一切正常，无需环境变量 |

---

## 10. 后续可扩展方向（非本期范围）

- 会话导出/导入（JSON）
- 系统 Prompt 预设
- 移动端 PWA 化
- 标题自动生成（调用模型小结）
- 对话分享为图片（借鉴 NextChat Artifacts 思路）

---

## 附：BUILD 完成状态 ✅

| 项 | 状态 |
|----|------|
| 项目脚手架（Next.js 14.2.35 + TS + Tailwind） | ✅ |
| 状态层（config-store / chat-store，含 localStorage persist） | ✅ |
| 后端代理 `/api/chat`（流式 + 错误 + 超时 + SSRF 校验） | ✅ |
| 聊天 UI（ChatWindow / MessageList / MessageItem / ChatInput） | ✅ |
| Markdown 渲染（react-markdown + remark-gfm） | ✅ |
| 会话管理（侧边栏 新建/切换/删除） | ✅ |
| 配置面板 + 连接测试 | ✅ |
| `npm run build` 通过 | ✅ 6 routes，0 错误 |
| 浏览器端到端验证 | ✅ `/chat`、`/settings`、`/api/chat` 均正常 |
| 浏览器验证 | ✅ 连接测试的 400 校验 / 502 网络错误路径均正确 |

**运行方式**：`npm run dev` → http://localhost:3000

**浏览器验证记录**
- `/chat` 200：自动创建会话，空态提示正常
- `/settings` 200：三项参数 + 预设快捷按钮 + 连接测试
- 连接测试（空参数）：前端拦截，提示「请先填写完整配置」
- 连接测试（错误地址 localhost:9999）：代理返回 502，前端展示「fetch failed」

---

*文档版本：v1.0 | 2026-08-02 | 目标目录：`20260802/chatbot-demo`*
