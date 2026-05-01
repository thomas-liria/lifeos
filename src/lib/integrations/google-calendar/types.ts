// ── Stored in localStorage under "lifeos_integration_google_calendar" ──────────
export interface CalendarTokens {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number; // Unix ms
  connectedAt?: number; // Unix ms — set on first connect
  lastSyncedAt?: number; // Unix ms — updated on every successful events fetch
}

// ── Returned by the events API route ────────────────────────────────────────
export interface CalendarEvent {
  id:       string;
  title:    string;
  start:    string; // ISO-8601
  end:      string; // ISO-8601
  isAllDay: boolean;
  calendar: string;
}

// ── Partial token update returned when an access token was refreshed ─────────
export interface UpdatedToken {
  accessToken: string;
  expiresAt:   number;
}
