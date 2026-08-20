import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import { useEffect } from "react";
import SidebarLayout from "@/components/sidebar/SidebarLayout";
import ChatWindow from "@/components/chat/ChatWindow";
import SettingsPanel from "@/components/settings/SettingsPanel";
import StatsPanel from "@/components/stats/StatsPanel";
import SkillsPage from "@/components/skills/SkillsPage";
import SkillCreateWizard from "@/components/skills/SkillCreateWizard";
import SkillEditPage from "@/components/skills/SkillEditPage";
import { useChatStore } from "@/store/chat-store";

/** 根路由：全局布局（字体变量 + 背景） */
const rootRoute = createRootRoute({
  component: () => (
    <div className="font-sans antialiased bg-ink-950 min-h-screen text-slate-200">
      <Outlet />
    </div>
  ),
});

/** 首页：重定向到 /chat */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/chat" });
  },
});

/** 聊天页 */
const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: ChatPage,
});

function ChatPage() {
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
    <SidebarLayout>
      {active ? (
        <ChatWindow sessionId={active.id} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-dim text-sm">
          正在创建会话…
        </div>
      )}
    </SidebarLayout>
  );
}

/** 设置页 */
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <SidebarLayout>
      <main className="flex-1 overflow-y-auto min-w-0">
        <SettingsPanel />
      </main>
    </SidebarLayout>
  ),
});

/** 统计页 */
const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stats",
  component: () => (
    <SidebarLayout>
      <main className="flex-1 overflow-y-auto min-w-0">
        <StatsPanel />
      </main>
    </SidebarLayout>
  ),
});

/** SKILL 库列表页 */
const skillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills",
  component: () => <SkillsPage />,
});

/** AI 创建 SKILL 页 */
const skillsCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills/create",
  component: () => <SkillCreateWizard />,
});

/** SKILL 编辑器页 */
const skillsEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills/$id",
  component: () => <SkillEditPage />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  chatRoute,
  settingsRoute,
  statsRoute,
  skillsRoute,
  skillsCreateRoute,
  skillsEditRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}