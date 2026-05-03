import { getValidToken, TokenExpiredError } from "@/lib/integrations/jobber/client";
import type { JobberTokens } from "@/lib/integrations/jobber/types";

export const dynamic = "force-dynamic";

const GRAPHQL_URL = "https://api.getjobber.com/api/graphql";

// ── GraphQL response shapes ───────────────────────────────────────────────────

interface GQLInvoice {
  id:             string;
  invoiceNumber?: string;
  dueDate?:       string;
  total?:         number;
  client?:        { name: string };
}

interface GQLJob {
  id:             string;
  title:          string;
  scheduledStart?: string;
  scheduledEnd?:   string;
  client?:        { name: string };
}

interface GQLRequest {
  id:         string;
  title?:     string;
  createdAt?: string;
  status?:    string;
  client?:    { name: string };
}

interface GQLQueryResponse {
  data?: {
    invoices?: { nodes?: GQLInvoice[] };
    jobs?:     { nodes?: GQLJob[]     };
    requests?: { nodes?: GQLRequest[] };
  };
  errors?: Array<{ message: string; locations?: unknown; path?: unknown; extensions?: unknown }>;
}

// ── Build date strings for query variables ────────────────────────────────────
function buildDateVars() {
  const today   = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const fmt = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

  return {
    today:        fmt(today),
    weekEnd:      fmt(weekEnd),
    sevenDaysAgo: fmt(sevenDaysAgo),
  };
}

// ── Queries — split so one bad field doesn't kill all three ──────────────────

const INVOICE_QUERY = /* graphql */ `
  query LifeOSInvoices {
    invoices(first: 50) {
      nodes {
        id
        invoiceNumber
        dueDate
        total
        client { name }
      }
    }
  }
`;

const JOBS_QUERY = /* graphql */ `
  query LifeOSJobs($today: Date!, $weekEnd: Date!) {
    jobs(filter: { scheduledStart: { gt: $today, lt: $weekEnd } }, first: 20) {
      nodes {
        id
        title
        scheduledStart
        scheduledEnd
        client { name }
      }
    }
  }
`;

const REQUESTS_QUERY = /* graphql */ `
  query LifeOSRequests($sevenDaysAgo: Date!) {
    requests(filter: { createdAt: { gt: $sevenDaysAgo } }, first: 10) {
      nodes {
        id
        title
        createdAt
        client { name }
      }
    }
  }
`;

// ── Helper: run one GraphQL query ─────────────────────────────────────────────
async function runQuery<T>(
  token: string,
  query: string,
  variables: Record<string, string> = {},
  label: string,
): Promise<{ data: T | null; errors: GQLQueryResponse["errors"] }> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type":             "application/json",
      "Authorization":            `Bearer ${token}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
    },
    body: JSON.stringify({ query, variables }),
  });

  const rawText = await res.text();
  console.log(`[jobber/data] ${label} HTTP ${res.status} — raw:`, rawText.slice(0, 1000));

  if (!res.ok) {
    console.error(`[jobber/data] ${label} HTTP error ${res.status}`);
    return { data: null, errors: [{ message: `HTTP ${res.status}: ${rawText.slice(0, 200)}` }] };
  }

  let parsed: GQLQueryResponse;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error(`[jobber/data] ${label} JSON parse error`);
    return { data: null, errors: [{ message: "JSON parse failed" }] };
  }

  if (parsed.errors?.length) {
    console.error(`[jobber/data] ${label} GraphQL errors:`, JSON.stringify(parsed.errors));
  }

  return { data: parsed.data as T, errors: parsed.errors };
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request): Promise<Response> {
  try {
    const headers      = request.headers;
    const authHeader   = headers.get("authorization") ?? "";
    const refreshToken = headers.get("x-refresh-token") ?? "";
    const expiresAtRaw = headers.get("x-token-expires-at");

    if (!authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }

    const accessToken = authHeader.slice(7);
    const expiresAt   = expiresAtRaw ? Number(expiresAtRaw) : 0;

    const tokens: JobberTokens = { accessToken, refreshToken, expiresAt };
    const { accessToken: validToken, updatedTokens } = await getValidToken(tokens);

    const { today, weekEnd, sevenDaysAgo } = buildDateVars();
    console.log(`[jobber/data] Fetching — today=${today} weekEnd=${weekEnd} sevenDaysAgo=${sevenDaysAgo}`);

    // ── Run all three queries in parallel (failures are isolated) ─────────────
    const [invoicesResult, jobsResult, requestsResult] = await Promise.all([
      runQuery<{ invoices: { nodes: GQLInvoice[] } }>(
        validToken, INVOICE_QUERY, {}, "invoices"
      ),
      runQuery<{ jobs: { nodes: GQLJob[] } }>(
        validToken, JOBS_QUERY, { today, weekEnd }, "jobs"
      ),
      runQuery<{ requests: { nodes: GQLRequest[] } }>(
        validToken, REQUESTS_QUERY, { sevenDaysAgo }, "requests"
      ),
    ]);

    // ── Collect any GraphQL errors to surface in the panel ────────────────────
    const allErrors: string[] = [];
    if (invoicesResult.errors?.length) {
      allErrors.push(`invoices: ${invoicesResult.errors.map((e) => e.message).join("; ")}`);
    }
    if (jobsResult.errors?.length) {
      allErrors.push(`jobs: ${jobsResult.errors.map((e) => e.message).join("; ")}`);
    }
    if (requestsResult.errors?.length) {
      allErrors.push(`requests: ${requestsResult.errors.map((e) => e.message).join("; ")}`);
    }

    // ── Parse invoices ────────────────────────────────────────────────────────
    const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
    const invoiceNodes = invoicesResult.data?.invoices?.nodes ?? [];

    console.log(`[jobber/data] invoices raw count: ${invoiceNodes.length}`);
    invoiceNodes.forEach((inv, i) => {
      console.log(`[jobber/data]   invoice[${i}]:`, JSON.stringify({
        id: inv.id, invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate, total: inv.total,
        client: inv.client?.name,
      }));
    });

    // All invoices with a balance — for outstanding total
    const unpaidInvoices = invoiceNodes.filter((inv) => (inv.total ?? 0) > 0);

    // Subset that are also past due — for the overdue section
    const overdueInvoices = unpaidInvoices
      .filter((inv) => {
        if (!inv.dueDate) return false;
        return new Date(inv.dueDate + "T00:00:00").getTime() < todayDate.getTime();
      })
      .map((inv) => {
        const dueDate     = inv.dueDate ?? "";
        const daysOverdue = Math.max(0, Math.floor(
          (todayDate.getTime() - new Date(dueDate + "T00:00:00").getTime()) / 86_400_000,
        ));
        return {
          id:            inv.id,
          invoiceNumber: inv.invoiceNumber ?? `#${inv.id.slice(-4)}`,
          clientName:    inv.client?.name ?? "Unknown",
          total:         inv.total ?? 0,
          dueDate,
          daysOverdue,
        };
      });

    // Outstanding = ALL unpaid invoices (not just overdue)
    const outstandingBalance = unpaidInvoices.reduce((s, inv) => s + (inv.total ?? 0), 0);

    // ── Parse jobs ────────────────────────────────────────────────────────────
    const jobNodes = jobsResult.data?.jobs?.nodes ?? [];
    console.log(`[jobber/data] jobs raw count: ${jobNodes.length}`);
    jobNodes.forEach((job, i) => {
      console.log(`[jobber/data]   job[${i}]:`, JSON.stringify({
        id: job.id, title: job.title,
        scheduledStart: job.scheduledStart, client: job.client?.name,
      }));
    });

    const upcomingJobs = jobNodes
      .slice(0, 10)
      .map((job) => ({
        id:             job.id,
        title:          job.title,
        clientName:     job.client?.name ?? "Unknown",
        scheduledStart: job.scheduledStart ?? "",
      }));

    // ── Parse requests ────────────────────────────────────────────────────────
    const reqNodes = requestsResult.data?.requests?.nodes ?? [];
    console.log(`[jobber/data] requests raw count: ${reqNodes.length}`);
    reqNodes.forEach((req, i) => {
      console.log(`[jobber/data]   request[${i}]:`, JSON.stringify({
        id: req.id, title: req.title, createdAt: req.createdAt, status: req.status,
      }));
    });

    const recentRequests = reqNodes
      .slice(0, 5)
      .map((req) => ({
        id:          req.id,
        clientName:  req.client?.name ?? "Unknown",
        description: req.title ?? "New request",
        createdAt:   req.createdAt ?? "",
      }));

    const syncedAt = Date.now();
    console.log(`[jobber/data] done — ${overdueInvoices.length} overdue / ${unpaidInvoices.length} unpaid / ${upcomingJobs.length} jobs / ${recentRequests.length} requests — outstandingBalance: ${outstandingBalance}`);

    return Response.json({
      overdueInvoices,
      upcomingJobs,
      recentRequests,
      outstandingBalance,
      unpaidCount:   unpaidInvoices.length,
      syncedAt,
      updatedTokens: updatedTokens ?? null,
      // Surface non-fatal schema errors so the panel can show a warning
      schemaWarnings: allErrors.length > 0 ? allErrors : undefined,
    });

  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return Response.json({ error: "TOKEN_EXPIRED" }, { status: 401 });
    }
    console.error("[jobber/data] Uncaught:", err);
    return Response.json({ error: "Failed to fetch Jobber data", detail: String(err) }, { status: 500 });
  }
}
