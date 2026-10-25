import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { NearbyStore } from "../../shared/types";
import { chainById } from "../../shared/chains";
import { formatDistance } from "../../shared/geo";
import type { LatLon } from "../useLocation";

const RIO: [number, number] = [-22.9068, -43.1729];

function Recenter({ position }: { position: LatLon | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.lat, position.lon], Math.max(map.getZoom(), 14));
  }, [position, map]);
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
    <MapContainer center={RIO} zoom={12} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter position={position} />
      <ClickToSet onPick={onPick} />
      {position && (
        <>
          <Circle center={[position.lat, position.lon]} radius={radius} pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.05 }} />
          <CircleMarker center={[position.lat, position.lon]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}>
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
            radius={chain ? 8 : 5}
            pathOptions={{ color: "#fff", weight: 2, fillColor: chain?.color ?? "#94a3b8", fillOpacity: 0.95 }}
          >
            <Popup>
              <strong>{s.name}</strong>
              <br />
              {formatDistance(s.distanceM)}
              {s.address && <> · {s.address}</>}
              <br />
              {chain ? `Preços online: ${chain.name}` : "Sem preços online"}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
