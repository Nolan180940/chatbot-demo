"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import SkillPreview from "@/components/skills/SkillPreview";
import { streamChat } from "@/lib/llm";
import {
  buildSystemPrompt,
  buildIntakePrompt,
  buildGeneratePrompt,
  buildFixPrompt,
  parseLLMOutput,
} from "@/lib/skill/prompts";
import { validateSkill } from "@/lib/skill/validate";
import { toSlug, normalizeName, TYPE_CATEGORY } from "@/lib/skill/schema";
import type { SkillMeta, SkillType } from "@/lib/skill/types";
import { buildSkillDoc, saveSkill } from "@/lib/skill/storage";
import { useSkillStore } from "@/store/skill-store";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

type Phase = "type" | "chat" | "generating" | "preview";

/** AI 创建 SKILL 向导：选类型 → 对话收集 → 生成 → 预览确认 → 保存 */
export default function SkillCreateWizard() {
  const router = useRouter();
  const { refresh } = useSkillStore();
  const [phase, setPhase] = useState<Phase>("type");
  const [type, setType] = useState<SkillType | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [generated, setGenerated] = useState<{ meta: Partial<SkillMeta>; content: string } | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fixRounds, setFixRounds] = useState(0);
  const collectedRef = useRef<Record<string, string>>({});

  /** 发送消息（Step 1 对话收集） */
  const sendMessage = async (text: string) => {
    const userText = text.trim();
    if (!userText || busy) return;
    setInput("");
    setError("");

    const history: ChatMsg[] = [...messages, { role: "user", content: userText }];
    setMessages(history);
    setBusy(true);

    try {
      const assistantText = await streamChat(
        [
          { role: "system", content: buildSystemPrompt() },
          { role: "system", content: buildIntakePrompt(type!) },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
        () => {},
      );
      setMessages([...history, { role: "assistant", content: assistantText }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
      setMessages(history);
    } finally {
      setBusy(false);
    }
  };

  /** 生成 SKILL（Step 2） */
  const generate = async () => {
    if (!type) return;
    setPhase("generating");
    setError("");
    setFixRounds(0);

    const collected = collectedRef.current;
    try {
      await doGenerate(collected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
      setPhase("chat");
    }
  };

  const doGenerate = async (collected: Record<string, string>, fixIssues?: string[]) => {
    const prompt = fixIssues ? buildFixPrompt(fixIssues) : buildGeneratePrompt(type!, collected);
    const text = await streamChat(
      [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: prompt },
      ],
      () => {},
    );
    const parsed = parseLLMOutput(text);
    if (!parsed || !parsed.content.trim()) {
      throw new Error("大模型输出格式不正确，请重试");
    }

    // 自动校验，不合格则让 LLM 修正（最多 2 轮）
    const result = validateSkill(parsed.content);
    if (!result.valid && fixRounds < 2) {
      setFixRounds((r) => r + 1);
      const issues = result.issues.filter((i) => i.severity === "error").map((i) => i.message);
      await doGenerate(collected, issues);
      return;
    }

    setGenerated(parsed);
    setValidationIssues(result.issues.filter((i) => i.severity === "error").map((i) => i.message));
    setPhase("preview");
  };

  /** 保存入库 */
  const save = () => {
    if (!generated || !type) return;
    // name 归一化：连字符转下划线（AI 生成可能带 -）
    const name = normalizeName(
      generated.meta.name || toSlug(generated.meta.displayName || "skill"),
    );
    const displayName = generated.meta.displayName || name;
    const doc = buildSkillDoc({
      slug: toSlug(name),
      name,
      displayName,
      description: generated.meta.description || "",
      type,
      category: TYPE_CATEGORY[type],
      tags: generated.meta.tags ?? [],
      content: generated.content,
      source: "create",
    });
    saveSkill(doc);
    refresh();
    router.push(`/skills/${doc.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      {/* 顶栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/skills" className="text-dim hover:text-white text-sm transition-colors">
            ← 返回
          </Link>
          <h1 className="font-display text-2xl font-bold text-white">AI 创建 SKILL</h1>
        </div>
      </div>

      {/* 阶段指示 */}
      <div className="flex items-center gap-2 text-xs text-dim">
        {["选择类型", "对话收集", "生成", "预览确认"].map((s, i) => {
          const stepIdx = phase === "type" ? 0 : phase === "chat" || phase === "generating" ? 1 : phase === "preview" ? 3 : 2;
          const active = i === stepIdx;
          const done = i < stepIdx;
          return (
            <div key={s} className="flex items-center gap-2">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  active ? "border-gold bg-gold-dim text-gold" : done ? "border-emerald-500/50 text-emerald-400" : "border-line text-dim"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={active ? "text-white" : ""}>{s}</span>
              {i < 3 && <span className="text-line">—</span>}
            </div>
          );
        })}
      </div>

      {/* Step 0: 选择类型 */}
      {phase === "type" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => {
              setType("persona");
              setMessages([]);
              setPhase("chat");
            }}
            className="rounded-2xl border border-line bg-panel p-6 text-left hover:border-gold/50 hover:shadow-gold transition-all group"
          >
            <div className="text-3xl mb-3">👤</div>
            <h2 className="font-display font-semibold text-white group-hover:text-gold transition-colors">人格类 SKILL</h2>
            <p className="text-dim text-sm mt-2">人物背景、性格特征、说话风格、语言习惯。如「前任」「孔子」</p>
          </button>
          <button
            onClick={() => {
              setType("functional");
              setMessages([]);
              setPhase("chat");
            }}
            className="rounded-2xl border border-line bg-panel p-6 text-left hover:border-gold/50 hover:shadow-gold transition-all group"
          >
            <div className="text-3xl mb-3">🔧</div>
            <h2 className="font-display font-semibold text-white group-hover:text-gold transition-colors">功能性 SKILL</h2>
            <p className="text-dim text-sm mt-2">功能描述、使用方法、参数配置。如「网页搜索工具」</p>
          </button>
        </div>
      )}

      {/* Step 1: 对话收集 */}
      {phase === "chat" && (
        <div className="rounded-2xl border border-line bg-panel flex flex-col h-[480px]">
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <span className="text-sm text-white font-medium">
              {type === "persona" ? "👤 人格类" : "🔧 功能性"} · 告诉我你的需求
            </span>
            <span className="text-[10px] text-dim">例：「我需要创建一个孔子的 SKILL」</span>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-dim text-sm pt-16">
                <p>💡 描述你想要创建的 SKILL</p>
                <p className="text-xs mt-2">我会通过多轮对话收集信息，然后自动生成规范格式的 SKILL.md</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === "user" ? "bg-gold text-ink-950 font-medium" : "bg-ink-950/70 border border-line text-slate-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-ink-950/70 border border-line rounded-2xl px-4 py-2.5 text-sm text-dim">
                  <span className="stream-cursor">思考中</span>
                </div>
              </div>
            )}
          </div>
          {error && <div className="px-5 py-2 text-xs text-rose-400">{error}</div>}
          <div className="p-3 border-t border-line flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) void sendMessage(input);
              }}
              placeholder="输入你的需求…（Enter 发送）"
              className="flex-1 rounded-xl border border-line bg-ink-950/60 px-4 py-2.5 text-sm text-white placeholder:text-dim focus:border-gold/50 focus:outline-none"
            />
            <Button onClick={() => void sendMessage(input)} disabled={busy || !input.trim()}>
              发送
            </Button>
            <Button variant="outline" onClick={() => void generate()} disabled={busy}>
              ✨ 生成 SKILL
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: 生成中 */}
      {phase === "generating" && (
        <div className="rounded-2xl border border-line bg-panel p-16 text-center">
          <div className="text-4xl mb-4 animate-pulse">✨</div>
          <p className="text-white font-medium">正在生成 SKILL…</p>
          <p className="text-dim text-sm mt-2">大模型正在按 colleague-skill 规范撰写内容</p>
        </div>
      )}

      {/* Step 3: 预览确认 */}
      {phase === "preview" && generated && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-panel overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-line">
              <div>
                <h2 className="font-display font-semibold text-white">
                  {generated.meta.displayName || "未命名 SKILL"}
                </h2>
                <p className="text-dim text-xs mt-0.5">
                  {generated.meta.name} · {generated.meta.description || "无描述"}
                  {generated.meta.tags?.map((t) => (
                    <span key={t} className="ml-2 px-1.5 py-0.5 rounded bg-white/5">
                      #{t}
                    </span>
                  ))}
                </p>
              </div>
              {validationIssues.length > 0 ? (
                <span className="text-xs text-rose-400 shrink-0">❌ {validationIssues.length} 个问题</span>
              ) : (
                <span className="text-xs text-emerald-400 shrink-0">✅ 格式校验通过</span>
              )}
            </div>
            <div className="h-[420px] overflow-y-auto">
              <SkillPreview content={generated.content} />
            </div>
          </div>

          {validationIssues.length > 0 && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-300 space-y-1">
              {validationIssues.map((i, idx) => (
                <p key={idx}>⚠ {i}</p>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={save}>💾 保存到 SKILL 库</Button>
            <Button
              variant="outline"
              onClick={() => {
                setPhase("chat");
              }}
            >
              ← 继续对话修改
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPhase("type");
                setGenerated(null);
                setMessages([]);
              }}
            >
              重新开始
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}