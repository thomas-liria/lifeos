"use client";

import type { HabitItem } from "./useHomeData";

const Checkmark = () => (
  <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden>
    <path
      d="M1 3.5L3.2 5.5L8 1"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface Props {
  habits:   HabitItem[];
  onToggle: (id: string) => void;
  mounted:  boolean;
}

export default function HabitsStrip({ habits, onToggle, mounted }: Props) {
  return (
    <div className="px-4 pb-1">
      <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.08em] mb-3">
        Habits today
      </p>

      {!mounted ? (
        <div className="flex gap-2.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-11 w-32 rounded-xl bg-surface border border-[0.5px]
                border-border/60"
            />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <p className="text-sm text-foreground/35 py-1">
          All habits done for today 🌿
        </p>
      ) : (
        <div className="overflow-x-auto scroll-touch">
          <div className="flex gap-2.5 pb-1" style={{ width: "max-content" }}>
            {habits.map((habit) => (
              <button
                key={habit.id}
                onClick={() => onToggle(habit.id)}
                className={`
                  flex items-center gap-2 px-3.5 min-h-[44px]
                  rounded-xl border border-[0.5px]
                  transition-all duration-200 active:scale-[0.97]
                  ${habit.done
                    ? "border-primary/30 bg-primary/8 text-foreground/40"
                    : "border-border bg-surface text-foreground"
                  }
                `}
              >
                <span
                  className={`
                    w-[18px] h-[18px] rounded-[5px] border border-[0.5px]
                    flex items-center justify-center flex-shrink-0
                    transition-all duration-200
                    ${habit.done
                      ? "border-primary bg-primary"
                      : "border-border bg-background"
                    }
                  `}
                >
                  {habit.done && <Checkmark />}
                </span>
                <span
                  className={`text-sm whitespace-nowrap transition-all duration-200 ${
                    habit.done ? "line-through" : ""
                  }`}
                >
                  {habit.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
