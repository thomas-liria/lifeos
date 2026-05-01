"use client";

import {
  AtSign,
  Briefcase,
  Calendar,
  Check,
  Clock,
  Mail,
  RefreshCw,
  Unlink,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import SettingsSection from "./SettingsSection";
import type { CalendarTokens, CalendarEvent } from "@/lib/integrations/google-calendar/types";
import type { JobberTokens } from "@/lib/integrations/jobber/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlaceholderIntegration {
  id:   string;
  name: string;
  Icon: LucideIcon;
}

// Jobber removed — it has its own real row below
const PLACEHOLDER_INTEGRATIONS: PlaceholderIntegration[] = [
  { id: "wiw",       name: "When I Work",      Icon: Clock  },
  { id: "gmail-wg",  name: "Gmail (WeedGuys)", Icon: Mail   },
  { id: "snap-mail", name: "SnapshotTO Email", Icon: AtSign },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000)        return "Just now";
  if (diff < 3_600_000)     return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000)    return `${Math.floor(diff / 3_600_000)} hr ago`;
  return `${Math.floor(diff / 86_400_000)} day${Math.floor(diff / 86_400_000) > 1 ? "s" : ""} ago`;
}

const GCAL_STORAGE_KEY = "lifeos_integration_google_calendar";

// ── Google Calendar row (real OAuth) ─────────────────────────────────────────

function GoogleCalendarRow() {
  const [tokens,     setTokens]    = useState<CalendarTokens | null>(null);
  const [syncing,    setSyncing]   = useState(false);
  const [syncError,  setSyncError] = useState(false);
  const [mounted,    setMounted]   = useState(false);

  // Read stored tokens on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GCAL_STORAGE_KEY);
      if (raw) setTokens(JSON.parse(raw));
    } catch {}
    setMounted(true);
  }, []);

  const isConnected = Boolean(tokens?.accessToken);

  // Trigger the OAuth flow
  function handleConnect() {
    window.location.href = "/api/integrations/google-calendar/connect";
  }

  // Clear stored tokens
  function handleDisconnect() {
    try { localStorage.removeItem(GCAL_STORAGE_KEY); } catch {}
    setTokens(null);
  }

  // Re-fetch events and update lastSyncedAt
  const handleSync = useCallback(async () => {
    if (!tokens) return;
    setSyncing(true);
    setSyncError(false);
    try {
      const res = await fetch("/api/integrations/google-calendar/events", {
        headers: {
          "Authorization":      `Bearer ${tokens.accessToken}`,
          "X-Refresh-Token":    tokens.refreshToken,
          "X-Token-Expires-At": String(tokens.expiresAt),
        },
      });

      if (!res.ok) throw new Error(`${res.status}`);

      const data: {
        events:        CalendarEvent[];
        updatedTokens: { accessToken: string; expiresAt: number } | null;
      } = await res.json();

      const updated: CalendarTokens = {
        ...tokens,
        ...(data.updatedTokens ?? {}),
        lastSyncedAt: Date.now(),
      };
      localStorage.setItem(GCAL_STORAGE_KEY, JSON.stringify(updated));
      setTokens(updated);
    } catch {
      setSyncError(true);
    } finally {
      setSyncing(false);
    }
  }, [tokens]);

  if (!mounted) {
    // Skeleton while reading localStorage
    return (
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-9 h-9 rounded-xl bg-border/30 flex items-center justify-center flex-shrink-0">
          <Calendar size={17} className="text-foreground/50" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground">Google Calendar</p>
          <p className="text-xs text-foreground/35 mt-0.5">Loading…</p>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="px-4 py-3.5">
        {/* Top row: icon + name + Connected badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-border/30 flex items-center justify-center flex-shrink-0">
            <Calendar size={17} className="text-foreground/50" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">Google Calendar</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Check size={11} className="text-primary" strokeWidth={2.5} />
              <span className="text-xs text-primary font-medium">Connected</span>
              {tokens?.lastSyncedAt && (
                <span className="text-xs text-foreground/30">
                  · Synced {formatRelativeTime(tokens.lastSyncedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3 ml-12">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5
              rounded-lg bg-primary/10 text-primary hover:bg-primary/20
              disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              size={11}
              className={syncing ? "animate-spin" : ""}
              strokeWidth={2.5}
            />
            {syncing ? "Syncing…" : "Sync now"}
          </button>

          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5
              rounded-lg bg-border/30 text-foreground/50 hover:bg-border/50
              transition-colors"
          >
            <Unlink size={11} strokeWidth={2.5} />
            Disconnect
          </button>
        </div>

        {syncError && (
          <p className="text-xs text-urgent/70 mt-2 ml-12">
            Sync failed — check your connection and try again.
          </p>
        )}
      </div>
    );
  }

  // Not connected
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-9 h-9 rounded-xl bg-border/30 flex items-center justify-center flex-shrink-0">
        <Calendar size={17} className="text-foreground/50" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">Google Calendar</p>
        <p className="text-xs text-foreground/35 mt-0.5">Not connected</p>
      </div>

      <button
        onClick={handleConnect}
        className="text-xs font-medium px-3 py-1.5 rounded-lg
          bg-primary/10 text-primary hover:bg-primary/20
          transition-colors flex-shrink-0"
      >
        Connect
      </button>
    </div>
  );
}

// ── Jobber row (real OAuth) ───────────────────────────────────────────────────

const JOBBER_STORAGE_KEY = "lifeos_integration_jobber";

function JobberRow() {
  const [tokens,    setTokens]   = useState<JobberTokens | null>(null);
  const [syncing,   setSyncing]  = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [mounted,   setMounted]  = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(JOBBER_STORAGE_KEY);
      if (raw) setTokens(JSON.parse(raw));
    } catch {}
    setMounted(true);
  }, []);

  const isConnected = Boolean(tokens?.accessToken);

  function handleConnect() {
    window.location.href = "/api/integrations/jobber/connect";
  }

  function handleDisconnect() {
    try { localStorage.removeItem(JOBBER_STORAGE_KEY); } catch {}
    setTokens(null);
  }

  const handleSync = useCallback(async () => {
    if (!tokens) return;
    setSyncing(true);
    setSyncError(false);
    try {
      const res = await fetch("/api/integrations/jobber/data", {
        headers: {
          "Authorization":      `Bearer ${tokens.accessToken}`,
          "X-Refresh-Token":    tokens.refreshToken,
          "X-Token-Expires-At": String(tokens.expiresAt),
        },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const updated: JobberTokens = {
        ...tokens,
        ...(data.updatedTokens ?? {}),
        lastSyncedAt: Date.now(),
      };
      localStorage.setItem(JOBBER_STORAGE_KEY, JSON.stringify(updated));
      setTokens(updated);
    } catch {
      setSyncError(true);
    } finally {
      setSyncing(false);
    }
  }, [tokens]);

  if (!mounted) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-9 h-9 rounded-xl bg-border/30 flex items-center justify-center flex-shrink-0">
          <Briefcase size={17} className="text-foreground/50" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-foreground">Jobber</p>
          <p className="text-xs text-foreground/35 mt-0.5">Loading…</p>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-border/30 flex items-center justify-center flex-shrink-0">
            <Briefcase size={17} className="text-foreground/50" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">Jobber</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Check size={11} className="text-primary" strokeWidth={2.5} />
              <span className="text-xs text-primary font-medium">Connected</span>
              {tokens?.lastSyncedAt && (
                <span className="text-xs text-foreground/30">
                  · Synced {formatRelativeTime(tokens.lastSyncedAt)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3 ml-12">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5
              rounded-lg bg-primary/10 text-primary hover:bg-primary/20
              disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={11} className={syncing ? "animate-spin" : ""} strokeWidth={2.5} />
            {syncing ? "Syncing…" : "Sync now"}
          </button>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5
              rounded-lg bg-border/30 text-foreground/50 hover:bg-border/50
              transition-colors"
          >
            <Unlink size={11} strokeWidth={2.5} />
            Disconnect
          </button>
        </div>
        {syncError && (
          <p className="text-xs text-urgent/70 mt-2 ml-12">
            Sync failed — check your connection and try again.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="w-9 h-9 rounded-xl bg-border/30 flex items-center justify-center flex-shrink-0">
        <Briefcase size={17} className="text-foreground/50" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">Jobber</p>
        <p className="text-xs text-foreground/35 mt-0.5">Not connected · WeedGuys field management</p>
      </div>
      <button
        onClick={handleConnect}
        className="text-xs font-medium px-3 py-1.5 rounded-lg
          bg-primary/10 text-primary hover:bg-primary/20
          transition-colors flex-shrink-0"
      >
        Connect
      </button>
    </div>
  );
}

// ── Placeholder rows ("coming soon") ─────────────────────────────────────────

function PlaceholderRow({ id, name, Icon }: PlaceholderIntegration) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-9 h-9 rounded-xl bg-border/30 flex items-center justify-center flex-shrink-0">
          <Icon size={17} className="text-foreground/50" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">{name}</p>
          <p className="text-xs text-foreground/35 mt-0.5">Not connected</p>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors
            flex-shrink-0 ${
              expanded
                ? "bg-border/40 text-foreground/50"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
        >
          {expanded ? "Close" : "Connect"}
        </button>
      </div>

      {expanded && (
        <div
          key={id}
          className="px-4 pb-4 mx-4 mb-1 rounded-xl bg-background/60
            border border-[0.5px] border-border -mt-1"
        >
          <p className="text-sm text-foreground/60 py-3 leading-relaxed">
            Integration coming soon — check back after the core app is complete.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export default function IntegrationsSection() {
  return (
    <SettingsSection title="Integrations">
      <GoogleCalendarRow />
      <JobberRow />

      {PLACEHOLDER_INTEGRATIONS.map((integration) => (
        <PlaceholderRow key={integration.id} {...integration} />
      ))}
    </SettingsSection>
  );
}
