import type { JobberTokens, UpdatedJobberToken } from "./types";

const TOKEN_URL      = "https://api.getjobber.com/api/oauth/token";
const BUFFER_MS      = 60_000; // refresh 60 s before expiry
const CLIENT_ID      = process.env.JOBBER_CLIENT_ID!;
const CLIENT_SECRET  = process.env.JOBBER_CLIENT_SECRET!;

/** Thrown when the refresh token is invalid/expired — caller should re-auth */
export class TokenExpiredError extends Error {
  constructor() { super("TOKEN_EXPIRED"); this.name = "TokenExpiredError"; }
}

export async function getValidToken(tokens: JobberTokens): Promise<{
  accessToken:   string;
  updatedTokens: UpdatedJobberToken | null;
}> {
  // Token still valid
  if (Date.now() + BUFFER_MS < tokens.expiresAt) {
    return { accessToken: tokens.accessToken, updatedTokens: null };
  }

  // Refresh
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: tokens.refreshToken,
    }),
  });

  if (!res.ok) {
    // 401 = refresh token invalid/expired → signal re-auth needed
    if (res.status === 401) throw new TokenExpiredError();
    const text = await res.text().catch(() => "");
    throw new Error(`Jobber token refresh failed ${res.status}: ${text}`);
  }

  const data: { access_token: string; refresh_token?: string; expires_in: number } = await res.json();
  const updatedTokens: UpdatedJobberToken = {
    accessToken:  data.access_token,
    // Jobber uses rotating refresh tokens — always persist the new one
    refreshToken: data.refresh_token ?? tokens.refreshToken,
    expiresAt:    Date.now() + data.expires_in * 1_000,
  };

  return { accessToken: updatedTokens.accessToken, updatedTokens };
}
