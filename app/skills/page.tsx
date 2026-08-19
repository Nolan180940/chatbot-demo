"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import SkillImport from "@/components/skills/SkillImport";
import SkillList from "@/components/skills/SkillList";

/** SKILL 库列表页：导入入口 + AI 创建入口 + 操作指引 */
export default function SkillsPage() {
  const [showImport, setShowImport] = useState(false);

  return (
    <main className="min-h-screen bg-ink-950 text-slate-200">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-dim hover:text-white text-sm transition-colors">
              ← 返回
            </Link>
            <h1 className="font-display text-2xl font-bold text-white">SKILL 库</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              📥 导入
            </Button>
            <Link href="/skills/create">
              <Button>✨ AI 创建</Button>
            </Link>
          </div>
        </div>

        {/* 操作指引 */}
        <div className="mb-8 rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-display text-sm font-semibold text-gold mb-3">三步使用指南</h2>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gold-dim text-gold flex items-center justify-center text-xs font-bold">1</span>
              <p className="text-dim">
                <span className="text-white font-medium">导入或创建</span>
                <br />
                拖入本地 SKILL.md，或用 AI 对话生成（如「创建一个孔子的 SKILL」）
              </p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gold-dim text-gold flex items-center justify-center text-xs font-bold">2</span>
              <p className="text-dim">
                <span className="text-white font-medium">编辑与校验</span>
                <br />
                在编辑器中精修内容，实时预览 + 格式校验 + 版本回滚
              </p>
            </div>
            <div className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-gold-dim text-gold flex items-center justify-center text-xs font-bold">3</span>
              <p className="text-dim">
                <span className="text-white font-medium">使用</span>
                <br />
                将 SKILL.md 内容复制到你的 AI 工具（Claude Code / Codex 等）中使用
              </p>
            </div>
          </div>
        </div>

        <SkillList />
      </div>

      {showImport && <SkillImport onClose={() => setShowImport(false)} />}
    </main>
  );
}