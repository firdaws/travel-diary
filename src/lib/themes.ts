import type { Json } from "@/lib/database.types";

// The allowed theme presets. The database has a CHECK constraint with the same list,
// and the colors for each live in globals.css under [data-group-theme="..."].
export const THEMES = [
  { key: "teal", label: "Teal" },
  { key: "ocean", label: "Ocean" },
  { key: "sunset", label: "Sunset" },
  { key: "forest", label: "Forest" },
  { key: "plum", label: "Plum" },
  { key: "slate", label: "Slate" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

export function isThemeKey(value: unknown): value is ThemeKey {
  return THEMES.some((t) => t.key === value);
}

// group_trips.theme is JSON like {"preset": "ocean"}, or {} for the default.
export function themeOf(theme: Json | null | undefined): ThemeKey {
  const preset = theme && typeof theme === "object" && !Array.isArray(theme) ? theme.preset : null;
  return isThemeKey(preset) ? preset : "teal";
}
