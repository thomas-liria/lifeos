"use client";

/**
 * /auth/gcal-success
 *
 * The callback route redirects here with tokens encoded as base64 JSON in
 * the URL hash (#…).  Hash fragments are never sent to any server so the
 * tokens never leave the browser.  This page decodes them, persists them in
 * localStorage, then navigates the user to /home.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";

export default function GcalSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1); // strip the leading "#"

    if (hash) {
      try {
        const decoded = JSON.parse(atob(hash));

        if (decoded.accessToken && decoded.expiresAt) {
          localStorage.setItem(
            "lifeos_integration_google_calendar",
            JSON.stringify(decoded),
          );
        }
      } catch (err) {
        console.error("[gcal-success] Failed to decode token payload:", err);
      }
    }

    // Always redirect — even if decoding failed, go home cleanly
    router.replace("/home");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
      >
        <Calendar size={22} className="text-primary" />
      </div>
      <p className="text-sm text-foreground/50">Connecting Google Calendar…</p>
    </div>
  );
}
