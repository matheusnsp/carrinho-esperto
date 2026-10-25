import { FormEvent, useEffect, useMemo, useState } from "react";
import type { NearbyStore, SearchResponse } from "../shared/types";
import { CHAINS } from "../shared/chains";
import { SortMode, flattenOffers, groupByEan } from "../shared/compare";
import { fetchNearby, searchProducts } from "./api";
import { useGeolocation } from "./useLocation";
import { StoreMap } from "./components/StoreMap";
import { NearbyList } from "./components/NearbyList";
import { OfferCard } from "./components/OfferCard";
import { SameProduct } from "./components/SameProduct";

const RADII = [1000, 3000, 5000, 10000];
const SUGGESTIONS = ["arroz 5kg", "feijão preto 1kg", "leite integral", "café 500g", "óleo de soja"];

export default function App() {
  const geo = useGeolocation();
  const [radius, setRadius] = useState(3000);
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [onlyNearby, setOnlyNearby] = useState(true);
  const [sort, setSort] = useState<SortMode>("price");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!geo.position) return;
    let cancelled = false;
    setStoresLoading(true);
    setStoresError(null);
    fetchNearby(geo.position.lat, geo.position.lon, radius)
      .then((s) => !cancelled && setStores(s))
      .catch((e) => !cancelled && setStoresError(e.message))
      .finally(() => !cancelled && setStoresLoading(false));
    return () => {
      cancelled = true;
    };
  }, [geo.position, radius]);

  /** Distância até a loja mais próxima de cada rede. */
  const nearestByChain = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stores) if (s.chainId && !m.has(s.chainId)) m.set(s.chainId, s.distanceM);
    return m;
  }, [stores]);

  const nearbyChainIds = [...nearestByChain.keys()];
  const useNearbyFilter = onlyNearby && nearbyChainIds.length > 0;
  const chainIds = useNearbyFilter ? nearbyChainIds : [];

  async function runSearch(q: string) {
    if (q.trim().length < 2) return;
    setQuery(q);
    setSearching(true);
    setSearchError(null);
    try {
      setResult(await searchProducts(q.trim(), chainIds));
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  const offers = useMemo(() => (result ? flattenOffers(result.results, sort) : []), [result, sort]);
  const groups = useMemo(() => (result ? groupByEan(result.results) : []), [result]);
  const failed = result?.results.filter((r) => !r.ok) ?? [];
  const cheapest = offers.length ? Math.min(...offers.map((o) => o.price)) : null;

  return (
    <div className="app">
      <header>
        <h1>
          🛒 Carrinho <span>Esperto</span>
        </h1>
        <p>Encontre o mercado mais barato perto de você.</p>
      </header>

      <main>
        <aside className="panel">
          <h2>1. Onde você está?</h2>
          <div className="controls">
            <button onClick={geo.locate} disabled={geo.status === "loading"}>
              {geo.status === "loading" ? "Localizando…" : "📍 Usar minha localização"}
            </button>
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="Raio">
              {RADII.map((r) => (
                <option key={r} value={r}>
                  até {r / 1000} km
                </option>
              ))}
            </select>
          </div>
          {geo.error && <p className="error small">{geo.error}</p>}
          {!geo.position && !geo.error && <p className="muted small">Ou clique no mapa para marcar sua posição.</p>}
          <StoreMap position={geo.position} radius={radius} stores={stores} onPick={geo.setPosition} />
          {storesLoading && <p className="muted small">Procurando mercados…</p>}
          {storesError && <p className="error small">Erro ao buscar mercados: {storesError}</p>}
          {geo.position && !storesLoading && !storesError && <NearbyList stores={stores} />}
        </aside>

        <section className="content">
          <h2>2. O que você quer comprar?</h2>
          <form onSubmit={onSubmit} className="search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: arroz 5kg, leite integral, café…"
              autoFocus
            />
            <button type="submit" disabled={searching || query.trim().length < 2}>
              {searching ? "Buscando…" : "Comparar"}
            </button>
          </form>
          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => runSearch(s)}>
                {s}
              </button>
            ))}
          </div>

          <div className="options small">
            <label>
              <input
                type="checkbox"
                checked={onlyNearby}
                onChange={(e) => setOnlyNearby(e.target.checked)}
                disabled={!nearbyChainIds.length}
              />{" "}
              Só mercados perto de mim
              {nearbyChainIds.length > 0 ? ` (${nearbyChainIds.length} redes)` : " — defina sua localização"}
            </label>
            <label>
              Ordenar por{" "}
              <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
                <option value="price">menor preço</option>
                <option value="unitPrice">preço por kg / litro</option>
                <option value="relevance">relevância</option>
              </select>
            </label>
          </div>
          {!useNearbyFilter && (
            <p className="muted small">Buscando em todas as redes: {CHAINS.map((c) => c.name).join(", ")}.</p>
          )}

          {searchError && <p className="error">{searchError}</p>}
          {failed.length > 0 && (
            <p className="warn small">
              Não foi possível consultar: {failed.map((r) => CHAINS.find((c) => c.id === r.chainId)?.name).join(", ")}.
            </p>
          )}

          {result && !searching && (
            <>
              <SameProduct groups={groups} />
              <section>
                <h2>
                  {offers.length} ofertas para “{result.query}”
                </h2>
                {offers.length === 0 && <p className="muted">Nada encontrado. Tente outro termo.</p>}
                <div className="grid">
                  {offers.map((o) => (
                    <OfferCard
                      key={`${o.chainId}-${o.productId}`}
                      offer={o}
                      best={sort === "price" && o.price === cheapest}
                      distanceM={nearestByChain.get(o.chainId)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

          <p className="disclaimer small">
            Preços das lojas online de cada rede. O valor na loja física pode ser diferente. Mapa ©
            OpenStreetMap.
          </p>
        </section>
      </main>
    </div>
  );
}
