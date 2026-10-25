import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { NearbyStore } from "../../shared/types";
import { chainById } from "../../shared/chains";
import { formatDistance } from "../../shared/geo";
import type { LatLon } from "../useLocation";
import { Directions } from "./Directions";

const RIO: [number, number] = [-22.9068, -43.1729];

const userIcon = L.divIcon({ className: "", html: '<span class="pin-me"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });

function storeIcon(color: string | undefined, letter: string, selected: boolean) {
  const html = color
    ? `<span class="pin ${selected ? "pin-selected" : ""}" style="--c:${color}"><b>${letter}</b></span>`
    : `<span class="pin-dot ${selected ? "pin-selected" : ""}"></span>`;
  return L.divIcon({
    className: "",
    html,
    iconSize: color ? [30, 38] : [12, 12],
    iconAnchor: color ? [15, 36] : [6, 6],
    popupAnchor: color ? [0, -32] : [0, -6],
  });
}

/** Enquadra a pessoa e os mercados com preço online. */
function FitView({ position, radius, stores }: { position: LatLon | null; radius: number; stores: NearbyStore[] }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    const withChain = stores.filter((s) => s.chainId).slice(0, 15);
    if (!withChain.length) {
      map.fitBounds(L.latLng(position.lat, position.lon).toBounds(radius * 2), { padding: [10, 10] });
      return;
    }
    const bounds = L.latLngBounds([[position.lat, position.lon], ...withChain.map((s) => [s.lat, s.lon] as [number, number])]);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
  }, [position, radius, stores, map]);
  return null;
}

/** Sem isso o Leaflet deixa uma faixa cinza quando o mapa muda de tamanho. */
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const obs = new ResizeObserver(() => map.invalidateSize());
    obs.observe(map.getContainer());
    return () => obs.disconnect();
  }, [map]);
  return null;
}

function ClickToSet({ onPick }: { onPick: (p: LatLon) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lon: e.latlng.lng }) });
  return null;
}

function StoreMarker({ store, selected, onSelect }: { store: NearbyStore; selected: boolean; onSelect: (id: string) => void }) {
  const ref = useRef<L.Marker>(null);
  const map = useMap();
  const chain = store.chainId ? chainById(store.chainId) : undefined;
  const icon = useMemo(() => storeIcon(chain?.color, chain?.name.charAt(0) ?? "", selected), [chain, selected]);

  useEffect(() => {
    if (!selected || !ref.current) return;
    const marker = ref.current;
    // Abre a janela só depois do voo, senão o Leaflet não ajusta o mapa e ela fica cortada.
    map.once("moveend", () => marker.openPopup());
    map.flyTo([store.lat, store.lon], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [selected, store, map]);

  return (
    <Marker
      ref={ref}
      position={[store.lat, store.lon]}
      icon={icon}
      zIndexOffset={chain ? 500 : 0}
      eventHandlers={{ click: () => onSelect(store.id) }}
    >
      <Popup autoPanPaddingTopLeft={[50, 20]} autoPanPaddingBottomRight={[20, 20]}>
        <div className="popup">
          <strong>{store.name}</strong>
          <span>
            {formatDistance(store.distanceM)}
            {store.address && ` · ${store.address}`}
          </span>
          <span className={chain ? "popup-ok" : "popup-muted"}>{chain ? `Preços online: ${chain.name}` : "Sem preços online"}</span>
          <Directions store={store} compact />
        </div>
      </Popup>
    </Marker>
  );
}

interface Props {
  position: LatLon | null;
  radius: number;
  stores: NearbyStore[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPick: (p: LatLon) => void;
}

export function StoreMap({ position, radius, stores, selectedId, onSelect, onPick }: Props) {
  return (
    <MapContainer center={RIO} zoom={12} className="map" scrollWheelZoom={false} closePopupOnClick={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitView position={position} radius={radius} stores={stores} />
      <AutoResize />
      <ClickToSet onPick={onPick} />
      {position && (
        <>
          <Circle
            center={[position.lat, position.lon]}
            radius={radius}
            pathOptions={{ color: "#0b3b2e", weight: 1.5, dashArray: "4 6", fillColor: "#c8f169", fillOpacity: 0.08 }}
          />
          <Marker position={[position.lat, position.lon]} icon={userIcon} zIndexOffset={1000}>
            <Popup>Você está aqui</Popup>
          </Marker>
        </>
      )}
      {stores.map((s) => (
        <StoreMarker key={s.id} store={s} selected={s.id === selectedId} onSelect={onSelect} />
      ))}
    </MapContainer>
  );
}
