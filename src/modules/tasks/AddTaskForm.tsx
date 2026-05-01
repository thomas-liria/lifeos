"use client";

import { useState } from "react";
import type { Urgency } from "./types";

function isoFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

interface Props {
  onSave:   (text: string, urgency: Urgency, dueDate?: string) => void;
  onCancel: () => void;
}

const DUE_OPTIONS = [
  { label: "Today",     value: "today"     },
  { label: "Tomorrow",  value: "tomorrow"  },
  { label: "This week", value: "this-week" },
  { label: "Someday",   value: "someday"   },
  { label: "Pick date", value: "pick"      },
] as const;

type DueOption = (typeof DUE_OPTIONS)[number]["value"];

function resolveDue(option: DueOption, customDate: string): string | undefined {
  if (option === "today")     return new Date().toLocaleDateString("en-CA");
  if (option === "tomorrow")  return isoFromNow(1);
  if (option === "this-week") return isoFromNow(5);
  if (option === "someday")   return "someday";
  if (option === "pick")      return customDate || undefined;
  return undefined;
}

export default function AddTaskForm({ onSave, onCancel }: Props) {
  const [text,       setText]       = useState("");
  const [urgency,    setUrgency]    = useState<Urgency>("normal");
  const [dueOption,  setDueOption]  = useState<DueOption>("today");
  const [customDate, setCustomDate] = useState("");

  function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed, urgency, resolveDue(dueOption, customDate));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter"  && !e.shiftKey) { e.preventDefault(); handleSave(); }
    if (e.key === "Escape")                  onCancel();
  }

  return (
    <div className="mx-4 my-3 flex flex-col gap-3
      bg-surface border border-[0.5px] border-border rounded-2xl p-4">

      {/* Task name */}
      <input
        autoFocus
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task name…"
        className="w-full rounded-xl bg-background border border-[0.5px] border-border
          px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30
          focus:outline-none focus:border-primary transition-colors"
      />

      {/* Urgency toggle */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-foreground/40 whitespace-nowrap w-12">Priority</p>
        {(["normal", "urgent"] as Urgency[]).map((u) => (
          <button
            key={u}
            onClick={() => setUrgency(u)}
            className={`px-3 py-1.5 rounded-lg text-xs border border-[0.5px] transition-all ${
              urgency === u
                ? u === "urgent"
                  ? "border-urgent/50 bg-urgent/12 text-urgent font-medium"
                  : "border-primary/50 bg-primary/10 text-primary font-medium"
                : "border-border bg-background text-foreground/50"
            }`}
          >
            {u === "normal" ? "Normal" : "Urgent"}
          </button>
        ))}
      </div>

      {/* Due date chips */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-foreground/40">Due date</p>
        <div className="flex flex-wrap gap-2">
          {DUE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDueOption(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs border border-[0.5px] transition-all ${
                dueOption === opt.value
                  ? "border-primary/50 bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-foreground/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Native date input when "Pick date" selected */}
      {dueOption === "pick" && (
        <input
          type="date"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          min={new Date().toLocaleDateString("en-CA")}
          className="w-full rounded-xl bg-background border border-[0.5px] border-border
            px-3.5 py-2 text-sm text-foreground
            focus:outline-none focus:border-primary transition-colors"
        />
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium
            hover:opacity-90 active:opacity-80 transition-opacity"
          style={{ color: "white" }}
        >
          Save task
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-sm text-foreground/45
            hover:text-foreground/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
