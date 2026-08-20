import type { SkillMeta, SkillType } from "./types";

/** colleague-skill 规范说明（注入系统提示词，要求 LLM 严格遵循） */
export const SKILL_SPEC = `你是一个 SKILL 创建助手，遵循 colleague-skill（AgentSkills 开放标准）规范生成 SKILL.md 文件。

## SKILL.md 格式要求

文件必须以 YAML frontmatter 开头：

---
name: colleague_example        # 小写字母/数字/下划线
description: 一句话描述
user-invocable: true
---

# 显示名称

身份/简介段落

---

## PART A: Work（功能性 SKILL 必填）

### 功能描述
### 使用方法
### 参数配置
### 工作流程
### 输出偏好
### 经验知识库

---

## PART B: Persona（人格类 SKILL 必填）

### 硬规则（不可违背）
### 身份
### 表达风格
### 决策模式
### 人际行为
### Correction（被纠正时）

---

## Operating Rules

1. 运行规则一
2. 运行规则二
3. 运行规则三

## 生成要求

- name 字段：小写字母/数字/下划线，如 colleague_example
- description：一句话，概括人物或功能
- 人格类：PART B 必须完整覆盖六层结构，表达风格要具体（语气、口头禅、句式、用词）
- 功能性：PART A 必须包含功能描述、使用方法、参数配置、工作流程
- 内容用中文撰写（除非用户要求其他语言）
- 人物类 SKILL 可基于你的知识补充背景（如历史人物事迹、著作、语录），不确定处标注"（待核实）"
- 示例中的 colleague_example 仅为格式示范，禁止生成示例人物
`;

/** 构建系统提示词 */
export function buildSystemPrompt(): string {
  return SKILL_SPEC;
}

/** Step 1 信息收集提示词 */
export function buildIntakePrompt(type: SkillType): string {
  const personaQs = [
    "1. 人物是谁？（姓名、身份、时代/背景）",
    "2. 核心性格特征是什么？（可用 MBTI、星座、个性标签描述）",
    "3. 说话风格和语言习惯？（语气、口头禅、句式）",
    "4. 有哪些标志性事迹、著作或语录？",
    "5. 决策模式和人际行为有什么特点？",
  ];
  const funcQs = [
    "1. 这个 SKILL 的核心功能是什么？",
    "2. 用户如何调用它？（触发方式、输入要求）",
    "3. 有哪些可配置参数？",
    "4. 工作流程是怎样的？",
    "5. 输出偏好和注意事项？",
  ];
  const qs = type === "persona" ? personaQs : funcQs;
  return `请通过多轮对话收集创建 SKILL 所需的信息。每轮最多问 1-3 个问题，不要一次问完。

需要收集的信息：
${qs.join("\n")}

用户回答后，如果信息已足够（至少覆盖 3 项），就总结确认并告知用户"信息已足够，可以生成 SKILL"。`;
}

/** Step 3 生成提示词 */
export function buildGeneratePrompt(type: SkillType, collected: Record<string, string>): string {
  const facts = Object.entries(collected)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return `请根据以下收集到的信息，生成完整的 SKILL.md 文件。

类型：${type === "persona" ? "人格类" : "功能性"}

收集到的信息：
${facts || "（无，请基于常识生成合理内容）"}

## 硬性要求

- 必须严格使用「收集到的信息」中的人物/功能，禁止使用示例或虚构其他人物
- name 必须基于收集信息中的人物/功能名生成（如张雪峰 → colleague_zhangxuefeng）
- 若收集信息为空，请向用户说明缺少信息，而不是自行编造人物

输出格式：先输出一个 JSON 代码块（\`\`\`json），包含：
{
  "name": "小写下划线命名",
  "displayName": "显示名称",
  "description": "一句话描述",
  "tags": ["标签1", "标签2"],
  "content": "完整的 SKILL.md 内容（含 frontmatter，用 \\n 转义）"
}

JSON 代码块之后不要再输出其他内容。`;
}

/** 修正提示词 */
export function buildFixPrompt(issues: string[]): string {
  return `你生成的 SKILL 未通过格式校验，请修正后重新输出（同样用 JSON 代码块格式）。

校验问题：
${issues.map((i) => `- ${i}`).join("\n")}

注意：name 必须是小写字母/数字/下划线；必须包含 --- frontmatter；content 内换行用 \\n 转义。`;
}

/** 解析 LLM 输出的 JSON 代码块 */
export function parseLLMOutput(text: string): { meta: Partial<SkillMeta>; content: string } | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  const raw = match ? match[1] : text.trim();
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || typeof obj.content !== "string") return null;
    return {
      meta: {
        name: typeof obj.name === "string" ? obj.name : "",
        displayName: typeof obj.displayName === "string" ? obj.displayName : "",
        description: typeof obj.description === "string" ? obj.description : "",
        tags: Array.isArray(obj.tags) ? obj.tags.filter((t: unknown) => typeof t === "string") : [],
      },
      content: obj.content,
    };
  } catch {
    return null;
  }
}