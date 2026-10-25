import type { NearbyStore, SearchResponse } from "../shared/types";

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

export function fetchNearby(lat: number, lon: number, radius: number): Promise<NearbyStore[]> {
  return getJson(`/api/nearby?lat=${lat}&lon=${lon}&radius=${radius}`);
}
