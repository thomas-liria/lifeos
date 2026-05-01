"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import SettingsSection from "./SettingsSection";

const THEMES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "light",  label: "Light",  Icon: Sun     },
  { value: "dark",   label: "Dark",   Icon: Moon    },
  { value: "system", label: "System", Icon: Monitor },
];

interface Props {
  onSaved: () => void;
}

export default function AppearanceSection({ onSaved }: Props) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Prevent hydration flash */
  if (!mounted) {
    return (
      <SettingsSection title="Appearance">
        <div className="px-4 py-4 h-[72px]" />
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Appearance">
      <div className="px-4 py-4">
        <div className="flex bg-background rounded-xl p-1 border border-[0.5px] border-border gap-1">
          {THEMES.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => { setTheme(value); onSaved(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2
                text-sm font-medium rounded-lg transition-colors ${
                  theme === value
                    ? "bg-primary text-white shadow-sm"
                    : "text-foreground/50 hover:text-foreground"
                }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}
