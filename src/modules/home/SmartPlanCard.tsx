"use client";

import { ChevronRight, Leaf } from "lucide-react";
import { useRouter } from "next/navigation";
import { WORKSPACE_LABELS } from "@/modules/tasks/types";
import type { PlanItem } from "./useHomeData";

interface Props {
  items:   PlanItem[];
  mounted: boolean;
}

function tagStyle(urgency: PlanItem["urgency"]): string {
  if (urgency === "overdue") return "bg-urgent/12 text-urgent";
  if (urgency === "urgent")  return "bg-urgent/8  text-urgent/80";
  return "bg-border/60 text-foreground/45";
}

function Dot({ urgency }: { urgency: PlanItem["urgency"] }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[6px]"
      style={{
        backgroundColor:
          urgency === "overdue" || urgency === "urgent"
            ? "var(--urgent)"
            : "var(--calm)",
      }}
    />
  );
}

export default function SmartPlanCard({ items, mounted }: Props) {
  const router = useRouter();

  /* Loading skeleton */
  if (!mounted) {
    return (
      <div className="mx-4 bg-surface border border-[0.5px] border-border rounded-2xl px-4 py-4">
        <div className="h-2.5 w-24 bg-border/40 rounded-full mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 items-center py-3.5 border-b border-border/30 last:border-0">
            <div className="w-1.5 h-1.5 rounded-full bg-border/40 flex-shrink-0" />
            <div className="flex-1 h-3.5 bg-border/25 rounded-full" />
            <div className="w-4 h-4 bg-border/15 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  /* Empty state */
  if (items.length === 0) {
    return (
      <div className="mx-4 bg-surface border border-[0.5px] border-border rounded-2xl
        flex flex-col items-center justify-center py-8 gap-2.5">
        <Leaf size={28} className="text-foreground/15" />
        <p className="text-sm text-foreground/35">Nothing pressing — enjoy the breathing room</p>
      </div>
    );
  }

  return (
    <div className="mx-4 bg-surface border border-[0.5px] border-border rounded-2xl px-4 py-4">
      <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.08em] mb-2">
        Today's focus
      </p>

      <div className="flex flex-col divide-y divide-border/40">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(item.href)}
            className="flex items-start gap-3 py-3.5 first:pt-2 last:pb-0
              active:opacity-70 transition-opacity text-left w-full group"
          >
            <Dot urgency={item.urgency} />

            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">{item.text}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {item.workspace && (
                  <>
                    <span className="text-[11px] text-foreground/40">
                      {WORKSPACE_LABELS[item.workspace]}
                    </span>
                    <span className="text-foreground/20 text-[11px]">·</span>
                  </>
                )}
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${tagStyle(item.urgency)}`}
                >
                  {item.tag}
                </span>
              </div>
            </div>

            <ChevronRight
              size={16}
              className="text-foreground/35 group-hover:text-foreground/60
                group-active:text-foreground/60 transition-colors
                flex-shrink-0 mt-0.5"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
