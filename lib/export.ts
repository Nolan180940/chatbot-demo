"use client";

import { useChatStore } from "@/store/chat-store";

type SerializableMessage = {
  role: string;
  content: string;
  createdAt: number;
};

/** 导出全部会话为纯 JSON（浏览器下载） */
export function exportAllSessions(): void {
  const { sessions } = useChatStore.getState();

  const data = {
    app: "chatbot-demo",
    version: 1,
    exportedAt: new Date().toISOString(),
    stats: {
      sessionCount: sessions.length,
      messageCount: sessions.reduce((n, s) => n + s.messages.length, 0),
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      messages: s.messages.map<SerializableMessage>((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    })),
  };

  downloadJson(data, `chatbot-sessions-${timestampToDate(new Date())}.json`);
}

/** 导出单个会话为纯 JSON（浏览器下载） */
export function exportSession(sessionId: string): void {
  const session = useChatStore
    .getState()
    .sessions.find((s) => s.id === sessionId);
  if (!session) return;

  const data = {
    app: "chatbot-demo",
    version: 1,
    exportedAt: new Date().toISOString(),
    session: {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      messageCount: session.messages.length,
      messages: session.messages.map<SerializableMessage>((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    },
  };

  // 用会话标题生成文件名（清理非法字符）
  const safeTitle =
    session.title
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "-")
      .slice(0, 40) || "untitled";
  downloadJson(
    data,
    `session-${safeTitle}-${timestampToDate(new Date())}.json`,
  );
}

function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timestampToDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours(),
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
