// Shared helpers for recurring invoice schedules.

export type Frequency = "weekly" | "monthly" | "quarterly" | "yearly";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

/** Returns the next run date (YYYY-MM-DD) given a frequency and a base date. */
export function nextRunDate(frequency: Frequency, from: Date): string {
  const d = new Date(from.getTime());
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

/** Adds N days to a YYYY-MM-DD date, returning YYYY-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
