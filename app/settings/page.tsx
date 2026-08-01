"use client";

import Sidebar from "@/components/sidebar/Sidebar";
import SettingsPanel from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="flex h-screen overflow-hidden app-ambient">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <SettingsPanel />
      </main>
    </div>
  );
}
