import { useConfigStore } from "@/store/config-store";
import type { Role } from "@/lib/types";
import { extractDelta } from "@/lib/api-adapter";

export interface LLMHistoryItem {
  role: Role | "system";
  content: string;
}

/** 解析 SSE 流：把 `data: {...}` 逐行喂给 onDelta，返回完整文本 */
export async function streamChat(
  messages: LLMHistoryItem[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { baseUrl, apiKey, model } = useConfigStore.getState();

  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ baseUrl, apiKey, model, messages }),
    signal,
  });

  if (!resp.ok) {
    let message = `HTTP ${resp.status}`;
    try {
      const data = await resp.json();
      message = data?.error?.message ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const json = JSON.parse(payload);
        // 兼容三种协议：chat/completions、responses、messages
        const delta = extractDelta(json);
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        /* 忽略无法解析的行 */
      }
    }
  }
  return full;
}

/** 连接测试：发送一条最短消息，验证 baseUrl + apiKey + model 是否可用 */
export async function testConnection(signal?: AbortSignal): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
}> {
  const start = Date.now();
  const { baseUrl, apiKey, model } = useConfigStore.getState();

  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl,
        apiKey,
        model,
        messages: [{ role: "user", content: "ping" }],
      }),
      signal,
    });
    const latencyMs = Date.now() - start;

    if (!resp.ok) {
      let msg = `HTTP ${resp.status}`;
      try {
        const data = await resp.json();
        msg = data?.error?.message ?? msg;
      } catch {
        /* ignore */
      }
      return { ok: false, latencyMs, message: msg };
    }

    // 读取少量流以确认真的通了（避免只是连接建立但模型无效）
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let firstText = "";
    for (let i = 0; i < 8; i++) {
      const { done, value } = await reader.read();
      if (done) break;
      firstText += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});

    const ok = firstText.length > 0;
    return {
      ok,
      latencyMs,
      message: ok
        ? "连接成功，模型响应正常"
        : "连接建立但未收到模型响应，请检查 Model ID",
    };
  } catch (e: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      message: e?.name === "AbortError" ? "测试超时" : (e?.message ?? "网络错误"),
    };
  }
}
