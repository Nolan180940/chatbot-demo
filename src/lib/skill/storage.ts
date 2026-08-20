import type { SkillDoc, SkillMeta, SkillVersion } from "./types";
import { MAX_VERSIONS, STORAGE_KEY } from "./schema.ts";

/** 存储接口抽象（Web 用 localStorage，测试用内存实现） */
export interface SkillStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 默认使用浏览器 localStorage（SSR/Node 环境降级为内存） */
function defaultStorage(): SkillStorage {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => void mem.set(k, v),
    removeItem: (k) => void mem.delete(k),
  };
}

let storage: SkillStorage | null = null;

export function setSkillStorage(impl: SkillStorage): void {
  storage = impl;
}

function getStorage(): SkillStorage {
  if (!storage) storage = defaultStorage();
  return storage;
}

/** 读取全部 SKILL 文档 */
export function loadSkills(): SkillDoc[] {
  try {
    const raw = getStorage().getItem(STORAGE_KEY);
    if (!raw) return [];
    const docs = JSON.parse(raw) as SkillDoc[];
    return Array.isArray(docs) ? docs : [];
  } catch {
    return [];
  }
}

function persist(docs: SkillDoc[]): void {
  getStorage().setItem(STORAGE_KEY, JSON.stringify(docs));
}

/** 新增 SKILL（含初始版本 v1） */
export function saveSkill(doc: SkillDoc): void {
  const docs = loadSkills();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) docs[idx] = doc;
  else docs.push(doc);
  persist(docs);
}

/** 按 id 删除 */
export function deleteSkill(id: string): void {
  persist(loadSkills().filter((d) => d.id !== id));
}

/** 按 id 查找 */
export function getSkill(id: string): SkillDoc | undefined {
  return loadSkills().find((d) => d.id === id);
}

/** slug 冲突检测：返回已存在的同名 slug 列表 */
export function findSlugConflicts(slug: string, excludeId?: string): SkillDoc[] {
  return loadSkills().filter((d) => d.meta.slug === slug && d.id !== excludeId);
}

/** 更新内容并追加版本快照（自动裁剪到 MAX_VERSIONS） */
export function updateSkillContent(id: string, content: string, note?: string): SkillDoc | undefined {
  const docs = loadSkills();
  const doc = docs.find((d) => d.id === id);
  if (!doc) return undefined;

  const version: SkillVersion = {
    version: doc.meta.version + 1,
    content,
    timestamp: Date.now(),
    note,
  };
  doc.versions.push(version);
  if (doc.versions.length > MAX_VERSIONS) doc.versions = doc.versions.slice(-MAX_VERSIONS);

  doc.content = content;
  doc.meta.version = version.version;
  doc.meta.updatedAt = version.timestamp;
  persist(docs);
  return doc;
}

/** 回滚到指定版本 */
export function rollbackSkill(id: string, version: number): SkillDoc | undefined {
  const docs = loadSkills();
  const doc = docs.find((d) => d.id === id);
  if (!doc) return undefined;
  const target = doc.versions.find((v) => v.version === version);
  if (!target) return undefined;
  return updateSkillContent(id, target.content, `回滚到 v${version}`);
}

/** 由 ParsedSkill 构建 SkillDoc（导入/创建共用） */
export function buildSkillDoc(input: {
  slug: string;
  name: string;
  displayName: string;
  description: string;
  type: SkillMeta["type"];
  category: SkillMeta["category"];
  tags: string[];
  content: string;
  source: SkillMeta["source"];
}): SkillDoc {
  const now = Date.now();
  const meta: SkillMeta = {
    id: makeUniqueId(input.slug),
    slug: input.slug,
    name: input.name,
    displayName: input.displayName,
    description: input.description,
    type: input.type,
    category: input.category,
    tags: input.tags,
    language: "zh-CN",
    source: input.source,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  return {
    id: meta.id,
    meta,
    content: input.content,
    versions: [{ version: 1, content: input.content, timestamp: now, note: "初始版本" }],
  };
}

let idCounter = 0;
function makeUniqueId(slug: string): string {
  idCounter = (idCounter + 1) % 36;
  return `${slug}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}