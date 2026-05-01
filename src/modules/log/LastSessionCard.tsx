"use client";

import type { GymSession } from "./types";

/* ── Hardcoded placeholder shown until a real session is logged ── */
const PLACEHOLDER = {
  type:      "Upper A",
  dateLabel: "Apr 22",
  exercises: [
    { name: "Bench Press",      best: "185 lbs × 8"  },
    { name: "Incline DB Press", best: "60 lbs × 10"  },
    { name: "Tricep Pushdown",  best: "120 lbs × 12" },
  ],
};

interface Props {
  session: GymSession | null;
}

export default function LastSessionCard({ session }: Props) {
  const data = session
    ? {
        type:      session.type,
        dateLabel: new Date(session.date + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day:   "numeric",
        }),
        exercises: session.exercises.map((ex) => {
          const best =
            ex.sets.length > 0
              ? ex.sets.reduce((b, s) => (s.weight > b.weight ? s : b), ex.sets[0])
              : { weight: 0, reps: 0 };
          return { name: ex.name, best: `${best.weight} lbs × ${best.reps}` };
        }),
      }
    : PLACEHOLDER;

  return (
    <div className="mx-4 mt-3 bg-surface border border-[0.5px] border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] text-foreground/40 uppercase tracking-wider">Last session</p>
        <p className="text-xs text-foreground/40">{data.dateLabel}</p>
      </div>
      <p className="text-sm font-medium text-foreground mb-2.5">{data.type}</p>
      <div className="flex flex-col gap-1.5">
        {data.exercises.map((ex) => (
          <div key={ex.name} className="flex items-center justify-between">
            <span className="text-sm text-foreground/70">{ex.name}</span>
            <span className="text-sm text-foreground/40 tabular-nums">{ex.best}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
