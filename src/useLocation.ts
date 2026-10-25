import { useCallback, useEffect, useState } from "react";
import { usePersistentState } from "./usePersistentState";

export interface LatLon {
  lat: number;
  lon: number;
}

/** Nome do bairro para mostrar ao usuário ("Copacabana, Rio de Janeiro"). */
async function placeName({ lat, lon }: LatLon, signal: AbortSignal): Promise<string | null> {
  const resp = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14&accept-language=pt-BR`,
    { signal },
  );
  if (!resp.ok) return null;
  const a = (await resp.json()).address ?? {};
  const bairro = a.suburb ?? a.neighbourhood ?? a.city_district ?? a.quarter;
  const cidade = a.city ?? a.town ?? a.municipality;
  return [bairro, cidade].filter(Boolean).join(", ") || null;
}

export function useGeolocation() {
  // Lembra a última posição para não pedir de novo a cada visita.
  const [position, setPosition] = usePersistentState<LatLon | null>("ce:local", null);
  const [label, setLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!position) return;
    const ctrl = new AbortController();
    setLabel(null);
    placeName(position, ctrl.signal)
      .then(setLabel)
      .catch(() => {});
    return () => ctrl.abort();
  }, [position]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Seu navegador não permite localização. Toque no mapa para marcar onde você está.");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus("idle");
        setError(null);
      },
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permissão negada. Toque no mapa para marcar onde você está."
            : "Não consegui achar você. Toque no mapa para marcar onde você está.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  return { position, setPosition, label, locate, status, error };
}
