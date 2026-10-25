import type { NearbyStore, SearchResponse } from "../shared/types";
import { type StoreRow, nearbyStores } from "../shared/nearby";
import STORES from "../shared/stores-rj.json";

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
 * Lojas das redes do app perto da posição. A lista vem junto com o site
 * (gerada por scripts/build-stores.mts), então não depende de nenhum serviço externo.
 */
export function findNearby(lat: number, lon: number, radius: number): NearbyStore[] {
  return nearbyStores(STORES as StoreRow[], lat, lon, radius);
}
