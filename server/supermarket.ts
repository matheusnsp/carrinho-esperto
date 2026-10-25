import type { Chain, ChainResult, Offer } from "../shared/types.js";
import { parseQuantity, unitPrice } from "../shared/quantity.js";
import { normalizeText } from "../shared/geo.js";
import { parseBrl, searchByWords } from "../shared/textSearch.js";

/**
 * A rede Supermarket (lojas independentes, cada uma com seu preço) não tem catálogo online.
 * O site da rede mostra só os destaques da semana; o guia completo é um PDF em imagem.
 */
const PAGE = "https://www.redesupermarket.com.br/ofertas/";
const CACHE_MS = 60 * 60_000;

export interface SupermarketItem {
  name: string;
  price: number;
  perKg: boolean;
  image: string | null;
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&#0?38;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();

export function parseOffersPage(html: string): { items: SupermarketItem[]; validUntil: string | null } {
  const items: SupermarketItem[] = [];
  for (const card of html.split('class="card-product ').slice(1)) {
    const name = card.match(/class="card-product__title">([^<]+)</);
    const main = card.match(/card-product__price-main">\s*([\d.]+)\s*</);
    const dec = card.match(/card-product__price-sup--decimal">\s*(\d{2})\s*</);
    if (!name || !main || !dec) continue;
    const info = card.match(/card-product__price-sup--info">\s*([^<]*)</)?.[1] ?? "";
    const img = card.match(/data-src="([^"]+)"/) ?? card.match(/<img[^>]+src="(https?:[^"]+)"/);
    items.push({
      name: decode(name[1]),
      price: parseBrl(`${main[1]},${dec[1]}`),
      perKg: /kg/i.test(info),
      image: img ? img[1] : null,
    });
  }
  // "Ofertas válidas de sexta a domingo, 23 a 25/10/2026"
  const valid = normalizeText(html).match(/ofertas validas de.{0,80}?(\d{1,2}\/\d{2})\/\d{4}/);
  return { items, validUntil: valid ? valid[1] : null };
}

let cache: { at: number; items: SupermarketItem[]; validUntil: string | null } | null = null;

async function loadOffers() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const resp = await fetch(PAGE, {
    headers: { "User-Agent": "Mozilla/5.0 (CarrinhoEsperto)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  cache = { at: Date.now(), ...parseOffersPage(await resp.text()) };
  return cache;
}

export function toSupermarketOffer(chain: Chain, item: SupermarketItem): Offer {
  const quantity = item.perKg ? { amount: 1, unit: "kg" as const } : parseQuantity(item.name);
  return {
    chainId: chain.id,
    productId: normalizeText(item.name).replace(/[^a-z0-9]+/g, "-"),
    name: item.name,
    brand: "",
    ean: null,
    price: item.price,
    listPrice: item.price,
    available: true,
    image: item.image,
    url: PAGE,
    quantity,
    unitPrice: unitPrice(item.price, quantity),
  };
}

export async function searchSupermarket(chain: Chain, query: string): Promise<ChainResult> {
  try {
    const { items, validUntil } = await loadOffers();
    const offers = searchByWords(items, query).map((i) => toSupermarketOffer(chain, i));
    const note = `destaques${validUntil ? ` até ${validUntil}` : " da semana"}`;
    return { chainId: chain.id, ok: true, note, offers };
  } catch (err) {
    return { chainId: chain.id, ok: false, error: err instanceof Error ? err.message : String(err), offers: [] };
  }
}
