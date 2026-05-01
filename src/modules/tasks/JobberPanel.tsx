"use client";

import { useJobberData } from "./useJobberData";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(amount);
}

function formatJobDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatRequestDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Styles (inline, matching app's forest/bark design system) ─────────────────

const card: React.CSSProperties = {
  background:   "var(--surface)",
  border:       "0.5px solid var(--border)",
  borderRadius:  16,
  padding:       "16px 18px",
  marginBottom:  10,
};

const sectionTitle: React.CSSProperties = {
  fontSize:    "0.7rem",
  fontWeight:  500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color:       "var(--text-muted)",
  marginBottom: 10,
};

const row: React.CSSProperties = {
  display:        "flex",
  justifyContent: "space-between",
  alignItems:     "flex-start",
  padding:        "8px 0",
  borderBottom:   "0.5px solid var(--border)",
};

const rowLast: React.CSSProperties = { ...row, borderBottom: "none" };

const label: React.CSSProperties = {
  fontSize:  "0.875rem",
  color:     "var(--text)",
  fontWeight: 400,
};

const sub: React.CSSProperties = {
  fontSize: "0.75rem",
  color:    "var(--text-muted)",
  marginTop: 2,
};

const urgentAmount: React.CSSProperties = {
  fontSize:  "0.875rem",
  fontWeight: 500,
  color:     "var(--urgent)",
};

const normalAmount: React.CSSProperties = {
  fontSize:  "0.875rem",
  fontWeight: 500,
  color:     "var(--text-muted)",
};

const chip: React.CSSProperties = {
  display:      "inline-block",
  background:   "color-mix(in srgb, var(--urgent) 12%, transparent)",
  color:        "var(--urgent)",
  borderRadius:  8,
  padding:      "1px 7px",
  fontSize:     "0.7rem",
  fontWeight:    500,
  marginLeft:    6,
};

// ── Component ─────────────────────────────────────────────────────────────────
export function JobberPanel() {
  const { data, loading, error } = useJobberData();

  if (loading) {
    return (
      <div style={{ ...card, opacity: 0.6 }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Loading Jobber data…</p>
      </div>
    );
  }

  const { overdueInvoices, upcomingJobs, recentRequests, outstandingBalance, isMock } = data;
  const hasOverdue  = overdueInvoices.length > 0;
  const hasJobs     = upcomingJobs.length     > 0;
  const hasRequests = recentRequests.length   > 0;

  return (
    <div>
      {/* Mock / error banner */}
      {isMock && (
        <div style={{
          background:   "color-mix(in srgb, var(--urgent) 10%, transparent)",
          border:       "0.5px solid color-mix(in srgb, var(--urgent) 30%, transparent)",
          borderRadius:  12,
          padding:      "8px 14px",
          marginBottom:  12,
          fontSize:     "0.8rem",
          color:        "var(--urgent)",
        }}>
          Showing sample data — connect Jobber in Settings to see live data
        </div>
      )}
      {error && (
        <div style={{
          background:   "color-mix(in srgb, var(--urgent) 10%, transparent)",
          border:       "0.5px solid color-mix(in srgb, var(--urgent) 30%, transparent)",
          borderRadius:  12,
          padding:      "8px 14px",
          marginBottom:  12,
          fontSize:     "0.75rem",
          color:        "var(--urgent)",
          wordBreak:    "break-all",
        }}>
          {error}
        </div>
      )}

      {/* Outstanding balance */}
      <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ ...sectionTitle, marginBottom: 2 }}>Outstanding balance</p>
          <p style={{
            fontSize:   "1.5rem",
            fontWeight:  500,
            color:      hasOverdue ? "var(--urgent)" : "var(--text)",
            lineHeight:  1.2,
          }}>
            {formatCurrency(outstandingBalance)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Overdue invoices */}
      {hasOverdue && (
        <div style={card}>
          <p style={sectionTitle}>Overdue invoices</p>
          {overdueInvoices.map((inv, i) => (
            <div key={inv.id} style={i === overdueInvoices.length - 1 ? rowLast : row}>
              <div>
                <p style={label}>
                  {inv.clientName}
                  <span style={chip}>{inv.daysOverdue}d overdue</span>
                </p>
                <p style={sub}>{inv.invoiceNumber}</p>
              </div>
              <p style={urgentAmount}>{formatCurrency(inv.total)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming jobs */}
      {hasJobs && (
        <div style={card}>
          <p style={sectionTitle}>Upcoming jobs</p>
          {upcomingJobs.map((job, i) => (
            <div key={job.id} style={i === upcomingJobs.length - 1 ? rowLast : row}>
              <div>
                <p style={label}>{job.title}</p>
                <p style={sub}>{job.clientName}</p>
              </div>
              <p style={normalAmount}>{formatJobDate(job.scheduledStart)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent requests */}
      {hasRequests && (
        <div style={card}>
          <p style={sectionTitle}>Pending requests</p>
          {recentRequests.map((req, i) => (
            <div key={req.id} style={i === recentRequests.length - 1 ? rowLast : row}>
              <div>
                <p style={label}>{req.clientName}</p>
                <p style={sub}>{req.description}</p>
              </div>
              <p style={normalAmount}>{formatRequestDate(req.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {!hasOverdue && !hasJobs && !hasRequests && (
        <div style={{ ...card, textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
          All caught up — no overdue invoices or upcoming jobs
        </div>
      )}
    </div>
  );
}
