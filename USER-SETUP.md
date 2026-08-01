# USER-SETUP.md — 部署与开发指南

> 面向新用户的完整上手教程：从环境准备 → 本地开发 → 部署到 Vercel → 常见问题排查。

---

## 1. 环境要求

| 依赖 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | ≥ 18 | 建议 20 LTS 或更高 |
| 包管理器 | npm ≥ 9 或 yarn ≥ 1.22 | 本项目默认使用 npm |
| Git | 任意较新版本 | 推送到 GitHub 用 |
| 浏览器 | 现代浏览器（Chrome / Edge / Firefox / Safari） | 用于预览 |

> 本项目的后端逻辑内置于 Next.js，**无需单独安装数据库或后端服务**。

验证环境：

```bash
node --version   # v18+ 即可
npm --version    # 9+ 即可
```

---

## 2. 本地开发环境搭建

### 2.1 获取代码

本项目的官方仓库位于：**https://github.com/Nolan180940/chatbot-demo**

```bash
# 方式一：克隆官方仓库
git clone https://github.com/Nolan180940/chatbot-demo.git
cd chatbot-demo

# 方式二：Fork 后克隆你自己的副本（推荐，便于二次开发）
git clone https://github.com/<你的GitHub用户名>/chatbot-demo.git
cd chatbot-demo

# 方式三：本地已有该目录时，直接进入即可
cd path/to/chatbot-demo
```

> 💡 若你 Fork 了本项目，建议添加上游以便同步更新：
> ```bash
> git remote add upstream https://github.com/Nolan180940/chatbot-demo.git
> git fetch upstream
> git merge upstream/main
> ```

### 2.2 安装依赖

```bash
npm install
```

> 依赖包括：`next`、`react`、`react-dom`、`zustand`、`react-markdown`、`remark-gfm`，以及 TypeScript / Tailwind 等开发依赖。

### 2.3 环境变量（可选）

**本项目默认无需配置任何环境变量** —— 这是 BYOK 设计的核心优势：密钥由最终用户在前端填写，随请求转发，不落在服务端。

若你希望在部署端提供「默认 Key」兜底（用户不填时使用），可按如下预留（`lib/config.ts` 中对应的回退逻辑需自行启用）：

```bash
# .env.local
DEFAULT_BASE_URL=https://api.openai.com
DEFAULT_API_KEY=sk-xxx
DEFAULT_MODEL=gpt-4o-mini
```

> ⚠️ 强烈建议不要在生产环境暴露自己的 Key。

---

## 3. 本地启动与预览

### 3.1 开发模式

```bash
npm run dev
```

终端出现 `Local: http://localhost:3000` 后，用浏览器打开：

```
http://localhost:3000
```

- 根路径 `/` 会自动重定向到 `/chat`
- 主要页面：
  - `/chat` — 聊天界面
  - `/settings` — 参数设置
  - `/stats` — Token 统计

### 3.2 首次使用配置

1. 点击左侧「参数设置」
2. 填写 **Base URL** / **API Key** / **Model ID**（也可用预设快捷按钮）
3. 点击「连接测试」，看到 `connection ok` 即配置成功
4. 点击「保存配置」，回到聊天页开始对话

### 3.3 生产构建预览（本地）

```bash
npm run build   # 类型检查 + 构建
npm start       # 以生产模式运行，同样访问 localhost:3000
```

> ⚠️ 注意：**不要同时运行** `npm run dev` 和 `npm run build`（二者共用 `.next` 目录）。切换前先停掉另一个。

---

## 4. 部署到 Vercel

### 4.1 前置：推送到你自己的 GitHub 仓库

如果你 Fork 了官方仓库，可直接部署 Fork 副本；若从零开始，请先创建你自己的仓库并推送：

```bash
git init
git add .
git commit -m "init chatbot-demo"

# 将 origin 指向你自己的仓库（把 <你的GitHub用户名> 换成你的名字）
git remote add origin https://github.com/<你的GitHub用户名>/chatbot-demo.git
# 官方原仓库地址（只读参考）：https://github.com/Nolan180940/chatbot-demo.git

git branch -M main
git push -u origin main
```

> ✅ 推送成功后，前往 GitHub 页面确认仓库内容与本地一致（注意 `node_modules/` 与 `.next/` 已被 `.gitignore` 排除）。

### 4.2 授权并导入项目

1. 打开 https://vercel.com 并登录（可用 GitHub 账号授权）
2. 点击 **Add New… → Project**
3. 在 **Import Git Repository** 中找到 `chatbot-demo`，点击 **Import**
   - 若未显示：先点击 **Configure GitHub App** 授权 Vercel 访问你的仓库
4. 框架预设会自动识别为 **Next.js**

### 4.3 环境变量配置

> ✅ **无需配置任何环境变量**。直接跳过 Environment Variables 部分即可。

（可选）如需部署端默认 Key，按第 2.3 节添加 `DEFAULT_*` 变量。

### 4.4 部署

1. 检查 Build 配置（保持默认即可）：
   - Framework Preset: `Next.js`（自动识别）
   - Build Command: `npm run build`
   - Output Directory: 留空（自动）
2. 点击 **Deploy**
3. 等待 1–2 分钟，看到 **Congratulations!** 即完成
4. 访问生成的域名，例如 `https://chatbot-demo-<你的项目名>.vercel.app`（可在 Vercel 的 Settings → Domains 中绑定自定义域名）

> 📌 部署后若提示更新，可能是 Vercel 默认创建了新项目而非 Fork，导致无法检测上游更新。建议删除重建，或改用 Fork 方式部署。

### 4.5 后续更新

```bash
git add .
git commit -m "update"
git push
# Vercel 检测到 push 后自动重新部署
```

---

## 5. 常见错误排查

| 现象 | 排查与解决 |
|------|-----------|
| `npm install` 很慢 / 超时 | 换镜像源：`npm config set registry https://registry.npmmirror.com` 后重试 |
| `next dev` 报 `port 3000` 被占用 | 换端口：`npm run dev -- -p 3001` |
| `next build` 报字体下载失败 | `next/font/google` 首次需联网；确认网络后重试，或改用系统字体 |
| 部署后所有请求返回 `502` | Base URL 填错或服务不可达；在设置页重新测试连接 |
| 返回 `401` | API Key 无效或已过期 |
| 返回 `404` / 提示模型不存在 | Model ID 拼写错误，或该服务未提供该模型 |
| 流式响应到一半中断 | 服务端超时（120s）或 Vercel 免费函数时长限制；缩短提问或换模型 |
| 刷新后配置丢失 | 检查浏览器是否禁用了 localStorage / 隐私模式 |
| 页面样式错乱 | 强制刷新（Ctrl+Shift+R）清除旧缓存 |
| `Cannot find module '*.css'` 提示 | 属类型声明告警，`types/css.d.ts` 已处理；不影响运行 |
| 不想让别人访问你的部署 | 在设置中不分享域名，或后续为 `/chat` 增加访问密码 |

---

## 6. 相关文件导航

| 文件 | 用途 |
|------|------|
| `README.md` | 项目说明与架构 |
| `PROMPT.md` | 源码逆向分析 / 提示词底稿 |
| `PLAN.md` | 技术实现方案 |
| `app/api/chat/route.ts` | 后端代理（最核心逻辑） |
| `lib/llm.ts` | 客户端流式封装 |

---

*文档版本：v1.0 | 2026-08-02 | 适用项目：chatbot-demo*
