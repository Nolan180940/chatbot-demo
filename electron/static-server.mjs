/**
 * Electron 生产模式本地服务：
 *  - 静态文件服务 dist/（SPA fallback 到 index.html）
 *  - POST /api/chat 代理到上游 LLM（同源，无 CORS 问题）
 *
 * 由 electron/main.js 以 ELECTRON_RUN_AS_NODE 模式 spawn。
 * 用法: node static-server.mjs <distDir> <port>
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = process.argv[2] || path.join(__dirname, "..", "dist");
const port = Number(process.argv[3] || 0);

const REQUEST_TIMEOUT_MS = 120_000;
const MAX_BODY_KB = 256;

// ── 静态文件 ─────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (urlPath === "/") urlPath = "/index.html";

  let filePath = path.normalize(path.join(distDir, urlPath));
  // 防目录穿越
  if (!filePath.startsWith(distDir)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback
    filePath = path.join(distDir, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
}

// ── /api/chat 代理（与 Vercel api/chat.ts 同逻辑） ───────────────
function resolveEndpoint(baseUrl) {
  const b = baseUrl.trim().replace(/\/+$/, "");
  if (b.endsWith("/chat/completions")) return { kind: "openai-chat", url: b };
  if (b.endsWith("/responses")) return { kind: "openai-responses", url: b };
  if (b.endsWith("/messages")) return { kind: "anthropic-messages", url: b };
  if (b.endsWith("/v1")) return { kind: "openai-chat", url: `${b}/chat/completions` };
  return { kind: "openai-chat", url: `${b}/v1/chat/completions` };
}

function buildUpstreamRequest(kind, url, apiKey, model, messages) {
  switch (kind) {
    case "openai-chat":
      return {
        url,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, stream: true }),
      };
    case "openai-responses":
      return {
        url,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          input: messages.map((m) => ({
            role: m.role,
            content: [{ type: "input_text", text: m.content }],
          })),
          stream: true,
        }),
      };
    case "anthropic-messages":
      return {
        url,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: 4096,
          stream: true,
        }),
      };
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY_KB * 1024) {
        reject(new Error("payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

async function handleChat(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { error: { code: "invalid_json", message: "请求体不是合法 JSON" } });
  }

  const { baseUrl, apiKey, model, messages } = body ?? {};
  if (!baseUrl || !apiKey || !model) {
    return sendJson(res, 400, {
      error: { code: "invalid_params", message: "缺少 baseUrl / apiKey / model" },
    });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return sendJson(res, 400, { error: { code: "invalid_params", message: "messages 不能为空" } });
  }

  let normalizedBase;
  try {
    const u = new URL(baseUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("unsupported protocol");
    normalizedBase = baseUrl.replace(/\/+$/, "");
  } catch {
    return sendJson(res, 400, {
      error: { code: "invalid_base_url", message: "base URL 不合法，需以 http(s):// 开头" },
    });
  }

  const { kind, url } = resolveEndpoint(normalizedBase);
  const upstreamReq = buildUpstreamRequest(
    kind,
    url,
    apiKey,
    model,
    messages.map((m) => ({ role: m.role, content: m.content })),
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onClientAbort = () => controller.abort();
  req.on("close", onClientAbort);

  try {
    const upstream = await fetch(upstreamReq.url, {
      method: "POST",
      headers: upstreamReq.headers,
      body: upstreamReq.body,
      signal: controller.signal,
      redirect: "manual",
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      const contentType = upstream.headers.get("content-type") ?? "";
      let message;
      if (contentType.includes("text/html")) {
        message =
          upstream.status === 404
            ? `上游返回 404（HTML 页面）——请检查 Base URL：填完整端点时不要重复带 /v1/chat/completions 等路径，例如直接填 https://opencode.ai/zen/go/v1/chat/completions`
            : `上游返回 ${upstream.status}（HTML 页面），请检查 Base URL 是否正确`;
      } else {
        message = errText || `上游服务返回 ${upstream.status}`;
      }
      return sendJson(res, upstream.status, {
        error: { code: "upstream_error", status: upstream.status, message },
      });
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } finally {
      reader.releaseLock();
    }
    res.end();
  } catch (e) {
    clearTimeout(timeoutId);
    if (res.writableEnded) return;
    if (e?.name === "AbortError") {
      return sendJson(res, 504, {
        error: { code: "timeout", message: "请求超时，请检查网络或 base URL" },
      });
    }
    return sendJson(res, 502, {
      error: { code: "network_error", message: e?.message ?? "网络错误" },
    });
  } finally {
    clearTimeout(timeoutId);
    req.removeListener("close", onClientAbort);
  }
}

// ── 启动 ────────────────────────────────────────────────────────
if (!fs.existsSync(path.join(distDir, "index.html"))) {
  console.error(`[static-server] 未找到 ${path.join(distDir, "index.html")}，请先运行 npm run build`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url, "http://localhost").pathname;
  if (req.method === "POST" && urlPath === "/api/chat") {
    handleChat(req, res).catch((e) => {
      console.error("[static-server] /api/chat 错误:", e);
      if (!res.writableEnded) sendJson(res, 500, { error: { code: "internal", message: "内部错误" } });
    });
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res);
    return;
  }
  res.statusCode = 405;
  res.end("Method Not Allowed");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[static-server] listening on http://127.0.0.1:${server.address().port} (dist: ${distDir})`);
});