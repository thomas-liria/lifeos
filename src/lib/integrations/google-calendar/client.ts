import type { CalendarTokens, UpdatedToken } from "./types";

// Refresh the access token this many ms before it actually expires
const BUFFER_MS = 60_000;

export interface TokenResult {
  accessToken:    string;
  updatedTokens?: UpdatedToken; // only present when a refresh occurred
}

/**
 * Returns a valid access token, refreshing automatically if the stored one
 * is expired or about to expire.  Throws if the refresh fails.
 */
export async function getValidToken(tokens: CalendarTokens): Promise<TokenResult> {
  // Still valid — return as-is
  if (Date.now() + BUFFER_MS < tokens.expiresAt) {
    return { accessToken: tokens.accessToken };
  }

  // Expired → refresh
  const clientId     = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not configured");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refreshToken,
      grant_type:    "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  const data: { access_token: string; expires_in?: number } = await res.json();
  const newExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1_000;

  return {
    accessToken:    data.access_token,
    updatedTokens:  { accessToken: data.access_token, expiresAt: newExpiresAt },
  };
}
