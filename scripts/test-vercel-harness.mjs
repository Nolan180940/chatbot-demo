// 模拟 Vercel serverless 运行时调用 api/chat.ts
// 用法: node scripts/test-vercel-harness.mjs
import http from "node:http";
import handler from "../api/chat.ts";

const server = http.createServer((req, res) => {
  handler(req, res);
});

server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  console.log(`harness listening on ${port}`);

  const body = JSON.stringify({
    baseUrl: "https://opencode.ai/zen/v1/chat/completions",
    apiKey: "sk-invalid-test",
    model: "hy3-free",
    messages: [{ role: "user", content: "ping" }],
  });

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const text = await res.text();
    console.log(`STATUS: ${res.status}`);
    console.log(`BODY: ${text.slice(0, 300)}`);
  } catch (e) {
    console.log(`FETCH ERROR: ${e.message}`);
  }

  server.close();
  process.exit(0);
});