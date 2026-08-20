/**
 * API 协议适配层：根据 Base URL 自动识别三种主流 LLM 协议，
 * 并构造对应的上游请求（URL / 请求头 / 请求体）。
 *
 * 支持：
 *  - OpenAI chat/completions（OpenAI、DeepSeek、OpenCode Go 的 Hy3/GLM/Kimi 等）
 *  - OpenAI responses（Grok、GPT-5.x 等）
 *  - Anthropic messages（Claude、Qwen3 Max/Plus、MiniMax 等）
 */

export type ApiKind = "openai-chat" | "openai-responses" | "anthropic-messages";

export interface ResolvedEndpoint {
  kind: ApiKind;
  url: string;
}

/**
 * 解析 Base URL：
 *  - 已带完整端点（/chat/completions、/responses、/messages）→ 直接使用并识别协议
 *  - 以 /v1 结尾 → 补 /chat/completions
 *  - 只填域名/根地址 → 补 /v1/chat/completions（兼容旧行为）
 */
export function resolveEndpoint(baseUrl: string): ResolvedEndpoint {
  const b = baseUrl.trim().replace(/\/+$/, "");
  if (b.endsWith("/chat/completions")) return { kind: "openai-chat", url: b };
  if (b.endsWith("/responses")) return { kind: "openai-responses", url: b };
  if (b.endsWith("/messages")) return { kind: "anthropic-messages", url: b };
  if (b.endsWith("/v1")) return { kind: "openai-chat", url: `${b}/chat/completions` };
  return { kind: "openai-chat", url: `${b}/v1/chat/completions` };
}

export interface UpstreamRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

/** 按协议类型构造上游请求（统一走流式） */
export function buildUpstreamRequest(
  kind: ApiKind,
  url: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
): UpstreamRequest {
  switch (kind) {
    case "openai-chat":
      return {
        url,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, stream: true }),
      };

    case "openai-responses":
      // Responses API：input 的 content 是数组（input_text 块）
      return {
        url,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
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
      // Anthropic：x-api-key 认证 + 必须带 anthropic-version 与 max_tokens
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

/** 从任意协议的 SSE 事件 JSON 中提取文本增量 */
export function extractDelta(json: any): string {
  // OpenAI chat/completions：choices[0].delta.content
  const c = json?.choices?.[0]?.delta?.content;
  if (typeof c === "string") return c;
  // OpenAI responses：response.output_text.delta
  if (json?.type === "response.output_text.delta") return json.delta ?? "";
  // Anthropic messages：content_block_delta / text_delta
  if (json?.type === "content_block_delta" && json?.delta?.type === "text_delta") {
    return json.delta.text ?? "";
  }
  return "";
}