"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import GymTab from "./GymTab";

type LogTab = "gym" | "daily";

const TAB_LABELS: Record<LogTab, string> = { gym: "Gym", daily: "Daily Log" };

export default function LogScreen() {
  const [activeTab, setActiveTab] = useState<LogTab>("gym");

  return (
    <div className="flex flex-col">

      {/* ── Tab row — sticky just below TopBar ── */}
      <div
        className="flex border-b border-[0.5px] border-border bg-background"
        style={{ position: "sticky", top: "3.5rem", zIndex: 30 }}
      >
        {(["gym", "daily"] as LogTab[]).map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative flex-1 min-h-[44px] text-sm transition-colors"
              style={{
                color:   active ? "var(--primary)" : "var(--foreground)",
                opacity: active ? 1 : 0.45,
              }}
            >
              {TAB_LABELS[tab]}
              {active && (
                <span
                  className="absolute bottom-0 left-4 right-4 h-[1.5px] rounded-full"
                  style={{ backgroundColor: "var(--primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content — key triggers fade on switch ── */}
      <div key={activeTab} className="tab-fade">
        {activeTab === "gym" && <GymTab />}

        {activeTab === "daily" && (
          <div className="flex flex-col items-center justify-center py-20 px-6 gap-3">
            <CalendarDays size={32} className="text-foreground/15" />
            <p className="text-sm text-foreground/35 text-center">
              Daily Log — coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
