import { drawnCodes, getCountryShapes, MAP_HEIGHT, MAP_WIDTH } from "@/lib/world-map";

export type MapMark = {
  code: string;
  name: string;
  // People who have been / want to go, for the hover text.
  been: string[];
  wants: string[];
};

// A world map colored by country. Rendered on the server as plain SVG.
// Green = someone has been. Coral = on a wishlist only.
export default function WorldMap({ marks, label }: { marks: MapMark[]; label: string }) {
  const byCode = new Map(marks.map((m) => [m.code, m]));
  const drawn = drawnCodes();
  const hidden = marks.filter((m) => !drawn.has(m.code));

  const been = marks.filter((m) => m.been.length > 0).length;
  const wishOnly = marks.filter((m) => m.been.length === 0 && m.wants.length > 0).length;
  const summary = `${label}: ${been} ${been === 1 ? "country" : "countries"} visited, ${wishOnly} more on wishlists.`;

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-label={summary}
        className="h-auto w-full"
      >
        {getCountryShapes().map((s, i) => {
          const mark = s.code ? byCode.get(s.code) : undefined;
          const state = !mark ? "land" : mark.been.length > 0 ? "visited" : "wish";
          return (
            <path key={s.code ?? `x${i}`} d={s.d} className={`map-${state}`}>
              <title>
                {mark
                  ? [
                      mark.name,
                      mark.been.length ? `Been: ${mark.been.join(", ")}` : "",
                      mark.wants.length ? `Wants to go: ${mark.wants.join(", ")}` : "",
                    ]
                      .filter(Boolean)
                      .join("\n")
                  : s.name}
              </title>
            </path>
          );
        })}
      </svg>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm map-swatch-visited" aria-hidden /> Been
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm map-swatch-wish" aria-hidden /> Wants to go
        </span>
        {hidden.length > 0 && (
          <span>
            Too small to draw: {hidden.map((m) => m.name).join(", ")}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
