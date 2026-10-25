import type { Chain, ChainResult, Offer } from "../shared/types.js";
import { parseQuantity, unitPrice } from "../shared/quantity.js";
import { normalizeText } from "../shared/geo.js";
import { searchByWords } from "../shared/textSearch.js";

/**
 * O Guanabara não vende online, mas publica a lista de preços de cada categoria no site
 * (com data de validade). Lemos todas as categorias, guardamos por algumas horas e buscamos nelas.
 */
const BASE = "https://www.supermercadosguanabara.com.br";
const CATEGORIES = [2, 12, 22, 32, 42, 52, 62, 72, 82, 92, 102, 112, 152, 203];
const CACHE_MS = 3 * 60 * 60_000;

export interface GuanabaraItem {
  name: string;
  price: number;
  image: string | null;
  category: number;
}

interface Catalog {
  at: number;
  items: GuanabaraItem[];
  validUntil: string | null;
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** Extrai os produtos de uma página de categoria. */
export function parseCategory(html: string, category: number): { items: GuanabaraItem[]; validUntil: string | null } {
  const items: GuanabaraItem[] = [];
  for (const block of html.split('class="col item"').slice(1)) {
    const price = block.match(/<span class="number">\s*([\d.]+,\d{2})\s*<\/span>/);
    const name = block.match(/<div class="name">([^<]+)<\/div>/);
    if (!price || !name) continue;
    const img = block.match(/background-image:\s*url\('([^']+)'\)/);
    items.push({
      name: decode(name[1]),
      price: parseFloat(price[1].replace(/\./g, "").replace(",", ".")),
      image: img ? `https:${img[1].replace(/^https?:/, "").replace(":443", "")}` : null,
      category,
    });
  }
  const valid = html.match(/Validade:\s*(\d{2}\/\d{2})\/\d{4}/);
  return { items, validUntil: valid ? valid[1] : null };
}

let catalog: Catalog | null = null;
let loading: Promise<Catalog> | null = null;

async function loadCatalog(): Promise<Catalog> {
  if (catalog && Date.now() - catalog.at < CACHE_MS) return catalog;
  loading ??= (async () => {
    const pages = await Promise.allSettled(
      CATEGORIES.map(async (id) => {
        const resp = await fetch(`${BASE}/produtos/${id}`, {
          headers: { "User-Agent": "Mozilla/5.0 (CarrinhoEsperto)" },
          signal: AbortSignal.timeout(10_000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return parseCategory(await resp.text(), id);
      }),
    );
    const ok = pages.flatMap((p) => (p.status === "fulfilled" ? [p.value] : []));
    if (!ok.length) throw new Error("site do Guanabara fora do ar");
    catalog = {
      at: Date.now(),
      items: ok.flatMap((p) => p.items),
      validUntil: ok.find((p) => p.validUntil)?.validUntil ?? null,
    };
    return catalog;
  })().finally(() => {
    loading = null;
  });
  return loading;
}

/** Busca nos itens da lista; veja searchByWords. */
export const searchItems = (items: GuanabaraItem[], query: string, count = 12) => searchByWords(items, query, count);

export function toGuanabaraOffer(chain: Chain, item: GuanabaraItem): Offer {
  const quantity = parseQuantity(item.name);
  return {
    chainId: chain.id,
    productId: `${item.category}-${normalizeText(item.name).replace(/[^a-z0-9]+/g, "-")}`,
    name: item.name,
    brand: "",
    ean: null,
    price: item.price,
    listPrice: item.price,
    available: true,
    image: item.image,
    url: `${BASE}/produtos/${item.category}`,
    quantity,
    unitPrice: unitPrice(item.price, quantity),
  };
}

export async function searchGuanabara(chain: Chain, query: string): Promise<ChainResult> {
  try {
    const cat = await loadCatalog();
    const offers = searchItems(cat.items, query).map((i) => toGuanabaraOffer(chain, i));
    return { chainId: chain.id, ok: true, note: cat.validUntil ? `preços até ${cat.validUntil}` : undefined, offers };
  } catch (err) {
    return { chainId: chain.id, ok: false, error: err instanceof Error ? err.message : String(err), offers: [] };
  }
}
