"use client";

import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";
import { type ThemeKey } from "@/lib/themes";
import { cn } from "@/lib/utils";

// One swatch of the theme picker. It's a submit button; while the form is saving,
// the swatch that was clicked shows a spinner and all swatches lock.
export default function ThemeSwatch({
  themeKey,
  label,
  selected,
}: {
  themeKey: ThemeKey;
  label: string;
  selected: boolean;
}) {
  const { pending, data } = useFormStatus();
  const saving = pending && data?.get("preset") === themeKey;
  return (
    <button
      type="submit"
      name="preset"
      value={themeKey}
      disabled={pending}
      aria-label={`${label} theme${selected ? " (selected)" : ""}`}
      aria-pressed={selected}
      aria-busy={saving || undefined}
      title={label}
      className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-wait"
    >
      {/* The swatch takes its color from the same CSS the theme uses: one source of truth. */}
      <span
        data-group-theme={themeKey}
        className={cn(
          "flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground ring-offset-2 ring-offset-card transition group-hover:scale-110",
          selected && "ring-2 ring-foreground",
          pending && !saving && "opacity-50",
        )}
      >
        {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : selected && <Check className="size-4" aria-hidden />}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}
