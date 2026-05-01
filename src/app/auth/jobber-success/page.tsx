"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JobberSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // 1. Try cookie (primary — reliable across redirect chains)
    const cookieMatch = document.cookie.match(/(?:^|;\s*)lifeos_jobber_pending=([^;]*)/);
    if (cookieMatch?.[1]) {
      try {
        const decoded = JSON.parse(atob(cookieMatch[1]));
        if (decoded.accessToken) {
          localStorage.setItem("lifeos_integration_jobber", JSON.stringify(decoded));
        }
      } catch (err) {
        console.error("[jobber-success] cookie decode failed:", err);
      }
      // Clear cookie
      document.cookie = "lifeos_jobber_pending=; Path=/; Max-Age=0";
    }

    // 2. Fallback: hash fragment (legacy, in case cookie was blocked)
    const hash = window.location.hash.slice(1);
    if (!cookieMatch?.[1] && hash) {
      try {
        const decoded = JSON.parse(atob(hash));
        if (decoded.accessToken) {
          localStorage.setItem("lifeos_integration_jobber", JSON.stringify(decoded));
        }
      } catch (err) {
        console.error("[jobber-success] hash decode failed:", err);
      }
    }

    router.replace("/tasks?workspace=weedguys");
  }, [router]);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100dvh", background: "var(--bg)",
    }}>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        Connecting Jobber…
      </p>
    </div>
  );
}
