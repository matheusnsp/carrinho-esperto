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

const NEARBY_CACHE_MS = 24 * 60 * 60_000;

function readCache(key: string): NearbyStore[] | null {
  try {
    const hit = JSON.parse(localStorage.getItem(key) ?? "null");
    return hit && Date.now() - hit.at < NEARBY_CACHE_MS ? hit.stores : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, stores: NearbyStore[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), stores }));
  } catch {
    // sem espaço ou navegação privada
  }
}

/**
 * Mercados perto da posição. Tenta, em ordem: cache do navegador, Overpass e Photon direto
 * do navegador (os servidores do OpenStreetMap costumam recusar a Vercel) e, por último, o nosso servidor.
 */
export async function fetchNearby(lat: number, lon: number, radius: number): Promise<NearbyStore[]> {
  const key = `ce:mercados:${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  const cached = readCache(key);
  if (cached) return cached;

  const attempts: Array<[string, () => Promise<NearbyStore[]>]> = [
    ["OpenStreetMap", () => queryOverpass(lat, lon, radius, { timeoutMs: 8_000 })],
    ["Photon", () => queryPhoton(lat, lon, radius, { timeoutMs: 10_000 })],
    ["servidor", () => getJson<NearbyStore[]>(`/api/nearby?lat=${lat}&lon=${lon}&radius=${radius}`)],
  ];
  const errors: string[] = [];
  for (const [name, attempt] of attempts) {
    try {
      const stores = await attempt();
      writeCache(key, stores);
      return stores;
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
      console.warn("Falha ao buscar mercados", name, err);
    }
  }
  throw new Error(`Não foi possível buscar os mercados próximos (${errors.join("; ")}).`);
}
