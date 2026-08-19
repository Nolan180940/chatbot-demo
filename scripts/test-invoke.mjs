// SKILL 调用（invoke）单元测试：node scripts/test-invoke.mjs
import { parseSkillCommand, extractSection, skillContentForMode, buildSkillMessages } from "../lib/skill/invoke.ts";

let pass = 0;
let fail = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`PASS: ${name}`);
  } else {
    fail++;
    console.log(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

const kongziContent = `---
name: colleague_kongzi
description: 孔子
user-invocable: true
---

# 孔子

你是孔子。

## PART A: Work

### 功能描述

讲学、答疑

### 使用方法

提问即可

## PART B: Persona

### 硬规则

坚持「仁」

### 身份

孔丘

## Operating Rules

1. 以孔子身份回应
`;

const doc = {
  id: "kongzi_1",
  meta: {
    id: "kongzi_1",
    slug: "colleague_kongzi",
    name: "colleague_kongzi",
    displayName: "孔子",
    description: "孔子",
    type: "persona",
    category: "persona",
    tags: [],
    version: 1,
    createdAt: 1,
    updatedAt: 1,
    source: "import",
  },
  content: kongziContent,
  versions: [],
};

// 1. 基本解析
const inv1 = parseSkillCommand("/colleague_kongzi 帮我写首诗", [doc]);
check("解析完整命令", inv1 && { slug: inv1.slug, mode: inv1.mode, question: inv1.question }, {
  slug: "colleague_kongzi",
  mode: "full",
  question: "帮我写首诗",
});

// 2. 无问题
const inv2 = parseSkillCommand("/colleague_kongzi", [doc]);
check("无问题默认", inv2 && inv2.question, "");

// 3. -work 后缀
const inv3 = parseSkillCommand("/colleague_kongzi-work 讲学", [doc]);
check("work 后缀", inv3 && { slug: inv3.slug, mode: inv3.mode, question: inv3.question }, {
  slug: "colleague_kongzi",
  mode: "work",
  question: "讲学",
});

// 4. -persona 后缀
const inv4 = parseSkillCommand("/colleague_kongzi-persona 你是谁", [doc]);
check("persona 后缀", inv4 && inv4.mode, "persona");

// 5. 未找到
check("未找到 SKILL", parseSkillCommand("/unknown_skill 你好", [doc]), null);

// 6. 非命令
check("非命令", parseSkillCommand("你好呀", [doc]), null);

// 7. extractSection
const work = extractSection(kongziContent, "PART A");
check("提取 PART A 含功能描述", work.includes("功能描述"), true);
check("提取 PART A 不含 Persona", work.includes("PART B"), false);
const persona = extractSection(kongziContent, "PART B");
check("提取 PART B 含硬规则", persona.includes("硬规则"), true);
check("提取 PART B 不含 Operating", persona.includes("Operating Rules"), false);

// 8. skillContentForMode
check("full 模式全文", skillContentForMode(doc, "full") === kongziContent, true);
check("work 模式裁剪", skillContentForMode(doc, "work").includes("功能描述"), true);
check("work 模式不含人格", skillContentForMode(doc, "work").includes("硬规则"), false);

// 9. buildSkillMessages
const history = [
  { role: "user", content: "你好" },
  { role: "assistant", content: "你好呀" },
  { role: "user", content: "/colleague_kongzi 你是谁" },
];
const msgs = buildSkillMessages(inv1, history);
check("system 注入在最前", msgs[0].role, "system");
check("system 含 SKILL 内容", msgs[0].content.includes("colleague_kongzi"), true);
check("最后一条 user 替换为问题", msgs[msgs.length - 1].content, "帮我写首诗");
check("消息数 = 历史数 + 1", msgs.length, history.length + 1);

// 10. 空问题默认问候
const invEmpty = parseSkillCommand("/colleague_kongzi", [doc]);
const msgs2 = buildSkillMessages(invEmpty, [{ role: "user", content: "/colleague_kongzi" }]);
check("空问题默认问候", msgs2[msgs2.length - 1].content, "你好，请介绍一下你自己");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);