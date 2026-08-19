// 单元测试：lib/skill 模块（parser / validate / template / storage / prompts）
import { parseSkill, serializeSkill } from "../lib/skill/parser.ts";
import { validateSkill } from "../lib/skill/validate.ts";
import { personaTemplate, functionalTemplate } from "../lib/skill/template.ts";
import {
  setSkillStorage,
  saveSkill,
  loadSkills,
  deleteSkill,
  getSkill,
  updateSkillContent,
  rollbackSkill,
  buildSkillDoc,
  findSlugConflicts,
} from "../lib/skill/storage.ts";
import { parseLLMOutput, buildGeneratePrompt } from "../lib/skill/prompts.ts";
import { toSlug, makeId, normalizeName } from "../lib/skill/schema.ts";

let pass = 0;
let fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++;
  else {
    fail++;
    console.log(`✗ ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function ok(name, cond) {
  if (cond) pass++;
  else {
    fail++;
    console.log(`✗ ${name}`);
  }
}

// --- 内存存储注入 ---
const mem = new Map();
setSkillStorage({
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => void mem.set(k, v),
  removeItem: (k) => void mem.delete(k),
});

// --- schema ---
check("toSlug 中文+空格", toSlug("孔子 语录"), "孔子_语录");
check("toSlug 大写转小写", toSlug("MySkill"), "myskill");
check("toSlug 空输入", toSlug("   "), "skill");

// --- normalizeName（方案 A：连字符转下划线） ---
check("normalizeName 连字符转下划线", normalizeName("colleague-kongzi"), "colleague_kongzi");
check("normalizeName 大写转小写", normalizeName("My-Skill"), "my_skill");
check("normalizeName 非法字符清理", normalizeName("Bad Name!"), "bad_name");
check("normalizeName 已下划线不变", normalizeName("colleague_kongzi"), "colleague_kongzi");
check("normalizeName 空输入", normalizeName("   "), "");
ok("makeId 唯一性", makeId("a") !== makeId("a"));

// --- parser ---
const GOOD = `---
name: colleague_kongzi
description: 孔子，儒家创始人
user-invocable: true
---

# 孔子

你是孔子。

## PART A: Work

### 功能描述

## PART B: Persona

### 身份
`;
const p = parseSkill(GOOD);
ok("parseSkill 正常解析", p !== null);
check("parseSkill name", p?.name, "colleague_kongzi");
check("parseSkill description", p?.description, "孔子，儒家创始人");
check("parseSkill userInvocable", p?.userInvocable, true);
check("parseSkill title", p?.title, "孔子");
check("parseSkill hasPartA/B", [p?.hasPartA, p?.hasPartB], [true, true]);
check("parseSkill type", p?.type, "combined");

const p2 = parseSkill("没有 frontmatter 的普通文本");
ok("parseSkill 无 frontmatter 返回 null", p2 === null);
ok("parseSkill 空内容返回 null", parseSkill("") === null);

const p3 = parseSkill(`---
name: tool_web_search
description: 网页搜索工具
---

# 网页搜索

## PART A: Work
`);
check("parseSkill 仅 PART A → functional", p3?.type, "functional");

const p4 = parseSkill(`---
name: ex_girlfriend
description: 前任人格
---

# 前任

## PART B: Persona
`);
check("parseSkill 仅 PART B → persona", p4?.type, "persona");

// --- serialize ---
const round = serializeSkill(p);
ok("serializeSkill 往返可再解析", parseSkill(round)?.name === "colleague_kongzi");

// --- validate ---
check("validate 空内容", validateSkill("").valid, false);
check("validate 无 frontmatter", validateSkill("hello").valid, false);
check("validate 合法文件", validateSkill(GOOD).valid, true);
const vNoName = validateSkill(`---
description: 缺 name
---

# X
`);
check("validate 缺 name → error", vNoName.issues.some((i) => i.severity === "error" && i.field === "name"), true);
const vBadName = validateSkill(`---
name: Bad Name!
description: x
---

# X
`);
check("validate name 非法字符 → error", vBadName.issues.some((i) => i.severity === "error" && i.field === "name"), true);
const vHyphenName = validateSkill(`---
name: colleague-kongzi
description: x
---

# X
`);
check("validate name 连字符 → 可导入", vHyphenName.valid, true);
check("validate name 连字符 → warning 提示归一化", vHyphenName.issues.some((i) => i.severity === "warning" && i.field === "name" && i.message.includes("colleague_kongzi")), true);
const vNoPart = validateSkill(`---
name: plain
description: x
---

# X

普通内容
`);
check("validate 无 PART 结构 → warning 但 valid", vNoPart.valid && vNoPart.issues.some((i) => i.severity === "warning"), true);
const vNoTitle = validateSkill(`---
name: plain
description: x
---

## PART A: Work
`);
check("validate 缺一级标题 → warning", vNoTitle.issues.some((i) => i.severity === "warning" && i.message.includes("一级标题")), true);

// --- template ---
const pt = personaTemplate("ex", "前任", "前任人格");
ok("personaTemplate 含六层结构", ["硬规则", "身份", "表达风格", "决策模式", "人际行为", "Correction"].every((s) => pt.includes(s)));
ok("personaTemplate 可解析", parseSkill(pt)?.type === "persona");
const ft = functionalTemplate("tool", "工具", "工具描述");
ok("functionalTemplate 含 Work 章节", ["功能描述", "使用方法", "参数配置", "工作流程", "输出偏好", "经验知识库"].every((s) => ft.includes(s)));
ok("functionalTemplate 可解析", parseSkill(ft)?.type === "functional");

// --- storage ---
const doc = buildSkillDoc({
  slug: "kongzi",
  name: "colleague_kongzi",
  displayName: "孔子",
  description: "儒家创始人",
  type: "persona",
  category: "celebrity",
  tags: ["儒家", "历史"],
  content: GOOD,
  source: "import",
});
check("buildSkillDoc 初始版本", doc.meta.version, 1);
check("buildSkillDoc 版本快照数", doc.versions.length, 1);
saveSkill(doc);
check("loadSkills 数量", loadSkills().length, 1);
check("getSkill 查找", getSkill(doc.id)?.meta.displayName, "孔子");

const updated = updateSkillContent(doc.id, GOOD + "\n新增内容", "补充语录");
check("updateSkillContent 版本+1", updated?.meta.version, 2);
check("updateSkillContent 快照数", updated?.versions.length, 2);
check("updateSkillContent 内容更新", updated?.content.includes("新增内容"), true);

const rolled = rollbackSkill(doc.id, 1);
check("rollbackSkill 回滚到 v1", rolled?.meta.version, 3);
check("rollbackSkill 内容恢复", rolled?.content.includes("新增内容"), false);

// slug 冲突
const doc2 = buildSkillDoc({
  slug: "kongzi",
  name: "colleague_kongzi2",
  displayName: "孔子2",
  description: "另一个",
  type: "functional",
  category: "colleague",
  tags: [],
  content: GOOD,
  source: "import",
});
saveSkill(doc2);
check("findSlugConflicts 检测到 2 个冲突", findSlugConflicts("kongzi").length, 2);
check("findSlugConflicts 排除自身", findSlugConflicts("kongzi", doc.id).length, 1);
check("findSlugConflicts 无冲突", findSlugConflicts("nobody").length, 0);

deleteSkill(doc.id);
check("deleteSkill 删除后剩 1 个", loadSkills().length, 1);

// --- prompts ---
const llmOut = `好的，这是生成的 SKILL：

\`\`\`json
{
  "name": "colleague_kongzi",
  "displayName": "孔子",
  "description": "儒家创始人",
  "tags": ["儒家"],
  "content": "---\\nname: colleague_kongzi\\ndescription: 儒家创始人\\n---\\n\\n# 孔子\\n"
}
\`\`\``;
const parsed = parseLLMOutput(llmOut);
ok("parseLLMOutput 解析 JSON 块", parsed !== null);
check("parseLLMOutput name", parsed?.meta.name, "colleague_kongzi");
check("parseLLMOutput content", parsed?.content.includes("# 孔子"), true);
ok("parseLLMOutput 非法输入返回 null", parseLLMOutput("不是 JSON") === null);
ok("parseLLMOutput 无 JSON 块但纯 JSON", parseLLMOutput('{"content":"x"}') !== null);

const gen = buildGeneratePrompt("persona", { 姓名: "孔子", 性格: "仁" });
ok("buildGeneratePrompt 含收集信息", gen.includes("孔子") && gen.includes("仁"));
ok("buildGeneratePrompt 含类型", gen.includes("人格类"));

// --- 汇总 ---
console.log(`\nPASS: ${pass}  FAIL: ${fail}`);
process.exit(fail > 0 ? 1 : 0);