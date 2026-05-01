"use client";

import { useCallback, useEffect, useState } from "react";
import type { RoutineItemData } from "./types";

const STORAGE_KEY = "lifeos_routine_items";

/** Returns today's date as "YYYY-MM-DD" in local timezone (resets at midnight). */
export function todayKey(): string {
  return new Date().toLocaleDateString("en-CA");
}

const DEFAULT_ITEMS: RoutineItemData[] = [
  { id: "med",       label: "Morning medication"   },
  { id: "water",     label: "Glass of water",        timeEstimate: "1 min" },
  { id: "omega3",    label: "Omega-3 (2 capsules)"  },
  { id: "multi",     label: "Multivitamin (1 tablet)" },
  { id: "breakfast", label: "Breakfast"              },
  { id: "gym",       label: "Gym — Upper A",          timeEstimate: "(today's session)" },
  { id: "redlight",  label: "Red light therapy",     timeEstimate: "15 min" },
  { id: "review",    label: "Review today's plan",   timeEstimate: "5 min" },
];

function load(): RoutineItemData[] {
  if (typeof window === "undefined") return DEFAULT_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ITEMS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ITEMS;
  } catch {
    return DEFAULT_ITEMS;
  }
}

function persist(items: RoutineItemData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useRoutine() {
  const [items, setItems] = useState<RoutineItemData[]>(DEFAULT_ITEMS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(load());
    setMounted(true);
  }, []);

  const toggle = useCallback((id: string) => {
    const today = todayKey();
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === id
          ? { ...item, completedDate: item.completedDate === today ? undefined : today }
          : item
      );
      persist(next);
      return next;
    });
  }, []);

  const addItem = useCallback((label: string, timeEstimate?: string) => {
    const newItem: RoutineItemData = {
      id: `custom-${Date.now()}`,
      label: label.trim(),
      timeEstimate: timeEstimate?.trim() || undefined,
    };
    setItems((prev) => {
      const next = [...prev, newItem];
      persist(next);
      return next;
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const updateItem = useCallback((id: string, label: string, timeEstimate?: string) => {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id !== id
          ? item
          : { ...item, label: label.trim(), timeEstimate: timeEstimate?.trim() || undefined }
      );
      persist(next);
      return next;
    });
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      persist(next);
      return next;
    });
  }, []);

  const today = todayKey();
  const completedCount = items.filter((i) => i.completedDate === today).length;

  return { items, completedCount, toggle, addItem, updateItem, deleteItem, reorder, mounted };
}
