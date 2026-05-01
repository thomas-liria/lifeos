"use client";

import { Leaf } from "lucide-react";
import { WORKSPACE_LABELS } from "@/modules/tasks/types";
import type { FocusTask } from "./useHomeData";

interface Props {
  tasks:   FocusTask[];
  mounted: boolean;
}

export default function FocusCard({ tasks, mounted }: Props) {
  /* Loading skeleton */
  if (!mounted) {
    return (
      <div className="mx-4 bg-surface border border-[0.5px] border-border rounded-2xl px-4 py-4">
        <div className="h-2.5 w-20 bg-border/40 rounded-full mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 mb-4 last:mb-0">
            <div className="w-2 h-2 rounded-full bg-border/40 mt-1.5 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-border/30 rounded-full w-4/5" />
              <div className="h-2.5 bg-border/20 rounded-full w-2/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* Empty state */
  if (tasks.length === 0) {
    return (
      <div className="mx-4 bg-surface border border-[0.5px] border-border rounded-2xl
        flex flex-col items-center justify-center py-8 gap-2.5">
        <Leaf size={28} className="text-foreground/15" />
        <p className="text-sm text-foreground/35">Nothing urgent — you're clear</p>
      </div>
    );
  }

  return (
    <div className="mx-4 bg-surface border border-[0.5px] border-border rounded-2xl px-4 py-4">
      <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.08em] mb-3">
        Up front now
      </p>
      <div className="flex flex-col gap-3.5">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-3">
            <span
              className="mt-[5px] w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor:
                  task.urgency === "urgent" ? "var(--urgent)" : "var(--calm)",
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">{task.text}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-foreground/40">
                  {WORKSPACE_LABELS[task.workspace]}
                </span>
                <span className="text-foreground/20 text-xs">·</span>
                <span
                  className="text-xs"
                  style={{
                    color:   task.isOverdue ? "var(--urgent)" : "var(--foreground)",
                    opacity: task.isOverdue ? 0.85 : 0.40,
                  }}
                >
                  {task.dueLabel}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
