"use client";

import { useEffect, useRef, useState } from "react";
import type { CaptureResult } from "@/app/api/capture/route";
import type { Task, Workspace, Urgency } from "@/modules/tasks/types";
import { STORAGE_KEY, todayISO } from "@/modules/tasks/useTasks";

/* ── Helpers ──────────────────────────────────────────────────── */

function isoFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

function resolveDueDate(dueDate: CaptureResult["dueDate"]): string | undefined {
  if (!dueDate)             return undefined;
  if (dueDate === "today")     return todayISO();
  if (dueDate === "tomorrow")  return isoFromNow(1);
  if (dueDate === "this-week") return isoFromNow(5);
  // ISO date string "YYYY-MM-DD" passes through directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return dueDate;
  return undefined;
}

function mapWorkspace(ws: CaptureResult["workspace"]): Workspace | null {
  if (ws === "Personal")   return "personal";
  if (ws === "WeedGuys")   return "weedguys";
  if (ws === "SnapshotTO") return "snapshotto";
  return null; // "unclear"
}

function mapUrgency(urgency: CaptureResult["urgency"]): Urgency {
  return urgency === "urgent" ? "urgent" : "normal";
}

function dueDateLabel(dueDate: CaptureResult["dueDate"]): string {
  if (!dueDate) return "No due date";
  if (dueDate === "today")     return "Today";
  if (dueDate === "tomorrow")  return "Tomorrow";
  if (dueDate === "this-week") return "This week";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return new Date(dueDate + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day:   "numeric",
    });
  }
  return dueDate;
}

const WORKSPACE_OPTIONS: { id: Workspace; label: string }[] = [
  { id: "personal",   label: "Personal"   },
  { id: "weedguys",   label: "WeedGuys"   },
  { id: "snapshotto", label: "SnapshotTO" },
];

/* ── Component ────────────────────────────────────────────────── */

interface Props {
  result:    CaptureResult;
  onSave:    () => void;
  onDiscard: () => void;
}

export default function CaptureCard({ result, onSave, onDiscard }: Props) {
  const [selectedWs, setSelectedWs] = useState<Workspace | null>(
    mapWorkspace(result.workspace)
  );

  const backdropRef = useRef<HTMLDivElement>(null);

  // Tap-outside-to-discard
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (backdropRef.current === e.target) onDiscard();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onDiscard]);

  function handleSave() {
    const ws = selectedWs ?? "personal";
    const dueDate = result.urgency === "someday" ? "someday" : resolveDueDate(result.dueDate);

    const task: Task = {
      id:        `task-${Date.now()}`,
      text:      result.text,
      workspace: ws,
      urgency:   mapUrgency(result.urgency),
      dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    try {
      const raw   = localStorage.getItem(STORAGE_KEY);
      const tasks: Task[] = raw ? (JSON.parse(raw) as Task[]) : [];
      tasks.push(task);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // Silent fail — task will just not persist
    }

    onSave();
  }

  /* ── Workspace label for badge ── */
  const wsLabel =
    selectedWs === "personal"   ? "Personal"   :
    selectedWs === "weedguys"   ? "WeedGuys"   :
    selectedWs === "snapshotto" ? "SnapshotTO" :
    "Unassigned";

  const urgencyLabel = result.urgency === "urgent" ? "Urgent"
                     : result.urgency === "someday" ? "Someday"
                     : "Normal";

  return (
    /* Backdrop — tap outside = discard */
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50"
      style={{ background: "rgba(0,0,0,0.25)" }}
    >
      {/* Card */}
      <div
        className="slide-up-card absolute left-0 right-0 mx-3 rounded-2xl
          bg-surface border border-[0.5px] border-border p-4 flex flex-col gap-3"
        style={{ bottom: "calc(4rem + 8px)" }}  /* above tab bar + gap */
      >
        {/* Low confidence note */}
        {result.confidence === "low" && (
          <p className="text-xs text-foreground/50 italic">
            Not sure about this one — check before saving
          </p>
        )}

        {/* Task text */}
        <p className="text-base font-medium text-foreground leading-snug">
          {result.text}
        </p>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Workspace badge */}
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium border border-[0.5px]"
            style={{
              backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
              borderColor:      "color-mix(in srgb, var(--primary) 40%, transparent)",
              color:            "var(--primary)",
            }}
          >
            {wsLabel}
          </span>

          {/* Urgency badge */}
          <span
            className="px-2.5 py-1 rounded-full text-xs font-medium border border-[0.5px]"
            style={
              result.urgency === "urgent"
                ? {
                    backgroundColor: "color-mix(in srgb, var(--urgent) 12%, transparent)",
                    borderColor:      "color-mix(in srgb, var(--urgent) 40%, transparent)",
                    color:            "var(--urgent)",
                  }
                : {
                    backgroundColor: "color-mix(in srgb, var(--foreground) 6%, transparent)",
                    borderColor:      "color-mix(in srgb, var(--border) 80%, transparent)",
                    color:            "color-mix(in srgb, var(--foreground) 45%, transparent)",
                  }
            }
          >
            {urgencyLabel}
          </span>

          {/* Due date badge */}
          {result.dueDate && (
            <span className="text-xs text-foreground/45">
              {dueDateLabel(result.dueDate)}
            </span>
          )}
        </div>

        {/* Workspace selector — shown only when unclear */}
        {result.workspace === "unclear" && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-foreground/40">Which workspace?</p>
            <div className="flex gap-2">
              {WORKSPACE_OPTIONS.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setSelectedWs(ws.id)}
                  className={`flex-1 py-1.5 rounded-xl text-xs border border-[0.5px] transition-all ${
                    selectedWs === ws.id
                      ? "border-primary/50 bg-primary/10 text-primary font-medium"
                      : "border-border text-foreground/50"
                  }`}
                >
                  {ws.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={result.workspace === "unclear" && !selectedWs}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium
              transition-opacity hover:opacity-90 active:opacity-80
              disabled:opacity-30"
            style={{ backgroundColor: "var(--primary)", color: "white" }}
          >
            Save
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-2.5 rounded-xl text-sm text-foreground/45
              hover:text-foreground/70 transition-colors"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
