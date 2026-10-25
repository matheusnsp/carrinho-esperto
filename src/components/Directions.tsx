import type { NearbyStore } from "../../shared/types";
import { directionLinks } from "../directions";

const ICONS: Record<string, string> = {
  "Google Maps": "G",
  "Apple Maps": "A",
  Waze: "W",
};

/** Botões para abrir a rota até o mercado no app de mapas. */
export function Directions({ store, compact }: { store: NearbyStore; compact?: boolean }) {
  return (
    <div className={`directions ${compact ? "compact" : ""}`}>
      {directionLinks(store).map((l) => (
        <a key={l.app} href={l.url} target="_blank" rel="noreferrer" className="dir-btn">
          <span className={`dir-icon dir-${l.app.split(" ")[0].toLowerCase()}`} aria-hidden>
            {ICONS[l.app]}
          </span>
          {l.app}
        </a>
      ))}
    </div>
  );
}
