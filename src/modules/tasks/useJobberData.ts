"use client";

import { useCallback, useEffect, useState } from "react";
import type { JobberData, JobberTokens } from "@/lib/integrations/jobber/types";

// ── Mock data — shown when no Jobber token is present ────────────────────────
const MOCK_DATA: JobberData = {
  overdueInvoices: [
    {
      id:            "mock-1",
      invoiceNumber: "#1042",
      clientName:    "Smith Residence",
      total:         285.00,
      dueDate:       "2026-04-14",
      daysOverdue:   16,
    },
    {
      id:            "mock-2",
      invoiceNumber: "#1038",
      clientName:    "Metro Properties",
      total:         640.00,
      dueDate:       "2026-04-21",
      daysOverdue:   9,
    },
  ],
  upcomingJobs: [
    {
      id:             "mock-j1",
      title:          "Lawn Care",
      clientName:     "Johnson Property",
      scheduledStart: "2026-05-01T09:00:00",
    },
    {
      id:             "mock-j2",
      title:          "Snow Removal",
      clientName:     "Park Ave Commercial",
      scheduledStart: "2026-05-02T07:00:00",
    },
  ],
  recentRequests:     [],
  outstandingBalance: 925.00,
  isMock:             true,
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export interface UseJobberDataResult {
  data:      JobberData;
  loading:   boolean;
  error:     string | null;
  refetch:   () => void;
}

export function useJobberData(): UseJobberDataResult {
  const [data,    setData]    = useState<JobberData>(MOCK_DATA);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    let raw: string | null = null;
    try { raw = localStorage.getItem("lifeos_integration_jobber"); } catch {}

    if (!raw) {
      setData(MOCK_DATA);
      return;
    }

    let tokens: JobberTokens;
    try { tokens = JSON.parse(raw); }
    catch { setData(MOCK_DATA); return; }

    if (!tokens.accessToken) { setData(MOCK_DATA); return; }

    setLoading(true);
    setError(null);

    try {
      const res  = await fetch("/api/integrations/jobber/data", {
        headers: {
          "Authorization":      `Bearer ${tokens.accessToken}`,
          "X-Refresh-Token":    tokens.refreshToken,
          "X-Token-Expires-At": String(tokens.expiresAt),
        },
      });

      const json = await res.json();

      if (!res.ok) {
        // Token expired — clear stored creds and fall back to mock silently
        if (res.status === 401 && json?.error === "TOKEN_EXPIRED") {
          try { localStorage.removeItem("lifeos_integration_jobber"); } catch {}
          setData(MOCK_DATA);
          setLoading(false);
          return;
        }
        // Surface other errors so they're visible in the panel
        const msg = json?.detail
          ? (typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail).slice(0, 200))
          : json?.error ?? `HTTP ${res.status}`;
        console.error("[useJobberData] API error:", msg);
        setError(`Jobber API error: ${msg}`);
        setLoading(false);
        return;
      }

      const fetched = json;
      const updatedTokens = fetched.updatedTokens;

      // Persist refreshed token
      if (updatedTokens) {
        try {
          const updated: JobberTokens = {
            ...tokens,
            ...updatedTokens,
            lastSyncedAt: Date.now(),
          };
          localStorage.setItem("lifeos_integration_jobber", JSON.stringify(updated));
        } catch {}
      } else {
        try {
          localStorage.setItem(
            "lifeos_integration_jobber",
            JSON.stringify({ ...tokens, lastSyncedAt: Date.now() }),
          );
        } catch {}
      }

      setData({ ...fetched, isMock: false });
    } catch (err) {
      console.error("[useJobberData]", err);
      setError("Could not load live Jobber data");
      setData(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}
