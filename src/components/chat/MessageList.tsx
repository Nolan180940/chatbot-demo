"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import MessageItem from "./MessageItem";

export default function MessageList({
  messages,
  streaming,
}: {
  messages: ChatMessage[];
  streaming: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 py-16 px-4">
        {/* 终端欢迎屏 */}
        <div className="w-16 h-16 rounded-2xl border border-gold/30 bg-gold-dim flex items-center justify-center shadow-gold">
          <svg className="w-8 h-8 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 17l6-6-6-6M12 19h8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold text-slate-100">
            chatbot console
          </h2>
          <p className="mt-1 font-mono text-[11px] text-gold/80">
            $ next chat --help
          </p>
        </div>
        <p className="text-sm text-dim text-center max-w-sm leading-relaxed">
          这是一个 BYOK 简易聊天控制台。在下方输入消息开始对话，或先在
          <span className="text-gold font-mono"> 设置 </span>
          中配置 Base URL / API Key / Model。
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 flex flex-col gap-5">
        {messages.map((m, i) => (
          <MessageItem
            key={m.id}
            message={m}
            streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
