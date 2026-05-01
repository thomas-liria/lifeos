"use client";

import { Dumbbell } from "lucide-react";
import type { SessionType } from "./types";

interface Props {
  nextType: SessionType;
  onStart:  () => void;
}

export default function SessionHeaderCard({ nextType, onStart }: Props) {
  return (
    <div className="mx-4 mt-4 bg-surface border border-[0.5px] border-border rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
        >
          <Dumbbell size={18} style={{ color: "var(--primary)" }} />
        </div>
        <div className="flex-1">
          <p className="text-[11px] text-foreground/40 uppercase tracking-wider mb-0.5">
            Next up
          </p>
          <p className="text-lg font-medium text-foreground leading-tight">{nextType}</p>
          <p className="text-xs text-foreground/40 mt-0.5">Last trained 2 days ago</p>
        </div>
      </div>
      <button
        onClick={onStart}
        className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium
          transition-opacity hover:opacity-90 active:opacity-80"
        style={{ backgroundColor: "var(--primary)", color: "white" }}
      >
        Start Session
      </button>
    </div>
  );
}
