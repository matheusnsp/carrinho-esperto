import type { NearbyStore } from "../../shared/types";
import { chainById } from "../../shared/chains";
import { formatDistance } from "../../shared/geo";

export function NearbyList({ stores }: { stores: NearbyStore[] }) {
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
        {[...withPrices, ...others].slice(0, 25).map((s) => {
          const chain = s.chainId ? chainById(s.chainId) : undefined;
          return (
            <li key={s.id} className={chain ? "" : "dim"}>
              <span className="avatar" style={{ background: chain?.color ?? "#dfe5e1" }}>
                {s.name.charAt(0).toUpperCase()}
              </span>
              <span className="grow">
                <span className="store-name">{s.name}</span>
                <span className="store-sub">{s.address ?? (chain ? "Preços online disponíveis" : "Sem loja online")}</span>
              </span>
              <span className="distance">{formatDistance(s.distanceM)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
