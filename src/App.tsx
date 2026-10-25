import { useEffect, useMemo, useState } from "react";
import type { NearbyStore, SearchResponse } from "../shared/types";
import { CHAINS } from "../shared/chains";
import { SortMode, flattenOffers, groupByEan } from "../shared/compare";
import { formatDistance } from "../shared/geo";
import { fetchNearby, searchProducts } from "./api";
import { useGeolocation } from "./useLocation";
import { setCodec, usePersistentState } from "./usePersistentState";
import { StoreMap } from "./components/StoreMap";
import { NearbyList } from "./components/NearbyList";
import { OfferCard, OfferSkeleton } from "./components/OfferCard";
import { SameProduct } from "./components/SameProduct";
import { BestDeal } from "./components/BestDeal";
import { Hero } from "./components/Hero";
import { EmptyState } from "./components/EmptyState";
import { Coverage } from "./components/Coverage";
import { CartIcon, CrosshairIcon, PinIcon } from "./components/Icons";

const RADII = [1000, 3000, 5000, 10000];

export default function App() {
  const geo = useGeolocation();
  const [radius, setRadius] = usePersistentState("ce:raio", 3000);
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [onlyNearby, setOnlyNearby] = usePersistentState("ce:soPerto", true);
  // Redes que a pessoa desmarcou; fica salvo entre buscas e visitas.
  const [hidden, setHidden] = usePersistentState("ce:desmarcados", new Set<string>(), setCodec);
  const [sort, setSort] = usePersistentState<SortMode>("ce:ordem", "price");
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
  const searchedChainIds = useNearbyFilter ? nearbyChainIds : CHAINS.map((c) => c.id);

  async function runSearch(q: string, chainIds = searchedChainIds) {
    if (q.trim().length < 2) return;
    setQuery(q);
    setSearching(true);
    setSearchError(null);
    try {
      setResult(await searchProducts(q.trim(), chainIds, geo.cep));
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  }

  // Refaz a busca quando muda o conjunto de redes (localização, raio ou filtro "perto de mim") ou o CEP.
  // O CEP muda a loja usada pelo Pão de Açúcar e pelo Extra.
  const chainsKey = `${searchedChainIds.join(",")}|${geo.cep ?? ""}`;
  useEffect(() => {
    if (result) runSearch(result.query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainsKey]);

  const visible = useMemo(
    () => (result ? result.results.filter((r) => r.ok && !hidden.has(r.chainId)) : []),
    [result, hidden],
  );
  const offers = useMemo(() => flattenOffers(visible, sort), [visible, sort]);
  const groups = useMemo(() => groupByEan(visible), [visible]);
  const cheapest = useMemo(
    () => offers.reduce<(typeof offers)[number] | null>((b, o) => (!b || o.price < b.price ? o : b), null),
    [offers],
  );
  const cheapestGroup = cheapest?.ean ? groups.find((g) => g.ean === cheapest.ean) : undefined;

  function toggleChain(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="app">
      <nav className="topbar">
        <div className="brand">
          <span className="logo">
            <CartIcon size={20} />
          </span>
          Carrinho <b>Esperto</b>
        </div>
        <button className="loc-pill" onClick={geo.locate} disabled={geo.status === "loading"}>
          <PinIcon size={16} />
          <span>
            {geo.status === "loading"
              ? "Localizando…"
              : geo.position
                ? (geo.label ?? "Sua localização")
                : "Definir localização"}
          </span>
        </button>
      </nav>

      <Hero query={query} setQuery={setQuery} onSearch={(q) => runSearch(q)} searching={searching} />

      <main className="layout">
        <div className="results">
          <Coverage
            chainIds={searchedChainIds}
            results={result?.results ?? null}
            searching={searching}
            hidden={hidden}
            onToggle={toggleChain}
            nearestByChain={nearestByChain}
            nearbyOnly={useNearbyFilter}
          />

          <div className="toolbar">
            <label className="switch">
              <input
                type="checkbox"
                checked={onlyNearby}
                onChange={(e) => setOnlyNearby(e.target.checked)}
                disabled={!nearbyChainIds.length}
              />
              <span className="track" />
              Só mercados perto de mim
            </label>
            {result && (
              <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} aria-label="Ordenar">
                <option value="price">Menor preço</option>
                <option value="unitPrice">Preço por kg/litro</option>
                <option value="relevance">Relevância</option>
              </select>
            )}
          </div>

          {searchError && <div className="alert alert-error">{searchError}</div>}

          {searching && (
            <div className="grid">
              {Array.from({ length: 8 }, (_, i) => (
                <OfferSkeleton key={i} />
              ))}
            </div>
          )}

          {!searching && !result && <EmptyState />}

          {!searching && result && (
            <>
              {cheapest && (
                <BestDeal
                  offer={cheapest}
                  total={offers.length}
                  storesCount={visible.filter((r) => r.offers.length).length}
                  sameProductMax={cheapestGroup?.offers[cheapestGroup.offers.length - 1].price}
                  distanceM={nearestByChain.get(cheapest.chainId)}
                />
              )}
              <SameProduct groups={groups} />
              <section className="block">
                <div className="block-head">
                  <h2>Todas as ofertas</h2>
                  <p>
                    {offers.length} resultados para “{result.query}”
                  </p>
                </div>
                {offers.length === 0 ? (
                  <p className="hint">Nada encontrado. Tente outro termo, como “arroz 5kg”.</p>
                ) : (
                  <div className="grid">
                    {offers.map((o) => (
                      <OfferCard
                        key={`${o.chainId}-${o.productId}`}
                        offer={o}
                        best={o === cheapest}
                        distanceM={nearestByChain.get(o.chainId)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <aside className="side">
          <div className="side-card">
            <div className="side-head">
              <div>
                <h2>Mercados perto de você</h2>
                <p>{geo.position ? `Num raio de ${formatDistance(radius)}` : "Toque no mapa ou use o GPS"}</p>
              </div>
              <button className="icon-btn" onClick={geo.locate} title="Usar minha localização">
                <CrosshairIcon />
              </button>
            </div>
            <div className="radius">
              {RADII.map((r) => (
                <button key={r} className={r === radius ? "on" : ""} onClick={() => setRadius(r)}>
                  {r / 1000} km
                </button>
              ))}
            </div>
            <StoreMap position={geo.position} radius={radius} stores={stores} onPick={geo.setPosition} />
            {geo.error && <div className="alert">{geo.error}</div>}
            {storesLoading && <p className="hint">Procurando mercados…</p>}
            {storesError && <div className="alert alert-error">Erro ao buscar mercados: {storesError}</div>}
            {geo.position && !storesLoading && !storesError && <NearbyList stores={stores} />}
          </div>
        </aside>
      </main>

      <footer className="foot">
        Preços das lojas online de cada rede. O valor na loja física pode ser diferente. Mapa © OpenStreetMap.
      </footer>
    </div>
  );
}
