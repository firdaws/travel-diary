import { field, btnPrimary } from "@/lib/ui";

type Country = { code: string; name: string };

// One form for both lists. Trips need a visit month; wishlist items have an optional target month.
export default function EntryForm({
  action,
  countries,
  kind,
  submitLabel,
  defaults,
}: {
  action: (formData: FormData) => void | Promise<void>;
  countries: Country[];
  kind: "trip" | "wish";
  submitLabel: string;
  defaults?: { country_code?: string; city?: string | null; month?: string; notes?: string | null };
}) {
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Country
        <select name="country_code" required defaultValue={defaults?.country_code ?? ""} className={field}>
          <option value="">Choose a country</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        City (optional)
        <input name="city" maxLength={120} defaultValue={defaults?.city ?? ""} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {kind === "trip" ? "Month visited" : "Target month (optional)"}
        <input
          name="month"
          type="month"
          required={kind === "trip"}
          defaultValue={defaults?.month ?? ""}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Notes (optional)
        <textarea name="notes" rows={3} maxLength={5000} defaultValue={defaults?.notes ?? ""} className={field} />
      </label>
      <button className={btnPrimary}>{submitLabel}</button>
    </form>
  );
}
