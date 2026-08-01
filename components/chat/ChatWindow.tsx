"use client";

import { useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useConfigStore } from "@/store/config-store";
import { exportSession } from "@/lib/export";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

export default function ChatWindow({ sessionId }: { sessionId: string }) {
  const session = useChatStore((s) => s.sessions.find((x) => x.id === sessionId));
  const model = useConfigStore((s) => s.model);
  const ready = useConfigStore((s) => !!s.baseUrl && !!s.apiKey && !!s.model);
  const [exported, setExported] = useState(false);

  if (!session) return null;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 顶部状态栏 */}
      <header className="h-14 flex items-center justify-between px-5 border-b border-line bg-ink-900/60 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim flex-shrink-0">
            session
          </span>
          <span className="text-slate-200 text-sm font-medium truncate">
            {session.title}
          </span>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* 单会话导出 */}
          <button
            onClick={() => {
              exportSession(sessionId);
              setExported(true);
              setTimeout(() => setExported(false), 1500);
            }}
            title="导出本会话 JSON"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-dim hover:text-gold hover:bg-gold-dim border border-transparent hover:border-gold/30 transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {exported ? "exported ✓" : "export"}
          </button>

          {/* 模型状态徽章 */}
          <span
            className={`inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg font-mono text-[11px] border ${
              ready
                ? "border-mint/25 text-mint bg-mint/5"
                : "border-gold/30 text-gold bg-gold-dim"
            }`}
            title={ready ? "配置完整" : "未配置"}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                ready ? "bg-mint" : "bg-gold animate-pulse"
              }`}
            />
            {model}
          </span>
        </div>
      </header>

      {/* 消息区 */}
      <MessageList messages={session.messages} streaming={session.streaming} />

      {/* 输入区 */}
      <ChatInput sessionId={sessionId} streaming={session.streaming} />
    </div>
  );
}
