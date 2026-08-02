"use client";

import { useRef, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useConfigStore } from "@/store/config-store";
import { streamChat } from "@/lib/llm";
import { useRouter } from "next/navigation";

export default function ChatInput({
  sessionId,
  streaming,
}: {
  sessionId: string;
  streaming: boolean;
}) {
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (!useConfigStore.getState().isReady()) {
      router.push("/settings");
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

    try {
      await streamChat(
        history,
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t border-line bg-ink-950/80 backdrop-blur px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-xl border border-line bg-ink-900 focus-within:border-gold/50 focus-within:shadow-gold transition-all px-3 py-2.5">
          {/* 命令提示符 */}
          <span className="font-mono text-gold select-none pb-2.5 text-sm">❯</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              streaming ? "正在生成…" : "输入消息，Enter 发送，Shift+Enter 换行"
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
        <p className="mt-2 text-center font-mono text-[10px] text-dim/70">
          AI 生成内容仅供参考 · 密钥仅保存在本浏览器
        </p>
      </div>
    </div>
  );
}
