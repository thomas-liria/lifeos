import { Suspense } from "react";
import TasksScreen from "@/modules/tasks/TasksScreen";

/* useSearchParams() inside TasksScreen requires a Suspense boundary */
export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-foreground/25 text-sm">Loading…</p>
      </div>
    }>
      <TasksScreen />
    </Suspense>
  );
}
