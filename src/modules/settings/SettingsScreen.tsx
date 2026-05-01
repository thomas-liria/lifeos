"use client";

import { useCallback, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import AppearanceSection  from "./AppearanceSection";
import DataSection        from "./DataSection";
import HabitsSection      from "./HabitsSection";
import IntegrationsSection from "./IntegrationsSection";
import NotificationsSection from "./NotificationsSection";
import RoutineSection     from "./RoutineSection";
import { useSettings }    from "./useSettings";
import WorkspacesSection  from "./WorkspacesSection";

export default function SettingsScreen() {
  const {
    settings, mounted,
    update, setGym, setRedLight, setNotifications, setWorkspaces,
    addHabit, removeHabit,
  } = useSettings();

  /* Saved toast — key trick restarts the CSS animation on every save */
  const [savedKey, setSavedKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSaved = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSavedKey((k) => k + 1);
    timerRef.current = setTimeout(() => setSavedKey(0), 1700);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Settings2 size={32} className="text-foreground/15" />
        <p className="text-sm text-foreground/30">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-8 relative">
      <h1 className="text-lg font-semibold text-foreground px-4 mb-6">Settings</h1>

      <RoutineSection
        settings={settings}
        onUpdate={update}
        onSaved={triggerSaved}
      />

      <HabitsSection
        settings={settings}
        setGym={setGym}
        setRedLight={setRedLight}
        update={update}
        addHabit={addHabit}
        removeHabit={removeHabit}
        onSaved={triggerSaved}
      />

      <WorkspacesSection
        settings={settings}
        setWorkspaces={setWorkspaces}
        onSaved={triggerSaved}
      />

      <NotificationsSection
        settings={settings}
        setNotifications={setNotifications}
        onSaved={triggerSaved}
      />

      <IntegrationsSection />

      <AppearanceSection onSaved={triggerSaved} />

      <DataSection />

      {/* ── Saved toast ──────────────────────────────────────── */}
      {savedKey > 0 && (
        <div
          key={savedKey}
          className="fixed bottom-36 left-1/2 saved-fade z-50 pointer-events-none"
        >
          <div className="bg-foreground/88 text-background text-xs font-medium
            px-3.5 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            Saved
          </div>
        </div>
      )}
    </div>
  );
}
