export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);

  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  const failUrl = `${origin}/settings?error=google-calendar-failed`;

  if (error || !code) {
    console.error("[gcal/callback] OAuth error:", error ?? "missing code");
    return Response.redirect(failUrl, 302);
  }

  const clientId     = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    console.error("[gcal/callback] Missing OAuth credentials");
    return Response.redirect(failUrl, 302);
  }

  const redirectUri = `${origin}/api/integrations/google-calendar/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });

    const tokenData: {
      access_token?:  string;
      refresh_token?: string;
      expires_in?:    number;
      error?:         string;
    } = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[gcal/callback] Token exchange failed:", tokenData.error);
      return Response.redirect(failUrl, 302);
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt    = Date.now() + (expires_in ?? 3600) * 1_000;
    const connectedAt  = Date.now();

    // Encode token payload as base64 JSON and pass via URL hash.
    // Hash fragments are never sent to any server — they exist only in the browser.
    const payload = Buffer.from(JSON.stringify({
      accessToken:  access_token,
      refreshToken: refresh_token ?? "",
      expiresAt,
      connectedAt,
    })).toString("base64");

    // Redirect to client-side success page which writes to localStorage
    const successUrl = `${origin}/auth/gcal-success#${payload}`;
    return Response.redirect(successUrl, 302);

  } catch (err) {
    console.error("[gcal/callback] Unexpected error:", err);
    return Response.redirect(failUrl, 302);
  }
}
