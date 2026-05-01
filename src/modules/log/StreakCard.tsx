"use client";

import type { GymSession } from "./types";

const TARGET = 4;

function countThisWeek(sessions: GymSession[]): number {
  const now = new Date();
  /* Monday as week start */
  const dow     = now.getDay(); // 0 = Sun
  const monday  = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);

  return sessions.filter(
    (s) => new Date(s.date + "T00:00:00") >= monday
  ).length;
}

interface Props {
  sessions: GymSession[];
}

export default function StreakCard({ sessions }: Props) {
  const done = countThisWeek(sessions);
  const pct  = Math.min((done / TARGET) * 100, 100);

  return (
    <div className="mx-4 mt-3 mb-4 bg-surface border border-[0.5px] border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-foreground">This week</p>
        <p className="text-sm text-foreground/40 tabular-nums">
          {done} of {TARGET} sessions
        </p>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: "color-mix(in srgb, var(--border) 80%, transparent)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: "var(--primary)" }}
        />
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2 mt-3">
        {Array.from({ length: TARGET }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i < done
                ? "var(--primary)"
                : "color-mix(in srgb, var(--border) 80%, transparent)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
