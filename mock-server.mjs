// 本地 mock OpenAI 兼容服务器，用于验证 /api/chat 代理
// 启动：node mock-server.mjs （监听 9998）
import http from "node:http";

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let lastUser = "";
    try {
      const parsed = JSON.parse(body);
      const msgs = parsed?.messages ?? [];
      lastUser = msgs.filter((m) => m.role === "user").pop()?.content ?? "";
    } catch {
      /* ignore */
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    });

    // 回显模式：把最后一条用户消息原样流式返回，方便前端调试任意内容（含 LaTeX）的渲染
    const fallback =
      "**回显模式**：本 mock 会把你的输入原样返回。可粘贴一段含 LaTeX 的内容，例如：\n\n" +
      "\\(\\lim_{x\\to 0}\\frac{\\sin x}{x}=1\\) 以及\n\n" +
      "\\[\\boxed{\\lim_{x\\to a}\\frac{f(x)}{g(x)}=\\lim_{x\\to a}\\frac{f'(x)}{g'(x)}}\\]";
    const text = lastUser || fallback;
    // 按小块切分模拟逐字输出
    const chunks = text.match(/[\s\S]{1,24}/g) ?? [];
    let i = 0;
    const timer = setInterval(() => {
      if (i < chunks.length) {
        const delta = chunks[i++];
        res.write(
          `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`,
        );
      } else {
        res.write("data: [DONE]\n\n");
        clearInterval(timer);
        res.end();
      }
    }, 120);
  });
});

server.listen(9998, () => {
  console.log("mock server on http://localhost:9998");
});
