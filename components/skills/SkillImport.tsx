"use client";

import { useCallback, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import type { ImportResult } from "@/lib/skill/types";
import { useSkillStore } from "@/store/skill-store";
import { TYPE_LABELS } from "@/lib/skill/schema";

interface Props {
  onClose: () => void;
}

/** 导入对话框：文件选择 + 拖拽（单/多文件）+ 校验结果列表 */
export default function SkillImport({ onClose }: Props) {
  const { importFiles, forceImport } = useSkillStore();
  const [results, setResults] = useState<ImportResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const [showSpec, setShowSpec] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".md"));
      if (files.length === 0) {
        setResults([{ fileName: "（无 .md 文件）", ok: false, error: "请拖入 .md 格式的 SKILL 文件" }]);
        return;
      }
      const contents = await Promise.all(
        files.map(async (f) => ({ name: f.name, content: await f.text() })),
      );
      setResults(importFiles(contents));
    },
    [importFiles],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  // Electron 桌面端能力检测（纯浏览器环境无此 API）
  const hasNative =
    typeof window !== "undefined" &&
    typeof (window as unknown as { skillAPI?: unknown }).skillAPI !== "undefined";

  const importFromNative = async (mode: "files" | "dir") => {
    const api = (window as unknown as {
      skillAPI?: { openFiles: () => Promise<{ name: string; content: string }[]>; openDirectory: () => Promise<{ name: string; content: string }[]> };
    }).skillAPI;
    if (!api) return;
    try {
      const files = mode === "files" ? await api.openFiles() : await api.openDirectory();
      if (files.length === 0) return;
      setResults(importFiles(files));
    } catch (e) {
      setResults([{ fileName: "本机导入", ok: false, error: e instanceof Error ? e.message : "导入失败" }]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-line bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="font-display text-lg font-semibold text-white">导入 SKILL</h2>
          <button onClick={onClose} className="text-dim hover:text-white text-xl leading-none" aria-label="关闭">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* 拖放区 */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
              dragging
                ? "border-gold bg-gold-dim scale-[1.01]"
                : "border-line hover:border-gold/50 hover:bg-white/[0.02]"
            }`}
          >
            <div className="text-4xl mb-3">{dragging ? "📥" : "📄"}</div>
            <p className="text-white font-medium">
              {dragging ? "松开导入！" : "拖入 SKILL.md 文件，或点击选择"}
            </p>
            <p className="text-dim text-xs mt-2">支持多文件批量导入 · 仅接受 .md 格式</p>
            <input
              ref={inputRef}
              type="file"
              accept=".md"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Electron 本机导入（桌面端） */}
          {hasNative && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void importFromNative("files")}>
                📂 从本机选择文件
              </Button>
              <Button size="sm" variant="outline" onClick={() => void importFromNative("dir")}>
                🗂 扫描目录（SKILL.md）
              </Button>
              <span className="text-[10px] text-dim">桌面端可用：直接读取本地文件</span>
            </div>
          )}

          {/* 格式说明 */}
          <button
            onClick={() => setShowSpec((v) => !v)}
            className="text-xs text-dim hover:text-gold transition-colors"
          >
            {showSpec ? "▾ 收起格式说明" : "▸ 查看 SKILL.md 格式说明"}
          </button>
          {showSpec && (
            <pre className="text-xs text-dim bg-ink-950/60 border border-line rounded-lg p-4 overflow-x-auto leading-relaxed">
{`---
name: colleague_zhangsan   # 小写字母/数字/下划线
description: 一句话描述
user-invocable: true
---

# 显示名称

## PART A: Work      ← 功能性 SKILL
### 功能描述 / 使用方法 / 参数配置 / 工作流程

## PART B: Persona    ← 人格类 SKILL
### 硬规则 / 身份 / 表达风格 / 决策模式 / 人际行为 / Correction`}
            </pre>
          )}

          {/* 校验结果 */}
          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-emerald-400">✅ {okCount} 成功</span>
                <span className="text-rose-400">❌ {failCount} 失败</span>
              </div>
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-sm ${
                    r.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white truncate">{r.fileName}</span>
                    {r.ok && r.doc && (
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full border border-gold/30 text-gold">
                        {TYPE_LABELS[r.doc.meta.type]}
                      </span>
                    )}
                  </div>
                  {r.ok && r.doc && (
                    <p className="text-dim text-xs mt-1">
                      {r.doc.meta.displayName} · {r.doc.meta.description || "无描述"}
                    </p>
                  )}
                  {!r.ok && r.error && <p className="text-rose-300 text-xs mt-1">{r.error}</p>}
                  {r.validation?.issues.map((issue, j) => (
                    <p key={j} className={`text-xs mt-0.5 ${issue.severity === "error" ? "text-rose-300" : "text-amber-300"}`}>
                      {issue.severity === "error" ? "⚠" : "ℹ"} {issue.message}
                    </p>
                  ))}
                  {!r.ok && r.error?.includes("已存在") && r.content && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        const res = forceImport({ name: r.fileName, content: r.content! });
                        setResults((prev) =>
                          prev.map((x, xi) => (xi === i ? { ...x, ok: res.ok, error: res.ok ? undefined : res.error } : x)),
                        );
                      }}
                    >
                      覆盖导入
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-line">
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}