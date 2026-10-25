import type { Offer } from "../../shared/types";
import { chainById } from "../../shared/chains";
import { brl } from "../../shared/compare";
import { formatDistance } from "../../shared/geo";
import { unitLabel } from "../../shared/quantity";

interface Props {
  offer: Offer;
  best?: boolean;
  distanceM?: number;
}

export function OfferCard({ offer, best, distanceM }: Props) {
  const chain = chainById(offer.chainId);
  const discount = offer.listPrice > offer.price ? Math.round((1 - offer.price / offer.listPrice) * 100) : 0;
  return (
    <a className={`card ${best ? "best" : ""}`} href={offer.url} target="_blank" rel="noreferrer">
      {best && <span className="ribbon">Menor preço</span>}
      <div className="thumb">{offer.image ? <img src={offer.image} alt="" loading="lazy" /> : "🛒"}</div>
      <div className="info">
        <span className="badge" style={{ background: chain?.color }}>
          {chain?.name ?? offer.chainId}
        </span>
        {distanceM !== undefined && <span className="muted small"> a {formatDistance(distanceM)}</span>}
        <div className="name">{offer.name}</div>
        <div className="prices">
          <span className="price">{brl(offer.price)}</span>
          {discount > 0 && (
            <span className="old">
              {brl(offer.listPrice)} <em>-{discount}%</em>
            </span>
          )}
        </div>
        {offer.unitPrice !== null && (
          <div className="muted small">
            {brl(offer.unitPrice)}
            {unitLabel(offer.quantity)}
          </div>
        )}
      </div>
    </a>
  );
}
