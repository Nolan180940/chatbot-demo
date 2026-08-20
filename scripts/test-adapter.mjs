// 临时测试：验证 lib/api-adapter.ts 的协议识别 / 请求构造 / SSE 解析
import { resolveEndpoint, buildUpstreamRequest, extractDelta } from "../src/lib/api-adapter.ts";

let pass = 0;
let fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++;
  else {
    fail++;
    console.log(`✗ ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

// --- resolveEndpoint ---
check("完整 chat/completions 端点", resolveEndpoint("https://opencode.ai/zen/go/v1/chat/completions"), {
  kind: "openai-chat",
  url: "https://opencode.ai/zen/go/v1/chat/completions",
});
check("完整 responses 端点", resolveEndpoint("https://opencode.ai/zen/go/v1/responses"), {
  kind: "openai-responses",
  url: "https://opencode.ai/zen/go/v1/responses",
});
check("完整 messages 端点", resolveEndpoint("https://opencode.ai/zen/go/v1/messages"), {
  kind: "anthropic-messages",
  url: "https://opencode.ai/zen/go/v1/messages",
});
check("带尾斜杠", resolveEndpoint("https://opencode.ai/zen/go/v1/chat/completions/"), {
  kind: "openai-chat",
  url: "https://opencode.ai/zen/go/v1/chat/completions",
});
check("以 /v1 结尾", resolveEndpoint("https://opencode.ai/zen/go/v1"), {
  kind: "openai-chat",
  url: "https://opencode.ai/zen/go/v1/chat/completions",
});
check("只填域名（旧行为回归）", resolveEndpoint("https://api.openai.com"), {
  kind: "openai-chat",
  url: "https://api.openai.com/v1/chat/completions",
});
check("本地 mock 域名", resolveEndpoint("http://localhost:9998"), {
  kind: "openai-chat",
  url: "http://localhost:9998/v1/chat/completions",
});

// --- buildUpstreamRequest ---
const msgs = [
  { role: "user", content: "hi" },
  { role: "assistant", content: "hello" },
];

const chatReq = buildUpstreamRequest("openai-chat", "https://x/v1/chat/completions", "KEY", "hy3", msgs);
check("chat 请求体", JSON.parse(chatReq.body), { model: "hy3", messages: msgs, stream: true });
check("chat 认证头", chatReq.headers.Authorization, "Bearer KEY");

const respReq = buildUpstreamRequest("openai-responses", "https://x/v1/responses", "KEY", "grok-4.5", msgs);
check("responses 请求体", JSON.parse(respReq.body), {
  model: "grok-4.5",
  input: [
    { role: "user", content: [{ type: "input_text", text: "hi" }] },
    { role: "assistant", content: [{ type: "input_text", text: "hello" }] },
  ],
  stream: true,
});

const msgReq = buildUpstreamRequest("anthropic-messages", "https://x/v1/messages", "KEY", "qwen3.7-max", msgs);
const msgBody = JSON.parse(msgReq.body);
check("messages 请求体", msgBody, { model: "qwen3.7-max", messages: msgs, max_tokens: 4096, stream: true });
check("messages 认证头 x-api-key", msgReq.headers["x-api-key"], "KEY");
check("messages anthropic-version", msgReq.headers["anthropic-version"], "2023-06-01");

// --- extractDelta ---
check("chat delta", extractDelta({ choices: [{ delta: { content: "你好" } }] }), "你好");
check("responses delta", extractDelta({ type: "response.output_text.delta", delta: "世界" }), "世界");
check("messages delta", extractDelta({ type: "content_block_delta", delta: { type: "text_delta", text: "!" } }), "!");
check("messages 非文本块", extractDelta({ type: "content_block_delta", delta: { type: "thinking_delta", thinking: "x" } }), "");
check("无关事件", extractDelta({ type: "response.created" }), "");
check("chat 空 content", extractDelta({ choices: [{ delta: { content: null } }] }), "");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);