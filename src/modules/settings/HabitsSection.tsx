"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import SettingsSection, { Stepper, ToggleSwitch } from "./SettingsSection";
import type { CustomHabit, SettingsData } from "./useSettings";

/* ── Sortable rotation row ───────────────────────────────────── */
function RotationRow({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
      className="flex items-center gap-2.5 px-4 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        tabIndex={-1}
        aria-label="Drag to reorder"
        className="text-foreground/20 hover:text-foreground/50 touch-none flex-shrink-0"
      >
        <GripVertical size={15} />
      </button>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}

/* ── Section ──────────────────────────────────────────────────── */
interface Props {
  settings:     SettingsData;
  setGym:       (patch: Partial<SettingsData["gym"]>) => void;
  setRedLight:  (patch: Partial<SettingsData["redLight"]>) => void;
  update:       (patch: Partial<SettingsData>) => void;
  addHabit:     (habit: Omit<CustomHabit, "id">) => void;
  removeHabit:  (id: string) => void;
  onSaved:      () => void;
}

export default function HabitsSection({
  settings,
  setGym,
  setRedLight,
  update,
  addHabit,
  removeHabit,
  onSaved,
}: Props) {
  const [showAdd,       setShowAdd]       = useState(false);
  const [habitName,     setHabitName]     = useState("");
  const [habitDays,     setHabitDays]     = useState(3);
  const [habitDuration, setHabitDuration] = useState("");

  const rotationIds = settings.gym.rotation.map((_, i) => `rot-${i}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleRotationDrag(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = rotationIds.indexOf(active.id as string);
    const to   = rotationIds.indexOf(over.id as string);
    const next = [...settings.gym.rotation];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setGym({ rotation: next });
    onSaved();
  }

  function submitHabit() {
    const name = habitName.trim();
    if (!name) return;
    addHabit({ name, targetDays: habitDays, duration: habitDuration.trim() });
    setHabitName("");
    setHabitDays(3);
    setHabitDuration("");
    setShowAdd(false);
    onSaved();
  }

  return (
    <SettingsSection title="Habits">
      {/* ── Gym ── */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <p className="text-sm text-foreground">Gym — target days / week</p>
        <Stepper
          value={settings.gym.targetDays}
          min={1}
          max={7}
          onChange={(v) => { setGym({ targetDays: v }); onSaved(); }}
        />
      </div>

      <div className="py-1.5">
        <p className="text-xs text-foreground/40 px-4 mb-0.5">Session rotation order</p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleRotationDrag}
        >
          <SortableContext items={rotationIds} strategy={verticalListSortingStrategy}>
            {settings.gym.rotation.map((session, i) => (
              <RotationRow key={`rot-${i}`} id={`rot-${i}`} label={session} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* ── Red light ── */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <p className="text-sm text-foreground">Red light — target days / week</p>
        <Stepper
          value={settings.redLight.targetDays}
          min={1}
          max={7}
          onChange={(v) => { setRedLight({ targetDays: v }); onSaved(); }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-3.5">
        <p className="text-sm text-foreground">Red light — duration (min)</p>
        <Stepper
          value={settings.redLight.durationMinutes}
          min={5}
          max={60}
          onChange={(v) => { setRedLight({ durationMinutes: v }); onSaved(); }}
        />
      </div>

      {/* ── Supplements ── */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <p className="text-sm text-foreground">Supplements — daily reminder</p>
        <ToggleSwitch
          value={settings.supplements.reminder}
          onChange={(v) => { update({ supplements: { reminder: v } }); onSaved(); }}
        />
      </div>

      {/* ── Custom habits ── */}
      {settings.habits.map((habit) => (
        <div key={habit.id} className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-sm text-foreground">{habit.name}</p>
            <p className="text-xs text-foreground/40 mt-0.5">
              {habit.targetDays}× / week
              {habit.duration ? ` · ${habit.duration}` : ""}
            </p>
          </div>
          <button
            onClick={() => { removeHabit(habit.id); onSaved(); }}
            aria-label="Remove habit"
            className="p-1.5 rounded-lg text-urgent/35 hover:text-urgent hover:bg-urgent/8
              transition-colors flex-shrink-0"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {/* ── Add habit ── */}
      <div className="px-4 py-3.5">
        {showAdd ? (
          <div className="flex flex-col gap-2">
            <input
              autoFocus
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setShowAdd(false); }}
              placeholder="Habit name…"
              className="w-full bg-background border border-[0.5px] border-border rounded-xl
                px-3 py-2 text-sm text-foreground placeholder:text-foreground/30
                focus:outline-none focus:border-primary"
            />
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground/50 flex-shrink-0">Days / week</span>
              <Stepper value={habitDays} min={1} max={7} onChange={setHabitDays} />
            </div>
            <input
              value={habitDuration}
              onChange={(e) => setHabitDuration(e.target.value)}
              placeholder="Duration (optional — e.g. 15 min)"
              className="w-full bg-background border border-[0.5px] border-border rounded-xl
                px-3 py-2 text-sm text-foreground placeholder:text-foreground/30
                focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2 mt-1">
              <button
                onClick={submitHabit}
                className="px-4 py-2 bg-primary/15 text-primary text-sm font-medium
                  rounded-xl hover:bg-primary/20 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-2 text-sm text-foreground/35 hover:text-foreground/60
                  transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm text-foreground/40
              hover:text-primary transition-colors"
          >
            <Plus size={14} />
            Add habit
          </button>
        )}
      </div>
    </SettingsSection>
  );
}
