import type { ChainResult } from "../../shared/types";
import { chainById } from "../../shared/chains";
import { formatDistance } from "../../shared/geo";

interface Props {
  chainIds: string[];
  results: ChainResult[] | null;
  searching: boolean;
  hidden: Set<string>;
  onToggle: (id: string) => void;
  nearestByChain: Map<string, number>;
  nearbyOnly: boolean;
}

/** Mostra quais mercados entram na comparação e a situação de cada um. */
export function Coverage({ chainIds, results, searching, hidden, onToggle, nearestByChain, nearbyOnly }: Props) {
  const byId = new Map(results?.map((r) => [r.chainId, r]));
  const ids = results && !searching ? results.map((r) => r.chainId) : chainIds;
  const included = results && !searching ? results.filter((r) => r.ok && r.offers.length && !hidden.has(r.chainId)).length : ids.length;

  return (
    <section className="coverage">
      <div className="coverage-head">
        <h2>
          Mercados nesta comparação <span className="badge-count">{included}</span>
        </h2>
        <p>
          {nearbyOnly
            ? "Redes com loja perto de você e preços online."
            : "Todas as redes com preços online. Defina sua localização para ver só as próximas."}
          {results && !searching && " Toque para incluir ou tirar da comparação."}
        </p>
      </div>
      <ul className="coverage-list">
        {ids.map((id) => {
          const chain = chainById(id);
          const r = searching ? undefined : byId.get(id);
          const dist = nearestByChain.get(id);
          const failed = r && !r.ok;
          const empty = r?.ok && r.offers.length === 0;
          const off = hidden.has(id);
          const state = searching ? "loading" : failed ? "failed" : empty ? "empty" : off ? "off" : r ? "on" : "idle";
          const status = searching
            ? "consultando…"
            : failed
              ? "não respondeu"
              : empty
                ? "sem resultados"
                : r
                  ? `${r.offers.length} ofertas`
                  : dist !== undefined
                    ? `a ${formatDistance(dist)}`
                    : "loja online";
          return (
            <li key={id}>
              <button
                className={`cov cov-${state}`}
                style={{ ["--c" as string]: chain?.color }}
                onClick={() => onToggle(id)}
                disabled={!r || failed || empty}
                aria-pressed={r ? !off : undefined}
                title={failed ? r?.error : undefined}
              >
                <span className="cov-avatar">{chain?.name.charAt(0)}</span>
                <span className="cov-text">
                  <span className="cov-name">{chain?.name ?? id}</span>
                  <span className="cov-status">
                    {status}
                    {r && dist !== undefined && !failed && ` · ${formatDistance(dist)}`}
                  </span>
                </span>
                {r && !failed && !empty && <span className="cov-check">{off ? "" : "✓"}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
