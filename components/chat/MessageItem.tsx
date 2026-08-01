"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[10px] px-2 py-1 rounded-md bg-white/5 hover:bg-gold-dim text-dim hover:text-gold"
    >
      {copied ? "copied ✓" : "copy"}
    </button>
  );
}

export default function MessageItem({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="group flex flex-row-reverse gap-3 animate-fade-in">
        <div className="max-w-[85%] min-w-0">
          <div className="flex items-baseline gap-2 mb-1 justify-end">
            <span className="font-mono text-[10px] text-dim select-none">you</span>
          </div>
          <div className="rounded-xl rounded-tr-sm border border-line bg-ink-850/70 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <span className="font-mono text-gold select-none mt-0.5">❯</span>
              <p className="text-slate-100 whitespace-pre-wrap text-[15px] leading-relaxed break-words">
                {message.content}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 animate-fade-in">
      <div className="max-w-[85%] min-w-0 flex-1">
        {/* 终端窗口卡片 */}
        <div className="overflow-hidden rounded-xl border border-line bg-ink-900">
          {/* 终端标题栏 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-ink-850/80 border-b border-line">
            <span className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </span>
            <span className="ml-2 font-mono text-[10px] text-dim truncate">
              ~/assistant
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              {streaming && (
                <span className="flex items-center gap-1 font-mono text-[10px] text-mint">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
                  running
                </span>
              )}
              {message.content && <CopyButton text={message.content} />}
            </span>
          </div>

          {/* 终端输出 */}
          <div className="px-4 py-3">
            <div
              className={`prose-chat ${streaming ? "stream-cursor" : ""}`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || "…"}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
