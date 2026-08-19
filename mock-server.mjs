// 本地 mock 服务器，用于验证 /api/chat 代理（不花一分钱测三种协议）
// 启动：node mock-server.mjs （监听 9998）
//
// 支持三种端点（按请求路径自动识别）：
//   POST /v1/chat/completions  → OpenAI chat 格式 SSE
//   POST /v1/responses         → OpenAI responses 格式 SSE
//   POST /v1/messages          → Anthropic messages 格式 SSE
import http from "node:http";

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let lastUser = "";
    let kind = "chat";
    try {
      const parsed = JSON.parse(body);
      const path = req.url ?? "";
      if (path.endsWith("/responses")) {
        kind = "responses";
        // responses 格式：input[].content 是数组（input_text 块）
        const input = parsed?.input ?? [];
        const last = input.filter((m) => m.role === "user").pop();
        lastUser = Array.isArray(last?.content)
          ? last.content.map((p) => p.text ?? "").join("")
          : last?.content ?? "";
      } else if (path.endsWith("/messages")) {
        kind = "messages";
        const msgs = parsed?.messages ?? [];
        lastUser = msgs.filter((m) => m.role === "user").pop()?.content ?? "";
      } else {
        const msgs = parsed?.messages ?? [];
        lastUser = msgs.filter((m) => m.role === "user").pop()?.content ?? "";
      }
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
    // SKILL 模式：识别创建 SKILL 的系统提示词，返回符合流程的响应（用于测试 AI 创建向导）
    let text = lastUser || fallback;
    let allPrompt = "";
    try {
      const parsed = JSON.parse(body);
      const msgs = parsed?.messages ?? [];
      allPrompt = msgs.map((m) => m.content).join("\n") ?? "";
    } catch {
      /* ignore */
    }
    if (allPrompt.includes("colleague-skill")) {
      if (allPrompt.includes("多轮对话收集")) {
        text = "好的，我来收集信息！请先告诉我：\n\n1. 这个人物/功能的名字和一句话简介是什么？\n2. 它最核心的 2-3 个特征是什么？";
      } else if (allPrompt.includes("生成完整的 SKILL.md")) {
        text =
          "```json\n" +
          JSON.stringify({
            name: "colleague_kongzi",
            displayName: "孔子",
            description: "孔子，儒家学派创始人，思想家、教育家",
            tags: ["儒家", "历史人物"],
            content:
              "---\nname: colleague_kongzi\ndescription: 孔子，儒家学派创始人，思想家、教育家\nuser-invocable: true\n---\n\n# 孔子\n\n你是孔子，儒家学派创始人。\n\n---\n\n## PART B: Persona\n\n### 硬规则（不可违背）\n\n- 坚持「仁」与「礼」的核心价值观\n\n### 身份\n\n- 姓名：孔丘，字仲尼\n- 背景：春秋时期鲁国人，思想家、教育家\n\n### 表达风格\n\n- 语气：温和而坚定，善用比喻\n- 语言习惯：常引用《论语》语录\n- 回复长度：言简意赅\n\n### 决策模式\n\n- 以「仁」为准则，权衡义利\n\n### 人际行为\n\n- 尊师重道，重视礼数\n\n### Correction（被纠正时）\n\n- 虚心接受，但坚持原则\n\n---\n\n## Operating Rules\n\n1. 始终以孔子的身份和思想回应\n2. 引用《论语》时确保准确\n3. 涉及不确定的历史细节时诚实说明\n",
          }) +
          "```";
      }
    }
    // 按小块切分模拟逐字输出
    if (allPrompt.includes("colleague-skill") && allPrompt.includes("生成完整的 SKILL.md")) {
      console.log("[mock] SKILL text length:", text.length, "ends with ```:", text.endsWith("```"), "last10:", JSON.stringify(text.slice(-10)));
    }
    const chunks = text.match(/[\s\S]{1,24}/g) ?? [];
    let i = 0;
    const timer = setInterval(() => {
      if (i < chunks.length) {
        const delta = chunks[i++];
        let event = "";
        if (kind === "responses") {
          event = `data: ${JSON.stringify({ type: "response.output_text.delta", delta })}\n\n`;
        } else if (kind === "messages") {
          event = `data: ${JSON.stringify({
            type: "content_block_delta",
            delta: { type: "text_delta", text: delta },
          })}\n\n`;
        } else {
          event = `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`;
        }
        res.write(event);
      } else {
        res.write("data: [DONE]\n\n");
        clearInterval(timer);
        res.end();
      }
    }, 120);
  });
});

server.listen(9998, () => {
  console.log(
    "mock server on http://localhost:9998 (chat/completions | responses | messages)",
  );
});
