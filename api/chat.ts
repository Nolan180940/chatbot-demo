/**
 * Vercel Serverless 代理：/api/chat
 * 复用 src/lib/api-adapter.ts 的三协议识别逻辑，转发 SSE 流。
 * 前端（Vite 构建的静态站）同源调用，无 CORS 问题。
 */
import { REQUEST_TIMEOUT_MS } from "../src/lib/config.ts";
import { resolveEndpoint, buildUpstreamRequest } from "../src/lib/api-adapter.ts";

const MAX_BODY_KB = 256;

export default async function handler(req: Request): Promise<Response> {
  // 仅接受 POST
  if (req.method !== "POST") return json(405, { error: { code: "method_not_allowed", message: "仅支持 POST" } });

  // 1. 限制请求体大小
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_KB * 1024) return json(413, { error: { code: "payload_too_large", message: "请求体过大" } });

  // 2. 读取并解析 JSON 请求体
  let body: any;
  try {
    body = await req.json();
  } catch { return json(400, { error: { code: "invalid_json", message: "请求体不是合法 JSON" } }); }

  const { baseUrl, apiKey, model, messages } = body ?? {};

  // 3. 参数校验
  if (!baseUrl || !apiKey || !model) {
    return json(400, { error: { code: "invalid_params", message: "缺少 baseUrl / apiKey / model" } });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(400, { error: { code: "invalid_params", message: "messages 不能为空" } });
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
    return json(400, { error: { code: "invalid_base_url", message: "base URL 不合法，需以 http(s):// 开头" } });
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
  req.signal.addEventListener("abort", () => controller.abort(), { once: true });

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
      return json(upstream.status, { error: { code: "upstream_error", status: upstream.status, message } });
    }

    // 8. 成功：转发 SSE 流
    return new Response(upstream.body, { status: 200, headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    } });
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e?.name === "AbortError") {
      return json(504, { error: { code: "timeout", message: "请求超时，请检查网络或 base URL" } });
    }
    return json(502, { error: { code: "network_error", message: e?.message ?? "网络错误" } });
  } finally { clearTimeout(timeoutId); }
}

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

/** 读取请求体并解析 JSON */
