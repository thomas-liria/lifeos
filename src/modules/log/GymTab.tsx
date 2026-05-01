"use client";

import { Dumbbell } from "lucide-react";
import { useState } from "react";
import { nextSessionType, useGym } from "./useGym";
import SessionHeaderCard    from "./SessionHeaderCard";
import LastSessionCard      from "./LastSessionCard";
import ActiveSessionLogger  from "./ActiveSessionLogger";
import ProgressChart        from "./ProgressChart";
import StreakCard            from "./StreakCard";
import type { Exercise, GymSession } from "./types";

export default function GymTab() {
  const { sessions, mounted, addSession } = useGym();
  const [isActive,    setIsActive]    = useState(false);
  const [showSummary, setShowSummary] = useState<GymSession | null>(null);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Dumbbell size={32} className="text-foreground/15" />
        <p className="text-sm text-foreground/30">Loading gym data…</p>
      </div>
    );
  }

  const nextType    = nextSessionType(sessions);
  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  /* ── Save finished session ── */
  function handleFinish(exercises: Exercise[], durationSeconds: number) {
    const session: GymSession = {
      id:              `gym-${Date.now()}`,
      type:            nextType,
      date:            new Date().toLocaleDateString("en-CA"),
      exercises,
      durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
    };
    addSession(session);
    setIsActive(false);
    setShowSummary(session);
  }

  /* ── Completion summary overlay ── */
  if (showSummary) {
    const totalSets = showSummary.exercises.reduce((n, ex) => n + ex.sets.length, 0);
    return (
      <div className="px-4 pt-6">
        <div className="bg-surface border border-[0.5px] border-border rounded-2xl p-5">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
            style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
          >
            💪
          </div>
          <p className="text-base font-medium text-foreground text-center">
            {showSummary.type} complete
          </p>
          <p className="text-sm text-foreground/40 text-center mt-1">
            {showSummary.exercises.length} exercise{showSummary.exercises.length !== 1 ? "s" : ""}
            {" · "}
            {totalSets} set{totalSets !== 1 ? "s" : ""}
            {" · "}
            {showSummary.durationMinutes} min
          </p>

          {/* Best sets per exercise */}
          <div className="mt-4 flex flex-col gap-1.5 border-t border-[0.5px] border-border pt-4">
            {showSummary.exercises.map((ex) => {
              const best =
                ex.sets.length > 0
                  ? ex.sets.reduce((b, s) => (s.weight > b.weight ? s : b), ex.sets[0])
                  : { weight: 0, reps: 0 };
              return (
                <div key={ex.id} className="flex items-center justify-between">
                  <span className="text-sm text-foreground/70">{ex.name}</span>
                  <span className="text-sm text-foreground/40 tabular-nums">
                    {best.weight} lbs × {best.reps}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setShowSummary(null)}
            className="mt-5 w-full py-2.5 rounded-xl text-sm font-medium
              hover:opacity-90 active:opacity-80 transition-opacity"
            style={{ backgroundColor: "var(--primary)", color: "white" }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  /* ── Active session logger ── */
  if (isActive) {
    return (
      <ActiveSessionLogger
        sessionType={nextType}
        onFinish={handleFinish}
        onCancel={() => setIsActive(false)}
      />
    );
  }

  /* ── Default gym view ── */
  return (
    <div className="flex flex-col">
      <SessionHeaderCard nextType={nextType} onStart={() => setIsActive(true)} />
      <LastSessionCard   session={lastSession} />
      <ProgressChart />
      <StreakCard sessions={sessions} />
    </div>
  );
}
