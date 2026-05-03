"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { CalendarEvent } from "@/lib/integrations/google-calendar/types";
import type { CalendarTokens } from "@/lib/integrations/google-calendar/types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function isoDate(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) {
    days.push(new Date(d));
  }
  return days;
}

const DAY_LABELS   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ── Types ─────────────────────────────────────────────────────────────────────
interface DbTask {
  id: string; text: string; workspace: string; urgency: string; due_date: string | null; completed: boolean;
}

interface HabitCompletion { completed_date: string; }
interface GymSession { created_at: string; session_type: string; }

type ViewMode = "week" | "month";

// ── Main Component ────────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const [view,          setView]          = useState<ViewMode>("week");
  const [weekStart,     setWeekStart]     = useState<Date>(() => getMondayOfWeek(new Date()));
  const [monthYear,     setMonthYear]     = useState<{ year: number; month: number }>(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null);

  const [tasks,         setTasks]         = useState<DbTask[]>([]);
  const [habits,        setHabits]        = useState<HabitCompletion[]>([]);
  const [gymSessions,   setGymSessions]   = useState<GymSession[]>([]);
  const [calEvents,     setCalEvents]     = useState<CalendarEvent[]>([]);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [tasksRes, habitsRes, gymRes] = await Promise.all([
        supabase.from("tasks").select("id,text,workspace,urgency,due_date,completed").not("due_date", "is", null),
        supabase.from("habit_completions").select("completed_date"),
        supabase.from("gym_sessions").select("created_at,session_type").order("created_at"),
      ]);
      if (tasksRes.data)  setTasks(tasksRes.data as DbTask[]);
      if (habitsRes.data) setHabits(habitsRes.data as HabitCompletion[]);
      if (gymRes.data)    setGymSessions(gymRes.data as GymSession[]);

      // Load Google Calendar events
      try {
        const raw = localStorage.getItem("lifeos_integration_google_calendar");
        if (raw) {
          const tokens: CalendarTokens = JSON.parse(raw);
          if (tokens.accessToken) {
            const res = await fetch("/api/integrations/google-calendar/events", {
              headers: {
                "Authorization":      `Bearer ${tokens.accessToken}`,
                "X-Refresh-Token":    tokens.refreshToken,
                "X-Token-Expires-At": String(tokens.expiresAt),
              },
            });
            if (res.ok) {
              const { events } = await res.json();
              setCalEvents(events ?? []);
            }
          }
        }
      } catch {}
    }
    load();
  }, []);

  // ── Week navigation ───────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const goTodayWeek = () => setWeekStart(getMondayOfWeek(new Date()));
  const prevWeek    = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek    = () => setWeekStart((d) => addDays(d,  7));

  // ── Month navigation ──────────────────────────────────────────────────────
  const prevMonth = () => setMonthYear(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  );
  const nextMonth = () => setMonthYear(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
  );
  const goTodayMonth = () => {
    const n = new Date();
    setMonthYear({ year: n.getFullYear(), month: n.getMonth() });
  };

  // ── Per-day data helpers ───────────────────────────────────────────────────
  const tasksForDate = useCallback((dateStr: string) =>
    tasks.filter((t) => t.due_date === dateStr && !t.completed),
  [tasks]);

  const eventsForDate = useCallback((dateStr: string) =>
    calEvents.filter((ev) => {
      const evDate = new Date(ev.isAllDay ? ev.start + "T00:00:00" : ev.start)
        .toLocaleDateString("en-CA");
      return evDate === dateStr;
    }),
  [calEvents]);

  const hasHabits = useCallback((dateStr: string) =>
    habits.some((h) => h.completed_date === dateStr),
  [habits]);

  const hasGym = useCallback((dateStr: string) =>
    gymSessions.some((s) => s.created_at.slice(0, 10) === dateStr),
  [gymSessions]);

  const today = isoDate(new Date());

  // ── Week View ─────────────────────────────────────────────────────────────
  const weekLabel = (() => {
    const s = weekStart;
    const e = addDays(weekStart, 6);
    const sm = MONTH_LABELS[s.getMonth()].slice(0, 3);
    const em = MONTH_LABELS[e.getMonth()].slice(0, 3);
    if (sm === em) return `${sm} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
    return `${sm} ${s.getDate()} – ${em} ${e.getDate()}, ${e.getFullYear()}`;
  })();

  return (
    <div className="px-4 pt-2 pb-4">
      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        {(["week", "month"] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="flex-1 py-2 rounded-xl text-[13px] font-medium transition-colors"
            style={view === v
              ? { background: "var(--primary)", color: "white" }
              : { background: "var(--surface)", color: "var(--text-muted)", border: "0.5px solid var(--border)" }
            }
          >
            {v === "week" ? "Week" : "Month"}
          </button>
        ))}
      </div>

      {view === "week" ? (
        <WeekView
          weekDays={weekDays}
          weekLabel={weekLabel}
          today={today}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          tasksForDate={tasksForDate}
          eventsForDate={eventsForDate}
          hasHabits={hasHabits}
          hasGym={hasGym}
          onPrev={prevWeek}
          onNext={nextWeek}
          onToday={goTodayWeek}
        />
      ) : (
        <MonthView
          year={monthYear.year}
          month={monthYear.month}
          today={today}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          tasksForDate={tasksForDate}
          eventsForDate={eventsForDate}
          hasHabits={hasHabits}
          hasGym={hasGym}
          onPrev={prevMonth}
          onNext={nextMonth}
          onToday={goTodayMonth}
        />
      )}

      {/* Day detail sheet */}
      {selectedDate && (
        <DayDetail
          date={selectedDate}
          tasks={tasksForDate(selectedDate)}
          events={eventsForDate(selectedDate)}
          habitsCompleted={hasHabits(selectedDate)}
          gymDone={hasGym(selectedDate)}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ weekDays, weekLabel, today, selectedDate, setSelectedDate, tasksForDate, eventsForDate, hasHabits, hasGym, onPrev, onNext, onToday }: {
  weekDays: Date[]; weekLabel: string; today: string;
  selectedDate: string | null; setSelectedDate: (d: string | null) => void;
  tasksForDate: (d: string) => DbTask[]; eventsForDate: (d: string) => CalendarEvent[];
  hasHabits: (d: string) => boolean; hasGym: (d: string) => boolean;
  onPrev: () => void; onNext: () => void; onToday: () => void;
}) {
  return (
    <div>
      {/* Nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="p-2 rounded-lg active:scale-95 transition-transform"
          style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToday} className="text-[11px] px-2 py-1 rounded-lg"
            style={{ color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
            Today
          </button>
          <button onClick={onNext} className="p-2 rounded-lg active:scale-95 transition-transform"
            style={{ color: "var(--text-muted)" }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, i) => {
          const dateStr  = isoDate(day);
          const isToday  = dateStr === today;
          const dayTasks = tasksForDate(dateStr);
          const dayEvs   = eventsForDate(dateStr);
          const selected = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(selected ? null : dateStr)}
              className="flex flex-col items-center rounded-2xl pt-2 pb-2 gap-1 transition-colors active:scale-95"
              style={{
                background: selected ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                  : isToday ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                  : "var(--surface)",
                border: `0.5px solid ${selected ? "var(--primary)" : isToday ? "color-mix(in srgb, var(--primary) 30%, transparent)" : "var(--border)"}`,
                minHeight: 90,
              }}
            >
              {/* Day label */}
              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                {DAY_LABELS[i]}
              </span>
              {/* Date number */}
              <span className={`text-[16px] font-medium leading-none`}
                style={{ color: isToday ? "var(--primary)" : "var(--text)" }}>
                {day.getDate()}
              </span>

              {/* Events */}
              {dayEvs.slice(0, 2).map((ev) => (
                <div key={ev.id} className="w-full px-0.5">
                  <div className="rounded-sm px-0.5 truncate text-[7px] font-medium"
                    style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "var(--primary)" }}>
                    {ev.title.length > 8 ? ev.title.slice(0, 7) + "…" : ev.title}
                  </div>
                </div>
              ))}

              {/* Task chips */}
              {dayTasks.length > 0 && (
                <div className="flex flex-col gap-0.5 w-full px-0.5">
                  {dayTasks.slice(0, 2).map((t) => (
                    <div key={t.id} className="rounded-sm px-0.5 truncate text-[7px]"
                      style={{
                        background: t.urgency === "urgent"
                          ? "color-mix(in srgb, var(--urgent) 15%, transparent)"
                          : "color-mix(in srgb, var(--text) 8%, transparent)",
                        color: t.urgency === "urgent" ? "var(--urgent)" : "var(--text-muted)",
                      }}>
                      {t.text.length > 8 ? t.text.slice(0, 7) + "…" : t.text}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[7px] text-center" style={{ color: "var(--text-muted)" }}>
                      +{dayTasks.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Dot indicators */}
              <div className="flex gap-1 mt-auto">
                {hasHabits(dateStr) && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--calm)" }} />}
                {hasGym(dateStr)   && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--primary)" }} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ year, month, today, selectedDate, setSelectedDate, tasksForDate, eventsForDate, hasHabits, hasGym, onPrev, onNext, onToday }: {
  year: number; month: number; today: string;
  selectedDate: string | null; setSelectedDate: (d: string | null) => void;
  tasksForDate: (d: string) => DbTask[]; eventsForDate: (d: string) => CalendarEvent[];
  hasHabits: (d: string) => boolean; hasGym: (d: string) => boolean;
  onPrev: () => void; onNext: () => void; onToday: () => void;
}) {
  const days     = getDaysInMonth(year, month);
  const firstDay = days[0].getDay(); // 0=Sun … 6=Sat
  // Offset for Mon-start grid: Sun→6, Mon→0, Tue→1 …
  const offset   = firstDay === 0 ? 6 : firstDay - 1;
  const cells    = [...Array(offset).fill(null), ...days];

  return (
    <div>
      {/* Nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="p-2 rounded-lg active:scale-95"
          style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[14px] font-medium" style={{ color: "var(--text)" }}>
            {MONTH_LABELS[month]} {year}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToday} className="text-[11px] px-2 py-1 rounded-lg"
            style={{ color: "var(--primary)", background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
            Today
          </button>
          <button onClick={onNext} className="p-2 rounded-lg active:scale-95"
            style={{ color: "var(--text-muted)" }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px]" style={{ color: "var(--text-muted)" }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr  = isoDate(day);
          const isToday  = dateStr === today;
          const selected = selectedDate === dateStr;
          const hasTasks = tasksForDate(dateStr).length > 0;
          const hasEvs   = eventsForDate(dateStr).length > 0;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(selected ? null : dateStr)}
              className="flex flex-col items-center py-1.5 rounded-xl transition-colors active:scale-95"
              style={{
                background: selected ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                  : isToday  ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                  : "transparent",
                border: `0.5px solid ${selected ? "var(--primary)" : isToday ? "color-mix(in srgb, var(--primary) 25%, transparent)" : "transparent"}`,
                minHeight: 48,
              }}
            >
              <span className="text-[13px]"
                style={{ color: isToday ? "var(--primary)" : "var(--text)", fontWeight: isToday ? 600 : 400 }}>
                {day.getDate()}
              </span>
              {/* Dots */}
              <div className="flex gap-0.5 mt-0.5">
                {hasHabits(dateStr) && <div className="w-1 h-1 rounded-full" style={{ background: "var(--calm)" }} />}
                {hasTasks           && <div className="w-1 h-1 rounded-full" style={{ background: "var(--urgent)" }} />}
                {hasEvs             && <div className="w-1 h-1 rounded-full" style={{ background: "var(--primary)" }} />}
                {hasGym(dateStr)    && <div className="w-1 h-1 rounded-full" style={{ background: "var(--text-muted)" }} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 justify-center">
        {[
          { color: "var(--calm)",     label: "Habits" },
          { color: "var(--urgent)",   label: "Tasks due" },
          { color: "var(--primary)",  label: "Event" },
          { color: "var(--text-muted)", label: "Gym" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Day detail sheet ──────────────────────────────────────────────────────────
function DayDetail({ date, tasks, events, habitsCompleted, gymDone, onClose }: {
  date: string; tasks: DbTask[]; events: CalendarEvent[];
  habitsCompleted: boolean; gymDone: boolean; onClose: () => void;
}) {
  const d        = new Date(date + "T00:00:00");
  const label    = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const hasAny   = tasks.length > 0 || events.length > 0 || habitsCompleted || gymDone;

  return (
    <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{label}</p>
        <button onClick={onClose} className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Close
        </button>
      </div>

      {!hasAny && (
        <div className="flex items-center gap-2 py-2">
          <CalendarDays size={14} style={{ color: "var(--text-muted)" }} />
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>Nothing scheduled</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Events</p>
          {events.map((ev) => (
            <div key={ev.id} className="flex items-start gap-2 py-1.5"
              style={{ borderBottom: "0.5px solid var(--border)" }}>
              <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: "var(--primary)" }} />
              <div>
                <p className="text-[13px]" style={{ color: "var(--text)" }}>{ev.title}</p>
                {!ev.isAllDay && (
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {new Date(ev.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Tasks Due</p>
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-1.5"
              style={{ borderBottom: "0.5px solid var(--border)" }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: t.urgency === "urgent" ? "var(--urgent)" : "var(--text-muted)" }} />
              <p className="text-[13px]" style={{ color: "var(--text)" }}>{t.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-1">
        {habitsCompleted && (
          <span className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: "color-mix(in srgb, var(--calm) 15%, transparent)", color: "var(--calm)" }}>
            ✓ Habits done
          </span>
        )}
        {gymDone && (
          <span className="text-[11px] px-2 py-0.5 rounded-full"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
            ✓ Gym session
          </span>
        )}
      </div>
    </div>
  );
}
