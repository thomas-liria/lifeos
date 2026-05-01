"use client";

import { useState } from "react";
import { ArrowUp, Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import type { CaptureResult } from "@/app/api/capture/route";

/* Lazy-load CaptureCard so it doesn't inflate the shell bundle */
const CaptureCard = dynamic(
  () => import("@/components/capture/CaptureCard"),
  { ssr: false }
);

type Status = "idle" | "loading" | "error";

export default function SmartInputBar() {
  const [value,  setValue]  = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CaptureResult | null>(null);

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || status === "loading") return;

    setStatus("loading");

    try {
      const res = await fetch("/api/capture", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: CaptureResult = await res.json();
      setResult(data);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      setValue("");
      setStatus("idle");
      setResult(null);
    }
  }

  function handleSave() {
    setValue("");
    setResult(null);
    setStatus("idle");
  }

  function handleDiscard() {
    setResult(null);
    setStatus("idle");
  }

  const isLoading  = status === "loading";
  const isError    = status === "error";
  const hasText    = value.trim().length > 0;

  return (
    <>
      {result && (
        <CaptureCard
          result={result}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />
      )}

      {/* Bar — sits directly above the 64px (4rem) tab bar */}
      <div
        className="fixed left-0 right-0 z-40 px-4 py-2 bg-surface
          border-t border-[0.5px] border-border"
        style={{ bottom: "4rem" }}
      >
        <div className="relative flex items-center">
          {/* Left icon */}
          <Pencil
            size={14}
            className="absolute left-3.5 text-foreground/30 pointer-events-none"
          />

          {/* Input */}
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (isError) setStatus("idle");
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="What's on your mind…"
            className={`w-full rounded-xl bg-background border border-[0.5px]
              pl-9 pr-11 py-2.5 text-[15px] text-foreground
              placeholder:text-foreground/30
              focus:outline-none transition-colors
              disabled:opacity-60
              ${isLoading
                ? "capture-breathe border-primary/50"
                : isError
                  ? "border-urgent/50"
                  : "border-border focus:border-primary"
              }`}
          />

          {/* Send arrow — visible only when there's text and not loading */}
          {hasText && !isLoading && (
            <button
              onClick={submit}
              aria-label="Send"
              className="absolute right-2 w-7 h-7 rounded-full
                flex items-center justify-center
                transition-all active:scale-90"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <ArrowUp size={14} color="white" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Inline error */}
        {isError && (
          <p className="mt-1.5 px-1 text-[11px]" style={{ color: "var(--urgent)" }}>
            Couldn&apos;t process that — try again
          </p>
        )}
      </div>
    </>
  );
}
