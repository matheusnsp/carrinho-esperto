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
  if (!stores.length) return <p className="hint">Nenhum mercado encontrado nesse raio. Tente aumentar a distância.</p>;
  const withPrices = stores.filter((s) => s.chainId);
  const others = stores.filter((s) => !s.chainId);
  return (
    <div className="nearby">
      <div className="nearby-stats">
        <div>
          <strong>{stores.length}</strong>
          <span>mercados</span>
        </div>
        <div>
          <strong>{withPrices.length}</strong>
          <span>com preço online</span>
        </div>
      </div>
      <ul>
        {[...withPrices, ...others].slice(0, 30).map((s) => {
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
