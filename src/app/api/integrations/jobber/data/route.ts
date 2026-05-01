import { getValidToken, TokenExpiredError } from "@/lib/integrations/jobber/client";
import type { JobberTokens } from "@/lib/integrations/jobber/types";

export const dynamic = "force-dynamic";

const GRAPHQL_URL = "https://api.getjobber.com/api/graphql";

// ── GraphQL response shapes ───────────────────────────────────────────────────

interface GQLAmounts {
  invoiceBalance?: number;
}

interface GQLInvoice {
  id:             string;
  invoiceNumber?: string;
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

// ── GraphQL query — no enum filters (schema unknown; filter client-side) ──────

const QUERY = /* graphql */ `
  query LifeOSWeedGuys {
    invoices(first: 50) {
      nodes {
        id
        invoiceNumber
        dueDate
        amounts {
          invoiceBalance
        }
        client { name }
      }
    }
    jobs(first: 20) {
      nodes {
        id
        title
        startAt
        client { name }
      }
    }
    requests(first: 10) {
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
        "Content-Type":             "application/json",
        "Authorization":            `Bearer ${validToken}`,
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
      return Response.json(
        { error: "GraphQL errors", detail: gql.errors },
        { status: 422 },
      );
    }

    // ── Invoices: filter client-side for past-due with a balance ─────────────
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const invoiceNodes = gql.data?.invoices?.nodes ?? [];

    const overdueInvoices = invoiceNodes
      .filter((inv) => {
        if (!inv.dueDate) return false;
        if ((inv.amounts?.invoiceBalance ?? 0) <= 0) return false;
        return new Date(inv.dueDate + "T00:00:00").getTime() < today.getTime();
      })
      .map((inv) => {
        const dueDate     = inv.dueDate ?? "";
        const daysOverdue = Math.max(0, Math.floor(
          (today.getTime() - new Date(dueDate + "T00:00:00").getTime()) / 86_400_000,
        ));
        return {
          id:            inv.id,
          invoiceNumber: inv.invoiceNumber ?? `#${inv.id.slice(-4)}`,
          clientName:    inv.client?.name ?? "Unknown",
          total:         inv.amounts?.invoiceBalance ?? 0,
          dueDate,
          daysOverdue,
        };
      });

    // ── Jobs: filter client-side for upcoming (startAt in the future) ─────────
    const upcomingJobs = (gql.data?.jobs?.nodes ?? [])
      .filter((job) => {
        if (!job.startAt) return false;
        return new Date(job.startAt).getTime() >= Date.now();
      })
      .slice(0, 10)
      .map((job) => ({
        id:             job.id,
        title:          job.title,
        clientName:     job.client?.name ?? "Unknown",
        scheduledStart: job.startAt ?? "",
      }));

    // ── Requests: take most recent 5 ─────────────────────────────────────────
    const recentRequests = (gql.data?.requests?.nodes ?? [])
      .slice(0, 5)
      .map((req) => ({
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
    if (err instanceof TokenExpiredError) {
      return Response.json({ error: "TOKEN_EXPIRED" }, { status: 401 });
    }
    console.error("[jobber/data] Uncaught:", err);
    return Response.json({ error: "Failed to fetch Jobber data", detail: String(err) }, { status: 500 });
  }
}
