"use client";

import { useEffect, useState, useCallback } from "react";
import {
  isPinSet, isUnlocked, setUnlocked, setPin,
  verifyPin, recordFailedAttempt, isLockedOut,
  lockoutSecondsLeft, clearLockout, getLockout, MAX_ATTEMPTS,
} from "@/lib/pin";

// ── Dot display ───────────────────────────────────────────────────────────────
function Dots({ filled, total = 4 }: { filled: number; total?: number }) {
  return (
    <div style={{ display: "flex", gap: 16, justifyContent: "center", margin: "28px 0 8px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 14, height: 14, borderRadius: "50%",
            background: i < filled ? "var(--primary)" : "transparent",
            border: `1.5px solid ${i < filled ? "var(--primary)" : "color-mix(in srgb, var(--text) 25%, transparent)"}`,
            transition: "background 0.15s, border-color 0.15s",
          }}
        />
      ))}
    </div>
  );
}

// ── Keypad button ─────────────────────────────────────────────────────────────
function Key({ label, sub, onPress, disabled }: {
  label: string; sub?: string; onPress: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      style={{
        width: 76, height: 76, borderRadius: "50%",
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        transition: "background 0.1s, transform 0.08s",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
      }}
      onMouseDown={e => { if (!disabled) (e.currentTarget.style.transform = "scale(0.94)"); }}
      onMouseUp={e => { (e.currentTarget.style.transform = "scale(1)"); }}
      onTouchStart={e => { if (!disabled) (e.currentTarget.style.transform = "scale(0.94)"); }}
      onTouchEnd={e => { (e.currentTarget.style.transform = "scale(1)"); }}
    >
      <span style={{ fontSize: "1.5rem", fontWeight: 400, color: "var(--text)", lineHeight: 1 }}>
        {label}
      </span>
      {sub && (
        <span style={{ fontSize: "0.55rem", letterSpacing: "0.12em", color: "var(--text-muted)", marginTop: 2 }}>
          {sub}
        </span>
      )}
    </button>
  );
}

// ── Keypad layout ─────────────────────────────────────────────────────────────
const KEYS = [
  ["1",""],["2","ABC"],["3","DEF"],
  ["4","GHI"],["5","JKL"],["6","MNO"],
  ["7","PQRS"],["8","TUV"],["9","WXYZ"],
  ["",""],["0",""],["⌫",""],
];

// ── Main component ────────────────────────────────────────────────────────────
type Mode = "unlock" | "setup" | "confirm";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [ready,        setReady]        = useState(false);
  const [authed,       setAuthed]       = useState(false);
  const [mode,         setMode]         = useState<Mode>("unlock");
  const [pin,          setDigits]       = useState("");
  const [firstPin,     setFirstPin]     = useState("");
  const [error,        setError]        = useState("");
  const [shake,        setShake]        = useState(false);
  const [lockSecs,     setLockSecs]     = useState(0);
  const PIN_LEN = 6;

  // ── Initialise ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPinSet()) { setMode("setup"); setReady(true); return; }
    if (isUnlocked()) { setAuthed(true); setReady(true); return; }
    setMode("unlock");
    setReady(true);
  }, []);

  // ── Lockout countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLockedOut()) return;
    setLockSecs(lockoutSecondsLeft());
    const t = setInterval(() => {
      const s = lockoutSecondsLeft();
      setLockSecs(s);
      if (s <= 0) { clearLockout(); clearInterval(t); }
    }, 1000);
    return () => clearInterval(t);
  }, [error]);

  // ── Trigger shake animation ──────────────────────────────────────────────────
  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  // ── Key press handler ────────────────────────────────────────────────────────
  const handleKey = useCallback(async (key: string) => {
    if (isLockedOut()) return;
    setError("");

    if (key === "⌫") {
      setDigits(p => p.slice(0, -1));
      return;
    }
    if (!/^\d$/.test(key)) return;

    const next = pin + key;
    setDigits(next);
    if (next.length < PIN_LEN) return;

    // Full PIN entered
    if (mode === "unlock") {
      const ok = await verifyPin(next);
      if (ok) {
        clearLockout();
        setUnlocked();
        setAuthed(true);
      } else {
        triggerShake();
        setDigits("");
        const { attempts, lockedUntil } = recordFailedAttempt();
        if (Date.now() < lockedUntil) {
          setError(`Too many attempts. Try again in 30s.`);
          setLockSecs(lockoutSecondsLeft());
        } else {
          const left = MAX_ATTEMPTS - attempts;
          setError(left <= 3 ? `Wrong PIN — ${left} attempt${left !== 1 ? "s" : ""} left` : "Wrong PIN");
        }
      }
    } else if (mode === "setup") {
      setFirstPin(next);
      setDigits("");
      setMode("confirm");
    } else if (mode === "confirm") {
      if (next === firstPin) {
        await setPin(next);
        setAuthed(true);
      } else {
        triggerShake();
        setDigits("");
        setFirstPin("");
        setMode("setup");
        setError("PINs didn't match — try again");
      }
    }
  }, [pin, mode, firstPin]);

  // ── Physical keyboard support ────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) handleKey(e.key);
      if (e.key === "Backspace") handleKey("⌫");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleKey]);

  if (!ready) return null;
  if (authed) return <>{children}</>;

  const title = mode === "setup"
    ? "Create a PIN"
    : mode === "confirm"
    ? "Confirm your PIN"
    : "Enter PIN";

  const subtitle = mode === "setup"
    ? `Choose a ${PIN_LEN}-digit PIN to protect your app`
    : mode === "confirm"
    ? "Enter the same PIN again"
    : "";

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "0 24px",
      userSelect: "none",
    }}>
      {/* App name */}
      <p style={{ fontSize: "1.1rem", fontWeight: 500, color: "var(--primary)", marginBottom: 8, letterSpacing: "0.04em" }}>
        LifeOS
      </p>

      {/* Title */}
      <h1 style={{ fontSize: "1.1rem", fontWeight: 500, color: "var(--text)", margin: 0 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6, textAlign: "center" }}>
          {subtitle}
        </p>
      )}

      {/* Dots */}
      <div style={{ transform: shake ? "translateX(0)" : undefined, animation: shake ? "pin-shake 0.45s ease" : undefined }}>
        <Dots filled={pin.length} total={PIN_LEN} />
      </div>

      {/* Error / lockout */}
      <p style={{
        minHeight: 20, fontSize: "0.8rem", textAlign: "center",
        color: "color-mix(in srgb, var(--urgent) 80%, transparent)",
        margin: "6px 0 20px",
      }}>
        {lockSecs > 0 ? `Locked — try again in ${lockSecs}s` : error}
      </p>

      {/* Keypad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 76px)", gap: 14 }}>
        {KEYS.map(([label, sub], i) => {
          if (!label) return <div key={i} />;
          return (
            <Key
              key={i}
              label={label}
              sub={sub || undefined}
              disabled={isLockedOut() || (label !== "⌫" && pin.length >= PIN_LEN)}
              onPress={() => handleKey(label)}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes pin-shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-8px); }
          30%      { transform: translateX(8px); }
          45%      { transform: translateX(-6px); }
          60%      { transform: translateX(6px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
