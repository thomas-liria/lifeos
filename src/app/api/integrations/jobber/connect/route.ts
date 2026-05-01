export const dynamic = "force-dynamic";

const CLIENT_ID    = process.env.JOBBER_CLIENT_ID!;
const CALLBACK_URL = process.env.JOBBER_REDIRECT_URI ?? "https://lifeos.vercel.app/api/integrations/jobber/callback";

export async function GET(): Promise<Response> {
  const params = new URLSearchParams({
    response_type: "code",
    client_id:     CLIENT_ID,
    redirect_uri:  CALLBACK_URL,
  });

  const url = `https://api.getjobber.com/api/oauth/authorize?${params}`;
  return Response.redirect(url, 302);
}
