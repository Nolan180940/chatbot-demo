import { NextRequest } from "next/server";
import { REQUEST_TIMEOUT_MS } from "@/lib/config";
import { resolveEndpoint, buildUpstreamRequest } from "@/lib/api-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_KB = 256; // 防止超大请求

export async function POST(req: NextRequest) {
  // 1. 限制请求体大小
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_KB * 1024) {
    return json(
      { error: { code: "payload_too_large", message: "请求体过大" } },
      413,
    );
  }

  // 2. 解析客户端传入的三项参数 + 消息
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "invalid_json", message: "请求体不是合法 JSON" } }, 400);
  }

  const { baseUrl, apiKey, model, messages } = body ?? {};

  // 3. 参数校验
  if (!baseUrl || !apiKey || !model) {
    return json(
      { error: { code: "invalid_params", message: "缺少 baseUrl / apiKey / model" } },
      400,
    );
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(
      { error: { code: "invalid_params", message: "messages 不能为空" } },
      400,
    );
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
    return json(
      { error: { code: "invalid_base_url", message: "base URL 不合法，需以 http(s):// 开头" } },
      400,
    );
  }

  // 5. 识别协议类型（chat/completions | responses | messages）并构造上游请求
  const { kind, url } = resolveEndpoint(normalizedBase);
  const upstreamReq = buildUpstreamRequest(
    kind,
    url,
    apiKey,
    model,
    messages.map((m: any) => ({ role: m.role, content: m.content })),
  );

  // 6. 超时控制 + 客户端断开时取消上游请求
  //    （用户点击“停止生成”会 abort 客户端的 fetch，这里同步取消上游，
  //    避免模型继续生成浪费 token）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onClientAbort = () => controller.abort();
  req.signal.addEventListener("abort", onClientAbort);

  try {
    const upstream = await fetch(upstreamReq.url, {
      method: "POST",
      headers: upstreamReq.headers,
      body: upstreamReq.body,
      signal: controller.signal,
      redirect: "manual",
    });

    // 7. 上游非 2xx：透传错误（HTML 页面给友好提示）
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
      return json(
        {
          error: {
            code: "upstream_error",
            status: upstream.status,
            message,
          },
        },
        upstream.status,
      );
    }

    // 8. 成功：剥离 CORS 头、禁用缓冲，直接转发 SSE 流
    const headers = new Headers();
    headers.set("Content-Type", "text/event-stream; charset=utf-8");
    headers.set("Cache-Control", "no-cache, no-transform");
    headers.set("Connection", "keep-alive");
    headers.set("X-Accel-Buffering", "no");
    headers.delete("WWW-Authenticate");

    const res = new Response(upstream.body as any, { status: 200, headers });

    return res;
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e?.name === "AbortError") {
      return json(
        { error: { code: "timeout", message: "请求超时，请检查网络或 base URL" } },
        504,
      );
    }
    return json(
      { error: { code: "network_error", message: e?.message ?? "网络错误" } },
      502,
    );
  } finally {
    clearTimeout(timeoutId);
    req.signal.removeEventListener("abort", onClientAbort);
  }
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
