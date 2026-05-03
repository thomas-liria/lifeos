"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
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
    { id: "p1", text: "Book dentist appointment",     workspace: "personal",   urgency: "normal",  dueDate: thisWeek, completed: false, createdAt: now },
    { id: "p2", text: "Research BBA textbooks",       workspace: "personal",   urgency: "normal",  dueDate: "someday",completed: false, createdAt: now },
    { id: "w1", text: "Call supplier re: invoice",    workspace: "weedguys",   urgency: "urgent",  dueDate: today,    completed: false, createdAt: now },
    { id: "w2", text: "Review lease renewal",         workspace: "weedguys",   urgency: "urgent",  dueDate: overdue,  completed: false, createdAt: now },
    { id: "w3", text: "Update client route schedule", workspace: "weedguys",   urgency: "normal",  dueDate: thisWeek, completed: false, createdAt: now },
    { id: "s1", text: "Update pricing page on website",   workspace: "snapshotto", urgency: "normal", dueDate: thisWeek, completed: false, createdAt: now },
    { id: "s2", text: "Follow up with last event client", workspace: "snapshotto", urgency: "urgent", dueDate: today,    completed: false, createdAt: now },
  ];
}

// ── localStorage helpers (cache / offline fallback) ───────────────────────────
function lsLoad(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeed();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as Task[]) : buildSeed();
  } catch { return buildSeed(); }
}

function lsPersist(tasks: Task[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
}

// ── Supabase row → Task ───────────────────────────────────────────────────────
interface DbTask {
  id: string; text: string; workspace: string; urgency: string;
  due_date: string | null; completed: boolean; completed_at: string | null; created_at: string;
}

function dbToTask(r: DbTask): Task {
  return {
    id:            r.id,
    text:          r.text,
    workspace:     r.workspace as Workspace,
    urgency:       r.urgency   as Urgency,
    dueDate:       r.due_date  ?? undefined,
    completed:     r.completed,
    completedDate: r.completed_at ? r.completed_at.slice(0, 10) : undefined,
    createdAt:     r.created_at,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTasks() {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [mounted, setMounted] = useState(false);
  const useDbRef = useRef(false); // true once Supabase confirmed working

  useEffect(() => {
    async function init() {
      // Show localStorage immediately (instant UI)
      const local = lsLoad();
      setTasks(local);
      setMounted(true);

      // Try Supabase in background
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) throw error;

        const dbTasks = (data as DbTask[]).map(dbToTask);

        if (dbTasks.length === 0 && local.length > 0) {
          // First run: migrate localStorage → Supabase
          await migrateToSupabase(local);
          setTasks(local);
        } else {
          setTasks(dbTasks);
          lsPersist(dbTasks);
        }
        useDbRef.current = true;
      } catch {
        console.warn("[useTasks] Supabase unavailable, using localStorage");
      }
    }
    init();
  }, []);

  const toggle = useCallback(async (id: string) => {
    const today = todayISO();
    let nowCompleted = false;

    setTasks((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t;
        nowCompleted = !t.completed;
        return { ...t, completed: nowCompleted, completedDate: nowCompleted ? today : undefined };
      });
      lsPersist(next);
      return next;
    });

    if (useDbRef.current) {
      supabase
        .from("tasks")
        .update({ completed: nowCompleted, completed_at: nowCompleted ? new Date().toISOString() : null })
        .eq("id", id)
        .then(({ error }) => { if (error) console.error(error); });
    }
  }, []);

  const addTask = useCallback(async (
    text: string, workspace: Workspace, urgency: Urgency, dueDate?: string
  ) => {
    if (useDbRef.current) {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          text,
          workspace,
          urgency,
          due_date: dueDate && dueDate !== "someday" ? dueDate : null,
          completed: false,
        })
        .select()
        .single<DbTask>();

      if (!error && data) {
        const task = dbToTask(data);
        setTasks((prev) => { const next = [...prev, task]; lsPersist(next); return next; });
        return;
      }
    }

    // Fallback
    const task: Task = {
      id: `task-${Date.now()}`, text: text.trim(), workspace, urgency, dueDate,
      completed: false, createdAt: new Date().toISOString(),
    };
    setTasks((prev) => { const next = [...prev, task]; lsPersist(next); return next; });
  }, []);

  return { tasks, mounted, toggle, addTask };
}

async function migrateToSupabase(tasks: Task[]) {
  if (!tasks.length) return;
  const rows = tasks.map((t) => ({
    id:          t.id,
    text:        t.text,
    workspace:   t.workspace,
    urgency:     t.urgency,
    due_date:    t.dueDate && t.dueDate !== "someday" ? t.dueDate : null,
    completed:   t.completed,
    completed_at: t.completedDate ? `${t.completedDate}T00:00:00Z` : null,
    created_at:  t.createdAt,
  }));
  await supabase.from("tasks").upsert(rows, { onConflict: "id" }).then(({ error }) => { if (error) console.error(error); });
}

/* ── Due date display helper ─────────────────────────────────────────────── */
export function formatDue(dueDate: string | undefined): { label: string; overdue: boolean } | null {
  if (!dueDate) return null;
  if (dueDate === "someday") return { label: "Someday", overdue: false };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dueDate + "T00:00:00");
  const diff  = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0)   return { label: "Overdue",  overdue: true  };
  if (diff === 0)  return { label: "Today",    overdue: false };
  if (diff === 1)  return { label: "Tomorrow", overdue: false };
  return { label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), overdue: false };
}
