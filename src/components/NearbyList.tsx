import type { NearbyStore } from "../../shared/types";
import { chainById } from "../../shared/chains";
import { formatDistance } from "../../shared/geo";

export function NearbyList({ stores }: { stores: NearbyStore[] }) {
  if (!stores.length) return <p className="muted">Nenhum mercado encontrado nesse raio.</p>;
  const withPrices = stores.filter((s) => s.chainId).length;
  return (
    <div>
      <p className="muted small">
        {stores.length} mercados por perto · {withPrices} com preços online
      </p>
      <ul className="nearby">
        {stores.slice(0, 30).map((s) => {
          const chain = s.chainId ? chainById(s.chainId) : undefined;
          return (
            <li key={s.id} className={chain ? "" : "dim"}>
              <span className="dot" style={{ background: chain?.color ?? "#cbd5e1" }} />
              <span className="grow">
                {s.name}
                {s.address && <span className="muted small"> · {s.address}</span>}
              </span>
              <span className="muted small">{formatDistance(s.distanceM)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
