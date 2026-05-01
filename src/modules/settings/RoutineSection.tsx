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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { RoutineItemData } from "@/modules/routine/types";
import { useRoutine } from "@/modules/routine/useRoutine";
import SettingsSection, { ToggleSwitch } from "./SettingsSection";
import type { SettingsData } from "./useSettings";

/* ── Single sortable row ──────────────────────────────────────── */
function SortableRow({
  item,
  showTimeEstimates,
  onDelete,
  onUpdate,
}: {
  item: RoutineItemData;
  showTimeEstimates: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, label: string, timeEstimate?: string) => void;
}) {
  const [editing, setEditing]   = useState(false);
  const [editLabel, setEditLabel] = useState(item.label);
  const [editTime,  setEditTime]  = useState(item.timeEstimate ?? "");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  function save() {
    const label = editLabel.trim();
    if (label) onUpdate(item.id, label, editTime.trim() || undefined);
    setEditing(false);
  }

  function cancel() {
    setEditLabel(item.label);
    setEditTime(item.timeEstimate ?? "");
    setEditing(false);
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2.5 px-4 py-3">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        tabIndex={-1}
        aria-label="Drag to reorder"
        className="mt-0.5 text-foreground/20 hover:text-foreground/50 touch-none flex-shrink-0"
      >
        <GripVertical size={16} />
      </button>

      {editing ? (
        <div className="flex-1 flex flex-col gap-2">
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")  save();
              if (e.key === "Escape") cancel();
            }}
            className="w-full bg-background border border-[0.5px] border-primary/40 rounded-lg
              px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <input
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  save();
                if (e.key === "Escape") cancel();
              }}
              placeholder="Time estimate (optional)"
              className="flex-1 bg-background border border-[0.5px] border-border rounded-lg
                px-2.5 py-1.5 text-sm text-foreground placeholder:text-foreground/30
                focus:outline-none focus:border-primary"
            />
            <button
              onClick={save}
              className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
            >
              <Check size={15} />
            </button>
            <button
              onClick={cancel}
              className="p-1.5 rounded-lg text-foreground/40 hover:bg-border/30 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0 py-0.5">
            <p className="text-sm text-foreground leading-snug">{item.label}</p>
            {showTimeEstimates && item.timeEstimate && (
              <p className="text-xs text-foreground/40 mt-0.5">{item.timeEstimate}</p>
            )}
          </div>
          <button
            onClick={() => {
              setEditLabel(item.label);
              setEditTime(item.timeEstimate ?? "");
              setEditing(true);
            }}
            aria-label="Edit"
            className="mt-0.5 p-1.5 rounded-lg text-foreground/30 hover:text-foreground/60
              hover:bg-border/20 transition-colors flex-shrink-0"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            aria-label="Delete"
            className="mt-0.5 p-1.5 rounded-lg text-urgent/35 hover:text-urgent
              hover:bg-urgent/8 transition-colors flex-shrink-0"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
}

/* ── Section ──────────────────────────────────────────────────── */
interface Props {
  settings: SettingsData;
  onUpdate: (patch: Partial<SettingsData>) => void;
  onSaved:  () => void;
}

export default function RoutineSection({ settings, onUpdate, onSaved }: Props) {
  const { items, addItem, deleteItem, updateItem, reorder } = useRoutine();

  const [showAdd,   setShowAdd]   = useState(false);
  const [newLabel,  setNewLabel]  = useState("");
  const [newTime,   setNewTime]   = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to   = items.findIndex((i) => i.id === over.id);
    reorder(from, to);
    onSaved();
  }

  function handleDelete(id: string) {
    deleteItem(id);
    onSaved();
  }

  function handleUpdate(id: string, label: string, timeEstimate?: string) {
    updateItem(id, label, timeEstimate);
    onSaved();
  }

  function submitAdd() {
    const label = newLabel.trim();
    if (!label) return;
    addItem(label, newTime.trim() || undefined);
    setNewLabel("");
    setNewTime("");
    setShowAdd(false);
    onSaved();
  }

  return (
    <SettingsSection title="Routine">
      {/* Show time estimates toggle */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <span className="text-sm text-foreground">Show time estimates</span>
        <ToggleSwitch
          value={settings.showTimeEstimates}
          onChange={(v) => { onUpdate({ showTimeEstimates: v }); onSaved(); }}
        />
      </div>

      {/* Sortable list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              showTimeEstimates={settings.showTimeEstimates}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add item */}
      <div className="px-4 py-3.5">
        {showAdd ? (
          <div className="flex flex-col gap-2">
            <input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  submitAdd();
                if (e.key === "Escape") setShowAdd(false);
              }}
              placeholder="Item name…"
              className="w-full bg-background border border-[0.5px] border-border rounded-xl
                px-3 py-2 text-sm text-foreground placeholder:text-foreground/30
                focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <input
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")  submitAdd();
                  if (e.key === "Escape") setShowAdd(false);
                }}
                placeholder="Time estimate (optional)"
                className="flex-1 bg-background border border-[0.5px] border-border rounded-xl
                  px-3 py-2 text-sm text-foreground placeholder:text-foreground/30
                  focus:outline-none focus:border-primary"
              />
              <button
                onClick={submitAdd}
                className="px-4 py-2 bg-primary/15 text-primary text-sm font-medium
                  rounded-xl hover:bg-primary/20 transition-colors flex-shrink-0"
              >
                Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-2 text-sm text-foreground/35 hover:text-foreground/60
                  transition-colors flex-shrink-0"
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
            Add routine item
          </button>
        )}
      </div>
    </SettingsSection>
  );
}
