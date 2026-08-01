// 本地 mock OpenAI 兼容服务器，用于验证 /api/chat 代理
// 启动：node mock-server.mjs （监听 9998）
import http from "node:http";

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
  });

  const chunks = ["你好", "，", "我是", " mock ", "模型", "。", "流式", "测试", "完成！"];
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
  }, 50);
});

server.listen(9998, () => {
  console.log("mock server on http://localhost:9998");
});
