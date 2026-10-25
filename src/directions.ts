import type { NearbyStore } from "../shared/types";

export interface DirectionLink {
  app: string;
  url: string;
}

/** Links de rota até o mercado no Google Maps, Apple Maps e Waze. */
export function directionLinks(store: Pick<NearbyStore, "lat" | "lon" | "name">): DirectionLink[] {
  const ll = `${store.lat},${store.lon}`;
  return [
    { app: "Google Maps", url: `https://www.google.com/maps/dir/?api=1&destination=${ll}` },
    { app: "Apple Maps", url: `https://maps.apple.com/?daddr=${ll}&q=${encodeURIComponent(store.name)}` },
    { app: "Waze", url: `https://waze.com/ul?ll=${ll}&navigate=yes` },
  ];
}
