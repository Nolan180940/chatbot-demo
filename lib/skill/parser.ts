import matter from "gray-matter";
import type { ParsedSkill } from "./types";
import { H1_HEADING, PART_A_HEADING, PART_B_HEADING } from "./schema.ts";

/**
 * 解析 SKILL.md 内容（frontmatter + 正文结构）。
 * 无法解析（无 frontmatter 或格式错误）时返回 null。
 */
export function parseSkill(content: string): ParsedSkill | null {
  if (typeof content !== "string" || !content.trim()) return null;

  let data: Record<string, unknown>;
  let body: string;
  try {
    // gray-matter 对无 frontmatter 的文本不抛错，需显式检测
    if (!matter.test(content)) return null;
    const parsed = matter(content);
    data = (parsed.data ?? {}) as Record<string, unknown>;
    body = parsed.content ?? "";
  } catch {
    return null;
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const userInvocable = data["user-invocable"] !== false;

  const titleMatch = body.match(H1_HEADING);
  const title = titleMatch?.[1]?.trim();

  const hasPartA = PART_A_HEADING.test(body);
  const hasPartB = PART_B_HEADING.test(body);

  const type: ParsedSkill["type"] =
    hasPartA && hasPartB ? "combined" : hasPartB ? "persona" : hasPartA ? "functional" : "functional";

  return { name, description, userInvocable, body, title, hasPartA, hasPartB, type };
}

/** 序列化：由 ParsedSkill 重新生成完整 SKILL.md */
export function serializeSkill(parsed: ParsedSkill): string {
  const lines = ["---", `name: ${parsed.name}`, `description: ${parsed.description}`];
  if (!parsed.userInvocable) lines.push("user-invocable: false");
  lines.push("---", "");
  return lines.join("\n") + parsed.body.trim() + "\n";
}

/** 提取正文中的一级标题（用于 displayName fallback） */
export function extractTitle(content: string): string | undefined {
  return parseSkill(content)?.title;
}