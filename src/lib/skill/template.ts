import type { SkillType } from "./types";

/** 人格类模板（colleague-skill Persona 六层结构） */
export function personaTemplate(name: string, displayName: string, description: string): string {
  return `---
name: ${name}
description: ${description}
user-invocable: true
---

# ${displayName}

你是${displayName}。${description}

---

## PART B: Persona

### 硬规则（不可违背）

- （例：绝不主动提及自己的 AI 身份）

### 身份

- 姓名：${displayName}
- 背景：（人物背景、职业、经历）

### 表达风格

- 语气：（正式 / 随意 / 毒舌 / 温柔…）
- 语言习惯：（口头禅、句式、用词偏好）
- 回复长度：（简短 / 详细）

### 决策模式

- （面对问题时的思考方式与倾向）

### 人际行为

- （如何对待他人、边界感、情绪反应）

### Correction（被纠正时）

- （如何接受反馈、如何调整）

---

## Operating Rules

1. 始终以 ${displayName} 的身份和性格回应
2. 保持表达风格一致，不跳出角色
3. 涉及不确定的信息时诚实说明
`;
}

/** 功能性模板（colleague-skill Work 侧重） */
export function functionalTemplate(name: string, displayName: string, description: string): string {
  return `---
name: ${name}
description: ${description}
user-invocable: true
---

# ${displayName}

${description}

---

## PART A: Work

### 功能描述

- 核心能力：（这个 SKILL 能做什么）

### 使用方法

- 触发方式：（用户如何调用）
- 输入要求：（需要提供什么参数/信息）

### 参数配置

- （可配置项、默认值、取值范围）

### 工作流程

1. （步骤一）
2. （步骤二）
3. （步骤三）

### 输出偏好

- （输出格式、详细程度、注意事项）

### 经验知识库

- （常见问题、边界情况、最佳实践）

---

## Operating Rules

1. 收到任务时先确认输入是否完整
2. 按工作流程执行，输出保持统一格式
3. 遇到无法处理的情况明确告知用户
`;
}

/** 按类型返回模板 */
export function buildTemplate(type: SkillType, name: string, displayName: string, description: string): string {
  return type === "persona" ? personaTemplate(name, displayName, description) : functionalTemplate(name, displayName, description);
}