"use client";

import { useState } from "react";
import { useConfigStore } from "@/store/config-store";
import { PRESET_BASE_URLS } from "@/lib/config";
import ConnectionTest from "./ConnectionTest";

function Field({
  label,
  code,
  desc,
  children,
}: {
  label: string;
  code?: boolean;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className={`block mb-1.5 ${
          code
            ? "font-mono text-[10px] uppercase tracking-[0.2em] text-gold"
            : "text-sm font-medium text-slate-200"
        }`}
      >
        {label}
      </label>
      {children}
      {desc && (
        <p className="mt-1.5 text-xs text-dim leading-relaxed">{desc}</p>
      )}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg bg-ink-900 border border-line text-sm text-slate-100 outline-none transition-all focus:border-gold/50 focus:shadow-gold placeholder:text-dim/50";

export default function SettingsPanel() {
  const baseUrl = useConfigStore((s) => s.baseUrl);
  const apiKey = useConfigStore((s) => s.apiKey);
  const model = useConfigStore((s) => s.model);
  const setConfig = useConfigStore((s) => s.setConfig);

  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const save = () => {
    useConfigStore.getState().setConfig({ baseUrl, apiKey, model });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="mx-auto max-w-2xl pl-14 pr-4 py-8 md:px-4">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-white mb-1">
          参数设置
        </h1>
        <p className="text-sm text-dim">
          只需配置三项参数即可连接任意 OpenAI 兼容服务（BYOK）
        </p>
      </div>

      <div className="space-y-5 rounded-xl border border-line bg-ink-900/60 p-5">
        {/* Base URL */}
        <Field
          label="base_url"
          code
          desc="支持三种形式：① 只填域名（自动补 /v1/chat/completions）② 完整端点，如 https://opencode.ai/zen/go/v1/chat/completions ③ /v1/responses 或 /v1/messages 端点（自动识别协议）。"
        >
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => useConfigStore.getState().setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com"
            className={inputCls}
            spellCheck={false}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_BASE_URLS.map((p) => (
              <button
                key={p.value}
                onClick={() => useConfigStore.getState().setBaseUrl(p.value)}
                className={`px-2.5 py-1 font-mono text-[10px] rounded-full border transition-all ${
                  baseUrl === p.value
                    ? "border-gold/40 bg-gold-dim text-gold"
                    : "border-line text-dim hover:text-slate-300 hover:border-gold/30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        {/* API Key */}
        <Field
          label="api_key"
          code
          desc="你的密钥只保存在浏览器 localStorage，不会上传到任何服务器。"
        >
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => useConfigStore.getState().setApiKey(e.target.value)}
              placeholder="sk-…"
              className={`${inputCls} pr-12 font-mono`}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-dim hover:text-gold"
            >
              {showKey ? "hide" : "show"}
            </button>
          </div>
        </Field>

        {/* Model ID */}
        <Field
          label="model"
          code
          desc="例如 gpt-4o-mini、deepseek-chat、Qwen/Qwen2.5-7B-Instruct 等。"
        >
          <input
            type="text"
            value={model}
            onChange={(e) => useConfigStore.getState().setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className={`${inputCls} font-mono`}
            spellCheck={false}
          />
        </Field>

        {/* 连接测试 */}
        <ConnectionTest />

        {/* 保存按钮 */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            className="px-6 py-2.5 rounded-lg bg-gold hover:bg-gold-soft text-ink-950 font-display text-sm font-semibold shadow-gold transition-all"
          >
            保存配置
          </button>
          {saved && (
            <span className="text-sm text-mint animate-fade-in">已保存 ✓</span>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-ink-900/60 p-4">
        <div className="text-xs text-dim leading-relaxed">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mb-2">
            usage tips
          </div>
          <ul className="list-disc pl-4 space-y-1">
            <li>连接测试会发送一条「ping」消息，验证三项参数是否可用。</li>
            <li>支持任意兼容 OpenAI Chat Completions 接口的服务，包括本地 Ollama（http://localhost:11434）。</li>
            <li>密钥仅存于本机浏览器，刷新页面不会丢失。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
