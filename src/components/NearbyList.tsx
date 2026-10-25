import type { NearbyStore } from "../../shared/types";
import { chainById } from "../../shared/chains";
import { formatDistance } from "../../shared/geo";
import { Directions } from "./Directions";

interface Props {
  stores: NearbyStore[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function NearbyList({ stores, selectedId, onSelect }: Props) {
  if (!stores.length) return <p className="hint">Nenhuma loja das redes do app nesse raio. Tente aumentar a distância.</p>;
  const chains = new Set(stores.map((s) => s.chainId)).size;
  return (
    <div className="nearby">
      <div className="nearby-stats">
        <div>
          <strong>{stores.length}</strong>
          <span>{stores.length === 1 ? "loja" : "lojas"} por perto</span>
        </div>
        <div>
          <strong>{chains}</strong>
          <span>{chains === 1 ? "rede" : "redes"}</span>
        </div>
      </div>
      <ul>
        {stores.slice(0, 40).map((s) => {
          const chain = s.chainId ? chainById(s.chainId) : undefined;
          const open = s.id === selectedId;
          return (
            <li key={s.id} className={`${chain ? "" : "dim"} ${open ? "open" : ""}`}>
              <button className="store-row" onClick={() => onSelect(open ? null : s.id)} aria-expanded={open}>
                <span className="avatar" style={{ background: chain?.color ?? "#dfe5e1" }}>
                  {s.name.charAt(0).toUpperCase()}
                </span>
                <span className="grow">
                  <span className="store-name">{s.name}</span>
                  <span className="store-sub">{s.address ?? (chain ? "Preços online disponíveis" : "Sem loja online")}</span>
                </span>
                <span className="distance">{formatDistance(s.distanceM)}</span>
              </button>
              {open && <Directions store={s} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
