import type { NearbyStore } from "../shared/types";
import { matchChain } from "../shared/chains";
import { distanceMeters } from "../shared/geo";

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

export function buildQuery(lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:20];
(
  nwr["shop"~"^(supermarket|wholesale|greengrocer)$"](around:${radius},${lat},${lon});
);
out center tags;`;
}

function address(tags: Record<string, string>): string | null {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", ");
  const parts = [street, tags["addr:suburb"]].filter(Boolean);
  return parts.length ? parts.join(" - ") : null;
}

export function parseElements(elements: any[], lat: number, lon: number): NearbyStore[] {
  return elements
    .map((el) => {
      const tags: Record<string, string> = el.tags ?? {};
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (elLat == null || elLon == null) return null;
      const chain = matchChain(tags);
      return {
        id: `${el.type}/${el.id}`,
        name: tags.name ?? tags.brand ?? "Supermercado",
        lat: elLat,
        lon: elLon,
        distanceM: Math.round(distanceMeters(lat, lon, elLat, elLon)),
        chainId: chain?.id ?? null,
        address: address(tags),
      } satisfies NearbyStore;
    })
    .filter((s): s is NearbyStore => s !== null)
    .sort((a, b) => a.distanceM - b.distanceM);
}

const cache = new Map<string, { at: number; stores: NearbyStore[] }>();
const CACHE_MS = 10 * 60_000;

export async function findNearby(lat: number, lon: number, radius: number): Promise<NearbyStore[]> {
  // Arredonda para ~100 m para reaproveitar o cache entre buscas parecidas.
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.stores;

  const body = new URLSearchParams({ data: buildQuery(lat, lon, radius) });
  let lastErr: unknown;
  for (const url of OVERPASS_URLS) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        body,
        headers: { "User-Agent": "MercaBom/0.1 (comparador de precos)" },
        signal: AbortSignal.timeout(25_000),
      });
      if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
      const data: any = await resp.json();
      const stores = parseElements(data.elements ?? [], lat, lon);
      cache.set(key, { at: Date.now(), stores });
      return stores;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Falha ao consultar o OpenStreetMap");
}
