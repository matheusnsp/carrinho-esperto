import type { Chain, ChainResult, Offer } from "../shared/types.js";
import { parseQuantity, unitPrice } from "../shared/quantity.js";

const TIMEOUT_MS = 10_000;

/** Converte um produto da busca VTEX em uma oferta. Retorna null se não houver preço. */
export function toOffer(chain: Chain, p: any): Offer | null {
  const item = p?.items?.[0];
  const offer = item?.sellers?.find((s: any) => s?.commertialOffer?.Price > 0)?.commertialOffer;
  if (!item || !offer) return null;

  const name: string = p.productName ?? item.name ?? "";
  const path = p.link ? new URL(p.link, `https://${chain.domain}`).pathname : `/${p.linkText}/p`;
  const quantity = parseQuantity(item.nameComplete ?? name) ?? parseQuantity(name);
  const price: number = offer.Price;
  return {
    chainId: chain.id,
    productId: String(p.productId),
    name,
    brand: p.brand ?? "",
    ean: item.ean || null,
    price,
    listPrice: offer.ListPrice > price ? offer.ListPrice : price,
    available: (offer.AvailableQuantity ?? 0) > 0,
    image: item.images?.[0]?.imageUrl ?? null,
    url: `https://${chain.domain}${path}`,
    quantity,
    unitPrice: unitPrice(price, quantity),
  };
}

export async function searchChain(chain: Chain, query: string, count = 12): Promise<ChainResult> {
  const url =
    `https://${chain.apiDomain ?? chain.domain}/api/io/_v/api/intelligent-search/product_search/` +
    `?query=${encodeURIComponent(query)}&count=${count}&page=1&locale=pt-BR&hideUnavailableItems=true`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (CarrinhoEsperto)", Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: any = await resp.json();
    const offers = (data.products ?? [])
      .map((p: any) => toOffer(chain, p))
      .filter((o: Offer | null): o is Offer => o !== null);
    return { chainId: chain.id, ok: true, offers };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { chainId: chain.id, ok: false, error: msg, offers: [] };
  }
}
