export type Workspace  = "personal" | "weedguys" | "snapshotto";
export type Urgency    = "normal"   | "urgent";
export type FilterType = "all"      | "urgent" | "today" | "someday";

export interface Task {
  id:             string;
  text:           string;
  workspace:      Workspace;
  urgency:        Urgency;
  /** ISO "YYYY-MM-DD" for a fixed date, or "someday", or undefined */
  dueDate?:       string;
  completed:      boolean;
  completedDate?: string;
  createdAt:      string;
}

export const WORKSPACE_LABELS: Record<Workspace, string> = {
  personal:   "Personal",
  weedguys:   "WeedGuys",
  snapshotto: "SnapshotTO",
};
