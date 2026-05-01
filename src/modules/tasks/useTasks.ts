"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task, Workspace, Urgency } from "./types";

export const STORAGE_KEY = "lifeos_tasks";

/** Local-timezone ISO date: "YYYY-MM-DD" */
export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

function isoFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

function buildSeed(): Task[] {
  const now      = new Date().toISOString();
  const today    = todayISO();
  const overdue  = isoFromNow(-3);
  const thisWeek = isoFromNow(4);

  return [
    // ── Personal ──────────────────────────────────────────────
    { id: "p1", text: "Book dentist appointment",    workspace: "personal",   urgency: "normal",  dueDate: thisWeek, completed: false, createdAt: now },
    { id: "p2", text: "Research BBA textbooks",      workspace: "personal",   urgency: "normal",  dueDate: "someday",completed: false, createdAt: now },
    // ── WeedGuys ──────────────────────────────────────────────
    { id: "w1", text: "Call supplier re: invoice",   workspace: "weedguys",   urgency: "urgent",  dueDate: today,    completed: false, createdAt: now },
    { id: "w2", text: "Review lease renewal",        workspace: "weedguys",   urgency: "urgent",  dueDate: overdue,  completed: false, createdAt: now },
    { id: "w3", text: "Update client route schedule",workspace: "weedguys",   urgency: "normal",  dueDate: thisWeek, completed: false, createdAt: now },
    // ── SnapshotTO ────────────────────────────────────────────
    { id: "s1", text: "Update pricing page on website",      workspace: "snapshotto", urgency: "normal", dueDate: thisWeek, completed: false, createdAt: now },
    { id: "s2", text: "Follow up with last event client",    workspace: "snapshotto", urgency: "urgent", dueDate: today,    completed: false, createdAt: now },
  ];
}

function load(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeed();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as Task[])
      : buildSeed();
  } catch {
    return buildSeed();
  }
}

function persist(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function useTasks() {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTasks(load());
    setMounted(true);
  }, []);

  const toggle = useCallback((id: string) => {
    const today = todayISO();
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed,
               completedDate: !t.completed ? today : undefined }
          : t
      );
      persist(next);
      return next;
    });
  }, []);

  const addTask = useCallback(
    (text: string, workspace: Workspace, urgency: Urgency, dueDate?: string) => {
      const task: Task = {
        id:        `task-${Date.now()}`,
        text:      text.trim(),
        workspace,
        urgency,
        dueDate,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => {
        const next = [...prev, task];
        persist(next);
        return next;
      });
    },
    []
  );

  return { tasks, mounted, toggle, addTask };
}

/* ── Due date display helper ──────────────────────────────────── */
export function formatDue(
  dueDate: string | undefined
): { label: string; overdue: boolean } | null {
  if (!dueDate) return null;
  if (dueDate === "someday") return { label: "Someday", overdue: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Parse as local midnight to avoid UTC-offset issues
  const due   = new Date(dueDate + "T00:00:00");
  const diff  = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diff < 0)  return { label: "Overdue",   overdue: true  };
  if (diff === 0) return { label: "Today",     overdue: false };
  if (diff === 1) return { label: "Tomorrow",  overdue: false };
  return {
    label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
  };
}
