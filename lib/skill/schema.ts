import type { SkillType } from "./types";

/** 必填 frontmatter 字段 */
export const REQUIRED_FRONTMATTER = ["name", "description"] as const;

/** name 字段格式：小写字母/数字/下划线/连字符（连字符导入时自动转下划线） */
export const NAME_PATTERN = /^[a-z0-9_-]+$/;

/** 可选 frontmatter 字段 */
export const OPTIONAL_FRONTMATTER = ["user-invocable"] as const;

/** PART A / PART B 章节标题识别 */
export const PART_A_HEADING = /^##\s*PART\s*A/im;
export const PART_B_HEADING = /^##\s*PART\s*B/im;

/** 一级标题识别 */
export const H1_HEADING = /^#\s+(.+)$/m;

/** 版本快照上限 */
export const MAX_VERSIONS = 50;

/** 存储键 */
export const STORAGE_KEY = "skill-docs-v1";

/** 类型 → 中文标签 */
export const TYPE_LABELS: Record<SkillType, string> = {
  persona: "人格类",
  functional: "功能性",
  combined: "综合类",
};

/** 类型 → 徽章颜色（Tailwind 类） */
export const TYPE_BADGE: Record<SkillType, string> = {
  persona: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  functional: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  combined: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

/** 类型 → 规范 character family */
export const TYPE_CATEGORY: Record<SkillType, "celebrity" | "colleague" | "colleague"> = {
  persona: "celebrity",
  functional: "colleague",
  combined: "colleague",
};

/** 生成 slug：name 字段或标题转小写下划线 */
export function toSlug(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return s || "skill";
}

/**
 * 归一化 name：转小写、连字符转下划线、去非法字符。
 * 用于导入时把 `colleague-kongzi` 这类外部命名统一为 `colleague_kongzi`，
 * 避免与命令模式后缀 `-work` / `-persona` 产生歧义。
 */
export function normalizeName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/** 生成唯一 id：slug + 时间戳 + 随机后缀 */
export function makeId(slug: string): string {
  return `${slug}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}