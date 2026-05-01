import { getValidToken } from "@/lib/integrations/google-calendar/client";
import type { CalendarTokens, CalendarEvent, UpdatedToken } from "@/lib/integrations/google-calendar/types";

export const dynamic = "force-dynamic";

// ── Google API response shapes ────────────────────────────────────────────────

interface GCalDatetime {
  dateTime?: string;
  date?:     string;
  timeZone?: string;
}

interface GCalAttendee {
  self?:           boolean;
  responseStatus?: "accepted" | "declined" | "tentative" | "needsAction";
}

interface GCalEvent {
  id?:         string;
  summary?:    string;
  status?:     string;
  start?:      GCalDatetime;
  end?:        GCalDatetime;
  attendees?:  GCalAttendee[];
  organizer?:  { displayName?: string; email?: string };
}

interface GCalEventsResponse {
  items?: GCalEvent[];
  error?: { message?: string; code?: number };
}

interface GCalCalendar {
  id:               string;
  summary:          string;
  accessRole:       string;
  selected?:        boolean;
}

interface GCalCalendarListResponse {
  items?: GCalCalendar[];
  error?: { message?: string; code?: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAndFilterEvents(
  rawItems: GCalEvent[],
  calendarName: string,
): CalendarEvent[] {
  return rawItems
    .filter((ev) => {
      if (ev.status === "cancelled") return false;
      const selfAttendee = ev.attendees?.find((a) => a.self);
      if (selfAttendee?.responseStatus === "declined") return false;
      return true;
    })
    .map((ev): CalendarEvent => {
      const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);
      return {
        id:       ev.id      ?? `gcal-${Math.random()}`,
        title:    ev.summary ?? "(No title)",
        start:    ev.start?.dateTime ?? ev.start?.date ?? "",
        end:      ev.end?.dateTime   ?? ev.end?.date   ?? "",
        isAllDay,
        calendar: calendarName,
      };
    });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  try {
    const headers      = request.headers;
    const authHeader   = headers.get("authorization") ?? "";
    const refreshToken = headers.get("x-refresh-token") ?? "";
    const expiresAtRaw = headers.get("x-token-expires-at");

    if (!authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }

    const accessToken = authHeader.slice(7);
    const expiresAt   = expiresAtRaw ? Number(expiresAtRaw) : 0;

    const tokens: CalendarTokens = { accessToken, refreshToken, expiresAt };
    const { accessToken: validToken, updatedTokens } = await getValidToken(tokens);

    const authHeader2 = { Authorization: `Bearer ${validToken}` };

    // ── Step 1: list all calendars the user has access to ────────────────────
    const calListRes = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250",
      { headers: authHeader2 },
    );

    const calListData: GCalCalendarListResponse = await calListRes.json();

    if (!calListRes.ok) {
      console.error("[gcal/events] calendarList error:", calListData.error?.message);
      return Response.json(
        { error: calListData.error?.message ?? "Failed to list calendars" },
        { status: calListRes.status },
      );
    }

    const allCals = calListData.items ?? [];
    console.log(`[gcal/events] Found ${allCals.length} calendars:`);
    allCals.forEach((c) => console.log(`  • ${c.summary} (${c.id}) role=${c.accessRole}`));

    // ── Step 2: fetch events from every calendar in parallel ─────────────────
    const now     = new Date();
    const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1_000);

    const qs = new URLSearchParams({
      timeMin:      now.toISOString(),
      timeMax:      timeMax.toISOString(),
      singleEvents: "true",
      orderBy:      "startTime",
      maxResults:   "250",
    });

    const results = await Promise.allSettled(
      allCals.map(async (cal) => {
        const encodedId = encodeURIComponent(cal.id);
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?${qs}`,
          { headers: authHeader2 },
        );

        if (!res.ok) {
          const err: GCalEventsResponse = await res.json().catch(() => ({}));
          console.warn(`[gcal/events] Skipping "${cal.summary}": ${res.status} ${err.error?.message ?? ""}`);
          return [] as CalendarEvent[];
        }

        const data: GCalEventsResponse = await res.json();
        const raw = data.items ?? [];
        const parsed = parseAndFilterEvents(raw, cal.summary);
        console.log(`[gcal/events] "${cal.summary}": ${raw.length} raw → ${parsed.length} kept`);
        return parsed;
      }),
    );

    // ── Step 3: merge, deduplicate by id, sort by start ──────────────────────
    const seen  = new Set<string>();
    const merged: CalendarEvent[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const ev of result.value) {
          if (!seen.has(ev.id)) {
            seen.add(ev.id);
            merged.push(ev);
          }
        }
      }
    }

    // Sort chronologically
    merged.sort((a, b) => {
      const ta = new Date(a.isAllDay ? a.start + "T00:00:00" : a.start).getTime();
      const tb = new Date(b.isAllDay ? b.start + "T00:00:00" : b.start).getTime();
      return ta - tb;
    });

    console.log(`[gcal/events] Total after merge+dedup: ${merged.length} events`);
    merged.forEach((ev, i) =>
      console.log(`  [${i}] "${ev.title}" | ${ev.start} | allDay=${ev.isAllDay} | cal="${ev.calendar}"`),
    );

    return Response.json({
      events:        merged,
      updatedTokens: updatedTokens ?? null,
    });

  } catch (err) {
    console.error("[gcal/events]", err);
    return Response.json({ error: "Failed to fetch calendar events" }, { status: 500 });
  }
}
