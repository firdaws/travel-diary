import { THEMES, type ThemeKey } from "@/lib/themes";
import { setGroupTripTheme } from "../actions";
import ThemeSwatch from "./theme-swatch";

// Owner-only. Each swatch is a submit button carrying its preset name.
export default function ThemePicker({ groupTripId, current }: { groupTripId: string; current: ThemeKey }) {
  return (
    <form action={setGroupTripTheme.bind(null, groupTripId)} className="flex flex-wrap gap-3">
      {THEMES.map((t) => (
        <ThemeSwatch key={t.key} themeKey={t.key} label={t.label} selected={t.key === current} />
      ))}
    </form>
  );
}
