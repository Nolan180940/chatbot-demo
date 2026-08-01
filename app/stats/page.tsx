"use client";

import Sidebar from "@/components/sidebar/Sidebar";
import StatsPanel from "@/components/stats/StatsPanel";

export default function StatsPage() {
  return (
    <div className="flex h-screen overflow-hidden app-ambient">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <StatsPanel />
      </main>
    </div>
  );
}
