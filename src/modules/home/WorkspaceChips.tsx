"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Workspace } from "@/modules/tasks/types";

const WS_ORDER: Workspace[] = ["personal", "weedguys", "snapshotto"];

interface Props {
  counts:  Record<Workspace, number>;
  names:   Record<Workspace, string>;
  mounted: boolean;
}

export default function WorkspaceChips({ counts, names, mounted }: Props) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto scroll-touch">
      <div className="flex gap-2.5 px-4 pb-1" style={{ width: "max-content" }}>
        {WS_ORDER.map((id) => {
          const count = mounted ? (counts[id] ?? 0) : 0;
          const name  = names[id];
          return (
            <button
              key={id}
              onClick={() => router.push(`/tasks?workspace=${id}`)}
              className="h-14 flex flex-col items-start justify-center px-4
                rounded-2xl border border-[0.5px] border-border bg-surface
                hover:border-primary/50 hover:bg-primary/5
                active:scale-[0.97] transition-all duration-150
                min-w-[96px]"
            >
              <span className="text-[12px] text-foreground/50 leading-none mb-1">
                {name}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-[18px] font-medium text-foreground leading-none tabular-nums">
                  {mounted ? count : "·"}
                </span>
                <span className="text-[10px] text-foreground/35 leading-none">
                  {count !== 1 ? "tasks" : "task"}
                </span>
              </div>
            </button>
          );
        })}

        {/* School — locked until activated in Settings */}
        <button
          disabled
          className="h-14 flex flex-col items-start justify-center px-4
            rounded-2xl border border-[0.5px] border-border/50 bg-surface
            cursor-default opacity-40 min-w-[96px]"
        >
          <div className="flex items-center gap-1 mb-1">
            <Lock size={10} />
            <span className="text-[12px] leading-none">School</span>
          </div>
          <span className="text-[10px] text-foreground/40">
            Activate in settings
          </span>
        </button>
      </div>
    </div>
  );
}
