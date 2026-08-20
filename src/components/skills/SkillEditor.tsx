"use client";

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import SkillPreview from "@/components/skills/SkillPreview";
import SkillValidationPanel from "@/components/skills/SkillValidationPanel";
import SkillVersionHistory from "@/components/skills/SkillVersionHistory";
import type { SkillDoc } from "@/lib/skill/types";
import { validateSkill } from "@/lib/skill/validate";
import { functionalTemplate, personaTemplate } from "@/lib/skill/template";

// CodeMirror 仅客户端加载（SSR 不兼容）；lazy 组件会转发 ref 给内部 forwardRef 组件
const CodeEditor = lazy(() => import("@/components/skills/CodeEditor"));

interface Props {
  doc: SkillDoc;
  onSave: (content: string, note?: string) => void;
  onRollback: (version: number) => void;
}

/** SKILL 编辑器：CodeMirror 编辑 + 实时预览 + 校验 + 版本历史 */
export default function SkillEditor({ doc, onSave, onRollback }: Props) {
  const [content, setContent] = useState(doc.content);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [split, setSplit] = useState(50); // 左右分栏百分比
  const editorRef = useRef<{ jumpToLine: (line: number) => void } | null>(null);

  const validation = useMemo(() => validateSkill(content), [content]);

  // Ctrl+S 保存（CodeEditor 内 dispatch 事件）
  useEffect(() => {
    const handler = () => {
      if (dirty) handleSave();
    };
    window.addEventListener("skill-save-request", handler);
    return () => window.removeEventListener("skill-save-request", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, content, note]);

  const handleChange = (value: string) => {
    setContent(value);
    setDirty(true);
  };

  const handleSave = () => {
    onSave(content, note || undefined);
    setDirty(false);
    setNote("");
  };

  const insertTemplate = (type: "persona" | "functional") => {
    const tpl =
      type === "persona"
        ? personaTemplate("new_persona", "新人物", "人物简介")
        : functionalTemplate("new_tool", "新工具", "工具简介");
    // 追加到内容末尾（若为空则直接使用）
    setContent((prev) => (prev.trim() ? prev.replace(/\s*$/, "\n\n---\n\n") + tpl : tpl));
    setDirty(true);
  };

  return (
    <div className="flex h-full flex-col">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-4 py-2">
        <div className="relative">
          <Button size="sm" variant="outline" onClick={() => setShowTemplates((v) => !v)}>
            🧩 插入模板
          </Button>
          {showTemplates && (
            <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-xl border border-line bg-panel2 shadow-2xl p-1.5">
              <button
                onClick={() => {
                  insertTemplate("persona");
                  setShowTemplates(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-lg text-xs text-white hover:bg-white/5"
              >
                👤 人格类模板
                <span className="block text-dim mt-0.5">六层 Persona 结构</span>
              </button>
              <button
                onClick={() => {
                  insertTemplate("functional");
                  setShowTemplates(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-lg text-xs text-white hover:bg-white/5"
              >
                🔧 功能性模板
                <span className="block text-dim mt-0.5">Work 能力结构</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 text-[10px] text-dim">
          <span>Ctrl+S 保存</span>
          <span className="mx-1">·</span>
          <span>Ctrl+Z 撤销</span>
          <span className="mx-1">·</span>
          <span>Ctrl+Y 重做</span>
        </div>

        {dirty && (
          <>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="保存备注（可选）"
              className="w-40 rounded-lg border border-line bg-ink-950/60 px-2.5 py-1.5 text-xs text-white placeholder:text-dim focus:border-gold/50 focus:outline-none"
            />
            <Button size="sm" onClick={handleSave}>
              💾 保存 v{doc.meta.version + 1}
            </Button>
          </>
        )}
      </div>

      {/* 编辑 + 预览分栏 */}
      <div className="flex flex-1 min-h-0" style={{ flexDirection: "row" }}>
        <div className="min-w-0 flex-1 border-r border-line" style={{ width: `${split}%` }}>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-dim text-sm">编辑器加载中…</div>
            }
          >
            <CodeEditor
              value={content}
              onChange={handleChange}
              ref={editorRef}
            />
          </Suspense>
        </div>
        <div className="min-w-0 flex-1 bg-ink-950/40" style={{ width: `${100 - split}%` }}>
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-line/60 text-[10px] text-dim">
            <span>实时预览</span>
            <span>SKILL.md</span>
          </div>
          <SkillPreview content={content} />
        </div>
      </div>

      {/* 校验面板 + 版本历史 */}
      <SkillValidationPanel result={validation} onJump={(line) => editorRef.current?.jumpToLine(line ?? 1)} />
      <SkillVersionHistory doc={doc} onRollback={onRollback} />
    </div>
  );
}