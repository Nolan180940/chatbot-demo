/**
 * Vercel Serverless 代理：/api/chat
 * 复用 src/lib/api-adapter.ts 的三协议识别逻辑，转发 SSE 流。
 * 前端（Vite 构建的静态站）同源调用，无 CORS 问题。
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { REQUEST_TIMEOUT_MS } from "../src/lib/config.ts";
import { resolveEndpoint, buildUpstreamRequest } from "../src/lib/api-adapter.ts";

const MAX_BODY_KB = 256;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // 仅接受 POST
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: { code: "method_not_allowed", message: "仅支持 POST" } }));
    return;
  }

  // 1. 限制请求体大小
  const contentLength = Number(req.headers["content-length"] ?? 0);
  if (contentLength > MAX_BODY_KB * 1024) {
    res.statusCode = 413;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: { code: "payload_too_large", message: "请求体过大" } }));
    return;
  }

  // 2. 读取并解析 JSON 请求体
  let body: any;
  try {
    body = await readJson(req);
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: { code: "invalid_json", message: "请求体不是合法 JSON" } }));
    return;
  }

  const { baseUrl, apiKey, model, messages } = body ?? {};

  // 3. 参数校验
  if (!baseUrl || !apiKey || !model) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({ error: { code: "invalid_params", message: "缺少 baseUrl / apiKey / model" } }),
    );
    return;
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({ error: { code: "invalid_params", message: "messages 不能为空" } }),
    );
    return;
  }

  // 4. 安全校验：只允许 http/https 协议，防止 SSRF
  let normalizedBase: string;
  try {
    const u = new URL(baseUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
    normalizedBase = baseUrl.replace(/\/+$/, "");
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: { code: "invalid_base_url", message: "base URL 不合法，需以 http(s):// 开头" },
      }),
    );
    return;
  }

  // 5. 识别协议并构造上游请求
  const { kind, url } = resolveEndpoint(normalizedBase);
  const upstreamReq = buildUpstreamRequest(
    kind,
    url,
    apiKey,
    model,
    messages.map((m: any) => ({ role: m.role, content: m.content })),
  );

  // 6. 超时控制 + 客户端断开时取消上游请求
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

    // 7. 上游非 2xx：透传错误
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      const contentType = upstream.headers.get("content-type") ?? "";
      let message: string;
      if (contentType.includes("text/html")) {
        message =
          upstream.status === 404
            ? `上游返回 404（HTML 页面）——请检查 Base URL：填完整端点时不要重复带 /v1/chat/completions 等路径，例如直接填 https://opencode.ai/zen/go/v1/chat/completions`
            : `上游返回 ${upstream.status}（HTML 页面），请检查 Base URL 是否正确`;
      } else {
        message = errText || `上游服务返回 ${upstream.status}`;
      }
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: { code: "upstream_error", status: upstream.status, message },
        }),
      );
      return;
    }

    // 8. 成功：转发 SSE 流
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = upstream.body!.getReader();
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
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (res.writableEnded) return;
    if (e?.name === "AbortError") {
      res.statusCode = 504;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ error: { code: "timeout", message: "请求超时，请检查网络或 base URL" } }),
      );
      return;
    }
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: { code: "network_error", message: e?.message ?? "网络错误" } }));
  } finally {
    clearTimeout(timeoutId);
    req.removeListener("close", onClientAbort);
  }
}

/** 读取请求体并解析 JSON */
function readJson(req: IncomingMessage): Promise<any> {
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