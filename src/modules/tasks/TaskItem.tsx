"use client";

import type { Task } from "./types";
import { formatDue } from "./useTasks";

interface Props {
  task:     Task;
  onToggle: (id: string) => void;
}

const Checkmark = () => (
  <svg width="11" height="8" viewBox="0 0 11 8" fill="none" aria-hidden>
    <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function TaskItem({ task, onToggle }: Props) {
  const due = formatDue(task.dueDate);

  return (
    <div className={`flex items-start gap-3 px-4 py-3.5
      border-b border-[0.5px] border-border/50 last:border-b-0
      transition-opacity duration-300 ${task.completed ? "opacity-50" : "opacity-100"}`}
    >
      {/* Circular checkbox */}
      <button
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 w-[22px] h-[22px] rounded-full border border-[0.5px] flex-shrink-0
          flex items-center justify-center transition-all duration-200
          ${task.completed
            ? "border-primary bg-primary"
            : "border-border bg-background hover:border-primary/50"
          }`}
      >
        {task.completed && <Checkmark />}
      </button>

      {/* Text + due date */}
      <div className="flex-1 min-w-0 pt-px">
        <span
          className={`text-sm leading-snug transition-all duration-200
            ${task.completed ? "line-through text-foreground/35" : "text-foreground"}`}
        >
          {task.text}
        </span>
        {due && (
          <p
            className="text-xs mt-0.5"
            style={{ color: due.overdue ? "var(--urgent)" : "var(--foreground)",
                     opacity: due.overdue ? 0.75 : 0.4 }}
          >
            {due.label}
          </p>
        )}
      </div>

      {/* Urgency pill — only shown for urgent tasks */}
      {task.urgency === "urgent" && !task.completed && (
        <span
          className="flex-shrink-0 mt-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            color:           "var(--urgent)",
            backgroundColor: "color-mix(in srgb, var(--urgent) 12%, transparent)",
          }}
        >
          Urgent
        </span>
      )}
    </div>
  );
}
