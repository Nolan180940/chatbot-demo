"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import SkillEditor from "@/components/skills/SkillEditor";
import type { SkillDoc } from "@/lib/skill/types";
import { TYPE_LABELS } from "@/lib/skill/schema";
import { useSkillStore } from "@/store/skill-store";

/** SKILL 编辑器页 */
export default function SkillEditPage() {
  const params = useParams<{ id: string }>();
  const { docs, updateContent, rollback } = useSkillStore();
  const [doc, setDoc] = useState<SkillDoc | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const found = docs.find((d) => d.id === params.id);
    setDoc(found ?? null);
  }, [docs, params.id]);

  if (!doc) {
    return (
      <main className="min-h-screen bg-ink-950 text-slate-200 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-dim">SKILL 不存在或已被删除</p>
          <Link href="/skills">
            <Button variant="outline">← 返回 SKILL 库</Button>
          </Link>
        </div>
      </main>
    );
  }

  const handleSave = (content: string, note?: string) => {
    updateContent(doc.id, content, note);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  // Electron 桌面端导出到本地文件
  const handleExport = async () => {
    const api = (window as unknown as {
      skillAPI?: { saveFile: (content: string, name: string) => Promise<string | null> };
    }).skillAPI;
    if (!api) return;
    try {
      const saved = await api.saveFile(doc.content, `${doc.meta.slug}.md`);
      if (saved) setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch {
      /* 用户取消或失败 */
    }
  };

  const hasNative =
    typeof window !== "undefined" &&
    typeof (window as unknown as { skillAPI?: unknown }).skillAPI !== "undefined";

  return (
    <main className="h-screen bg-ink-950 text-slate-200 flex flex-col">
      {/* 顶栏 */}
      <div className="flex items-center justify-between border-b border-line bg-panel px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/skills" className="text-dim hover:text-white text-sm transition-colors shrink-0">
            ← 返回
          </Link>
          <h1 className="font-display font-semibold text-white truncate">{doc.meta.displayName}</h1>
          <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full border border-gold/30 text-gold">
            {TYPE_LABELS[doc.meta.type]}
          </span>
          <span className="shrink-0 text-[10px] text-dim font-mono">{doc.meta.slug}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savedFlash && <span className="text-xs text-emerald-400 animate-fade-in">✓ 已保存</span>}
          <span className="text-[10px] text-dim">v{doc.meta.version}</span>
          {hasNative && (
            <Button size="sm" variant="outline" onClick={() => void handleExport()}>
              ⬇ 导出 .md
            </Button>
          )}
        </div>
      </div>

      {/* 编辑器主体 */}
      <div className="flex-1 min-h-0">
        <SkillEditor
          key={doc.id}
          doc={doc}
          onSave={handleSave}
          onRollback={(v) => rollback(doc.id, v)}
        />
      </div>
    </main>
  );
}