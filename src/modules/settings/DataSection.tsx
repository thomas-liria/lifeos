"use client";

import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import SettingsSection from "./SettingsSection";

export default function DataSection() {
  const [confirming, setConfirming] = useState(false);

  function exportData() {
    const snapshot: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const raw = localStorage.getItem(key);
      try {
        snapshot[key] = JSON.parse(raw ?? "null");
      } catch {
        snapshot[key] = raw;
      }
    }
    const blob = new Blob(
      [JSON.stringify(snapshot, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    localStorage.clear();
    setConfirming(false);
    window.location.reload();
  }

  return (
    <SettingsSection title="Data">
      {/* Export */}
      <button
        onClick={exportData}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left
          hover:bg-border/10 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Download size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm text-foreground">Export all data</p>
          <p className="text-xs text-foreground/40 mt-0.5">Download everything as JSON</p>
        </div>
      </button>

      {/* Clear */}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-left
            hover:bg-urgent/5 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-urgent/10 flex items-center justify-center flex-shrink-0">
            <Trash2 size={16} className="text-urgent" />
          </div>
          <div>
            <p className="text-sm text-urgent">Clear all data</p>
            <p className="text-xs text-foreground/40 mt-0.5">Wipe tasks, routine and gym logs</p>
          </div>
        </button>
      ) : (
        <div className="px-4 py-4 bg-urgent/5">
          <p className="text-sm font-medium text-foreground mb-1">Are you sure?</p>
          <p className="text-xs text-foreground/55 mb-4 leading-relaxed">
            This will delete all tasks, routine items, and gym logs. Are you sure?
          </p>
          <div className="flex gap-2">
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-urgent text-white text-sm font-medium
                rounded-xl hover:bg-urgent/85 transition-colors"
            >
              Yes, clear everything
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-4 py-2 text-sm text-foreground/50 hover:text-foreground
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
