// AI 创建向导收集逻辑单元测试：node scripts/test-create-wizard.mjs
import { classifyAnswer, collectAnswer } from "../lib/skill/collect.ts";
import { buildGeneratePrompt, buildSystemPrompt } from "../lib/skill/prompts.ts";

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

// --- classifyAnswer：按提问归类 ---
check("人物是谁", classifyAnswer("1. 人物是谁？（姓名、身份、时代/背景）", "张雪峰，考研名师", "persona"), "人物是谁");
check("核心性格", classifyAnswer("2. 核心性格特征是什么？", "直率、犀利", "persona"), "核心性格特征");
check("说话风格", classifyAnswer("3. 说话风格和语言习惯？", "东北口音，接地气", "persona"), "说话风格");
check("事迹语录", classifyAnswer("4. 有哪些标志性事迹、著作或语录？", "考研讲座", "persona"), "标志性事迹");
check("决策模式", classifyAnswer("5. 决策模式和人际行为有什么特点？", "果断", "persona"), "决策模式");
check("核心功能", classifyAnswer("1. 这个 SKILL 的核心功能是什么？", "网页搜索", "functional"), "核心功能");
check("调用方式", classifyAnswer("2. 用户如何调用它？", "输入关键词", "functional"), "使用方法");
check("参数配置", classifyAnswer("3. 有哪些可配置参数？", "搜索数量", "functional"), "参数配置");
check("工作流程", classifyAnswer("4. 工作流程是怎样的？", "先搜索后总结", "functional"), "工作流程");
check("输出偏好", classifyAnswer("5. 输出偏好和注意事项？", "简洁", "functional"), "输出偏好");

// --- classifyAnswer：无提问（第一条消息）兜底 ---
check("首条消息 → 需求描述", classifyAnswer("", "我需要创建一个张雪峰的SKILL，他是考研名师", "persona"), "需求描述");
check("首条消息 functional → 需求描述", classifyAnswer("", "网页搜索工具", "functional"), "需求描述");

// --- classifyAnswer：不匹配兜底 ---
check("不匹配 → 补充信息", classifyAnswer("随便聊聊", "今天天气不错", "persona"), "补充信息");

// --- collectAnswer：追加不覆盖 ---
const c1 = collectAnswer({}, "人物是谁", "张雪峰");
const c2 = collectAnswer(c1, "人物是谁", "考研名师");
check("collectAnswer 追加", c2["人物是谁"], "张雪峰\n考研名师");
const c3 = collectAnswer({}, "核心功能", "搜索");
check("collectAnswer 新 key", c3["核心功能"], "搜索");

// --- buildGeneratePrompt：收集信息进入提示词 ---
const collected = { "人物是谁": "张雪峰，考研名师", "核心性格特征": "直率犀利" };
const prompt = buildGeneratePrompt("persona", collected);
check("提示词含收集信息", prompt.includes("张雪峰"), true);
check("提示词含硬约束", prompt.includes("禁止使用示例或虚构其他人物"), true);
check("提示词不含孔子", !prompt.includes("孔子"), true);

// --- buildSystemPrompt：示例中性化 ---
const sys = buildSystemPrompt();
check("系统提示词示例中性化", sys.includes("colleague_example"), true);
check("系统提示词不含孔子示例", !sys.includes("colleague_kongzi"), true);
check("系统提示词禁止生成示例人物", sys.includes("禁止生成示例人物"), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);