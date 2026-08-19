"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import type { SkillDoc } from "@/lib/skill/types";

interface Props {
  doc: SkillDoc;
  onRollback: (version: number) => void;
}

/** 版本历史时间线：查看、回滚 */
export default function SkillVersionHistory({ doc, onRollback }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmVersion, setConfirmVersion] = useState<number | null>(null);
  const versions = [...doc.versions].reverse();

  return (
    <div className="border-t border-line">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-dim hover:text-white transition-colors"
      >
        <span>🕘 版本历史（{doc.versions.length}）</span>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="max-h-48 overflow-y-auto px-4 pb-3 space-y-1">
          {versions.map((v) => (
            <div key={v.version} className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 bg-ink-950/50 text-xs">
              <div className="min-w-0">
                <span className={`font-mono font-medium ${v.version === doc.meta.version ? "text-gold" : "text-dim"}`}>
                  v{v.version}
                </span>
                {v.version === doc.meta.version && <span className="ml-1 text-[10px] text-gold">当前</span>}
                <span className="ml-2 text-dim">{new Date(v.timestamp).toLocaleString()}</span>
                {v.note && <span className="ml-2 text-dim">· {v.note}</span>}
              </div>
              {v.version !== doc.meta.version &&
                (confirmVersion === v.version ? (
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="danger" onClick={() => onRollback(v.version)}>
                      确认回滚
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmVersion(null)}>
                      取消
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmVersion(v.version)}>
                    回滚
                  </Button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}