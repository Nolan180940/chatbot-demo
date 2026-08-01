"use client";

import { useState } from "react";
import { testConnection } from "@/lib/llm";
import { useConfigStore } from "@/store/config-store";

type State = "idle" | "testing" | "success" | "error";

export default function ConnectionTest() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [latency, setLatency] = useState(0);

  const run = async () => {
    const cfg = useConfigStore.getState();
    if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) {
      setState("error");
      setMessage("请先填写完整的 Base URL / API Key / Model");
      return;
    }

    setState("testing");
    setMessage("正在连接…");
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 30_000);
    const result = await testConnection(abort.signal);
    clearTimeout(timeout);

    setState(result.ok ? "success" : "error");
    setLatency(result.latencyMs);
    setMessage(result.message);
  };

  const color =
    state === "success"
      ? "border-mint/40 bg-mint/5 text-mint"
      : state === "error"
      ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
      : state === "testing"
      ? "border-gold/40 bg-gold-dim text-gold"
      : "border-line bg-ink-900 text-dim";

  const icon =
    state === "success" ? "✓" : state === "error" ? "✕" : state === "testing" ? "…" : "▸";

  return (
    <div className={`rounded-lg border px-4 py-3.5 ${color} transition-all`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 font-mono text-xs">
          <span className="select-none">{icon}</span>
          {state === "idle" && "ping /v1/chat/completions"}
          {state === "testing" && "testing…"}
          {state === "success" && "connection ok"}
          {state === "error" && "connection failed"}
        </div>
        <button
          onClick={run}
          disabled={state === "testing"}
          className="px-3 py-1.5 font-mono text-[11px] rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-all"
        >
          {state === "testing" ? "testing…" : "run test"}
        </button>
      </div>
      {message && (
        <div className="mt-2 font-mono text-[11px] opacity-90 leading-relaxed break-all">
          {message}
          {state === "success" && latency > 0 && (
            <span className="ml-2 opacity-70">（{latency} ms）</span>
          )}
        </div>
      )}
    </div>
  );
}
