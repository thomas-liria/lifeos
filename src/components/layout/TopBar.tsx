"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Lock, Settings } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { lock, isPinSet } from "@/lib/pin";

export default function TopBar() {
  const pathname   = usePathname();
  const router     = useRouter();
  const isSettings = pathname?.startsWith("/settings");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-surface border-b border-[0.5px] border-border">
      {isSettings ? (
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-foreground/60 hover:text-foreground transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </button>
      ) : (
        <span className="text-foreground font-medium text-base tracking-tight">
          LifeOS
        </span>
      )}

      <div className="flex items-center gap-1">
        {!isSettings && (
          <Link
            href="/settings"
            aria-label="Open settings"
            className="w-8 h-8 flex items-center justify-center rounded-lg
              text-foreground/60 hover:text-foreground hover:bg-border/40 transition-colors"
          >
            <Settings size={18} />
          </Link>
        )}
        {!isSettings && <ThemeToggle />}
        {!isSettings && isPinSet() && (
          <button
            onClick={() => { lock(); window.location.reload(); }}
            aria-label="Lock app"
            className="w-8 h-8 flex items-center justify-center rounded-lg
              text-foreground/40 hover:text-foreground/70 hover:bg-border/40 transition-colors"
          >
            <Lock size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
