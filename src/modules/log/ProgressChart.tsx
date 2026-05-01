"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DATA = [
  { date: "Apr 1",  weight: 175 },
  { date: "Apr 5",  weight: 175 },
  { date: "Apr 10", weight: 180 },
  { date: "Apr 14", weight: 180 },
  { date: "Apr 18", weight: 185 },
  { date: "Apr 22", weight: 185 },
];

export default function ProgressChart() {
  const [open,    setOpen]    = useState(false);
  const [mounted, setMounted] = useState(false);

  /* Recharts uses browser APIs — guard against SSR */
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="mx-4 mt-3 bg-surface border border-[0.5px] border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5
          hover:bg-primary/3 transition-colors"
      >
        <p className="text-sm font-medium text-foreground">Progress</p>
        {open
          ? <ChevronUp   size={16} className="text-foreground/40" />
          : <ChevronDown size={16} className="text-foreground/40" />
        }
      </button>

      {open && mounted && (
        <div className="px-4 pb-4">
          <p className="text-xs text-foreground/40 mb-3">
            Bench Press — weight (lbs)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--foreground)", opacity: 0.4 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["dataMin - 5", "dataMax + 5"]}
                tick={{ fontSize: 10, fill: "var(--foreground)", opacity: 0.4 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border:          "0.5px solid var(--border)",
                  borderRadius:    "10px",
                  fontSize:        12,
                  color:           "var(--foreground)",
                  boxShadow:       "none",
                }}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                formatter={(v) => [`${v} lbs`, "Weight"]}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--primary)", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
