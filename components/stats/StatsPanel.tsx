"use client";

import { useEffect, useMemo, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import {
  estimateMessageTokens,
  formatNumber,
} from "@/lib/token";
import { useRouter } from "next/navigation";

interface Stats {
  sessions: number;
  messages: number;
  userMessages: number;
  assistantMessages: number;
  chars: number;
  tokens: number;
  userTokens: number;
  assistantTokens: number;
  avgTokensPerMsg: number;
  perSession: {
    id: string;
    title: string;
    messages: number;
    tokens: number;
    createdAt: number;
  }[];
}

function computeStats(): Stats {
  const sessions = useChatStore.getState().sessions;

  let messages = 0;
  let userMessages = 0;
  let assistantMessages = 0;
  let chars = 0;
  let tokens = 0;
  let userTokens = 0;
  let assistantTokens = 0;

  const perSession = sessions.map((s) => {
    let sTokens = 0;
    for (const m of s.messages) {
      const t = estimateMessageTokens(m.role, m.content);
      sTokens += t;
      chars += m.content.length;
      tokens += t;
      messages += 1;
      if (m.role === "user") {
        userMessages += 1;
        userTokens += t;
      } else {
        assistantMessages += 1;
        assistantTokens += t;
      }
    }
    return {
      id: s.id,
      title: s.title,
      messages: s.messages.length,
      tokens: sTokens,
      createdAt: s.createdAt,
    };
  });

  perSession.sort((a, b) => b.tokens - a.tokens);

  return {
    sessions: sessions.length,
    messages,
    userMessages,
    assistantMessages,
    chars,
    tokens,
    userTokens,
    assistantTokens,
    avgTokensPerMsg: messages > 0 ? Math.round(tokens / messages) : 0,
    perSession,
  };
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-gold/30 bg-gold-dim"
          : "border-line bg-ink-900"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim mb-1">
        {label}
      </div>
      <div
        className={`font-display text-2xl font-semibold ${
          accent ? "text-gold" : "text-slate-100"
        }`}
      >
        {value}
      </div>
      {hint && (
        <div className="font-mono text-[10px] text-dim/70 mt-1">{hint}</div>
      )}
    </div>
  );
}

export default function StatsPanel() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const stats = useMemo(computeStats, []);
  const router = useRouter();

  const maxTokens = Math.max(1, ...stats.perSession.map((s) => s.tokens));

  // SSR / 首次水合时渲染与服务端一致的空态，避免 hydration mismatch
  // （persist 的会话数据只在浏览器端可用）
  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl pl-14 pr-4 py-8 md:px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-semibold text-white mb-1">
              数据统计
            </h1>
            <p className="text-sm text-dim">
              Token 消耗为本地估算值，仅供参考
            </p>
          </div>
          <button
            onClick={() => router.push("/chat")}
            className="font-mono text-xs px-3 py-1.5 rounded-lg border border-line text-dim hover:text-white hover:border-gold/40 transition-all"
          >
            ← back
          </button>
        </div>
        <div className="rounded-xl border border-line bg-ink-900 p-10 text-center text-dim">
          暂无数据，先去聊几句吧
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pl-14 pr-4 py-8 md:px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-semibold text-white mb-1">
            数据统计
          </h1>
          <p className="text-sm text-dim">
            Token 消耗为本地估算值，仅供参考
          </p>
        </div>
        <button
          onClick={() => router.push("/chat")}
          className="font-mono text-xs px-3 py-1.5 rounded-lg border border-line text-dim hover:text-white hover:border-gold/40 transition-all"
        >
          ← back
        </button>
      </div>

      {stats.sessions === 0 ? (
        <div className="rounded-xl border border-line bg-ink-900 p-10 text-center text-dim">
          暂无数据，先去聊几句吧
        </div>
      ) : (
        <>
          {/* 总览卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="total tokens" value={formatNumber(stats.tokens)} hint="估算" accent />
            <StatCard
              label="sessions"
              value={formatNumber(stats.sessions)}
              hint={`${formatNumber(stats.messages)} 条消息`}
            />
            <StatCard
              label="user tokens"
              value={formatNumber(stats.userTokens)}
              hint={`${formatNumber(stats.userMessages)} 条提问`}
            />
            <StatCard
              label="assistant tokens"
              value={formatNumber(stats.assistantTokens)}
              hint={`${formatNumber(stats.assistantMessages)} 条回复`}
            />
          </div>

          {/* 明细 */}
          <div className="rounded-xl border border-line bg-ink-900 p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mb-3">
              per-session usage
            </div>
            {stats.perSession.map((s) => (
              <div key={s.id} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                  <span className="text-dim truncate mr-2">
                    {s.title === "新对话" ? "（新对话）" : s.title}
                  </span>
                  <span className="text-dim/70 flex-shrink-0">
                    {s.messages} msgs · {formatNumber(s.tokens)} tok
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-950 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-deep to-gold"
                    style={{ width: `${(s.tokens / maxTokens) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 font-mono text-[10px] text-dim/70 leading-relaxed">
            💡 估算规则：中/日/韩字符约 0.6 token/字符，英文约 1 token/4 字符，每条消息 +1
            角色开销。实际消耗以服务商账单为准。
          </p>
        </>
      )}
    </div>
  );
}
