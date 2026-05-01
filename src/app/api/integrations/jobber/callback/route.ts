export const dynamic = "force-dynamic";

const CLIENT_ID     = process.env.JOBBER_CLIENT_ID!;
const CLIENT_SECRET = process.env.JOBBER_CLIENT_SECRET!;
const CALLBACK_URL  = process.env.JOBBER_REDIRECT_URI ?? "https://lifeos-seven-woad.vercel.app/api/integrations/jobber/callback";
const TOKEN_URL     = "https://api.getjobber.com/api/oauth/token";

// Resolve absolute URL from the incoming request origin
function abs(request: Request, path: string): string {
  const { origin } = new URL(request.url);
  return `${origin}${path}`;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return Response.redirect(abs(request, `/settings?error=jobber_${error ?? "no_code"}`), 302);
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
      return Response.redirect(abs(request, "/settings?error=jobber_token_exchange"), 302);
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

    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
    // Pass token via cookie (hash fragments are stripped by some CDNs/redirects)
    const headers = new Headers({
      Location:    abs(request, "/auth/jobber-success"),
      "Set-Cookie": `lifeos_jobber_pending=${encoded}; Path=/; SameSite=Lax; Max-Age=120`,
    });
    return new Response(null, { status: 302, headers });

  } catch (err) {
    console.error("[jobber/callback]", err);
    return Response.redirect(abs(request, "/settings?error=jobber_callback_exception"), 302);
  }
}
