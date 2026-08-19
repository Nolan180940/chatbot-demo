import type { ValidationResult } from "./types";
import { NAME_PATTERN, REQUIRED_FRONTMATTER } from "./schema.ts";
import { parseSkill } from "./parser.ts";

/**
 * 校验 SKILL.md 内容，返回结构化错误/警告列表。
 * - error：阻止导入（frontmatter 缺失、必填字段缺失、name 格式错误）
 * - warning：可导入但不符合 colleague-skill 标准结构
 */
export function validateSkill(content: string): ValidationResult {
  const issues: ValidationResult["issues"] = [];

  if (!content || !content.trim()) {
    return { valid: false, issues: [{ severity: "error", message: "文件内容为空" }] };
  }

  // frontmatter 存在性
  if (!/^---\s*$/m.test(content)) {
    return {
      valid: false,
      issues: [{ severity: "error", line: 1, message: "缺少 frontmatter（文件必须以 --- 开头）" }],
    };
  }

  const parsed = parseSkill(content);
  if (!parsed) {
    return {
      valid: false,
      issues: [{ severity: "error", line: 1, message: "frontmatter 解析失败（YAML 格式错误）" }],
    };
  }

  // 必填字段
  for (const field of REQUIRED_FRONTMATTER) {
    if (!parsed[field]) {
      issues.push({ severity: "error", field, message: `缺少必填字段 ${field}` });
    }
  }

  // name 格式
  if (parsed.name && !NAME_PATTERN.test(parsed.name)) {
    issues.push({
      severity: "error",
      field: "name",
      message: `name 格式错误：${parsed.name}（仅允许小写字母/数字/下划线）`,
    });
  }

  // 一级标题
  if (!parsed.title) {
    issues.push({ severity: "warning", message: "正文缺少一级标题（# 名称），建议补充" });
  }

  // 标准结构
  if (!parsed.hasPartA && !parsed.hasPartB) {
    issues.push({
      severity: "warning",
      message: "未检测到 PART A / PART B 章节，不符合 colleague-skill 标准结构（仍可导入为通用 SKILL）",
    });
  } else if (!parsed.hasPartB) {
    issues.push({ severity: "warning", message: "缺少 PART B: Persona 章节（人格信息）" });
  } else if (!parsed.hasPartA) {
    issues.push({ severity: "warning", message: "缺少 PART A: Work 章节（功能/工作能力）" });
  }

  const hasError = issues.some((i) => i.severity === "error");
  return { valid: !hasError, issues, parsed };
}