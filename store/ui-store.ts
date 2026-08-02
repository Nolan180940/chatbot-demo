"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UIState {
  /** 桌面端：侧边栏是否折叠为窄栏 */
  sidebarCollapsed: boolean;
  /** 移动端：抽屉是否打开 */
  sidebarMobileOpen: boolean;
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      toggleCollapsed: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileOpen: (open) => set({ sidebarMobileOpen: open }),
    }),
    {
      name: "chatbot-demo-ui",
      storage: createJSONStorage(() => localStorage),
      // 只持久化折叠偏好，抽屉开关是瞬态
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
