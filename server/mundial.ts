import type { Chain, ChainResult, Offer } from "../shared/types.js";
import { parseQuantity, unitPrice } from "../shared/quantity.js";
import { parseBrl, searchByWords } from "../shared/textSearch.js";

/**
 * O Mundial não vende online; publica as ofertas da semana numa API GraphQL.
 * Baixamos todas as ofertas vigentes, guardamos por 1 hora e buscamos nelas.
 */
const API = "https://mundial-api.supermercadosmundial.com.br/graphql";
const SITE = "https://www.supermercadosmundial.com.br";
const CACHE_MS = 60 * 60_000;

const QUERY = `query($w: ProductOfferWhereInput!) {
  offers(where: $w, limit: 2000) {
    id price oldPrice measureUnit unpublishedIn
    product { sku description images { url } }
  }
}`;

export interface MundialItem {
  id: string;
  name: string;
  price: number;
  oldPrice: number | null;
  perKg: boolean;
  image: string | null;
  until: string;
}

export function parseOffers(offers: any[]): MundialItem[] {
  return offers
    .map((o) => {
      const images: string[] = (o.product?.images ?? []).map((i: any) => i.url);
      return {
        id: String(o.id),
        name: String(o.product?.description ?? "").replace(/\s+/g, " ").trim(),
        price: parseBrl(String(o.price ?? "")),
        oldPrice: o.oldPrice ? parseBrl(String(o.oldPrice)) : null,
        perKg: String(o.measureUnit).toUpperCase() === "KG",
        image: images.find((u) => u.includes("300x300.webp")) ?? images[0] ?? null,
        until: String(o.unpublishedIn ?? ""),
      };
    })
    .filter((i) => i.name && i.price > 0);
}

let cache: { at: number; items: MundialItem[] } | null = null;

async function loadOffers(): Promise<MundialItem[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.items;
  const now = new Date().toISOString();
  const resp = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (CarrinhoEsperto)" },
    body: JSON.stringify({ query: QUERY, variables: { w: { publishedIn: now, unpublishedIn: now } } }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data: any = await resp.json();
  if (data.errors?.length) throw new Error(data.errors[0].message);
  const items = parseOffers(data.data?.offers ?? []);
  cache = { at: Date.now(), items };
  return items;
}

export function toMundialOffer(chain: Chain, item: MundialItem): Offer {
  const quantity = item.perKg ? { amount: 1, unit: "kg" as const } : parseQuantity(item.name);
  return {
    chainId: chain.id,
    productId: item.id,
    name: item.name,
    brand: "",
    ean: null,
    price: item.price,
    listPrice: item.oldPrice && item.oldPrice > item.price ? item.oldPrice : item.price,
    available: true,
    image: item.image,
    url: `${SITE}/departamentos/categoria/ofertas`,
    quantity,
    unitPrice: unitPrice(item.price, quantity),
  };
}

export async function searchMundial(chain: Chain, query: string): Promise<ChainResult> {
  try {
    const items = await loadOffers();
    const offers = searchByWords(items, query).map((i) => toMundialOffer(chain, i));
    return { chainId: chain.id, ok: true, note: "ofertas da semana", offers };
  } catch (err) {
    return { chainId: chain.id, ok: false, error: err instanceof Error ? err.message : String(err), offers: [] };
  }
}
