"use client";

import type { ReactNode } from "react";

/* ── Reusable section wrapper ─────────────────────────────────── */
interface SectionProps {
  title: string;
  children: ReactNode;
}

export default function SettingsSection({ title, children }: SectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-[11px] font-semibold tracking-widest text-foreground/40 uppercase px-4 mb-2.5">
        {title}
      </h2>
      <div className="bg-surface mx-4 rounded-2xl border border-[0.5px] border-border overflow-hidden divide-y divide-border/50">
        {children}
      </div>
    </section>
  );
}

/* ── Shared toggle switch ─────────────────────────────────────── */
interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}

export function ToggleSwitch({ value, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${
        value ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
        style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

/* ── Reusable stepper (±1 with min/max) ──────────────────────── */
interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

export function Stepper({ value, min, max, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-border/50
          text-foreground/60 hover:bg-border hover:text-foreground transition-colors
          disabled:opacity-30 disabled:pointer-events-none text-lg leading-none"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="text-sm font-medium text-foreground w-5 text-center tabular-nums">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-border/50
          text-foreground/60 hover:bg-border hover:text-foreground transition-colors
          disabled:opacity-30 disabled:pointer-events-none text-lg leading-none"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}
