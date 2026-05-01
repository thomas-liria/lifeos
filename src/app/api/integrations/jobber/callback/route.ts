export const dynamic = "force-dynamic";

const CLIENT_ID     = process.env.JOBBER_CLIENT_ID!;
const CLIENT_SECRET = process.env.JOBBER_CLIENT_SECRET!;
const CALLBACK_URL  = process.env.JOBBER_REDIRECT_URI ?? "https://lifeos.vercel.app/api/integrations/jobber/callback";
const TOKEN_URL     = "https://api.getjobber.com/api/oauth/token";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return Response.redirect(`/settings?error=jobber_${error ?? "no_code"}`, 302);
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  CALLBACK_URL,
        code,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[jobber/callback] token exchange failed:", res.status, text);
      return Response.redirect("/settings?error=jobber_token_exchange", 302);
    }

    const data: {
      access_token:  string;
      refresh_token: string;
      expires_in:    number;
    } = await res.json();

    const payload = {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:    Date.now() + data.expires_in * 1_000,
      connectedAt:  Date.now(),
    };

    // Encode as base64 and pass via URL hash (never sent to server)
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
    return Response.redirect(`/auth/jobber-success#${encoded}`, 302);

  } catch (err) {
    console.error("[jobber/callback]", err);
    return Response.redirect("/settings?error=jobber_callback_exception", 302);
  }
}
