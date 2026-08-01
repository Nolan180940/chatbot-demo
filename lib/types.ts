export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
  streaming: boolean;
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
