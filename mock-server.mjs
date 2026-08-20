// 本地 mock 服务器，用于验证 /api/chat 代理（不花一分钱测三种协议）
// 启动：node mock-server.mjs （监听 9998）
//
// 支持三种端点（按请求路径自动识别）：
//   POST /v1/chat/completions  → OpenAI chat 格式 SSE
//   POST /v1/responses         → OpenAI responses 格式 SSE
//   POST /v1/messages          → Anthropic messages 格式 SSE
import http from "node:http";

/** 从生成提示词中提取人物/功能名（优先「人物是谁」，其次「核心功能」，再其次需求描述里的名字） */
function extractSkillName(allPrompt) {
  const m1 = allPrompt.match(/人物是谁[：:]\s*([^\n，,。]+)/);
  if (m1) return m1[1].trim();
  const m2 = allPrompt.match(/核心功能[：:]\s*([^\n，,。]+)/);
  if (m2) return m2[1].trim();
  // 从需求描述中提取：创建/做一个 …的SKILL（去掉引导语和尾部「的」）
  const m3 = allPrompt.match(/创建(?:一个|个)?(?:关于)?([\u4e00-\u9fff]{2,6})(?:的)?SKILL/);
  if (m3) return m3[1].replace(/的$/, "");
  // 兜底：需求描述里第一个 2-6 字中文词
  const m4 = allPrompt.match(/需求描述[：:]\s*([^\n，,。]+)/);
  if (m4) {
    const name = m4[1].replace(/^(?:我需要|我想|请帮我|帮我)?(?:创建|做一个|做一个关于)?/, "").trim();
    if (name) return name;
  }
  return null;
}

/** 中文名转 ASCII slug：拼音不可得时用 colleague_ + 时间戳兜底 */
function toAsciiSlug(name) {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return ascii || `colleague_${Date.now().toString(36)}`;
}

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
        // 从收集到的信息中动态提取人物/功能名，生成对应 SKILL（不再写死孔子）
        const skillName = extractSkillName(allPrompt) || "测试人物";
        const slug = toAsciiSlug(skillName);
        const isPersona = allPrompt.includes("人格类");
        const content = isPersona
          ? `---\nname: ${slug}\ndescription: ${skillName}，${skillName}风格助手\nuser-invocable: true\n---\n\n# ${skillName}\n\n你是${skillName}。\n\n---\n\n## PART B: Persona\n\n### 硬规则（不可违背）\n\n- 始终以${skillName}的身份和风格回应\n\n### 身份\n\n- 姓名：${skillName}\n- 背景：${skillName}风格助手\n\n### 表达风格\n\n- 语气：符合${skillName}的公众形象\n- 语言习惯：口语化、接地气\n- 回复长度：简洁有力\n\n### 决策模式\n\n- 以${skillName}的价值观为准则\n\n### 人际行为\n\n- 热情直接，不绕弯子\n\n### Correction（被纠正时）\n\n- 虚心接受，保持风格\n\n---\n\n## Operating Rules\n\n1. 始终以${skillName}的身份回应\n2. 保持${skillName}的标志性表达风格\n3. 涉及不确定的信息时诚实说明\n`
          : `---\nname: ${slug}\ndescription: ${skillName}，功能性工具\nuser-invocable: true\n---\n\n# ${skillName}\n\n${skillName}工具。\n\n---\n\n## PART A: Work\n\n### 功能描述\n\n提供${skillName}相关能力\n\n### 使用方法\n\n直接提问即可\n\n### 参数配置\n\n无\n\n### 工作流程\n\n1. 理解用户需求\n2. 执行${skillName}相关操作\n3. 返回结果\n\n### 输出偏好\n\n简洁清晰\n\n### 经验知识库\n\n${skillName}领域知识\n\n---\n\n## Operating Rules\n\n1. 按流程执行\n2. 结果准确\n3. 不确定时说明\n`;
        text =
          "```json\n" +
          JSON.stringify({
            name: slug,
            displayName: skillName,
            description: `${skillName}，${isPersona ? "人格类" : "功能性"} SKILL`,
            tags: [skillName],
            content,
          }) +
          "```";
      }
    } else if (allPrompt.includes("你正在使用 SKILL")) {
      // SKILL 调用模式：system 注入了 SKILL.md → 以孔子口吻回复
      text =
        "（mock · 孔子 SKILL 已生效）\n\n" +
        "学而时习之，不亦说乎？\n\n" +
        "你方才所问，吾已思之。以「仁」为本，以「礼」为纲，此事当如此处之：\n\n" +
        "1. 先明其义，再行其道；\n" +
        "2. 不义而富且贵，于我如浮云；\n" +
        "3. 君子和而不同，小人同而不和。\n\n" +
        "—— 孔丘 谨答";
    }
    // 按小块切分模拟逐字输出
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
