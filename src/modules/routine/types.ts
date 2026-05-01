export interface RoutineItemData {
  id: string;
  label: string;
  /** Display string, e.g. "15 min" or "(today's session)" */
  timeEstimate?: string;
  /** "YYYY-MM-DD" local date when completed. Absent or stale = unchecked. */
  completedDate?: string;
}
