import type { SkillDoc } from "./types";
import type { LLMHistoryItem } from "@/lib/llm";

/** SKILL 调用模式：完整 / 仅工作能力 / 仅人格 */
export type SkillInvokeMode = "full" | "work" | "persona";

/** 解析结果：slug + 模式 + 剩余问题 + 命中的文档 */
export interface SkillInvocation {
  slug: string;
  mode: SkillInvokeMode;
  question: string;
  doc: SkillDoc;
}

const CMD_RE = /^\/([^\s/]+)(?:\s+([\s\S]*))?$/;

/**
 * 解析斜杠命令：`/colleague_kongzi 帮我写首诗`
 * 支持后缀：`/colleague_kongzi-work 只调用工作能力`、`/colleague_kongzi-persona`
 * 返回 null 表示不是 SKILL 命令或未找到对应 SKILL。
 */
export function parseSkillCommand(text: string, docs: SkillDoc[]): SkillInvocation | null {
  const m = text.trim().match(CMD_RE);
  if (!m) return null;

  let cmd = m[1];
  let question = (m[2] ?? "").trim();
  let mode: SkillInvokeMode = "full";

  const modeMatch = cmd.match(/-(work|persona)$/);
  if (modeMatch) {
    mode = modeMatch[1] as "work" | "persona";
    cmd = cmd.slice(0, -(modeMatch[1].length + 1));
  }

  const doc = docs.find((d) => d.meta.slug === cmd);
  if (!doc) return null;

  return { slug: cmd, mode, question, doc };
}

/** 提取 SKILL.md 中指定章节（## PART A: Work / ## PART B: Persona）到下一个 ## 或结尾 */
export function extractSection(content: string, part: "PART A" | "PART B"): string {
  const lines = content.split("\n");
  const startIdx = lines.findIndex((l) => l.trim().startsWith(`## ${part}`));
  if (startIdx === -1) return "";
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.trim().startsWith("## "));
  const section = endIdx === -1 ? lines.slice(startIdx) : lines.slice(startIdx, endIdx);
  return section.join("\n").trim();
}

/** 按模式裁剪 SKILL 内容 */
export function skillContentForMode(doc: SkillDoc, mode: SkillInvokeMode): string {
  if (mode === "full") return doc.content;
  const part = mode === "work" ? "PART A" : "PART B";
  const section = extractSection(doc.content, part);
  if (section) return section;
  // 章节缺失时回退到全文（避免空注入）
  return doc.content;
}

/**
 * 构建带 SKILL 的请求消息：
 * - SKILL.md 全文/章节作为 system 消息注入到最前面（人格生效的关键）
 * - 最后一条 user 消息替换为去掉命令后的真实问题
 */
export function buildSkillMessages(
  inv: SkillInvocation,
  history: LLMHistoryItem[],
): LLMHistoryItem[] {
  const skillContent = skillContentForMode(inv.doc, inv.mode);
  const systemMsg: LLMHistoryItem = {
    role: "system",
    content: `你正在使用 SKILL「${inv.doc.meta.displayName}」（${inv.doc.meta.slug}）。请严格遵循以下 SKILL.md 规范来回应：\n\n${skillContent}`,
  };

  const question = inv.question || "你好，请介绍一下你自己";
  const msgs = history.map((m) => ({ ...m }));
  if (msgs.length > 0 && msgs[msgs.length - 1].role === "user") {
    msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: question };
  } else {
    msgs.push({ role: "user", content: question });
  }
  return [systemMsg, ...msgs];
}