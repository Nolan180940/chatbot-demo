"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage, Session } from "@/lib/types";
import { DEFAULT_SESSION_TITLE } from "@/lib/config";

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: uid(), role, content, createdAt: Date.now() };
}

interface ChatState {
  sessions: Session[];
  activeSessionId: string | null;

  createSession: () => string;
  deleteSession: (id: string) => void;
  switchSession: (id: string) => void;

  appendMessage: (sessionId: string, role: ChatMessage["role"], content: string) => void;
  /** 更新最后一条 assistant 消息（流式追加） */
  updateLastMessage: (sessionId: string, delta: string) => void;
  setStreaming: (sessionId: string, streaming: boolean) => void;
  /** 首条用户消息后自动生成会话标题 */
  autoTitle: (sessionId: string) => void;
  clearAll: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      createSession: () => {
        const id = uid();
        const session: Session = {
          id,
          title: DEFAULT_SESSION_TITLE,
          createdAt: Date.now(),
          messages: [],
          streaming: false,
        };
        set((s) => ({
          sessions: [session, ...s.sessions],
          activeSessionId: id,
        }));
        return id;
      },

      deleteSession: (id) => {
        const { sessions, activeSessionId } = get();
        const next = sessions.filter((s) => s.id !== id);
        let nextActive = activeSessionId;
        if (activeSessionId === id) {
          nextActive = next[0]?.id ?? null;
        }
        set({ sessions: next, activeSessionId: nextActive });
      },

      switchSession: (id) => set({ activeSessionId: id }),

      appendMessage: (sessionId, role, content) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? { ...sess, messages: [...sess.messages, makeMessage(role, content)] }
              : sess,
          ),
        })),

      updateLastMessage: (sessionId, delta) =>
        set((s) => ({
          sessions: s.sessions.map((sess) => {
            if (sess.id !== sessionId || sess.messages.length === 0) return sess;
            const msgs = [...sess.messages];
            const last = msgs[msgs.length - 1];
            msgs[msgs.length - 1] = { ...last, content: last.content + delta };
            return { ...sess, messages: msgs };
          }),
        })),

      setStreaming: (sessionId, streaming) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId ? { ...sess, streaming } : sess,
          ),
        })),

      autoTitle: (sessionId) =>
        set((s) => ({
          sessions: s.sessions.map((sess) => {
            if (sess.id !== sessionId) return sess;
            const firstUser = sess.messages.find((m) => m.role === "user");
            if (!firstUser) return sess;
            const raw = firstUser.content.replace(/\s+/g, " ").trim();
            const title = raw.length > 20 ? raw.slice(0, 20) + "…" : raw;
            return { ...sess, title: title || DEFAULT_SESSION_TITLE };
          }),
        })),

      clearAll: () => set({ sessions: [], activeSessionId: null }),
    }),
    {
      name: "chatbot-demo-sessions",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
