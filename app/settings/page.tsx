"use client";

import SidebarLayout from "@/components/sidebar/SidebarLayout";
import SettingsPanel from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <SidebarLayout>
      <main className="flex-1 overflow-y-auto min-w-0">
        <SettingsPanel />
      </main>
    </SidebarLayout>
  );
}
