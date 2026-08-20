"use client";

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import Button from "@/components/ui/Button";
import type { SkillDoc } from "@/lib/skill/types";
import { TYPE_BADGE, TYPE_LABELS } from "@/lib/skill/schema";
import { useSkillStore } from "@/store/skill-store";

/** SKILL 卡片列表：搜索 + 类型筛选 + 删除 */
export default function SkillList() {
  const { docs, remove } = useSkillStore();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return docs
      .filter((d) => typeFilter === "all" || d.meta.type === typeFilter)
      .filter((d) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          d.meta.displayName.toLowerCase().includes(q) ||
          d.meta.description.toLowerCase().includes(q) ||
          d.meta.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.meta.updatedAt - a.meta.updatedAt);
  }, [docs, query, typeFilter]);

  return (
    <div className="space-y-4">
      {/* 搜索 + 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索名称 / 描述 / 标签…"
          className="flex-1 min-w-[200px] rounded-xl border border-line bg-ink-950/60 px-4 py-2 text-sm text-white placeholder:text-dim focus:border-gold/50 focus:outline-none"
        />
        <div className="flex gap-1.5">
          {["all", "persona", "functional", "combined"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                typeFilter === t
                  ? "border-gold/60 bg-gold-dim text-gold"
                  : "border-line text-dim hover:text-white hover:border-gold/30"
              }`}
            >
              {t === "all" ? "全部" : TYPE_LABELS[t as keyof typeof TYPE_LABELS]}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center text-dim">
          {docs.length === 0 ? "还没有 SKILL，点击右上角「导入」或「AI 创建」开始" : "没有匹配的 SKILL"}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((doc) => (
            <SkillCard key={doc.id} doc={doc} onDelete={() => remove(doc.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SkillCard({ doc, onDelete }: { doc: SkillDoc; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const { meta } = doc;

  return (
    <div className="group rounded-2xl border border-line bg-panel p-4 transition-all hover:border-gold/40 hover:shadow-gold">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-white truncate">{meta.displayName}</h3>
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${TYPE_BADGE[meta.type]}`}>
              {TYPE_LABELS[meta.type]}
            </span>
          </div>
          <p className="text-dim text-xs mt-1 line-clamp-2">{meta.description || "无描述"}</p>
        </div>
        <span className="shrink-0 text-[10px] text-dim font-mono">{meta.slug}</span>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/60">
        <div className="flex items-center gap-2 text-[10px] text-dim">
          {meta.tags.slice(0, 3).map((t) => (
            <span key={t} className="px-1.5 py-0.5 rounded bg-white/5">
              #{t}
            </span>
          ))}
          <span>v{meta.version}</span>
          <span>{new Date(meta.updatedAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirming ? (
            <>
              <Button size="sm" variant="danger" onClick={onDelete}>
                确认删除
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                取消
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
                删除
              </Button>
              <Link to="/skills/$id" params={{ id: doc.id }}>
                <Button size="sm" variant="outline">
                  编辑 →
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}