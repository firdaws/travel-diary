import { Check } from "lucide-react";
import { THEMES, type ThemeKey } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { setGroupTripTheme } from "../actions";

// Owner-only. Each swatch is a submit button carrying its preset name, so no client JS is needed.
export default function ThemePicker({ groupTripId, current }: { groupTripId: string; current: ThemeKey }) {
  return (
    <form action={setGroupTripTheme.bind(null, groupTripId)} className="flex flex-wrap gap-3">
      {THEMES.map((t) => {
        const selected = t.key === current;
        return (
          <button
            key={t.key}
            type="submit"
            name="preset"
            value={t.key}
            aria-label={`${t.label} theme${selected ? " (selected)" : ""}`}
            aria-pressed={selected}
            title={t.label}
            className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {/* The swatch takes its color from the same CSS the theme uses: one source of truth. */}
            <span
              data-group-theme={t.key}
              className={cn(
                "flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground ring-offset-2 ring-offset-card transition group-hover:scale-110",
                selected && "ring-2 ring-foreground",
              )}
            >
              {selected && <Check className="size-4" aria-hidden />}
            </span>
            <span className="text-xs text-muted-foreground">{t.label}</span>
          </button>
        );
      })}
    </form>
  );
}
