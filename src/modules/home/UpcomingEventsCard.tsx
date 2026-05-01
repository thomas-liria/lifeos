"use client";

import { Calendar } from "lucide-react";
import type { CalendarEvent } from "@/lib/integrations/google-calendar/types";

interface Props {
  events:          CalendarEvent[];
  mounted:         boolean;
  calendarLoading: boolean;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function getDayLabel(event: CalendarEvent): string {
  const src   = event.isAllDay ? event.start + "T00:00:00" : event.start;
  const start = new Date(src);
  const now   = new Date();
  const tom   = new Date(now);
  tom.setDate(now.getDate() + 1);

  if (start.toDateString() === now.toDateString()) return "Today";
  if (start.toDateString() === tom.toDateString()) return "Tomorrow";
  return start.toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
  });
}

function getDateGroupKey(event: CalendarEvent): string {
  const src = event.isAllDay ? event.start + "T00:00:00" : event.start;
  return new Date(src).toLocaleDateString("en-CA"); // YYYY-MM-DD for stable sort
}

function formatTime(event: CalendarEvent): string {
  if (event.isAllDay) return "All day";
  return new Date(event.start).toLocaleTimeString("en-US", {
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UpcomingEventsCard({ events, mounted, calendarLoading }: Props) {
  // Not yet hydrated — render nothing (prevents layout flicker)
  if (!mounted) return null;

  // Calendar is fetching — show skeleton so user sees something is loading
  if (calendarLoading) {
    return (
      <div className="px-4">
        <div className="bg-surface border border-[0.5px] border-border rounded-2xl px-4 py-4">
          <div className="h-2.5 w-20 bg-border/40 rounded-full mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-t border-[0.5px] border-border/25 first:border-0">
              <div className="w-8 h-8 rounded-xl bg-border/25 flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-3 bg-border/25 rounded-full w-3/4" />
                <div className="h-2.5 bg-border/15 rounded-full w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calendar loaded but no events in range — hide card entirely
  if (events.length === 0) return null;

  // Group events by calendar date
  const groups = new Map<string, { label: string; events: CalendarEvent[] }>();
  for (const ev of events) {
    const key = getDateGroupKey(ev);
    if (!groups.has(key)) {
      groups.set(key, { label: getDayLabel(ev), events: [] });
    }
    groups.get(key)!.events.push(ev);
  }
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="px-4">
      <div className="bg-surface border border-[0.5px] border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.08em]">
            Upcoming
          </p>
        </div>

        {/* Scrollable event list */}
        <div
          className="overflow-y-auto scroll-touch"
          style={{ maxHeight: "420px" }}
        >
          {sortedGroups.map(([dateKey, group], gi) => (
            <div key={dateKey}>
              {/* Date group label */}
              <div
                className={`px-4 py-1.5 ${
                  gi === 0 ? "" : "border-t border-[0.5px] border-border/40"
                }`}
              >
                <span className="text-[11px] font-medium text-text-tertiary">
                  {group.label}
                </span>
              </div>

              {/* Events in this date group */}
              {group.events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-4 py-2.5
                    border-t border-[0.5px] border-border/25"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--primary) 10%, transparent)",
                    }}
                  >
                    <Calendar size={14} className="text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug truncate">
                      {event.title}
                    </p>
                    <p className="text-xs text-foreground/40 mt-0.5">
                      {formatTime(event)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="h-3" />
        </div>
      </div>
    </div>
  );
}
