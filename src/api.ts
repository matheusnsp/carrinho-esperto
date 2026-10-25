import type { NearbyStore, SearchResponse } from "../shared/types";
import { queryOverpass } from "../shared/overpass";

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error ?? `Erro ${resp.status}`);
  return data as T;
}

export function searchProducts(query: string, chainIds: string[]): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (chainIds.length) params.set("chains", chainIds.join(","));
  return getJson(`/api/search?${params}`);
}

/** Busca mercados direto do navegador; se não der, pede ao nosso servidor. */
export async function fetchNearby(lat: number, lon: number, radius: number): Promise<NearbyStore[]> {
  try {
    return await queryOverpass(lat, lon, radius, { timeoutMs: 12_000 });
  } catch {
    return getJson(`/api/nearby?lat=${lat}&lon=${lon}&radius=${radius}`);
  }
}
