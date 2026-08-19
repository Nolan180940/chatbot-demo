// 临时端到端测试：通过 /api/chat 代理分别测三种协议
const BASE = "http://localhost:3000/api/chat";

async function test(name, baseUrl, model) {
  const resp = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      baseUrl,
      apiKey: "test-key",
      model,
      messages: [{ role: "user", content: "你好，请回显这句话" }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    console.log(`✗ ${name}  HTTP ${resp.status}: ${err?.error?.message ?? resp.statusText}`);
    return false;
  }
  const text = await resp.text();
  const ok = text.includes("你好，请回显这句话") && text.includes("[DONE]");
  console.log(`${ok ? "✓" : "✗"} ${name}  (${text.length} bytes)`);
  if (!ok) console.log("  首 200 字符:", text.slice(0, 200));
  return ok;
}

const results = await Promise.all([
  test("chat/completions", "http://localhost:9998/v1/chat/completions", "hy3"),
  test("responses", "http://localhost:9998/v1/responses", "grok-4.5"),
  test("messages", "http://localhost:9998/v1/messages", "qwen3.7-max"),
  // 回归：只填域名 → 自动补 /v1/chat/completions
  test("域名自动补全(回归)", "http://localhost:9998", "hy3"),
]);

const okCount = results.filter(Boolean).length;
console.log(`\n${okCount}/4 通过`);
process.exit(okCount === 4 ? 0 : 1);