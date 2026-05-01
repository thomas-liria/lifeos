"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import SettingsSection from "./SettingsSection";
import type { SettingsData } from "./useSettings";

type WorkspaceKey = "personal" | "weedguys" | "snapshotto" | "school";

const WORKSPACE_KEYS: WorkspaceKey[] = ["personal", "weedguys", "snapshotto", "school"];

interface Props {
  settings:      SettingsData;
  setWorkspaces: (patch: Partial<SettingsData["workspaces"]>) => void;
  onSaved:       () => void;
}

export default function WorkspacesSection({ settings, setWorkspaces, onSaved }: Props) {
  const [editingKey, setEditingKey] = useState<WorkspaceKey | null>(null);
  const [editValue,  setEditValue]  = useState("");
  const [showTimetable, setShowTimetable] = useState(false);
  const [timetable,     setTimetable]     = useState(settings.workspaces.schoolTimetable);

  function startEdit(key: WorkspaceKey) {
    setEditingKey(key);
    setEditValue(settings.workspaces[key]);
  }

  function saveEdit() {
    if (!editingKey) return;
    const trimmed = editValue.trim();
    if (trimmed) {
      setWorkspaces({ [editingKey]: trimmed } as Partial<SettingsData["workspaces"]>);
      onSaved();
    }
    setEditingKey(null);
  }

  function cancelEdit() {
    setEditingKey(null);
  }

  function saveTimetable() {
    setWorkspaces({ schoolTimetable: timetable, schoolActive: true });
    setShowTimetable(false);
    onSaved();
  }

  return (
    <SettingsSection title="Workspaces">
      {WORKSPACE_KEYS.map((key) => {
        const name     = settings.workspaces[key];
        const isSchool = key === "school";
        const isActive = !isSchool || settings.workspaces.schoolActive;
        const isEditing = editingKey === key;

        return (
          <div key={key} className="flex items-center gap-3 px-4 py-3.5">
            {isEditing ? (
              <>
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")  saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 bg-background border border-[0.5px] border-primary/40
                    rounded-lg px-2.5 py-1.5 text-sm text-foreground
                    focus:outline-none focus:border-primary"
                />
                <button
                  onClick={saveEdit}
                  className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1.5 rounded-lg text-foreground/40 hover:bg-border/30 transition-colors"
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{name}</p>
                  <p className={`text-xs mt-0.5 ${isActive ? "text-calm" : "text-foreground/30"}`}>
                    {isActive ? "Active" : "Inactive"}
                  </p>
                </div>

                {/* School activate button */}
                {isSchool && !settings.workspaces.schoolActive && (
                  <button
                    onClick={() => setShowTimetable(true)}
                    className="text-xs font-medium text-primary bg-primary/10 px-3 py-1.5
                      rounded-lg hover:bg-primary/20 transition-colors flex-shrink-0"
                  >
                    Activate
                  </button>
                )}

                <button
                  onClick={() => startEdit(key)}
                  aria-label={`Rename ${name}`}
                  className="p-1.5 rounded-lg text-foreground/30 hover:text-foreground/60
                    hover:bg-border/20 transition-colors flex-shrink-0"
                >
                  <Pencil size={14} />
                </button>
              </>
            )}
          </div>
        );
      })}

      {/* School timetable inline form */}
      {showTimetable && (
        <div className="px-4 py-4 border-t border-[0.5px] border-border bg-background/40">
          <p className="text-sm font-medium text-foreground mb-1">Add school timetable</p>
          <p className="text-xs text-foreground/40 mb-3">
            Paste or type your schedule — full integration coming later.
          </p>
          <textarea
            autoFocus
            value={timetable}
            onChange={(e) => setTimetable(e.target.value)}
            rows={5}
            placeholder="E.g.&#10;Mon 9am–12pm — Design&#10;Tue 2pm–5pm — Dev&#10;Wed 10am–1pm — PM"
            className="w-full bg-background border border-[0.5px] border-border rounded-xl
              px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30
              focus:outline-none focus:border-primary resize-none"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={saveTimetable}
              className="px-4 py-2 bg-primary/15 text-primary text-sm font-medium
                rounded-xl hover:bg-primary/20 transition-colors"
            >
              Save & Activate
            </button>
            <button
              onClick={() => setShowTimetable(false)}
              className="px-3 py-2 text-sm text-foreground/35 hover:text-foreground/60
                transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}
