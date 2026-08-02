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

    const chunks = [
      "好的，我来介绍**洛必达法则**（L'Hôpital's rule）。\n\n",
      "对于极限 $\\lim_{x \\to a} \\frac{f(x)}{g(x)}$，若满足：\n\n",
      "$$\\lim_{x \\to a} f(x) = 0 \\quad \\text{且} \\quad \\lim_{x \\to a} g(x) = 0$$\n\n",
      "且 $g'(x) \\neq 0$，则：\n\n",
      "$$\\lim_{x \\to a} \\frac{f(x)}{g(x)} = \\lim_{x \\to a} \\frac{f'(x)}{g'(x)}$$\n\n",
      "例如：$\\lim_{x \\to 0} \\frac{\\sin x}{x} = \\lim_{x \\to 0} \\frac{\\cos x}{1} = 1$。\n",
      "你说的是：“",
      lastUser,
      "”。流式测试完成！",
    ];
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
