import type { NearbyStore, SearchResponse } from "../shared/types";
import { queryOverpass } from "../shared/overpass";
import { queryPhoton } from "../shared/photon";

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error ?? `Erro ${resp.status}`);
  return data as T;
}

export function searchProducts(query: string, chainIds: string[], cep: string | null): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (cep) params.set("cep", cep);
  if (chainIds.length) params.set("chains", chainIds.join(","));
  return getJson(`/api/search?${params}`);
}

/**
 * Busca mercados direto do navegador (os servidores do OpenStreetMap costumam recusar a Vercel).
 * Tenta o Overpass, que lista tudo; se ele estiver fora, usa o Photon.
 */
export async function fetchNearby(lat: number, lon: number, radius: number): Promise<NearbyStore[]> {
  try {
    return await queryOverpass(lat, lon, radius, { timeoutMs: 10_000 });
  } catch {
    return queryPhoton(lat, lon, radius);
  }
}
