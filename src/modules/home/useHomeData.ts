"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task, Workspace } from "@/modules/tasks/types";
import type { GymSession } from "@/modules/log/types";
import type { CalendarTokens, CalendarEvent } from "@/lib/integrations/google-calendar/types";
import type { JobberTokens, JobberInvoice } from "@/lib/integrations/jobber/types";

// ── Local-timezone date helpers ───────────────────────────────────────────────
function todayKey(): string {
  return new Date().toLocaleDateString("en-CA");
}
function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-CA");
}
function weekMondayKey(): string {
  const d   = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toLocaleDateString("en-CA");
}
function getGreeting(h: number) {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Default settings (mirror useSettings DEFAULTS) ────────────────────────────
const DEFAULT_GYM        = { targetDays: 4, rotation: ["Upper A", "Lower A", "Upper B", "Lower B"] };
const DEFAULT_REDLIGHT   = { targetDays: 4, durationMinutes: 15 };
const DEFAULT_SUPPLEMENTS = { reminder: true };

// ── Gym-hour detection ────────────────────────────────────────────────────────
// Returns true if an event occupies any part of the morning (6–9 am) or
// evening (5–8 pm) gym windows on today's date.
function isEventDuringGymHours(event: CalendarEvent): boolean {
  if (event.isAllDay) return false;

  const start = new Date(event.start).getTime();
  const end   = new Date(event.end).getTime();

  const todayDate = new Date();
  function windowMs(h: number, m = 0) {
    const d = new Date(todayDate);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }

  const morningStart = windowMs(6);
  const morningEnd   = windowMs(9);
  const eveningStart = windowMs(17);
  const eveningEnd   = windowMs(20);

  const overlapsMorning = start < morningEnd && end > morningStart;
  const overlapsEvening = start < eveningEnd && end > eveningStart;
  return overlapsMorning || overlapsEvening;
}

// Returns true if any event today falls in a gym time window
function gymBlockedByCalendar(events: CalendarEvent[]): boolean {
  const todayStr = new Date().toLocaleDateString("en-CA");
  return events.some((ev) => {
    // Only consider events starting today
    const evDate = new Date(ev.isAllDay ? ev.start + "T00:00:00" : ev.start)
      .toLocaleDateString("en-CA");
    return evDate === todayStr && isEventDuringGymHours(ev);
  });
}

// ── Calendar events fetch ─────────────────────────────────────────────────────
async function fetchCalendarEvents(tokens: CalendarTokens): Promise<{
  events:        CalendarEvent[];
  updatedTokens: { accessToken: string; expiresAt: number } | null;
}> {
  const res = await fetch("/api/integrations/google-calendar/events", {
    headers: {
      "Authorization":       `Bearer ${tokens.accessToken}`,
      "X-Refresh-Token":     tokens.refreshToken,
      "X-Token-Expires-At":  String(tokens.expiresAt),
    },
  });

  if (!res.ok) throw new Error(`Calendar events fetch failed: ${res.status}`);

  const data: {
    events:        CalendarEvent[];
    updatedTokens: { accessToken: string; expiresAt: number } | null;
  } = await res.json();

  return data;
}

// ── Exported types ────────────────────────────────────────────────────────────
export interface FocusTask {
  id:        string;
  text:      string;
  workspace: Workspace;
  urgency:   "urgent" | "normal";
  dueLabel:  string;
  isOverdue: boolean;
}

export interface HabitItem {
  id:    string;
  label: string;
  done:  boolean;
}

export interface PlanItem {
  id:         string;
  text:       string;
  tag:        string;
  workspace?: Workspace;
  href:       string;
  urgency:    "urgent" | "normal" | "overdue";
}

export interface HomeData {
  mounted:          boolean;
  greeting:         string;
  dateStr:          string;
  urgentCount:      number;
  focusTasks:       FocusTask[];
  workspaceCounts:  Record<Workspace, number>;
  workspaceNames:   Record<Workspace, string>;
  habits:           HabitItem[];
  planItems:        PlanItem[];
  toggleHabit:      (id: string) => void;
  upcomingEvents:   CalendarEvent[];
  calendarLoading:  boolean; // true while the calendar fetch is in-flight
}

// ── Task priority scoring ─────────────────────────────────────────────────────
function taskScore(t: Task, today: string): number {
  const over = !!t.dueDate && t.dueDate !== "someday" && t.dueDate < today;
  const due  = t.dueDate === today;
  const urg  = t.urgency === "urgent";
  if (over && urg)  return 0;
  if (over && !urg) return 1;
  if (due  && urg)  return 2;
  if (due  && !urg) return 3;
  if (urg)          return 4;
  return 5;
}

function resolveDueLabel(t: Task, today: string): { label: string; isOverdue: boolean } {
  if (!t.dueDate || t.dueDate === "someday") return { label: "Someday", isOverdue: false };
  if (t.dueDate < today)  return { label: "Overdue", isOverdue: true  };
  if (t.dueDate === today) return { label: "Today",   isOverdue: false };
  const due  = new Date(t.dueDate + "T00:00:00");
  const now  = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - now.getTime()) / 86_400_000);
  if (diff === 1) return { label: "Tomorrow", isOverdue: false };
  return { label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), isOverdue: false };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useHomeData(): HomeData {
  const [mounted,   setMounted]   = useState(false);
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [gymSess,   setGymSess]   = useState<GymSession[]>([]);
  const [gymSet,    setGymSet]    = useState(DEFAULT_GYM);
  const [rlSet,     setRlSet]     = useState(DEFAULT_REDLIGHT);
  const [suppSet,   setSuppSet]   = useState(DEFAULT_SUPPLEMENTS);
  const [wsNames,   setWsNames]   = useState<Record<Workspace, string>>({
    personal: "Personal", weedguys: "WeedGuys", snapshotto: "SnapshotTO",
  });
  const [habitDone, setHabitDone] = useState<Record<string, boolean>>({});

  // Fixed at load time — prevent pills vanishing when user taps them mid-session
  const [showGym,      setShowGym]      = useState(false);
  const [showRedLight, setShowRedLight] = useState(false);
  const [nextGymLabel, setNextGymLabel] = useState("Upper A");

  // Calendar state — loaded async after mount
  const [calEvents,      setCalEvents]      = useState<CalendarEvent[]>([]);
  const [calGymBlocked,  setCalGymBlocked]  = useState(false);
  const [calLoading,     setCalLoading]     = useState(false); // true while fetch is in-flight

  // Jobber state — loaded async after mount
  const [jobberInvoices, setJobberInvoices] = useState<JobberInvoice[]>([]);

  const today     = todayKey();
  const habitsKey = `lifeos_habits_${today}`;

  // ── Effect: load localStorage + optionally fetch calendar ─────────────────
  useEffect(() => {
    let loadedTasks:    Task[]        = [];
    let loadedSessions: GymSession[]  = [];
    let loadedGymSet    = DEFAULT_GYM;
    let loadedRlSet     = DEFAULT_REDLIGHT;
    let loadedSuppSet   = DEFAULT_SUPPLEMENTS;
    let loadedWsNames: Record<Workspace, string> = {
      personal: "Personal", weedguys: "WeedGuys", snapshotto: "SnapshotTO",
    };
    let loadedHabitDone: Record<string, boolean> = {};

    try {
      const raw = localStorage.getItem("lifeos_tasks");
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) loadedTasks = p; }
    } catch {}

    try {
      const raw = localStorage.getItem("lifeos_gym_sessions");
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) loadedSessions = p; }
    } catch {}

    try {
      const raw = localStorage.getItem("lifeos_settings");
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.gym)         loadedGymSet  = { ...DEFAULT_GYM,        ...p.gym };
        if (p?.redLight)    loadedRlSet   = { ...DEFAULT_REDLIGHT,    ...p.redLight };
        if (p?.supplements) loadedSuppSet = { ...DEFAULT_SUPPLEMENTS, ...p.supplements };
        if (p?.workspaces)  loadedWsNames = {
          personal:   p.workspaces.personal   ?? "Personal",
          weedguys:   p.workspaces.weedguys   ?? "WeedGuys",
          snapshotto: p.workspaces.snapshotto ?? "SnapshotTO",
        };
      }
    } catch {}

    try {
      const raw = localStorage.getItem(habitsKey);
      if (raw) { const p = JSON.parse(raw); if (p && typeof p === "object") loadedHabitDone = p; }
    } catch {}

    // ── Gym scheduling ───────────────────────────────────────────────────────
    const yest            = yesterdayKey();
    const mon             = weekMondayKey();
    const todayHasGym     = loadedSessions.some((s) => s.date === today);
    const yesterdayHasGym = loadedSessions.some((s) => s.date === yest);
    const weekGymCount    = loadedSessions.filter((s) => s.date >= mon && s.date < today).length;
    const gymShouldShow   = !todayHasGym && !yesterdayHasGym && weekGymCount < loadedGymSet.targetDays;

    const rot = loadedGymSet.rotation;
    let nextGym = rot[0] ?? "Upper A";
    if (loadedSessions.length > 0) {
      const lastType = loadedSessions[loadedSessions.length - 1].type;
      const idx = rot.indexOf(lastType);
      nextGym = rot[(idx + 1) % rot.length] ?? rot[0] ?? "Upper A";
    }

    // ── Red light scheduling ─────────────────────────────────────────────────
    let rlWeekCount = 0;
    try {
      const cursor = new Date(mon + "T00:00:00");
      while (cursor.toLocaleDateString("en-CA") < today) {
        const key = `lifeos_habits_${cursor.toLocaleDateString("en-CA")}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const p = JSON.parse(raw);
          if (p?.redlight) rlWeekCount++;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    } catch {}

    const todayRedLightDone = loadedHabitDone["redlight"] ?? false;
    const rlShouldShow      = !todayRedLightDone && rlWeekCount < loadedRlSet.targetDays;

    // ── Batch state ──────────────────────────────────────────────────────────
    setTasks(loadedTasks);
    setGymSess(loadedSessions);
    setGymSet(loadedGymSet);
    setRlSet(loadedRlSet);
    setSuppSet(loadedSuppSet);
    setWsNames(loadedWsNames);
    setHabitDone(loadedHabitDone);
    setShowGym(gymShouldShow);
    setShowRedLight(rlShouldShow);
    setNextGymLabel(nextGym);
    setMounted(true);

    // ── Optional: fetch Google Calendar events ───────────────────────────────
    try {
      const raw = localStorage.getItem("lifeos_integration_google_calendar");
      if (raw) {
        const tokens: CalendarTokens = JSON.parse(raw);
        if (tokens.accessToken) {
          setCalLoading(true);
          console.log("[useHomeData] Starting calendar fetch…");

          fetchCalendarEvents(tokens)
            .then(({ events, updatedTokens }) => {
              console.log(`[useHomeData] Calendar fetch succeeded: ${events.length} events`);

              // Persist refreshed token if the server had to renew it
              if (updatedTokens) {
                try {
                  const updated: CalendarTokens = {
                    ...tokens,
                    ...updatedTokens,
                    lastSyncedAt: Date.now(),
                  };
                  localStorage.setItem(
                    "lifeos_integration_google_calendar",
                    JSON.stringify(updated),
                  );
                } catch {}
              } else {
                try {
                  localStorage.setItem(
                    "lifeos_integration_google_calendar",
                    JSON.stringify({ ...tokens, lastSyncedAt: Date.now() }),
                  );
                } catch {}
              }

              setCalEvents(events);
              setCalLoading(false);

              if (gymShouldShow && gymBlockedByCalendar(events)) {
                setCalGymBlocked(true);
              }
            })
            .catch((err) => {
              console.error("[useHomeData] Calendar events fetch failed:", err);
              setCalLoading(false);
            });
        }
      }
    } catch {}

    // ── Optional: fetch Jobber overdue invoices ──────────────────────────────
    try {
      const raw = localStorage.getItem("lifeos_integration_jobber");
      if (raw) {
        const tokens: JobberTokens = JSON.parse(raw);
        if (tokens.accessToken) {
          console.log("[useHomeData] Starting Jobber fetch…");

          fetch("/api/integrations/jobber/data", {
            headers: {
              "Authorization":      `Bearer ${tokens.accessToken}`,
              "X-Refresh-Token":    tokens.refreshToken,
              "X-Token-Expires-At": String(tokens.expiresAt),
            },
          })
            .then((res) => res.json())
            .then((data) => {
              const invoices: JobberInvoice[] = data.overdueInvoices ?? [];
              console.log(`[useHomeData] Jobber fetch: ${invoices.length} overdue invoices`);
              setJobberInvoices(invoices);

              // Persist refreshed token if returned
              if (data.updatedTokens) {
                try {
                  const updated: JobberTokens = {
                    ...tokens,
                    ...data.updatedTokens,
                    lastSyncedAt: Date.now(),
                  };
                  localStorage.setItem("lifeos_integration_jobber", JSON.stringify(updated));
                } catch {}
              }
            })
            .catch((err) => {
              console.error("[useHomeData] Jobber fetch failed:", err);
            });
        }
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleHabit = useCallback((id: string) => {
    setHabitDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(habitsKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [habitsKey]);

  // ── Computed values (render-time) ─────────────────────────────────────────
  const now      = new Date();
  const greeting = getGreeting(now.getHours());
  const dateStr  = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const urgentCount = tasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate !== "someday" && t.dueDate <= today,
  ).length;

  // Focus tasks: top 3 by priority score
  const focusTasks: FocusTask[] = tasks
    .filter((t) => !t.completed && t.dueDate && t.dueDate !== "someday")
    .sort((a, b) => taskScore(a, today) - taskScore(b, today))
    .slice(0, 3)
    .map((t) => {
      const { label, isOverdue } = resolveDueLabel(t, today);
      return { id: t.id, text: t.text, workspace: t.workspace, urgency: t.urgency, dueLabel: label, isOverdue };
    });

  // Workspace task counts (incomplete)
  const workspaceCounts: Record<Workspace, number> = { personal: 0, weedguys: 0, snapshotto: 0 };
  for (const t of tasks) {
    if (!t.completed && t.workspace in workspaceCounts) workspaceCounts[t.workspace]++;
  }

  // finalShowGym: calendar can block it after data loads, but it won't
  // flicker again — once the calendar check settles it stays fixed
  const finalShowGym = showGym && !calGymBlocked;

  // Habits strip
  const habits: HabitItem[] = [];
  if (finalShowGym) {
    habits.push({ id: "gym", label: `Gym — ${nextGymLabel}`, done: habitDone["gym"] ?? false });
  }
  if (showRedLight) {
    habits.push({ id: "redlight", label: `Red light (${rlSet.durationMinutes} min)`, done: habitDone["redlight"] ?? false });
  }
  if (suppSet.reminder) {
    habits.push({ id: "supplements", label: "Supplements", done: habitDone["supplements"] ?? false });
  }

  // Smart plan
  const planItems: PlanItem[] = [];

  // Jobber overdue invoices surface as urgent WeedGuys plan items
  if (jobberInvoices.length > 0) {
    const totalOwed = jobberInvoices.reduce((s, inv) => s + inv.total, 0);
    const fmt = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
    planItems.push({
      id:        "plan-jobber-invoices",
      text:      `${jobberInvoices.length} overdue WeedGuys invoice${jobberInvoices.length > 1 ? "s" : ""} — ${fmt.format(totalOwed)} outstanding`,
      tag:       "WeedGuys",
      workspace: "weedguys",
      href:      "/tasks?workspace=weedguys",
      urgency:   "urgent",
    });
  }

  const overdueList = tasks
    .filter((t) => !t.completed && t.dueDate && t.dueDate !== "someday" && t.dueDate < today)
    .sort((a) => (a.urgency === "urgent" ? -1 : 1));
  for (const t of overdueList.slice(0, 2)) {
    planItems.push({ id: t.id, text: t.text, tag: "Overdue", workspace: t.workspace, href: `/tasks?workspace=${t.workspace}`, urgency: "overdue" });
  }

  const urgentTodayList = tasks.filter((t) => !t.completed && t.dueDate === today && t.urgency === "urgent");
  for (const t of urgentTodayList) {
    if (planItems.length >= 5) break;
    if (!planItems.find((p) => p.id === t.id))
      planItems.push({ id: t.id, text: t.text, tag: "Do today", workspace: t.workspace, href: `/tasks?workspace=${t.workspace}`, urgency: "urgent" });
  }

  if (finalShowGym && !habitDone["gym"] && planItems.length < 5) {
    planItems.push({ id: "plan-gym", text: `Workout — ${nextGymLabel}`, tag: "Today", href: "/log", urgency: "normal" });
  }

  const normalTodayList = tasks.filter((t) => !t.completed && t.dueDate === today && t.urgency === "normal");
  for (const t of normalTodayList) {
    if (planItems.length >= 5) break;
    if (!planItems.find((p) => p.id === t.id))
      planItems.push({ id: t.id, text: t.text, tag: "Do today", workspace: t.workspace, href: `/tasks?workspace=${t.workspace}`, urgency: "normal" });
  }

  const undoneHabits = habits.filter((h) => !h.done);
  if (undoneHabits.length > 0 && planItems.length < 5) {
    planItems.push({ id: "plan-habits", text: "Complete your morning routine", tag: "Habits", href: "/routine", urgency: "normal" });
  }

  // Calendars excluded from the home screen Upcoming card.
  // "photoboothTO" holds SnapshotTO business bookings — those belong in
  // the SnapshotTO workspace panel, not the personal daily view.
  const HOME_EXCLUDED_CALENDARS = new Set(["photoboothTO"]);

  // Upcoming calendar events: personal + WIW shifts, next 60 days, not yet ended.
  // end > now (not start > now) because Google timeMin filters by end time,
  // so in-progress events are included and should remain visible.
  const _now  = Date.now();
  const in60d = _now + 60 * 24 * 60 * 60 * 1_000;
  const upcomingEvents = calEvents.filter((ev) => {
    if (HOME_EXCLUDED_CALENDARS.has(ev.calendar)) return false;
    const end   = new Date(ev.isAllDay ? ev.end   + "T00:00:00" : ev.end).getTime();
    const start = new Date(ev.isAllDay ? ev.start + "T00:00:00" : ev.start).getTime();
    return end > _now && start <= in60d;
  });

  return {
    mounted,
    greeting,
    dateStr,
    urgentCount,
    focusTasks,
    workspaceCounts,
    workspaceNames:  wsNames,
    habits,
    planItems:       planItems.slice(0, 5),
    toggleHabit,
    upcomingEvents,
    calendarLoading: calLoading,
  };
}
