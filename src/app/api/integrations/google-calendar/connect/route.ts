// Force dynamic so env vars are resolved at request time, not build time
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  if (!clientId) {
    return Response.json({ error: "GOOGLE_CLIENT_ID is not configured" }, { status: 500 });
  }

  const origin      = new URL(request.url).origin;
  const redirectUri = `${origin}/api/integrations/google-calendar/callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/calendar.readonly",
    access_type:   "offline",
    // "consent" forces Google to always return a refresh_token,
    // even if the user already granted access once before.
    prompt:        "consent",
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return Response.redirect(googleAuthUrl, 302);
}
