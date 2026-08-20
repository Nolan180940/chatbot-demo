"use client";

import { create } from "zustand";
import type { ImportResult, SkillDoc } from "@/lib/skill/types";
import {
  loadSkills,
  saveSkill,
  deleteSkill,
  updateSkillContent,
  rollbackSkill,
  buildSkillDoc,
  findSlugConflicts,
} from "@/lib/skill/storage";
import { validateSkill } from "@/lib/skill/validate";
import { toSlug, normalizeName, TYPE_CATEGORY } from "@/lib/skill/schema";

interface SkillState {
  docs: SkillDoc[];
  /** 从存储重新加载 */
  refresh: () => void;
  /** 导入文件内容（可多个），返回每个文件的结果 */
  importFiles: (files: { name: string; content: string }[]) => ImportResult[];
  /** 覆盖导入（跳过冲突确认） */
  forceImport: (file: { name: string; content: string }) => ImportResult;
  remove: (id: string) => void;
  updateContent: (id: string, content: string, note?: string) => void;
  rollback: (id: string, version: number) => void;
}

export const useSkillStore = create<SkillState>()((set, get) => ({
  docs: loadSkills(),

  refresh: () => set({ docs: loadSkills() }),

  importFiles: (files) => {
    const results: ImportResult[] = [];
    for (const file of files) {
      const validation = validateSkill(file.content);
      if (!validation.valid || !validation.parsed) {
        results.push({ fileName: file.name, ok: false, validation, error: "格式校验未通过" });
        continue;
      }
      const parsed = validation.parsed;
      // name 归一化：连字符转下划线（colleague-kongzi → colleague_kongzi）
      const name = normalizeName(
        parsed.name || parsed.title || file.name.replace(/\.md$/i, ""),
      );
      const slug = toSlug(name);
      const conflicts = findSlugConflicts(slug);
      if (conflicts.length > 0) {
        results.push({
          fileName: file.name,
          ok: false,
          validation,
          content: file.content,
          error: `slug「${slug}」已存在（${conflicts[0].meta.displayName}），请选择覆盖或重命名`,
        });
        continue;
      }
      const doc = buildSkillDoc({
        slug,
        name,
        displayName: parsed.title || parsed.name,
        description: parsed.description,
        type: parsed.type,
        category: TYPE_CATEGORY[parsed.type],
        tags: [],
        content: file.content,
        source: "import",
      });
      saveSkill(doc);
      results.push({ fileName: file.name, ok: true, validation, doc });
    }
    get().refresh();
    return results;
  },

  forceImport: (file) => {
    const validation = validateSkill(file.content);
    if (!validation.valid || !validation.parsed) {
      return { fileName: file.name, ok: false, validation, error: "格式校验未通过" };
    }
    const parsed = validation.parsed;
    // name 归一化：连字符转下划线（colleague-kongzi → colleague_kongzi）
    const name = normalizeName(
      parsed.name || parsed.title || file.name.replace(/\.md$/i, ""),
    );
    const slug = toSlug(name);
    const doc = buildSkillDoc({
      slug,
      name,
      displayName: parsed.title || parsed.name,
      description: parsed.description,
      type: parsed.type,
      category: TYPE_CATEGORY[parsed.type],
      tags: [],
      content: file.content,
      source: "import",
    });
    saveSkill(doc);
    get().refresh();
    return { fileName: file.name, ok: true, validation, doc };
  },

  remove: (id) => {
    deleteSkill(id);
    get().refresh();
  },

  updateContent: (id, content, note) => {
    updateSkillContent(id, content, note);
    get().refresh();
  },

  rollback: (id, version) => {
    rollbackSkill(id, version);
    get().refresh();
  },
}));