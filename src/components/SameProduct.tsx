import { hideBroken } from "../hideBroken";
import type { SameProductGroup } from "../../shared/compare";
import { brl } from "../../shared/compare";
import { chainById } from "../../shared/chains";

export function SameProduct({ groups }: { groups: SameProductGroup[] }) {
  if (!groups.length) return null;
  return (
    <section className="block">
      <div className="block-head">
        <h2>Mesmo produto, preços diferentes</h2>
        <p>Itens com o mesmo código de barras em mais de um mercado.</p>
      </div>
      <div className="compare-grid">
        {groups.slice(0, 6).map((g) => {
          const max = g.offers[g.offers.length - 1].price;
          return (
            <article key={g.ean} className="compare">
              <header>
                <div className="compare-img">{g.image && <img src={g.image} alt="" loading="lazy" onError={hideBroken} />}</div>
                <h3>{g.name}</h3>
              </header>
              <ol>
                {g.offers.map((o, i) => {
                  const chain = chainById(o.chainId);
                  return (
                    <li key={o.chainId}>
                      <a href={o.url} target="_blank" rel="noreferrer" className={i === 0 ? "winner" : ""}>
                        <span className="bar-label">
                          <span className="dot" style={{ background: chain?.color }} />
                          {chain?.name}
                        </span>
                        <span className="bar-track">
                          <span className="bar" style={{ width: `${Math.max(18, (o.price / max) * 100)}%` }} />
                        </span>
                        <strong>{brl(o.price)}</strong>
                      </a>
                    </li>
                  );
                })}
              </ol>
              {g.savings > 0 && (
                <footer>
                  Economize até <strong>{brl(g.savings)}</strong>
                </footer>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
