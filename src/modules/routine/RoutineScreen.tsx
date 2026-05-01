"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ListChecks, Plus } from "lucide-react";
import { useRef, useState } from "react";
import ProgressRing from "./ProgressRing";
import RoutineItem from "./RoutineItem";
import { useRoutine } from "./useRoutine";

export default function RoutineScreen() {
  const { items, completedCount, toggle, addItem, deleteItem, reorder, mounted } =
    useRoutine();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel]       = useState("");
  const [newTime, setNewTime]         = useState("");
  const labelRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to   = items.findIndex((i) => i.id === over.id);
    reorder(from, to);
  }

  function submitAdd() {
    const label = newLabel.trim();
    if (!label) return;
    addItem(label, newTime.trim() || undefined);
    setNewLabel("");
    setNewTime("");
    setShowAddForm(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  submitAdd();
    if (e.key === "Escape") cancelAdd();
  }

  function cancelAdd() {
    setShowAddForm(false);
    setNewLabel("");
    setNewTime("");
  }

  /* Server / pre-hydration placeholder */
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <ListChecks size={32} className="text-foreground/15" />
        <p className="text-sm text-foreground/30">Loading routine…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-6">

      {/* 1 ── Progress ring */}
      <ProgressRing completed={completedCount} total={items.length} />

      {/* Divider */}
      <div className="mx-4 border-t border-[0.5px] border-border mb-1" />

      {/* 2 ── Checklist */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col">
            {items.map((item) => (
              <RoutineItem
                key={item.id}
                item={item}
                onToggle={toggle}
                onDelete={deleteItem}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 3 ── Add step */}
      <div className="mx-4 mt-5">
        {showAddForm ? (
          <div className="flex flex-col gap-2">
            <input
              ref={labelRef}
              autoFocus
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Step name…"
              className="
                w-full rounded-xl bg-surface border border-[0.5px] border-border
                px-3.5 py-2.5 text-sm text-foreground
                placeholder:text-foreground/30
                focus:outline-none focus:border-primary transition-colors
              "
            />
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Time estimate (optional)"
                className="
                  flex-1 rounded-xl bg-surface border border-[0.5px] border-border
                  px-3.5 py-2 text-sm text-foreground
                  placeholder:text-foreground/30
                  focus:outline-none focus:border-primary transition-colors
                "
              />
              <button
                onClick={submitAdd}
                className="px-4 py-2 rounded-xl bg-primary/15 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex-shrink-0"
              >
                Add
              </button>
              <button
                onClick={cancelAdd}
                className="px-2 py-2 text-sm text-foreground/35 hover:text-foreground/60 transition-colors flex-shrink-0"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-sm text-foreground/40 hover:text-primary transition-colors py-1"
          >
            <Plus size={15} />
            Add step
          </button>
        )}
      </div>

      {/* 4 ── Footer */}
      <p className="text-center text-[11px] text-foreground/22 mt-8 mb-1 tracking-wide">
        Resets at midnight
      </p>
    </div>
  );
}
