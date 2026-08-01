"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_CONFIG } from "@/lib/config";
import type { AppConfig } from "@/lib/types";

interface ConfigState extends AppConfig {
  setBaseUrl: (v: string) => void;
  setApiKey: (v: string) => void;
  setModel: (v: string) => void;
  /** 全部更新（用于设置面板统一保存） */
  setConfig: (config: AppConfig) => void;
  /** 是否已配置完整 */
  isReady: () => boolean;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CONFIG,

      setBaseUrl: (v) => set({ baseUrl: v }),
      setApiKey: (v) => set({ apiKey: v }),
      setModel: (v) => set({ model: v }),
      setConfig: (c) => set(c),
      isReady: () => {
        const { baseUrl, apiKey, model } = get();
        return !!baseUrl && !!apiKey && !!model;
      },
    }),
    {
      name: "chatbot-demo-config",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
