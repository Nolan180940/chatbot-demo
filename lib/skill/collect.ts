import type { SkillType } from "./types";

/**
 * 对话收集归类规则：assistant 提问关键词 → 收集字段 key。
 * 顺序敏感：更具体的规则在前（如「核心功能」先于「功能」）。
 */
const QUESTION_RULES: [RegExp, string][] = [
  [/人物是谁|姓名|身份|背景/, "人物是谁"],
  [/核心性格|性格特征|MBTI|星座|个性标签/, "核心性格特征"],
  [/说话风格|语言习惯|语气|口头禅|句式/, "说话风格"],
  [/事迹|著作|语录|作品/, "标志性事迹"],
  [/决策模式|决策/, "决策模式"],
  [/人际行为|人际/, "人际行为"],
  [/核心功能|功能/, "核心功能"],
  [/调用|触发|输入要求/, "使用方法"],
  [/参数/, "参数配置"],
  [/工作流程|流程/, "工作流程"],
  [/输出偏好|输出/, "输出偏好"],
];

/**
 * 把用户回答归类到收集字段。
 * - 有 assistant 提问时按提问关键词归类
 * - 无提问（第一条消息）时存为「需求描述」（避免把"我需要创建…的SKILL"误存为人物名）
 * - 都不匹配 → 补充信息N（不丢信息）
 */
export function classifyAnswer(question: string, answer: string, type: SkillType): string {
  if (question) {
    for (const [re, key] of QUESTION_RULES) {
      if (re.test(question)) return key;
    }
  }
  if (!question) {
    return "需求描述";
  }
  return "补充信息";
}

/** 追加收集：同 key 多次回答时换行拼接，不覆盖 */
export function collectAnswer(
  collected: Record<string, string>,
  key: string,
  answer: string,
): Record<string, string> {
  const prev = collected[key];
  return { ...collected, [key]: prev ? `${prev}\n${answer}` : answer };
}