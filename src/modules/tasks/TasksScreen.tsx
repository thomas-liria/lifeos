"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Inbox } from "lucide-react";
import AddTaskForm from "./AddTaskForm";
import TaskItem from "./TaskItem";
import { JobberPanel } from "./JobberPanel";
import { useTasks, todayISO } from "./useTasks";
import type { FilterType, Urgency, Workspace } from "./types";

/* ── Tab + filter config ───────────────────────────────────────── */
const WORKSPACE_TABS: { id: Workspace; label: string }[] = [
  { id: "personal",   label: "Personal"   },
  { id: "weedguys",   label: "WeedGuys"   },
  { id: "snapshotto", label: "SnapshotTO" },
];

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all",     label: "All"     },
  { id: "urgent",  label: "Urgent"  },
  { id: "today",   label: "Today"   },
  { id: "someday", label: "Someday" },
];

const EMPTY_MESSAGES: Record<Workspace, string> = {
  personal:   "Nothing on your plate — enjoy it.",
  weedguys:   "WeedGuys is clear.",
  snapshotto: "SnapshotTO is clear.",
};

export default function TasksScreen() {
  const searchParams = useSearchParams();

  /* Initialise active workspace from ?workspace= URL param */
  const rawWs = searchParams.get("workspace");
  const initWs: Workspace =
    rawWs === "personal" || rawWs === "weedguys" || rawWs === "snapshotto"
      ? rawWs
      : "personal";

  const [activeWs,     setActiveWs]     = useState<Workspace>(initWs);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showAddForm,  setShowAddForm]  = useState(false);
  const addFormRef = useRef<HTMLDivElement>(null);

  const { tasks, mounted, toggle, addTask } = useTasks();

  /* ── Filter + sort ─────────────────────────────────────────── */
  const visibleTasks = useMemo(() => {
    const today = todayISO();
    const ws         = tasks.filter((t) =>  t.workspace === activeWs);
    const incomplete = ws.filter((t) => !t.completed);
    const completed  = ws.filter((t) =>  t.completed);

    let filtered = incomplete;
    if (activeFilter === "urgent")
      filtered = incomplete.filter((t) => t.urgency === "urgent");
    else if (activeFilter === "today")
      filtered = incomplete.filter((t) => t.dueDate === today);
    else if (activeFilter === "someday")
      filtered = incomplete.filter((t) => !t.dueDate || t.dueDate === "someday");

    // Completed always sinks to bottom
    return [...filtered, ...completed];
  }, [tasks, activeWs, activeFilter]);

  /* ── Handlers ──────────────────────────────────────────────── */
  function handleSave(text: string, urgency: Urgency, dueDate?: string) {
    addTask(text, activeWs, urgency, dueDate);
    setShowAddForm(false);
  }

  function openAddForm() {
    setShowAddForm(true);
    requestAnimationFrame(() =>
      addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    );
  }

  function switchWorkspace(ws: Workspace) {
    setActiveWs(ws);
    setActiveFilter("all");
    setShowAddForm(false);
  }

  /* ── Loading ───────────────────────────────────────────────── */
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Inbox size={32} className="text-foreground/15" />
        <p className="text-sm text-foreground/30">Loading tasks…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24">

      {/* ① Workspace tabs ── sticky just below TopBar (h-14 = 56px) */}
      <div
        className="flex border-b border-[0.5px] border-border bg-background"
        style={{ position: "sticky", top: "3.5rem", zIndex: 30 }}
      >
        {WORKSPACE_TABS.map((ws) => {
          const active = ws.id === activeWs;
          return (
            <button
              key={ws.id}
              onClick={() => switchWorkspace(ws.id)}
              className="relative flex-1 py-3 text-sm transition-colors"
              style={{ color: active ? "var(--primary)" : "var(--foreground)",
                       opacity: active ? 1 : 0.45 }}
            >
              {ws.label}
              {active && (
                <span
                  className="absolute bottom-0 left-4 right-4 h-[1.5px] rounded-full"
                  style={{ backgroundColor: "var(--primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ② Filter bar ── sticky just below workspace tabs (~44px tall) */}
      <div
        className="flex gap-1.5 px-4 py-2.5 border-b border-[0.5px] border-border/40
          overflow-x-auto scroll-touch bg-background"
        style={{ position: "sticky", top: "calc(3.5rem + 44px)", zIndex: 20 }}
      >
        {FILTERS.map((f) => {
          const active = f.id === activeFilter;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3.5 py-2 min-h-[36px] rounded-full text-xs border border-[0.5px]
                whitespace-nowrap transition-all flex-shrink-0 ${
                active
                  ? "border-primary/50 bg-primary/10 text-primary font-medium"
                  : "border-border/60 text-foreground/45 hover:text-foreground/70"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ③ Jobber panel — WeedGuys only */}
      {activeWs === "weedguys" && (
        <div className="px-4 pt-4">
          <JobberPanel />
        </div>
      )}

      {/* ④ Task list ── key triggers tab-fade on workspace/filter change */}
      {visibleTasks.length === 0 && !showAddForm ? (
        <div
          key={`empty-${activeWs}-${activeFilter}`}
          className="tab-fade flex flex-col items-center justify-center py-20 px-6 gap-3"
        >
          <Inbox size={32} className="text-foreground/15" />
          <p className="text-sm text-foreground/35 text-center">
            {EMPTY_MESSAGES[activeWs]}
          </p>
        </div>
      ) : (
        <div key={`${activeWs}-${activeFilter}`} className="tab-fade flex flex-col">
          {visibleTasks.map((task) => (
            <TaskItem key={task.id} task={task} onToggle={toggle} />
          ))}
        </div>
      )}

      {/* ⑤ Inline add form */}
      {showAddForm && (
        <div ref={addFormRef}>
          <AddTaskForm
            onSave={handleSave}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* ⑥ Floating "+" FAB — hidden while form is open */}
      {!showAddForm && (
        <button
          onClick={openAddForm}
          aria-label="Add task"
          className="fixed right-4 z-40 w-12 h-12 rounded-full
            flex items-center justify-center
            transition-transform active:scale-95"
          style={{
            bottom: "calc(4rem + 3.5rem + 8px)", /* tab bar + input bar + gap */
            backgroundColor: "var(--primary)",
          }}
        >
          <Plus size={22} color="white" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
