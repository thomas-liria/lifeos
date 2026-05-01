import { getValidToken } from "@/lib/integrations/jobber/client";
import type { JobberTokens, UpdatedJobberToken } from "@/lib/integrations/jobber/types";

export const dynamic = "force-dynamic";

const GRAPHQL_URL = "https://api.getjobber.com/api/graphql";

// ── GraphQL response shapes ───────────────────────────────────────────────────

interface GQLMoney { value: number }
interface GQLDate  { value: string }

interface GQLInvoice {
  id:         string;
  invoiceNet: string;
  dueDate?:   GQLDate;
  total?:     GQLMoney;
  balance?:   GQLMoney;
  client?:    { name: string };
}

interface GQLJob {
  id:             string;
  title:          string;
  startAt?:       string;
  scheduledStart?: string;
  client?:        { name: string };
}

interface GQLRequest {
  id:          string;
  title?:      string;
  createdAt?:  string;
  client?:     { name: string };
}

interface GQLQueryResponse {
  data?: {
    invoices?: {
      nodes?: GQLInvoice[];
    };
    jobs?: {
      nodes?: GQLJob[];
    };
    requests?: {
      nodes?: GQLRequest[];
    };
  };
  errors?: Array<{ message: string }>;
}

// ── GraphQL query ─────────────────────────────────────────────────────────────

const QUERY = /* graphql */ `
  query LifeOSWeedGuys {
    invoices(filter: { status: [PAST_DUE] }, first: 10, sort: { field: INVOICE_DATE, direction: ASC }) {
      nodes {
        id
        invoiceNet
        dueDate { value }
        total   { value }
        balance { value }
        client  { name }
      }
    }
    jobs(filter: { status: [SCHEDULED, IN_PROGRESS] }, first: 10, sort: { field: START_AT, direction: ASC }) {
      nodes {
        id
        title
        startAt
        client { name }
      }
    }
    requests(filter: { status: [PENDING] }, first: 5, sort: { field: CREATED_AT, direction: DESC }) {
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

    // ── Execute GraphQL query ─────────────────────────────────────────────────
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${validToken}`,
        "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
      },
      body: JSON.stringify({ query: QUERY }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[jobber/data] GraphQL request failed:", res.status, text);
      return Response.json({ error: `Jobber API error: ${res.status}` }, { status: res.status });
    }

    const gql: GQLQueryResponse = await res.json();

    if (gql.errors?.length) {
      console.error("[jobber/data] GraphQL errors:", gql.errors);
    }

    const invoiceNodes = gql.data?.invoices?.nodes ?? [];
    const jobNodes     = gql.data?.jobs?.nodes     ?? [];
    const reqNodes     = gql.data?.requests?.nodes ?? [];

    // ── Parse overdue invoices ────────────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = invoiceNodes.map((inv) => {
      const dueDate     = inv.dueDate?.value ?? "";
      const daysOverdue = dueDate
        ? Math.max(0, Math.floor((today.getTime() - new Date(dueDate + "T00:00:00").getTime()) / 86_400_000))
        : 0;
      return {
        id:            inv.id,
        invoiceNumber: inv.invoiceNet ?? inv.id,
        clientName:    inv.client?.name ?? "Unknown",
        total:         inv.total?.value  ?? inv.balance?.value ?? 0,
        dueDate,
        daysOverdue,
      };
    });

    // ── Parse upcoming jobs ───────────────────────────────────────────────────
    const upcomingJobs = jobNodes.map((job) => ({
      id:             job.id,
      title:          job.title,
      clientName:     job.client?.name  ?? "Unknown",
      scheduledStart: job.startAt       ?? "",
    }));

    // ── Parse recent requests ─────────────────────────────────────────────────
    const recentRequests = reqNodes.map((req) => ({
      id:          req.id,
      clientName:  req.client?.name ?? "Unknown",
      description: req.title        ?? "New request",
      createdAt:   req.createdAt    ?? "",
    }));

    // ── Outstanding balance ───────────────────────────────────────────────────
    const outstandingBalance = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);

    console.log(`[jobber/data] ${overdueInvoices.length} overdue invoices, ${upcomingJobs.length} jobs, ${recentRequests.length} requests`);

    return Response.json({
      overdueInvoices,
      upcomingJobs,
      recentRequests,
      outstandingBalance,
      updatedTokens: updatedTokens ?? null,
    });

  } catch (err) {
    console.error("[jobber/data]", err);
    return Response.json({ error: "Failed to fetch Jobber data" }, { status: 500 });
  }
}
