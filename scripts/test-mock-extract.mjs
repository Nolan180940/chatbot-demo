// 验证 mock server 从需求描述提取名字：node scripts/test-mock-extract.mjs
const BASE = "http://localhost:9998/v1/chat/completions";

async function ask(collected, type = "人格类") {
  const facts = Object.entries(collected)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  const body = JSON.stringify({
    messages: [
      { role: "system", content: "你是一个 SKILL 创建助手，遵循 colleague-skill 规范" },
      {
        role: "user",
        content:
          "请根据以下收集到的信息，生成完整的 SKILL.md 文件。\n\n类型：" +
          type +
          "\n\n收集到的信息：\n" +
          facts +
          "\n\n## 硬性要求\n\n- 必须严格使用「收集到的信息」中的人物/功能\n\n输出格式：先输出一个 JSON 代码块",
      },
    ],
  });
  const resp = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const text = await resp.text();
  return text
    .split("\n")
    .filter((l) => l.startsWith("data:") && !l.includes("[DONE]"))
    .map((l) => {
      try {
        return JSON.parse(l.slice(5)).choices?.[0]?.delta?.content ?? "";
      } catch {
        return "";
      }
    })
    .join("");
}

let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`PASS: ${name}`);
  } else {
    fail++;
    console.log(`FAIL: ${name} ${extra}`);
  }
}

// 1. 需求描述提取（首条消息场景）
const r1 = await ask({ "需求描述": "我需要创建一个张雪峰的SKILL，他是考研名师，说话直率犀利" });
const m1 = r1.match(/"displayName":"([^"]+)"/);
check("需求描述 → 提取张雪峰", m1 && m1[1] === "张雪峰", `got: ${m1?.[1]}`);
check("不含孔子", !r1.includes("孔子"), "");

// 2. 人物是谁提取（对话收集场景）
const r2 = await ask({ "人物是谁": "李雪琴，脱口秀演员" });
const m2 = r2.match(/"displayName":"([^"]+)"/);
check("人物是谁 → 提取李雪琴", m2 && m2[1] === "李雪琴", `got: ${m2?.[1]}`);

// 3. 功能性
const r3 = await ask({ "核心功能": "网页搜索工具" }, "功能性");
const m3 = r3.match(/"displayName":"([^"]+)"/);
check("核心功能 → 提取网页搜索工具", m3 && m3[1] === "网页搜索工具", `got: ${m3?.[1]}`);
check("功能性含 PART A", r3.includes("PART A"), "");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);