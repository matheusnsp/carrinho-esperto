import { useCallback, useState } from "react";

export interface LatLon {
  lat: number;
  lon: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<LatLon | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Seu navegador não permite localização. Clique no mapa para marcar onde você está.");
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
            ? "Permissão de localização negada. Clique no mapa para marcar onde você está."
            : "Não foi possível obter sua localização. Clique no mapa para marcar onde você está.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  return { position, setPosition, locate, status, error };
}
