import { getValidToken } from "@/lib/integrations/jobber/client";
import type { JobberTokens } from "@/lib/integrations/jobber/types";

export const dynamic = "force-dynamic";

const GRAPHQL_URL = "https://api.getjobber.com/api/graphql";

// ── GraphQL response shapes ───────────────────────────────────────────────────

interface GQLAmounts {
  invoiceAmount?:  number;
  paymentsTotal?:  number;
  outstanding?:    number;
}

interface GQLInvoice {
  id:            string;
  invoiceNumber?: string;
  status?:        string;
  dueDate?:       string;
  amounts?:       GQLAmounts;
  client?:        { name: string };
}

interface GQLJob {
  id:      string;
  title:   string;
  startAt?: string;
  client?: { name: string };
}

interface GQLRequest {
  id:         string;
  title?:     string;
  createdAt?: string;
  client?:    { name: string };
}

interface GQLQueryResponse {
  data?: {
    invoices?: { nodes?: GQLInvoice[] };
    jobs?:     { nodes?: GQLJob[]     };
    requests?: { nodes?: GQLRequest[] };
  };
  errors?: Array<{ message: string; locations?: unknown; path?: unknown }>;
}

// ── GraphQL query — uses confirmed Jobber public API field names ───────────────

const QUERY = /* graphql */ `
  query LifeOSWeedGuys {
    invoices(first: 50) {
      nodes {
        id
        invoiceNumber
        status
        dueDate
        amounts {
          invoiceAmount
          paymentsTotal
          outstanding
        }
        client { name }
      }
    }
    jobs(filter: { status: [SCHEDULED, IN_PROGRESS] }, first: 10) {
      nodes {
        id
        title
        startAt
        client { name }
      }
    }
    requests(filter: { status: PENDING }, first: 5) {
      nodes {
        id
        title
        createdAt
        client { name }
      }
    }
  }
`;

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

    // ── Execute GraphQL ───────────────────────────────────────────────────────
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type":            "application/json",
        "Authorization":           `Bearer ${validToken}`,
        "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
      },
      body: JSON.stringify({ query: QUERY }),
    });

    const rawText = await res.text();

    if (!res.ok) {
      console.error("[jobber/data] HTTP error:", res.status, rawText.slice(0, 500));
      return Response.json(
        { error: `Jobber API error ${res.status}`, detail: rawText.slice(0, 500) },
        { status: res.status },
      );
    }

    let gql: GQLQueryResponse;
    try {
      gql = JSON.parse(rawText);
    } catch {
      console.error("[jobber/data] JSON parse failed:", rawText.slice(0, 500));
      return Response.json({ error: "Invalid JSON from Jobber", detail: rawText.slice(0, 500) }, { status: 502 });
    }

    if (gql.errors?.length) {
      console.error("[jobber/data] GraphQL errors:", JSON.stringify(gql.errors));
      // Return errors to client so we can debug without server logs
      return Response.json(
        { error: "GraphQL errors", detail: gql.errors, raw: gql },
        { status: 422 },
      );
    }

    // ── Parse invoices (filter past-due client-side from AWAITING_PAYMENT) ────
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const invoiceNodes = gql.data?.invoices?.nodes ?? [];

    const overdueInvoices = invoiceNodes
      .filter((inv) => {
        if (!inv.dueDate) return false;
        const outstanding = inv.amounts?.outstanding ?? 0;
        if (outstanding <= 0) return false;           // fully paid — skip
        return new Date(inv.dueDate + "T00:00:00").getTime() < today.getTime();
      })
      .map((inv) => {
        const dueDate     = inv.dueDate ?? "";
        const daysOverdue = Math.max(0, Math.floor(
          (today.getTime() - new Date(dueDate + "T00:00:00").getTime()) / 86_400_000,
        ));
        const total = inv.amounts?.outstanding ?? inv.amounts?.invoiceAmount ?? 0;
        return {
          id:            inv.id,
          invoiceNumber: inv.invoiceNumber ?? `#${inv.id.slice(-4)}`,
          clientName:    inv.client?.name ?? "Unknown",
          total,
          dueDate,
          daysOverdue,
        };
      });

    // ── Parse upcoming jobs ───────────────────────────────────────────────────
    const upcomingJobs = (gql.data?.jobs?.nodes ?? []).map((job) => ({
      id:             job.id,
      title:          job.title,
      clientName:     job.client?.name ?? "Unknown",
      scheduledStart: job.startAt ?? "",
    }));

    // ── Parse requests ────────────────────────────────────────────────────────
    const recentRequests = (gql.data?.requests?.nodes ?? []).map((req) => ({
      id:          req.id,
      clientName:  req.client?.name ?? "Unknown",
      description: req.title ?? "New request",
      createdAt:   req.createdAt ?? "",
    }));

    const outstandingBalance = overdueInvoices.reduce((s, inv) => s + inv.total, 0);

    console.log(`[jobber/data] ${overdueInvoices.length} overdue, ${upcomingJobs.length} jobs, ${recentRequests.length} requests`);

    return Response.json({
      overdueInvoices,
      upcomingJobs,
      recentRequests,
      outstandingBalance,
      updatedTokens: updatedTokens ?? null,
    });

  } catch (err) {
    console.error("[jobber/data] Uncaught:", err);
    return Response.json({ error: "Failed to fetch Jobber data", detail: String(err) }, { status: 500 });
  }
}
