"use client";

import { useCallback, useEffect, useState } from "react";
import type { GymSession, SessionType } from "./types";

export const GYM_KEY = "lifeos_gym_sessions";

const ROTATION: SessionType[] = ["Upper A", "Lower A", "Upper B", "Lower B"];

function load(): GymSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GYM_KEY);
    return raw ? (JSON.parse(raw) as GymSession[]) : [];
  } catch {
    return [];
  }
}

function persist(sessions: GymSession[]) {
  localStorage.setItem(GYM_KEY, JSON.stringify(sessions));
}

export function nextSessionType(sessions: GymSession[]): SessionType {
  if (sessions.length === 0) return "Upper A";
  const idx = ROTATION.indexOf(sessions[sessions.length - 1].type);
  return ROTATION[(idx + 1) % ROTATION.length];
}

export function useGym() {
  const [sessions, setSessions] = useState<GymSession[]>([]);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => {
    setSessions(load());
    setMounted(true);
  }, []);

  const addSession = useCallback((session: GymSession) => {
    setSessions((prev) => {
      const next = [...prev, session];
      persist(next);
      return next;
    });
  }, []);

  return { sessions, mounted, addSession };
}
