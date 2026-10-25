import type { NearbyStore } from "./types.js";
import { CHAINS, matchChain } from "./chains.js";
import { distanceMeters } from "./geo.js";

const PHOTON_URL = "https://photon.komoot.io/api/";

/**
 * Alternativa ao Overpass: o Photon (também com dados do OpenStreetMap) só busca por texto,
 * então pesquisamos termos genéricos e o nome de cada rede dentro da área.
 */
export function photonTerms(): string[] {
  return ["supermercado", "mercado", "hortifruti", "atacadão", ...CHAINS.map((c) => c.name)];
}

export function bbox(lat: number, lon: number, radius: number): string {
  const dLat = radius / 111_320;
  const dLon = radius / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((n) => n.toFixed(5)).join(",");
}

export function parseFeatures(features: any[], lat: number, lon: number, radius: number): NearbyStore[] {
  const seen = new Map<string, NearbyStore>();
  for (const f of features) {
    const p = f.properties ?? {};
    const [fLon, fLat] = f.geometry?.coordinates ?? [];
    if (fLat == null || fLon == null || p.osm_key !== "shop") continue;
    if (!["supermarket", "wholesale", "greengrocer", "convenience"].includes(p.osm_value)) continue;
    const distanceM = Math.round(distanceMeters(lat, lon, fLat, fLon));
    if (distanceM > radius) continue;
    const id = `${p.osm_type}/${p.osm_id}`;
    const street = [p.street, p.housenumber].filter(Boolean).join(", ");
    seen.set(id, {
      id,
      name: p.name ?? "Supermercado",
      lat: fLat,
      lon: fLon,
      distanceM,
      chainId: matchChain({ name: p.name })?.id ?? null,
      address: [street, p.district].filter(Boolean).join(" - ") || null,
    });
  }
  return [...seen.values()].sort((a, b) => a.distanceM - b.distanceM);
}

export async function queryPhoton(lat: number, lon: number, radius: number, timeoutMs = 12_000): Promise<NearbyStore[]> {
  const box = bbox(lat, lon, radius);
  const signal = AbortSignal.timeout(timeoutMs);
  const responses = await Promise.allSettled(
    photonTerms().map(async (term) => {
      const params = new URLSearchParams({ q: term, lat: String(lat), lon: String(lon), bbox: box, limit: "50", osm_tag: "shop" });
      const resp = await fetch(`${PHOTON_URL}?${params}`, { signal });
      if (!resp.ok) throw new Error(`Photon HTTP ${resp.status}`);
      return ((await resp.json()).features ?? []) as any[];
    }),
  );
  const ok = responses.filter((r) => r.status === "fulfilled");
  if (!ok.length) throw new Error("Não foi possível buscar os mercados próximos. Tente de novo em instantes.");
  return parseFeatures(ok.flatMap((r) => r.value), lat, lon, radius);
}
