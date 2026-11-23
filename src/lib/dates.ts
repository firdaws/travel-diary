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
