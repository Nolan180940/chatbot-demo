"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/store/chat-store";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  const router = useRouter();
  const sessions = useChatStore((s) => s.sessions);
  const activeId = useChatStore((s) => s.activeSessionId);

  // 无会话时自动新建一个
  useEffect(() => {
    const store = useChatStore.getState();
    if (store.sessions.length === 0) {
      const id = store.createSession();
      store.switchSession(id);
    }
  }, []);

  const active = sessions.find((s) => s.id === activeId);

  return (
    <div className="flex h-screen overflow-hidden app-ambient">
      <Sidebar />
      {active ? (
        <ChatWindow sessionId={active.id} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => {
              const id = useChatStore.getState().createSession();
              router.push("/chat");
            }}
            className="px-4 py-2 rounded-lg bg-gold-dim text-gold hover:bg-gold/20 font-mono text-sm"
          >
            $ new chat
          </button>
        </div>
      )}
    </div>
  );
}
