# USER-SETUP.md — 开发 / 调试 / 打包指南（Web + 桌面版）

> 面向初学者的完整上手教程：从环境准备 → Web 开发 → **Electron 桌面版开发与调试** → **打包成 Windows 安装包** → 常见问题排查。
> 建议按顺序从头做到尾，每一步都验证通过再往下走。

---

## 0. 这套项目到底是什么

| 形态 | 说明 | 怎么运行 |
|------|------|----------|
| **Web 版** | Next.js 应用，部署在 Vercel | `npm run dev` 本地开发；push 到 GitHub 自动部署 |
| **桌面版** | 用 Electron 把**同一套**前端包成 Windows 程序 | `npm run electron:dev` 调试；`npm run dist` 打包安装包 |

关键理解：**桌面版没有单独写一套界面**，它只是：
1. Electron 主进程在后台启动一个 Next.js 服务（开发时连 `next dev`，打包后跑内置的 standalone 服务）
2. 用系统窗口（BrowserWindow）加载这个服务

所以你在浏览器里看到的一切，在桌面版里一模一样——**只维护一份前端代码**。

---

## 1. 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 18（建议 20 LTS） | 运行与构建 |
| npm | ≥ 9 | 包管理器 |
| Windows | 10 / 11（x64） | 打包 NSIS 安装包需要 Windows（跨平台见第 6 节） |
| 网络 | 能访问 npm 与 GitHub | 首次安装 Electron 需下载二进制（约 100MB） |

验证：

```bash
node --version   # v18+
npm --version    # 9+
```

> ⚠️ 国内安装 Electron 可能很慢/失败，先看第 7 节「常见问题」配置镜像再动手。

---

## 2. 获取代码 & 安装依赖

```bash
git clone https://github.com/Nolan180940/chatbot-demo.git
cd chatbot-demo
npm install
```

依赖分两部分：
- **运行时**：next / react / zustand / react-markdown / katex 等
- **桌面开发**（devDependencies）：`electron`、`electron-builder`、`concurrently`、`wait-on`

> 安装完成后确认：`node_modules/.bin/electron` 存在（`npx electron --version` 能看到版本号）。

---

## 3. Web 版开发（先跑通这个）

```bash
npm run dev
```

浏览器打开 http://localhost:3000（根路径自动跳到 `/chat`）。

- `/chat` 聊天、`/settings` 参数设置、`/stats` 统计
- 首次使用：设置里填 **Base URL / API Key / Model**，点「连接测试」，通过后「保存配置」

> 不配真实 API 也能玩：另开终端 `node mock-server.mjs`，设置里 Base URL 填 `http://localhost:9998`（**回显模式**，输入啥回啥，方便测渲染）。

---

## 4. 桌面版开发与调试（重点）

### 4.1 一键启动桌面开发模式

```bash
npm run electron:dev
```

这行等价于（见 `package.json`）：

```bash
concurrently -k -s first "next dev" "wait-on http://localhost:3000 && electron . --dev"
```

意思就是：**先起 `next dev`，等 3000 端口就绪，再用 Electron 打开窗口**；`--dev` 标记告诉主进程“去连本地开发服务器”。启动后会弹出名为 **Chatbot Demo** 的窗口，同时终端里打印 `next dev` 与 Electron 主进程日志。

### 4.2 桌面代码结构（要知道去哪改）

```
electron/
├── main.js     # 主进程：创建窗口、启动/停止 Next 服务、应用生命周期
└── preload.js  # 通过 contextBridge 给页面暴露 window.desktop（如平台信息）
```

- **主进程**（`main.js`）管“系统层面”的事：开窗口、起/停服务、菜单、托盘、单实例锁等
- **渲染进程**（页面）就是你的 Next.js React 代码，和 Web 版完全一致

> 安全配置已开启：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。页面里**不能**直接 `require` Node 模块；需要桥接时走 `preload.js` 的 `contextBridge`。

### 4.3 怎么调试

#### (a) 调试页面（渲染进程）——最常用
- 窗口里按 `F12` 或 `Ctrl+Shift+I` 打开 **DevTools**（Elements / Console / Network / React 都在，和浏览器一样）
- 页面 console、网络请求、localStorage 都能看

#### (b) 调试主进程
- 主进程的 `console.log` 打印在**启动它的终端**里（`[server] ...` 前缀的是 Next 服务日志）
- 想在 `electron/main.js` 打断点：用 VSCode。在 `.vscode/launch.json` 加：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Electron Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": [".", "--dev"],
      "env": { "NODE_OPTIONS": "--inspect=9229" }
    }
  ]
}
```
先手动 `npm run dev` 让 3000 端口就绪，再按 `F5`，即可在 `main.js` 里打断点。

#### (c) 调试 preload / contextBridge
- DevTools Console 里输入 `window.desktop` 查看暴露的 API
- 页面里判断是否桌面环境：`typeof window.desktop !== "undefined"`

### 4.4 改了代码怎么办
- 改 React/页面代码：`next dev` 自动热更新，窗口即时生效
- 改 `electron/main.js`：需重启 Electron（关闭窗口后重新 `npm run electron:dev`）

---

## 5. 打包 Windows 安装包（重点）

### 5.1 打包原理（一条命令背后做了什么）

```bash
npm run dist
```

等价于：

```bash
npm run build:standalone && electron-builder --win
```

而 `build:standalone` 又等于：

```bash
next build && node scripts/copy-standalone.mjs
```

过程拆解：

1. **`next build`**：`next.config.mjs` 里设了 `output: "standalone"`，会额外产出 `.next/standalone/` —— 一个**可独立运行的 Node 服务**（含 `server.js` + 精简后的 `node_modules`）
2. **`scripts/copy-standalone.mjs`**：把 `.next/static` 和 `public/` 拷进 standalone 产物（否则页面静态资源 404）
3. **`electron-builder --win`**：按 `electron-builder.yml` 配置，把 Electron 运行时 + standalone 服务一起打成 NSIS 安装程序

### 5.2 执行打包

```bash
npm run dist       # 产出安装程序 .exe，放在 release/
```

- 首次会联网下载 Electron / NSIS 相关文件，稍慢
- 完成后 `release/` 下会有：
  - `Chatbot Demo Setup 0.1.0.exe` —— 给用户安装的安装包
  - `win-unpacked/` —— 免安装绿色版（直接双击里面的 exe 即可运行）

只想快速验证、不生成安装包时（快很多）：

```bash
npm run dist:dir   # 只产出 win-unpacked/，不打包
```

### 5.3 打包配置（electron-builder.yml）说明

```yaml
appId: com.chatbot-demo.app
productName: Chatbot Demo          # 安装后显示的应用名
directories:
  output: release                  # 产物输出目录
files:
  - electron/**/*                  # 桌面壳代码
  - .next/standalone/**/*          # Next.js standalone 服务
asar: true                         # 代码打进 asar 归档（防篡改）
asarUnpack:
  - '**/node_modules/**'           # 原生/二进制模块解包为真实文件
  - '**/server.js'
win:
  target: nsis                     # Windows 安装包格式
  arch: [x64]
nsis:
  oneClick: false                  # 引导式安装（可自选目录）
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  shortcutName: Chatbot Demo
```

> 关键点：standalone 服务要运行 `node_modules` 里的二进制，所以必须 `asarUnpack` 解包；主进程用 `ELECTRON_RUN_AS_NODE=1` 以纯 Node 模式运行 `server.js`（见 `electron/main.js`）。

### 5.4 安装与验证

1. 双击 `Chatbot Demo Setup ... .exe` 按向导安装（可自选目录、生成桌面快捷方式）
2. 打开应用：主进程先启动内置服务再开窗口
3. 首次打开稍慢属正常（服务冷启动）
4. 功能应与网页版一致（发消息、设置、统计）

---

## 6. 跨平台打包（可选）

当前配置只打 **Windows**（`win.target: nsis`）。要支持 macOS / Linux：

- **macOS**：只能在 macOS 机器上打（通常还需签名/公证）
- **Linux**：`npx electron-builder --linux`（.deb / AppImage 等）
- 更推荐：用 **GitHub Actions** 分别在三个平台跑 `npm run dist`，自动产出各平台安装包

> 注意：`electron-builder.yml` 里 `win` 段是 Windows 专属，跨平台需补充 `mac` / `linux` 段。

---

## 7. 常见问题排查

| 现象 | 原因与解决 |
|------|-----------|
| `electron:dev` 起不来 / 窗口空白 | 看终端：`next dev` 是否已监听 3000；端口被占用时 `npm run dev -- -p 3001` 并同步改 `electron/main.js` 里的 `DEV_PORT` |
| `npm run dist` 报“未找到 standalone” | 没先构建；直接跑 `npm run dist` 即可（内部会先 build），或手动 `npm run build:standalone` |
| Electron 下载慢 / 装不上 | 换镜像后重装：`npm config set registry https://registry.npmmirror.com`；二进制镜像 `set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` 后重装 `npm i -D electron` |
| 打包后打开应用白屏 | 静态资源没拷全：确保跑过 `npm run build:standalone`（会拷 `.next/static`）；确认 `public/` 内容需要时存在 |
| 应用闪退 / 主进程报错 | 看启动终端日志；开发期用 VSCode 对 `main.js` 打断点 |
| 页面里想用 Node API | 设计如此（`nodeIntegration: false`）；需要时走 preload 的 contextBridge |
| 杀毒软件拦截安装包 | 未签名 exe 常被误报；正式分发可配置代码签名（Windows 证书） |
| 打包体积大 | 正常（Electron 运行时 ~80MB+）；可用 electron-builder 的压缩选项优化 |
| 网页版部署是否受影响 | **不受影响**：Electron 只复用前端，`electron/`、`electron-builder.yml` 是开发期资源；`output: "standalone"` 与 Vercel 兼容（README「常见问题」有说明，已用 `npm run build` 验证） |

---

## 8. 相关文件导航

| 文件 | 作用 |
|------|------|
| `electron/main.js` | Electron 主进程：窗口 + 内置服务生命周期 |
| `electron/preload.js` | 页面桥接（contextBridge） |
| `electron-builder.yml` | 打包配置（NSIS 安装包） |
| `scripts/copy-standalone.mjs` | 构建后拷贝静态资源到 standalone |
| `next.config.mjs` | `output: "standalone"` 开关（桌面版依赖） |
| `README.md` | 项目总览 / 架构 |
| `USER-SETUP.md` | 本指南 |

---

*文档版本：v2.0 | 2026-08-08 | 适用项目：chatbot-demo（Web + Electron 桌面版）*

