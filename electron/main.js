const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");
const fs = require("fs");

const DEV_MODE = process.argv.includes("--dev");
const DEV_PORT = 3000;
const READY_TIMEOUT_MS = 30_000;

let mainWindow = null;
let serverProcess = null;
let serverUrl = null;

// ── 工具：找空闲端口 ──────────────────────────────────────────────
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

// ── 等待 HTTP 服务就绪 ───────────────────────────────────────────
async function waitForServer(url, timeoutMs = READY_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(url, { method: "HEAD" });
      if (resp.ok) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`本地服务未在 ${timeoutMs / 1000}s 内就绪`);
}

// ── 启动 Next.js 服务 ────────────────────────────────────────────
async function startServer() {
  if (DEV_MODE) {
    await waitForServer(`http://localhost:${DEV_PORT}`);
    return `http://localhost:${DEV_PORT}`;
  }

  // 打包后 standalone 服务位于 resources/server（真实文件，不打包进 asar）；
  // 开发/未打包时回退到项目内 .next/standalone。
  const standaloneDir = app.isPackaged
    ? path.join(process.resourcesPath, "server")
    : path.join(app.getAppPath(), ".next", "standalone");
  const serverFile = path.join(standaloneDir, "server.js");
  if (!fs.existsSync(serverFile)) {
    throw new Error(
      `未找到 standalone 服务: ${serverFile}\n请先运行 npm run build:standalone`,
    );
  }

  const port = await getFreePort();

  // 用 Electron 自身二进制以纯 Node 模式运行 server.js，
  // 无需额外捆绑 Node 运行时。
  serverProcess = spawn(process.execPath, [serverFile], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  serverProcess.stdout.on("data", (d) => console.log(`[server] ${d}`));
  serverProcess.stderr.on("data", (d) => console.error(`[server] ${d}`));
  serverProcess.on("error", (e) => {
    console.error(`[server] spawn 失败: ${e.message}`);
    dialog.showErrorBox("启动失败", `无法启动本地服务:\n${e.message}`);
    app.quit();
  });
  serverProcess.on("exit", (code) => {
    console.log(`[server] exited with code ${code}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("server-exited", code);
    }
  });

  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  serverUrl = url;
  return url;
}

// ── 创建窗口 ─────────────────────────────────────────────────────
function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    title: "Chatbot Demo",
    backgroundColor: "#0a0f1e",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(url);

  mainWindow.webContents.on(
    "did-fail-load",
    (_e, code, desc, url_) => {
      console.error(`页面加载失败 (${code}): ${desc} ${url_}`);
    },
  );

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── 应用生命周期 ─────────────────────────────────────────────────
function killServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
    serverProcess = null;
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      const url = await startServer();
      createWindow(url);
    } catch (e) {
      dialog.showErrorBox("启动失败", String(e?.message ?? e));
      app.quit();
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0 && serverUrl) {
        createWindow(serverUrl);
      }
    });
  });

  app.on("window-all-closed", () => {
    killServer();
    app.quit();
  });

  app.on("before-quit", () => {
    killServer();
  });
}
