import type { NearbyStore } from "./types.js";
import { distanceMeters } from "./geo.js";

export interface StoreRow {
  id: string;
  name: string;
  lat: number;
  lon: number;
  chainId: string;
  address: string | null;
}

/** Lojas dentro do raio, da mais perto para a mais longe. */
export function nearbyStores(rows: StoreRow[], lat: number, lon: number, radius: number): NearbyStore[] {
  return rows
    .map((r) => ({ ...r, distanceM: Math.round(distanceMeters(lat, lon, r.lat, r.lon)) }))
    .filter((s) => s.distanceM <= radius)
    .sort((a, b) => a.distanceM - b.distanceM);
}
