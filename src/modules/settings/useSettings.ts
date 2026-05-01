"use client";

import { useCallback, useEffect, useState } from "react";

export type NotificationMode = "off" | "gentle" | "active";
export type AppearanceMode   = "light" | "dark" | "system";

export interface CustomHabit {
  id:         string;
  name:       string;
  targetDays: number;
  duration:   string;
}

export interface SettingsData {
  showTimeEstimates: boolean;
  gym: {
    targetDays: number;
    rotation:   string[];
  };
  redLight: {
    targetDays:       number;
    durationMinutes:  number;
  };
  supplements: {
    reminder: boolean;
  };
  habits: CustomHabit[];
  notifications: {
    mode:       NotificationMode;
    personal:   boolean;
    weedguys:   boolean;
    snapshotto: boolean;
  };
  workspaces: {
    personal:          string;
    weedguys:          string;
    snapshotto:        string;
    school:            string;
    schoolActive:      boolean;
    schoolTimetable:   string;
  };
}

const STORAGE_KEY = "lifeos_settings";

const DEFAULTS: SettingsData = {
  showTimeEstimates: true,
  gym: {
    targetDays: 4,
    rotation:   ["Upper A", "Lower A", "Upper B", "Lower B"],
  },
  redLight: {
    targetDays:      4,
    durationMinutes: 15,
  },
  supplements: { reminder: true },
  habits:      [],
  notifications: {
    mode:       "gentle",
    personal:   true,
    weedguys:   true,
    snapshotto: true,
  },
  workspaces: {
    personal:        "Personal",
    weedguys:        "WeedGuys",
    snapshotto:      "SnapshotTO",
    school:          "School",
    schoolActive:    false,
    schoolTimetable: "",
  },
};

function load(): SettingsData {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function persist(data: SettingsData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useSettings() {
  const [settings, setSettings] = useState<SettingsData>(DEFAULTS);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => {
    setSettings(load());
    setMounted(true);
  }, []);

  const update = useCallback((patch: Partial<SettingsData>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  /* Typed deep-update helpers */
  const setGym = useCallback((patch: Partial<SettingsData["gym"]>) => {
    setSettings((prev) => {
      const next = { ...prev, gym: { ...prev.gym, ...patch } };
      persist(next);
      return next;
    });
  }, []);

  const setRedLight = useCallback((patch: Partial<SettingsData["redLight"]>) => {
    setSettings((prev) => {
      const next = { ...prev, redLight: { ...prev.redLight, ...patch } };
      persist(next);
      return next;
    });
  }, []);

  const setNotifications = useCallback(
    (patch: Partial<SettingsData["notifications"]>) => {
      setSettings((prev) => {
        const next = { ...prev, notifications: { ...prev.notifications, ...patch } };
        persist(next);
        return next;
      });
    },
    []
  );

  const setWorkspaces = useCallback(
    (patch: Partial<SettingsData["workspaces"]>) => {
      setSettings((prev) => {
        const next = { ...prev, workspaces: { ...prev.workspaces, ...patch } };
        persist(next);
        return next;
      });
    },
    []
  );

  const addHabit = useCallback((habit: Omit<CustomHabit, "id">) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        habits: [...prev.habits, { ...habit, id: `habit-${Date.now()}` }],
      };
      persist(next);
      return next;
    });
  }, []);

  const removeHabit = useCallback((id: string) => {
    setSettings((prev) => {
      const next = { ...prev, habits: prev.habits.filter((h) => h.id !== id) };
      persist(next);
      return next;
    });
  }, []);

  return {
    settings, mounted, update,
    setGym, setRedLight, setNotifications, setWorkspaces,
    addHabit, removeHabit,
  };
}
