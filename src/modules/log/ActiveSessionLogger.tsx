"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { Exercise, SessionType } from "./types";

/* ── Preset exercise list ─────────────────────────────────────── */
const PRESETS = [
  // Upper A
  "Bench Press", "Incline DB Press", "Cable Fly", "Overhead Press",
  "Lateral Raise", "Tricep Pushdown", "Skull Crushers",
  // Upper B
  "Pull Up", "Barbell Row", "Seated Cable Row", "Face Pull",
  "Bicep Curl", "Hammer Curl",
  // Lower A
  "Squat", "Leg Press", "Bulgarian Split Squat", "Leg Extension", "Calf Raise",
  // Lower B
  "Romanian Deadlift", "Leg Curl", "Hip Thrust", "Walking Lunge",
];

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── Sub-components ───────────────────────────────────────────── */

interface ExerciseCardProps {
  ex:       Exercise;
  onRemove: () => void;
  onUpdateSet: (idx: number, field: "weight" | "reps", val: number) => void;
  onToggleDone: (idx: number) => void;
  onAddSet: () => void;
}

function ExerciseCard({ ex, onRemove, onUpdateSet, onToggleDone, onAddSet }: ExerciseCardProps) {
  return (
    <div className="bg-surface border border-[0.5px] border-border rounded-2xl p-4">
      {/* Exercise name + remove */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-foreground">{ex.name}</p>
        <button
          onClick={onRemove}
          className="text-foreground/25 hover:text-foreground/50 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Column headers */}
      <div className="flex gap-2 mb-1.5 px-0.5">
        <span className="w-6 text-[10px] text-foreground/35 text-center">#</span>
        <span className="flex-1 text-[10px] text-foreground/35 text-center">LBS</span>
        <span className="flex-1 text-[10px] text-foreground/35 text-center">REPS</span>
        <span className="w-7" />
      </div>

      {/* Sets */}
      {ex.sets.map((set, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-1.5">
          <span className="w-6 text-xs text-foreground/35 text-center tabular-nums">
            {idx + 1}
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={set.weight || ""}
            onChange={(e) => onUpdateSet(idx, "weight", parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="flex-1 rounded-lg bg-background border border-[0.5px] border-border
              px-2 py-1.5 text-sm text-center text-foreground
              focus:outline-none focus:border-primary transition-colors"
          />
          <input
            type="number"
            inputMode="numeric"
            value={set.reps || ""}
            onChange={(e) => onUpdateSet(idx, "reps", parseInt(e.target.value) || 0)}
            placeholder="0"
            className="flex-1 rounded-lg bg-background border border-[0.5px] border-border
              px-2 py-1.5 text-sm text-center text-foreground
              focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={() => onToggleDone(idx)}
            className="w-7 h-7 rounded-full border border-[0.5px] flex items-center
              justify-center transition-all flex-shrink-0"
            style={
              set.done
                ? { backgroundColor: "var(--primary)", borderColor: "var(--primary)" }
                : { borderColor: "var(--border)" }
            }
          >
            {set.done && <Check size={12} color="white" strokeWidth={3} />}
          </button>
        </div>
      ))}

      {/* Add set */}
      <button
        onClick={onAddSet}
        className="mt-2 flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: "var(--primary)" }}
      >
        <Plus size={12} />
        Add set
      </button>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */

interface Props {
  sessionType: SessionType;
  onFinish:    (exercises: Exercise[], durationSeconds: number) => void;
  onCancel:    () => void;
}

export default function ActiveSessionLogger({ sessionType, onFinish, onCancel }: Props) {
  const [elapsed,         setElapsed]         = useState(0);
  const [exercises,       setExercises]       = useState<Exercise[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exName,          setExName]          = useState("");
  const [suggestions,     setSuggestions]     = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Elapsed timer */
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* Autocomplete */
  useEffect(() => {
    const q = exName.trim().toLowerCase();
    setSuggestions(
      q.length === 0 ? [] : PRESETS.filter((p) => p.toLowerCase().includes(q)).slice(0, 6)
    );
  }, [exName]);

  /* Exercise CRUD */
  function addExercise(name: string) {
    setExercises((prev) => [
      ...prev,
      { id: `ex-${Date.now()}`, name, sets: [{ weight: 0, reps: 0, done: false }] },
    ]);
    setExName("");
    setSuggestions([]);
    setShowAddExercise(false);
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  }

  function updateSet(exId: string, idx: number, field: "weight" | "reps", val: number) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exId
          ? ex
          : { ...ex, sets: ex.sets.map((s, i) => (i !== idx ? s : { ...s, [field]: val })) }
      )
    );
  }

  function toggleDone(exId: string, idx: number) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exId
          ? ex
          : { ...ex, sets: ex.sets.map((s, i) => (i !== idx ? s : { ...s, done: !s.done })) }
      )
    );
  }

  function addSet(exId: string) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id !== exId
          ? ex
          : { ...ex, sets: [...ex.sets, { weight: 0, reps: 0, done: false }] }
      )
    );
  }

  return (
    <div className="flex flex-col pb-4">

      {/* ── Sticky session header ── */}
      <div
        className="sticky z-20 flex items-center justify-between px-4 py-3
          bg-surface border-b border-[0.5px] border-border/60"
        style={{ top: "calc(3.5rem + 44px)" }}
      >
        <div>
          <p className="text-[11px] text-foreground/40 uppercase tracking-wider">
            Session in progress
          </p>
          <p className="text-sm font-medium text-foreground">{sessionType}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-mono tabular-nums"
            style={{ color: "var(--primary)" }}
          >
            {formatTime(elapsed)}
          </span>
          <button
            onClick={onCancel}
            className="text-foreground/30 hover:text-foreground/60 transition-colors"
            aria-label="Cancel session"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Exercise cards ── */}
      <div className="flex flex-col gap-3 px-4 pt-3">
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            onRemove={() => removeExercise(ex.id)}
            onUpdateSet={(idx, field, val) => updateSet(ex.id, idx, field, val)}
            onToggleDone={(idx) => toggleDone(ex.id, idx)}
            onAddSet={() => addSet(ex.id)}
          />
        ))}

        {/* ── Add Exercise input ── */}
        {showAddExercise ? (
          <div className="bg-surface border border-[0.5px] border-primary/30 rounded-2xl p-4">
            <div className="relative">
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={exName}
                onChange={(e) => setExName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && exName.trim()) addExercise(exName.trim());
                  if (e.key === "Escape") { setShowAddExercise(false); setExName(""); }
                }}
                placeholder="Exercise name…"
                className="w-full rounded-xl bg-background border border-[0.5px] border-border
                  px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground/30
                  focus:outline-none focus:border-primary transition-colors"
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-10
                  bg-surface border border-[0.5px] border-border rounded-xl overflow-hidden">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onMouseDown={(e) => { e.preventDefault(); addExercise(s); }}
                      className="w-full text-left px-3.5 py-2.5 text-sm text-foreground/80
                        hover:bg-primary/5 transition-colors
                        border-b border-[0.5px] border-border/40 last:border-0"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => { if (exName.trim()) addExercise(exName.trim()); }}
                disabled={!exName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium
                  transition-opacity disabled:opacity-30 hover:opacity-90 active:opacity-80"
                style={{ backgroundColor: "var(--primary)", color: "white" }}
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddExercise(false); setExName(""); }}
                className="px-4 py-2.5 rounded-xl text-sm text-foreground/45
                  hover:text-foreground/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddExercise(true)}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl
              border border-dashed border-[0.5px] border-border/60
              text-sm text-foreground/40 hover:text-foreground/60 hover:border-border
              transition-colors"
          >
            <Plus size={14} />
            Add Exercise
          </button>
        )}

        {/* ── Finish button (only once at least one exercise exists) ── */}
        {exercises.length > 0 && !showAddExercise && (
          <button
            onClick={() => onFinish(exercises, elapsed)}
            className="w-full py-3 rounded-2xl text-sm font-medium
              transition-opacity hover:opacity-90 active:opacity-80 mt-1"
            style={{ backgroundColor: "var(--primary)", color: "white" }}
          >
            Finish Session
          </button>
        )}
      </div>
    </div>
  );
}
