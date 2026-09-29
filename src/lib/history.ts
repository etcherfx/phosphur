export const HISTORY_CAP = 5000;

export interface Visit {
  url: string;
  title: string;
  visitedAt: number;
}

export type VisitPlan = "add" | "skip" | "update-title";

/** Consecutive visits to the same URL collapse into one entry (a reload or an in-page title change). */
export function planVisit(last: Pick<Visit, "url" | "title"> | undefined, visit: Visit): VisitPlan {
  if (!last || last.url !== visit.url) return "add";
  return visit.title && visit.title !== last.title ? "update-title" : "skip";
}

/** How many of the oldest entries to drop to get back under the cap. */
export function overflow(count: number, cap: number = HISTORY_CAP): number {
  return Math.max(0, count - cap);
}
