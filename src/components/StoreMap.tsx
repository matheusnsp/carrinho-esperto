import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { NearbyStore } from "../../shared/types";
import { chainById } from "../../shared/chains";
import { formatDistance } from "../../shared/geo";
import type { LatLon } from "../useLocation";

const RIO: [number, number] = [-22.9068, -43.1729];

function Recenter({ position, radius }: { position: LatLon | null; radius: number }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    const zoom = radius <= 1000 ? 15 : radius <= 3000 ? 14 : radius <= 5000 ? 13 : 12;
    map.setView([position.lat, position.lon], zoom);
  }, [position, radius, map]);
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

interface Props {
  position: LatLon | null;
  radius: number;
  stores: NearbyStore[];
  onPick: (p: LatLon) => void;
}

export function StoreMap({ position, radius, stores, onPick }: Props) {
  return (
    <MapContainer center={RIO} zoom={12} className="map" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter position={position} radius={radius} />
      <AutoResize />
      <ClickToSet onPick={onPick} />
      {position && (
        <>
          <Circle
            center={[position.lat, position.lon]}
            radius={radius}
            pathOptions={{ color: "#0b3b2e", weight: 1.5, dashArray: "4 6", fillColor: "#c8f169", fillOpacity: 0.12 }}
          />
          <CircleMarker
            center={[position.lat, position.lon]}
            radius={9}
            pathOptions={{ color: "#fff", weight: 3, fillColor: "#0b3b2e", fillOpacity: 1 }}
          >
            <Popup>Você está aqui</Popup>
          </CircleMarker>
        </>
      )}
      {stores.map((s) => {
        const chain = s.chainId ? chainById(s.chainId) : undefined;
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lon]}
            radius={chain ? 8 : 4}
            pathOptions={{ color: "#fff", weight: 2, fillColor: chain?.color ?? "#9aa5a0", fillOpacity: chain ? 1 : 0.7 }}
          >
            <Popup>
              <strong>{s.name}</strong>
              <br />
              {formatDistance(s.distanceM)}
              {s.address && <> · {s.address}</>}
              <br />
              <span style={{ color: chain ? "#0b3b2e" : "#6b7570" }}>
                {chain ? `Preços online: ${chain.name}` : "Sem preços online"}
              </span>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
