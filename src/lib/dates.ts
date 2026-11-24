// We store month + year as the first day of the month ("2024-03-01").
// The <input type="month"> gives "2024-03". These helpers convert between them.
// We split strings by hand (no `new Date()`) so time zones can't shift the month.

export function monthInputToDate(value: FormDataEntryValue | null): string | null {
  const v = String(value ?? "").trim();
  return /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : null;
}

export function dateToMonthInput(date: string | null): string {
  return date ? date.slice(0, 7) : "";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(date: string | null): string {
  if (!date) return "";
  const [year, month] = date.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

// "5 minutes ago", "2 days ago"
export function timeAgo(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400], ["hour", 3600], ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}
