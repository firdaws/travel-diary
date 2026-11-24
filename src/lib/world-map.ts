import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import iso from "i18n-iso-countries";
import worldData from "world-atlas/countries-110m.json";

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 500;

export type CountryShape = { code: string | null; name: string; d: string };

let cache: CountryShape[] | null = null;

// Turns the world-atlas geometry into SVG path strings, once.
// Server-only: the browser just receives finished <path> elements, no map library.
export function getCountryShapes(): CountryShape[] {
  if (cache) return cache;

  const topology = worldData as unknown as Topology;
  const collection = feature(topology, topology.objects.countries as GeometryCollection);
  // Antarctica takes a lot of space and is rarely on anyone's list.
  const features = collection.features.filter((f) => String(f.id) !== "010");

  const projection = geoNaturalEarth1().fitExtent(
    [[4, 4], [MAP_WIDTH - 4, MAP_HEIGHT - 4]],
    { type: "FeatureCollection", features },
  );
  const path = geoPath(projection);

  cache = features.flatMap((f) => {
    const d = path(f);
    if (!d) return [];
    // world-atlas ids are ISO numeric codes like "004"; we use alpha-2 like "AF".
    const code = f.id ? (iso.numericToAlpha2(String(f.id).padStart(3, "0")) ?? null) : null;
    return [{ code, name: String((f.properties as { name?: string } | null)?.name ?? ""), d }];
  });
  return cache;
}

export function drawnCodes(): Set<string> {
  return new Set(getCountryShapes().flatMap((s) => (s.code ? [s.code] : [])));
}
