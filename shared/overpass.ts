import type { NearbyStore } from "./types.js";
import { matchChain } from "./chains.js";
import { distanceMeters } from "./geo.js";

/** Servidores públicos do Overpass (OpenStreetMap). Todos aceitam chamadas do navegador. */
export const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

export function buildQuery(lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:15];
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

/**
 * Consulta todos os servidores ao mesmo tempo e usa a primeira resposta válida.
 * Os servidores públicos às vezes ficam lentos ou recusam pedidos; assim um só não trava a busca.
 */
export async function queryOverpass(
  lat: number,
  lon: number,
  radius: number,
  { timeoutMs = 15_000, headers = {} as Record<string, string> } = {},
): Promise<NearbyStore[]> {
  const body = new URLSearchParams({ data: buildQuery(lat, lon, radius) });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await Promise.any(
      OVERPASS_URLS.map(async (url) => {
        const resp = await fetch(url, { method: "POST", body, headers, signal: ctrl.signal });
        if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
        const data: any = await resp.json();
        if (!Array.isArray(data.elements)) throw new Error("Resposta inválida do Overpass");
        return parseElements(data.elements, lat, lon);
      }),
    );
  } catch (err) {
    const first = err instanceof AggregateError ? err.errors[0] : err;
    throw new Error(first instanceof Error ? first.message : "Overpass sem resposta");
  } finally {
    clearTimeout(timer);
    ctrl.abort(); // cancela as consultas que ainda estão em andamento
  }
}
