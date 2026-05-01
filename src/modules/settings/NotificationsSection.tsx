"use client";

import SettingsSection, { ToggleSwitch } from "./SettingsSection";
import type { NotificationMode, SettingsData } from "./useSettings";

const MODES: { value: NotificationMode; label: string }[] = [
  { value: "off",    label: "Off"    },
  { value: "gentle", label: "Gentle" },
  { value: "active", label: "Active" },
];

const WORKSPACE_TOGGLES: {
  key: "personal" | "weedguys" | "snapshotto";
  label: string;
}[] = [
  { key: "personal",   label: "Personal"   },
  { key: "weedguys",   label: "WeedGuys"   },
  { key: "snapshotto", label: "SnapshotTO" },
];

interface Props {
  settings:         SettingsData;
  setNotifications: (patch: Partial<SettingsData["notifications"]>) => void;
  onSaved:          () => void;
}

export default function NotificationsSection({
  settings,
  setNotifications,
  onSaved,
}: Props) {
  return (
    <SettingsSection title="Notifications">
      {/* Segmented control */}
      <div className="px-4 py-4">
        <p className="text-xs text-foreground/40 mb-3">Notification mode</p>
        <div className="flex bg-background rounded-xl p-1 border border-[0.5px] border-border gap-1">
          {MODES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setNotifications({ mode: value }); onSaved(); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                settings.notifications.mode === value
                  ? "bg-primary text-white shadow-sm"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-workspace toggles */}
      {WORKSPACE_TOGGLES.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between px-4 py-3.5">
          <p className="text-sm text-foreground">{label}</p>
          <ToggleSwitch
            value={settings.notifications[key]}
            onChange={(v) => { setNotifications({ [key]: v }); onSaved(); }}
          />
        </div>
      ))}
    </SettingsSection>
  );
}
