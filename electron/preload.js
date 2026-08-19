const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
});

// SKILL 文件系统能力（Electron 桌面端可用；纯浏览器环境无此 API）
contextBridge.exposeInMainWorld("skillAPI", {
  openFiles: () => ipcRenderer.invoke("skill:openFiles"),
  openDirectory: () => ipcRenderer.invoke("skill:openDirectory"),
  saveFile: (content, defaultName) =>
    ipcRenderer.invoke("skill:saveFile", { content, defaultName }),
});