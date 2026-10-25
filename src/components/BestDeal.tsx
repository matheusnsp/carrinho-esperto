import { hideBroken } from "../hideBroken";
import type { NearbyStore, Offer } from "../../shared/types";
import { chainById } from "../../shared/chains";
import { brl } from "../../shared/compare";
import { formatDistance } from "../../shared/geo";
import { unitLabel } from "../../shared/quantity";
import { ExternalIcon, PinIcon, TrophyIcon } from "./Icons";
import { directionLinks } from "../directions";

interface Props {
  offer: Offer;
  total: number;
  storesCount: number;
  /** Preço mais alto do mesmo produto (mesmo EAN) em outra rede, se houver. */
  sameProductMax?: number;
  /** Loja mais próxima da rede com o melhor preço, se houver uma perto. */
  nearest?: NearbyStore;
  onShowOnMap: (storeId: string) => void;
}

export function BestDeal({ offer, total, storesCount, sameProductMax, nearest, onShowOnMap }: Props) {
  const chain = chainById(offer.chainId);
  return (
    <section className="best">
      <div className="best-img">{offer.image && <img src={offer.image} alt="" onError={hideBroken} />}</div>
      <div className="best-info">
        <span className="eyebrow">
          <TrophyIcon size={16} /> Melhor preço entre {total} ofertas em {storesCount}{" "}
          {storesCount === 1 ? "mercado" : "mercados"}
        </span>
        <h2>{offer.name}</h2>
        <div className="best-store">
          <span className="chip-store" style={{ background: chain?.color }}>
            {chain?.name}
          </span>
          {nearest && <span>a {formatDistance(nearest.distanceM)} de você</span>}
        </div>
        {nearest && (
          <div className="best-actions">
            <button className="btn btn-ghost" onClick={() => onShowOnMap(nearest.id)}>
              <PinIcon size={16} /> Ver no mapa
            </button>
            {directionLinks(nearest).map((l) => (
              <a key={l.app} href={l.url} target="_blank" rel="noreferrer" className="btn btn-ghost">
                {l.app}
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="best-price">
        <strong>{brl(offer.price)}</strong>
        {offer.unitPrice !== null && (
          <span>
            {brl(offer.unitPrice)}
            {unitLabel(offer.quantity)}
          </span>
        )}
        {sameProductMax !== undefined && sameProductMax > offer.price && (
          <em>{brl(sameProductMax - offer.price)} a menos que em outro mercado</em>
        )}
        <a href={offer.url} target="_blank" rel="noreferrer" className="btn btn-light">
          Ver na loja <ExternalIcon />
        </a>
      </div>
    </section>
  );
}
