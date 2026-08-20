"use client";

import { useUIStore } from "@/store/ui-store";
import Sidebar from "./Sidebar";

/**
 * 所有带侧边栏页面的外层容器。
 * - 桌面端：渲染可折叠的窄栏/宽栏 Sidebar
 * - 移动端：渲染汉堡按钮 + 抽屉式 Sidebar
 */
export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setMobileOpen = useUIStore((s) => s.setMobileOpen);

  return (
    <div className="flex h-screen overflow-hidden app-ambient">
      <Sidebar />

      {/* 移动端：悬浮汉堡按钮 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3.5 left-3 z-40 flex items-center justify-center w-9 h-9 rounded-lg bg-ink-900 border border-line text-slate-200 hover:text-gold hover:border-gold/40 active:scale-95 transition-all"
        title="打开菜单"
        aria-label="打开菜单"
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      {children}
    </div>
  );
}
