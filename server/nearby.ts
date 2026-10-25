import type { NearbyStore } from "../shared/types.js";
import { queryOverpass } from "../shared/overpass.js";

const cache = new Map<string, { at: number; stores: NearbyStore[] }>();
const CACHE_MS = 10 * 60_000;

export async function findNearby(lat: number, lon: number, radius: number): Promise<NearbyStore[]> {
  // Arredonda para ~100 m para reaproveitar o cache entre buscas parecidas.
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.stores;

  const stores = await queryOverpass(lat, lon, radius, {
    timeoutMs: 20_000,
    headers: { "User-Agent": "CarrinhoEsperto/0.1 (comparador de precos)" },
  });
  cache.set(key, { at: Date.now(), stores });
  return stores;
}
