"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { useRef, useState } from "react";
import type { RoutineItemData } from "./types";
import { todayKey } from "./useRoutine";

interface Props {
  item: RoutineItemData;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const Checkmark = () => (
  <svg width="11" height="8" viewBox="0 0 11 8" fill="none" aria-hidden>
    <path
      d="M1 4L4 7L10 1"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function RoutineItem({ item, onToggle, onDelete }: Props) {
  const isCompleted = item.completedDate === todayKey();
  const [showDelete, setShowDelete] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  /* ── Long-press handlers (reveal delete) ── */
  const startPress = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setShowDelete(true);
    }, 620);
  };

  const cancelPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      className="flex items-center gap-3 px-4 py-3.5 border-b border-[0.5px] border-border/50 last:border-b-0"
    >
      {/* ── Circular checkbox ── */}
      <button
        aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
        onClick={(e) => {
          e.stopPropagation();
          if (!didLongPress.current) {
            setShowDelete(false);
            onToggle(item.id);
          }
        }}
        className={`
          w-6 h-6 rounded-full border border-[0.5px] flex-shrink-0
          flex items-center justify-center
          transition-all duration-200
          ${isCompleted
            ? "border-primary bg-primary"
            : "border-border bg-background hover:border-primary/50"
          }
        `}
      >
        {isCompleted && <Checkmark />}
      </button>

      {/* ── Label + optional time estimate ── */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm transition-all duration-200 ${
            isCompleted
              ? "line-through text-foreground/35"
              : "text-foreground"
          }`}
        >
          {item.label}
        </span>
        {item.timeEstimate && (
          <span className="ml-2 text-xs text-foreground/35">
            {item.timeEstimate}
          </span>
        )}
      </div>

      {/* ── Right side: delete reveal or drag handle ── */}
      {showDelete ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
            setShowDelete(false);
          }}
          className="text-xs text-urgent px-2 py-1 rounded-lg hover:bg-urgent/10 transition-colors flex-shrink-0"
        >
          Delete
        </button>
      ) : (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
          className="touch-none cursor-grab active:cursor-grabbing flex-shrink-0 p-1 -mr-1"
        >
          <GripVertical size={16} className="text-foreground/20" />
        </button>
      )}
    </div>
  );
}
