"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JobberSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decoded = JSON.parse(atob(hash));
        if (decoded.accessToken && decoded.expiresAt) {
          localStorage.setItem("lifeos_integration_jobber", JSON.stringify(decoded));
        }
      } catch (err) {
        console.error("[jobber-success] Failed to decode token payload:", err);
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
