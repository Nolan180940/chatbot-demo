export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

/** 会话级激活的 SKILL（激活后后续消息自动注入，无需重复 / 调用） */
export interface ActiveSkill {
  slug: string;
  displayName: string;
  mode: "full" | "work" | "persona";
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
  streaming: boolean;
  activeSkill: ActiveSkill | null;
}

/** 三项核心配置（BYOK） */
export interface AppConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface LLMRequestPayload {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: { role: Role; content: string }[];
}
