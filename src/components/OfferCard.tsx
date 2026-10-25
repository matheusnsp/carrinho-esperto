import { hideBroken } from "../hideBroken";
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
    <a className={`card ${best ? "is-best" : ""}`} href={offer.url} target="_blank" rel="noreferrer">
      <div className="card-media">
        {offer.image ? <img src={offer.image} alt="" loading="lazy" onError={hideBroken} /> : <span className="no-img">sem foto</span>}
        {discount > 0 && <span className="tag-discount">-{discount}%</span>}
        {best && <span className="tag-best">Mais barato</span>}
      </div>
      <div className="card-body">
        <div className="card-store">
          <span className="dot" style={{ background: chain?.color }} />
          <span>{chain?.name ?? offer.chainId}</span>
          {distanceM !== undefined && <span className="muted">· {formatDistance(distanceM)}</span>}
        </div>
        <h3 className="card-title">{offer.name}</h3>
        <div className="card-price">
          {discount > 0 && <s>{brl(offer.listPrice)}</s>}
          <strong>{brl(offer.price)}</strong>
          {offer.unitPrice !== null && (
            <span className="unit">
              {brl(offer.unitPrice)}
              {unitLabel(offer.quantity)}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

export function OfferSkeleton() {
  return (
    <div className="card skeleton" aria-hidden>
      <div className="card-media shimmer" />
      <div className="card-body">
        <div className="line shimmer" style={{ width: "40%" }} />
        <div className="line shimmer" />
        <div className="line shimmer" style={{ width: "70%" }} />
        <div className="line big shimmer" style={{ width: "45%" }} />
      </div>
    </div>
  );
}
