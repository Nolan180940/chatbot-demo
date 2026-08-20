// 测试 mock server 动态 SKILL 生成：node scripts/test-mock-skill.mjs
const BASE = "http://localhost:9998/v1/chat/completions";

async function ask(messages) {
  const resp = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const text = await resp.text();
  // 提取所有 data: 行并拼接 delta
  const deltas = text
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => {
      try {
        return JSON.parse(l.slice(5).trim()).choices?.[0]?.delta?.content ?? "";
      } catch {
        return "";
      }
    })
    .join("");
  return deltas;
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

// 1. 张雪峰（人格类）
const zxf = await ask([
  { role: "system", content: "你是一个 SKILL 创建助手，遵循 colleague-skill 规范" },
  {
    role: "user",
    content:
      "请根据以下收集到的信息，生成完整的 SKILL.md 文件。\n\n类型：人格类\n\n收集到的信息：\n- 人物是谁: 张雪峰，考研名师\n- 核心性格特征: 直率、犀利、接地气\n\n输出格式：先输出一个 JSON 代码块",
  },
]);
check("张雪峰 → 含张雪峰", zxf.includes("张雪峰"), zxf.slice(0, 200));
check("张雪峰 → 不含孔子", !zxf.includes("孔子"), "");
check("张雪峰 → 含 colleague_ slug", /colleague_[a-z0-9_]+/.test(zxf), "");

// 2. 李雪琴（人格类）
const lxq = await ask([
  { role: "system", content: "你是一个 SKILL 创建助手，遵循 colleague-skill 规范" },
  {
    role: "user",
    content:
      "请根据以下收集到的信息，生成完整的 SKILL.md 文件。\n\n类型：人格类\n\n收集到的信息：\n- 人物是谁: 李雪琴，脱口秀演员\n- 核心性格特征: 幽默、自嘲\n\n输出格式：先输出一个 JSON 代码块",
  },
]);
check("李雪琴 → 含李雪琴", lxq.includes("李雪琴"), lxq.slice(0, 200));
check("李雪琴 → 不含张雪峰", !lxq.includes("张雪峰"), "");

// 3. 功能性（网页搜索）
const func = await ask([
  { role: "system", content: "你是一个 SKILL 创建助手，遵循 colleague-skill 规范" },
  {
    role: "user",
    content:
      "请根据以下收集到的信息，生成完整的 SKILL.md 文件。\n\n类型：功能性\n\n收集到的信息：\n- 核心功能: 网页搜索工具\n- 使用方法: 输入关键词\n\n输出格式：先输出一个 JSON 代码块",
  },
]);
check("功能性 → 含网页搜索", func.includes("网页搜索"), func.slice(0, 200));
check("功能性 → 含 PART A", func.includes("PART A"), "");

// 4. 兜底：无名字信息
const fallback = await ask([
  { role: "system", content: "你是一个 SKILL 创建助手，遵循 colleague-skill 规范" },
  {
    role: "user",
    content: "请根据以下收集到的信息，生成完整的 SKILL.md 文件。\n\n类型：人格类\n\n收集到的信息：\n（无，请基于常识生成合理内容）\n\n输出格式：先输出一个 JSON 代码块",
  },
]);
check("兜底 → 含测试人物", fallback.includes("测试人物"), fallback.slice(0, 200));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);