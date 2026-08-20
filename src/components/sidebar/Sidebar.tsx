"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useChatStore } from "@/store/chat-store";
import { useUIStore } from "@/store/ui-store";
import { exportAllSessions } from "@/lib/export";
import { DEFAULT_SESSION_TITLE } from "@/lib/config";

function timeLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

/**
 * 侧边栏内部内容。desktop：根据 collapsed 在宽栏/窄栏间切换；
 * mobile 抽屉固定用完整宽栏，onToggle 负责收起抽屉。
 */
function SidebarContent({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const sessions = useChatStore((s) => s.sessions);
  const activeId = useChatStore((s) => s.activeSessionId);
  const createSession = useChatStore((s) => s.createSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const isSettings = location.pathname === "/settings";
  const isStats = location.pathname === "/stats";
  const isSkills = location.pathname === "/skills";
  const [exported, setExported] = useState(false);

  return (
    <>
      {/* Logo / 折叠按钮行 */}
      <div
        className={`h-14 flex items-center gap-2.5 border-b border-line flex-shrink-0 transition-all ${
          collapsed ? "justify-center px-2" : "px-4"
        }`}
      >
        {!collapsed && (
          <>
            <div className="w-8 h-8 rounded-lg bg-gold-dim border border-gold/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 17l6-6-6-6M12 19h8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold text-white leading-tight">
                chatbot
              </div>
              <div className="font-mono text-[9px] text-dim leading-tight tracking-wider">
                BYOK · CONSOLE
              </div>
            </div>
          </>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          className="ml-auto flex-shrink-0 p-1.5 rounded-lg text-dim hover:text-gold hover:bg-white/5 transition-all"
        >
          {/* 桌面：折叠 / 展开箭头 */}
          <svg
            className={`w-4 h-4 hidden md:block transition-transform duration-200 ${
              collapsed ? "rotate-180" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {/* 移动：关闭抽屉 */}
          <svg className="w-4 h-4 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* 新建 + 导航 */}
      <div className="p-3 flex flex-col gap-1.5">
        <button
          onClick={() => {
            const id = createSession();
            navigate({ to: "/chat" });
          }}
          title="新建对话"
          className={`w-full flex items-center justify-center rounded-lg bg-gold hover:bg-gold-soft text-ink-950 shadow-gold transition-all ${
            collapsed
              ? "h-10"
              : "gap-2 py-2.5 font-display text-sm font-semibold"
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          {!collapsed && "新建对话"}
        </button>

        <button
          onClick={() => navigate({ to: "/settings" })}
          title="参数设置"
          className={`w-full flex items-center gap-2.5 rounded-lg text-sm transition-all ${
            isSettings
              ? "bg-gold-dim text-gold border border-gold/25"
              : "text-dim hover:text-slate-100 hover:bg-white/5 border border-transparent"
          } ${collapsed ? "justify-center py-2" : "px-3 py-2"}`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {!collapsed && "参数设置"}
        </button>

        <button
          onClick={() => navigate({ to: "/skills" })}
          title="SKILL 库"
          className={`w-full flex items-center gap-2.5 rounded-lg text-sm transition-all ${
            isSkills
              ? "bg-gold-dim text-gold border border-gold/25"
              : "text-dim hover:text-slate-100 hover:bg-white/5 border border-transparent"
          } ${collapsed ? "justify-center py-2" : "px-3 py-2"}`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!collapsed && "SKILL 库"}
        </button>

        <button
          onClick={() => navigate({ to: "/stats" })}
          title="数据统计"
          className={`w-full flex items-center gap-2.5 rounded-lg text-sm transition-all ${
            isStats
              ? "bg-gold-dim text-gold border border-gold/25"
              : "text-dim hover:text-slate-100 hover:bg-white/5 border border-transparent"
          } ${collapsed ? "justify-center py-2" : "px-3 py-2"}`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
          </svg>
          {!collapsed && "数据统计"}
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {!collapsed && (
          <div className="px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-dim/70">
            history
          </div>
        )}
        {sessions.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-dim/70">
            {collapsed ? "—" : "暂无会话，点击「新建对话」开始"}
          </div>
        ) : (
          sessions.map((s) => {
            const active = s.id === activeId && !isSettings && !isStats;
            return (
              <div
                key={s.id}
                title={collapsed ? s.title : undefined}
                className={`group relative flex items-center gap-2 mb-1 rounded-lg cursor-pointer text-sm transition-all ${
                  active
                    ? "bg-gold-dim text-slate-100 border border-gold/25"
                    : "text-dim hover:bg-white/5 hover:text-slate-200 border border-transparent"
                } ${collapsed ? "justify-center py-2.5" : "px-3 py-2"}`}
                onClick={() => {
                  useChatStore.getState().switchSession(s.id);
                  navigate({ to: "/chat" });
                }}
              >
                <span className="font-mono text-gold/70 flex-shrink-0 select-none">
                  ❯
                </span>
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        {s.title === DEFAULT_SESSION_TITLE ? "（新对话）" : s.title}
                      </div>
                      <div className="font-mono text-[9px] text-dim/70 mt-0.5">
                        {s.messages.length} msgs · {timeLabel(s.createdAt)}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded hover:bg-rose-500/10 text-dim hover:text-rose-400 transition-all"
                      title="删除会话"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                      </svg>
                    </button>

                    {confirmDelete === s.id && (
                      <div className="absolute right-2 top-full mt-1 z-20 bg-ink-800 border border-line rounded-xl p-3 shadow-2xl w-44 animate-fade-in">
                        <div className="text-xs text-slate-300 mb-2">删除该会话？</div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(s.id);
                              setConfirmDelete(null);
                            }}
                            className="flex-1 px-2 py-1 text-xs rounded-md bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
                          >
                            删除
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(null);
                            }}
                            className="flex-1 px-2 py-1 text-xs rounded-md bg-white/5 text-slate-300 hover:bg-white/10"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 底部 */}
      <div className={`py-3 border-t border-line flex-shrink-0 ${collapsed ? "flex flex-col items-center gap-2 px-2" : "px-4 space-y-2"}`}>
        <button
          onClick={() => {
            exportAllSessions();
            setExported(true);
            setTimeout(() => setExported(false), 1500);
          }}
          title="导出全部 (JSON)"
          className={`w-full flex items-center rounded-lg text-sm text-dim hover:text-slate-100 hover:bg-white/5 transition-all ${
            collapsed ? "justify-center py-2" : "gap-2.5 px-3 py-2"
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!collapsed && (exported ? "exported ✓" : "导出全部 (JSON)")}
        </button>
        <a
          href="https://github.com/Nolan180940/chatbot-demo"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub：github.com/Nolan180940/chatbot-demo"
          aria-label="GitHub 仓库"
          className={`w-full flex items-center rounded-lg text-sm text-dim hover:text-slate-100 hover:bg-white/5 transition-all ${
            collapsed ? "justify-center py-2" : "gap-2.5 px-3 py-2"
          }`}
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          {!collapsed && "GitHub · 查看源码"}
        </a>
        {!collapsed && (
          <div className="font-mono text-[9px] text-dim/60 leading-relaxed pt-2 border-t border-line">
            数据仅保存在本地浏览器
            <br />
            API Key 不会上传到服务器
          </div>
        )}
      </div>
    </>
  );
}

export default function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUIStore((s) => s.sidebarMobileOpen);
  const toggleCollapsed = useUIStore((s) => s.toggleCollapsed);
  const setMobileOpen = useUIStore((s) => s.setMobileOpen);
  const location = useLocation();

  // 路由变化时自动关闭移动端抽屉
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, setMobileOpen]);

  return (
    <>
      {/* 桌面端：可折叠窄栏 / 宽栏 */}
      <aside
        className={`hidden md:flex flex-col h-full bg-ink-900 border-r border-line flex-shrink-0 transition-[width] duration-200 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarContent collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* 移动端：抽屉 + 遮罩 */}
      <div
        className={`md:hidden fixed inset-0 z-50 ${
          mobileOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-64 max-w-[80vw] bg-ink-900 border-r border-line shadow-2xl flex flex-col transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent collapsed={false} onToggle={() => setMobileOpen(false)} />
        </aside>
      </div>
    </>
  );
}
