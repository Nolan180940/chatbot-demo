"use client";

import SkillCreateWizard from "@/components/skills/SkillCreateWizard";

/** AI 创建 SKILL 页 */
export default function SkillCreatePage() {
  return (
    <main className="min-h-screen bg-ink-950 text-slate-200">
      <SkillCreateWizard />
    </main>
  );
}