"use client";

import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useChatStore } from "@/store/chat-store";
import { useConfigStore } from "@/store/config-store";
import { useSkillStore } from "@/store/skill-store";
import { streamChat } from "@/lib/llm";
import { buildSkillMessages, resolveSkillForSend } from "@/lib/skill/invoke";
import { TYPE_LABELS } from "@/lib/skill/schema";

export default function ChatInput({
  sessionId,
  streaming,
}: {
  sessionId: string;
  streaming: boolean;
}) {
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  const skillDocs = useSkillStore((s) => s.docs);

  // ── 斜杠命令选择器状态 ──
  const [showPicker, setShowPicker] = useState(false);
  const [pickerIndex, setPickerIndex] = useState(0);

  // 会话级激活的 SKILL（持久化在 session 上，激活后无需重复 / 调用）
  const activeSkill = useChatStore(
    (s) => s.sessions.find((x) => x.id === sessionId)?.activeSkill ?? null,
  );

  // 输入以 / 开头且无空格时，弹出匹配的 SKILL 列表
  const pickerDocs = useMemo(() => {
    if (!showPicker) return [];
    const q = input.slice(1).toLowerCase();
    return skillDocs.filter(
      (d) => d.meta.slug.includes(q) || d.meta.displayName.toLowerCase().includes(q),
    );
  }, [showPicker, input, skillDocs]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (!useConfigStore.getState().isReady()) {
      navigate({ to: "/settings" });
      return;
    }

    const abort = new AbortController();
    abortRef.current = abort;

    const store = useChatStore.getState();
    store.setStreaming(sessionId, true);
    store.appendMessage(sessionId, "user", text);
    store.appendMessage(sessionId, "assistant", "");
    store.autoTitle(sessionId);
    setInput("");

    // 构造历史（含刚追加的用户消息）
    const session = useChatStore
      .getState()
      .sessions.find((s) => s.id === sessionId)!;
    const history = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // SKILL：解析 / 命令，或复用会话级激活的 SKILL，注入 system 消息
    const { inv, nextActive } = resolveSkillForSend(
      text,
      useSkillStore.getState().docs,
      activeSkill,
    );
    const messages = inv ? buildSkillMessages(inv, history) : history;
    // 持久化激活状态（会话记忆：后续消息自动携带 SKILL）
    useChatStore.getState().setActiveSkill(sessionId, nextActive);

    try {
      await streamChat(
        messages,
        (delta) => useChatStore.getState().updateLastMessage(sessionId, delta),
        abort.signal,
      );
    } catch (e: any) {
      const msg = e?.name === "AbortError" ? "" : (e?.message ?? "未知错误");
      if (msg) {
        useChatStore
          .getState()
          .updateLastMessage(sessionId, `\n\n> ⚠️ **出错**：${msg}`);
      }
    } finally {
      useChatStore.getState().setStreaming(sessionId, false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    // 终止当前请求；即使没有可终止的请求（例如刷新后残留的 streaming 标记），
    // 也强制复位流式状态，让红色按钮能正常切回发送按钮。
    abortRef.current?.abort();
    abortRef.current = null;
    useChatStore.getState().setStreaming(sessionId, false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setInput(v);
    // 仅当输入形如 /xxx（无空格）时显示选择器
    const isCmd = /^\/[^\s]*$/.test(v);
    setShowPicker(isCmd && v.length > 1);
    setPickerIndex(0);
  };

  const pickSkill = (slug: string) => {
    const meta = skillDocs.find((d) => d.meta.slug === slug)?.meta;
    if (!meta) return;
    setInput(`/${slug} `);
    setShowPicker(false);
    // 立即激活到会话（持久化），发送后自动注入
    useChatStore.getState().setActiveSkill(sessionId, {
      slug: meta.slug,
      displayName: meta.displayName,
      mode: "full",
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 选择器键盘导航优先
    if (showPicker && pickerDocs.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPickerIndex((i) => (i + 1) % pickerDocs.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPickerIndex((i) => (i - 1 + pickerDocs.length) % pickerDocs.length);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        pickSkill(pickerDocs[pickerIndex].meta.slug);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowPicker(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t border-line bg-ink-950/80 backdrop-blur px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="relative">
          {/* 斜杠命令选择器 */}
          {showPicker && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-line bg-panel shadow-2xl overflow-hidden z-20">
              {pickerDocs.length === 0 ? (
                <div className="px-4 py-3 text-sm text-dim">
                  {skillDocs.length === 0
                    ? "SKILL 库为空，先去「SKILL 库」导入或创建"
                    : "没有匹配的 SKILL"}
                </div>
              ) : (
                <ul className="max-h-64 overflow-y-auto py-1">
                  {pickerDocs.map((d, i) => (
                    <li key={d.id}>
                      <button
                        onClick={() => pickSkill(d.meta.slug)}
                        onMouseEnter={() => setPickerIndex(i)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                          i === pickerIndex ? "bg-gold-dim text-gold" : "text-slate-200"
                        }`}
                      >
                        <span className="font-mono text-xs text-gold shrink-0">/{d.meta.slug}</span>
                        <span className="truncate flex-1">{d.meta.displayName}</span>
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-gold/30 text-gold">
                          {TYPE_LABELS[d.meta.type]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="px-4 py-1.5 border-t border-line text-[10px] text-dim font-mono">
                ↑↓ 选择 · Enter 确认 · Esc 关闭
              </div>
            </div>
          )}

          {/* 已选 SKILL 徽章 */}
          {activeSkill && (
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border border-gold/30 text-gold bg-gold-dim">
                🧩 /{activeSkill.slug}
              </span>
              <span className="text-xs text-dim truncate">{activeSkill.displayName}</span>
              <button
                onClick={() => {
                  useChatStore.getState().setActiveSkill(sessionId, null);
                  setInput((v) => v.replace(/^\/[^\s]*\s*/, ""));
                }}
                className="text-dim hover:text-rose-400 text-xs transition-colors"
                title="取消 SKILL"
              >
                ✕
              </button>
            </div>
          )}

          <div className="relative flex items-end gap-2 rounded-xl border border-line bg-ink-900 focus-within:border-gold/50 focus-within:shadow-gold transition-all px-3 py-2.5">
            {/* 命令提示符 */}
            <span className="font-mono text-gold select-none pb-2.5 text-sm">❯</span>
            <textarea
              value={input}
              onChange={handleChange}
              onKeyDown={onKeyDown}
              placeholder={
                streaming
                  ? "正在生成…"
                  : "输入消息，Enter 发送，Shift+Enter 换行；输入 / 调用 SKILL"
              }
              rows={Math.min(Math.max(input.split("\n").length, 1), 6)}
              className="flex-1 bg-transparent outline-none resize-none text-[15px] text-slate-100 placeholder:text-dim/60 font-mono placeholder:font-sans"
            />

          {streaming ? (
            <button
              onClick={stop}
              className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#ff5f57] hover:bg-[#ff7871] flex items-center justify-center text-white transition-all"
              title="停止生成"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold hover:bg-gold-soft flex items-center justify-center text-ink-950 shadow-gold transition-all disabled:opacity-30 disabled:shadow-none"
              title="发送"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] text-dim/70">
          AI 生成内容仅供参考 · 密钥仅保存在本浏览器
        </p>
      </div>
    </div>
  );
}
