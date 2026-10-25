import type { SameProductGroup } from "../../shared/compare";
import { brl } from "../../shared/compare";
import { chainById } from "../../shared/chains";

export function SameProduct({ groups }: { groups: SameProductGroup[] }) {
  if (!groups.length) return null;
  return (
    <section>
      <h2>Mesmo produto, preços diferentes</h2>
      <p className="muted small">Produtos com o mesmo código de barras encontrados em mais de um mercado.</p>
      <div className="same-list">
        {groups.slice(0, 8).map((g) => (
          <div key={g.ean} className="same">
            <div className="thumb small-thumb">{g.image ? <img src={g.image} alt="" loading="lazy" /> : "🛒"}</div>
            <div className="grow">
              <div className="name">{g.name}</div>
              <div className="rows">
                {g.offers.map((o, i) => {
                  const chain = chainById(o.chainId);
                  return (
                    <a key={o.chainId} href={o.url} target="_blank" rel="noreferrer" className={`row ${i === 0 ? "cheapest" : ""}`}>
                      <span className="dot" style={{ background: chain?.color }} />
                      <span className="grow">{chain?.name}</span>
                      <strong>{brl(o.price)}</strong>
                    </a>
                  );
                })}
              </div>
              {g.savings > 0 && <div className="save">Economia de até {brl(g.savings)}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
