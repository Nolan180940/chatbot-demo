/** SKILL 类型：人格类 / 功能性 / 综合（Persona + Work） */
export type SkillType = "persona" | "functional" | "combined";

/** colleague-skill 规范中的 character family */
export type SkillCategory = "colleague" | "relationship" | "celebrity" | "generic";

export type SkillSource = "import" | "create" | "manual";

/** 解析出的 frontmatter + 正文结构 */
export interface ParsedSkill {
  name: string;
  description: string;
  userInvocable: boolean;
  body: string;
  title?: string;
  hasPartA: boolean;
  hasPartB: boolean;
  type: SkillType;
}

/** 校验问题 */
export interface ValidationIssue {
  severity: "error" | "warning";
  line?: number;
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  parsed?: ParsedSkill;
}

/** 版本快照 */
export interface SkillVersion {
  version: number;
  content: string;
  timestamp: number;
  note?: string;
}

/** SKILL 元数据（对应 colleague-skill meta.json 的简化版） */
export interface SkillMeta {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  description: string;
  type: SkillType;
  category: SkillCategory;
  tags: string[];
  language: string;
  source: SkillSource;
  createdAt: number;
  updatedAt: number;
  version: number;
}

/** 完整 SKILL 文档（存储单元） */
export interface SkillDoc {
  id: string;
  meta: SkillMeta;
  content: string;
  versions: SkillVersion[];
}

/** 导入结果（单文件） */
export interface ImportResult {
  fileName: string;
  ok: boolean;
  validation?: ValidationResult;
  doc?: SkillDoc;
  error?: string;
  /** 冲突时保留原始内容，供覆盖导入使用 */
  content?: string;
}

/** AI 创建会话状态 */
export interface CreateSession {
  step: number;
  type?: SkillType;
  collected: Record<string, string>;
  messages: { role: "user" | "assistant"; content: string }[];
  generated?: { meta: Partial<SkillMeta>; content: string };
}