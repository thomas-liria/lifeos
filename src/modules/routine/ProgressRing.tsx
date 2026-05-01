"use client";

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = 132;

interface Props {
  completed: number;
  total: number;
}

function statusLine(completed: number, total: number): string {
  if (total === 0 || completed === 0) return "Let's start — one thing at a time";
  if (completed === total) return "Morning locked in. Good work.";
  if (completed >= Math.ceil(total / 2)) return "More than halfway there";
  return "Good start, keep going";
}

export default function ProgressRing({ completed, total }: Props) {
  const progress = total === 0 ? 0 : Math.min(completed / total, 1);
  const offset = CIRCUMFERENCE * (1 - progress);
  const allDone = total > 0 && completed === total;
  const message = statusLine(completed, total);

  return (
    <div className="flex flex-col items-center gap-3 pt-5 pb-2">

      {/* Ring + centred label */}
      <div
        className={`relative ${allDone ? "ring-done-pulse" : ""}`}
        style={{ width: SIZE, height: SIZE }}
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox="0 0 100 100"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth="5.5"
          />
          {/* Progress arc */}
          <circle
            cx="50" cy="50" r={RADIUS}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 350ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>

        {/* Centre text overlay — sits on top, unrotated */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[1.7rem] font-medium text-foreground leading-none">
            {completed}
          </span>
          <span className="text-xs text-foreground/40 mt-1 leading-none">
            of {total}
          </span>
        </div>
      </div>

      <p className="text-sm text-foreground/55 text-center px-8 leading-snug">
        {message}
      </p>
    </div>
  );
}
