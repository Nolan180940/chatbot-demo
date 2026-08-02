"use client";

import SidebarLayout from "@/components/sidebar/SidebarLayout";
import StatsPanel from "@/components/stats/StatsPanel";

export default function StatsPage() {
  return (
    <SidebarLayout>
      <main className="flex-1 overflow-y-auto min-w-0">
        <StatsPanel />
      </main>
    </SidebarLayout>
  );
}
