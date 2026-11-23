import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

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
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="country_code">Country</Label>
        <NativeSelect id="country_code" name="country_code" required defaultValue={defaults?.country_code ?? ""}>
          <option value="" disabled>Choose a country</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="city">City <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input id="city" name="city" maxLength={120} defaultValue={defaults?.city ?? ""} placeholder="Lisbon" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="month">
          {kind === "trip" ? "Month visited" : "Target month"}{" "}
          {kind === "wish" && <span className="font-normal text-muted-foreground">(optional)</span>}
        </Label>
        <Input
          id="month"
          name="month"
          type="month"
          required={kind === "trip"}
          defaultValue={defaults?.month ?? ""}
          
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Textarea id="notes" name="notes" rows={3} maxLength={5000} defaultValue={defaults?.notes ?? ""} placeholder="What do you want to remember?" />
      </div>
      <div >
        <Button type="submit" size="lg">{submitLabel}</Button>
      </div>
    </form>
  );
}
