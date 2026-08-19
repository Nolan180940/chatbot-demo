"use client";

import type { ValidationResult } from "@/lib/skill/types";

interface Props {
  result: ValidationResult | null;
  onJump?: (line?: number) => void;
}

/** 格式校验面板：错误列表 + 行号跳转 */
export default function SkillValidationPanel({ result, onJump }: Props) {
  if (!result) {
    return (
      <div className="px-4 py-2 text-xs text-dim border-t border-line bg-panel">
        输入后自动校验格式…
      </div>
    );
  }

  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");

  return (
    <div className="border-t border-line bg-panel">
      <div className="flex items-center gap-2 px-4 py-1.5 text-xs">
        {result.valid ? (
          <span className="text-emerald-400">✅ 格式通过</span>
        ) : (
          <span className="text-rose-400">❌ {errors.length} 个错误</span>
        )}
        {warnings.length > 0 && <span className="text-amber-300">ℹ {warnings.length} 个警告</span>}
      </div>
      {result.issues.map((issue, i) => (
        <button
          key={i}
          onClick={() => onJump?.(issue.line)}
          className={`block w-full text-left px-4 py-1 text-xs hover:bg-white/5 transition-colors ${
            issue.severity === "error" ? "text-rose-300" : "text-amber-300"
          }`}
        >
          {issue.line ? `第 ${issue.line} 行 · ` : ""}
          {issue.message}
        </button>
      ))}
    </div>
  );
}