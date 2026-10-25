import type { ChainResult, Offer } from "./types.js";

export interface SameProductGroup {
  ean: string;
  name: string;
  image: string | null;
  /** Ofertas do mesmo produto, uma por rede, da mais barata para a mais cara. */
  offers: Offer[];
  savings: number;
}

/** Junta produtos idênticos (mesmo código de barras) vendidos em redes diferentes. */
export function groupByEan(results: ChainResult[]): SameProductGroup[] {
  const byEan = new Map<string, Map<string, Offer>>();
  for (const r of results) {
    for (const o of r.offers) {
      if (!o.ean) continue;
      const perChain = byEan.get(o.ean) ?? new Map<string, Offer>();
      const prev = perChain.get(o.chainId);
      if (!prev || o.price < prev.price) perChain.set(o.chainId, o);
      byEan.set(o.ean, perChain);
    }
  }
  const groups: SameProductGroup[] = [];
  for (const [ean, perChain] of byEan) {
    if (perChain.size < 2) continue;
    const offers = [...perChain.values()].sort((a, b) => a.price - b.price);
    groups.push({
      ean,
      name: offers[0].name,
      image: offers.find((o) => o.image)?.image ?? null,
      offers,
      savings: Math.round((offers[offers.length - 1].price - offers[0].price) * 100) / 100,
    });
  }
  return groups.sort((a, b) => b.offers.length - a.offers.length || b.savings - a.savings);
}

export type SortMode = "price" | "unitPrice" | "relevance";

export function flattenOffers(results: ChainResult[], sort: SortMode): Offer[] {
  // Intercala as redes para que "relevância" não mostre só a primeira rede.
  const lists = results.map((r) => r.offers);
  const max = Math.max(0, ...lists.map((l) => l.length));
  const all: Offer[] = [];
  for (let i = 0; i < max; i++) for (const l of lists) if (l[i]) all.push(l[i]);

  if (sort === "price") return all.sort((a, b) => a.price - b.price);
  if (sort === "unitPrice")
    return all.sort((a, b) => (a.unitPrice ?? Infinity) - (b.unitPrice ?? Infinity) || a.price - b.price);
  return all;
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
