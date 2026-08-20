import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vite 配置：沙箱要求端口 3015、构建产物 dist/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3015,
    strictPort: true,
    proxy: {
      // 本地开发：/api/chat 代理到 mock server（同源，无 CORS 问题）
      "/api": {
        target: "http://localhost:9998",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});