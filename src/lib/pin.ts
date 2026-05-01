// PIN is stored as a SHA-256 hash in localStorage — the raw digits are never
// persisted anywhere. The hash is computed entirely in the browser.

const STORAGE_KEY  = "lifeos_pin_hash";
const SESSION_KEY  = "lifeos_pin_unlocked"; // sessionStorage — clears on tab close
const MAX_ATTEMPTS = 10;
const LOCKOUT_KEY  = "lifeos_pin_lockout";

// ── Hashing ───────────────────────────────────────────────────────────────────

export async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(pin + "lifeos-salt-v1"),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Setup ─────────────────────────────────────────────────────────────────────

export function isPinSet(): boolean {
  try { return Boolean(localStorage.getItem(STORAGE_KEY)); } catch { return false; }
}

export async function setPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  localStorage.setItem(STORAGE_KEY, hash);
  sessionStorage.setItem(SESSION_KEY, "1");
}

export async function changePin(currentPin: string, newPin: string): Promise<boolean> {
  const valid = await verifyPin(currentPin);
  if (!valid) return false;
  await setPin(newPin);
  return true;
}

export function removePin(): void {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Verification ──────────────────────────────────────────────────────────────

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  const hash = await hashPin(pin);
  return hash === stored;
}

// ── Session unlock (persists until tab closes) ────────────────────────────────

export function isUnlocked(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
}

export function setUnlocked(): void {
  try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
}

export function lock(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

// ── Lockout (after too many wrong attempts) ───────────────────────────────────

interface LockoutData { attempts: number; lockedUntil: number }

export function getLockout(): LockoutData {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { attempts: 0, lockedUntil: 0 };
}

export function recordFailedAttempt(): LockoutData {
  const data = getLockout();
  data.attempts += 1;
  // Lock for 30 s after every 5 failed attempts
  if (data.attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + 30_000;
    data.attempts = 0;
  }
  try { localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data)); } catch {}
  return data;
}

export function clearLockout(): void {
  try { localStorage.removeItem(LOCKOUT_KEY); } catch {}
}

export function isLockedOut(): boolean {
  const { lockedUntil } = getLockout();
  return Date.now() < lockedUntil;
}

export function lockoutSecondsLeft(): number {
  const { lockedUntil } = getLockout();
  return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
}

export { MAX_ATTEMPTS };
