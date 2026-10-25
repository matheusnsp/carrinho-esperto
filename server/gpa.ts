import type { Chain, ChainResult, Offer } from "../shared/types.js";
import { parseQuantity, unitPrice } from "../shared/quantity.js";

const API = "https://api.vendas.gpa.digital";
/** Cada bandeira serve as fotos num domínio próprio. */
const IMAGE_HOST: Record<string, string> = {
  pa: "https://static.paodeacucar.com",
  ex: "https://static.extramercado.com.br",
};
/** CEP usado quando não sabemos onde a pessoa está (Centro do Rio). */
export const DEFAULT_CEP = "20040020";
const TIMEOUT_MS = 10_000;

const headers = { "User-Agent": "Mozilla/5.0 (CarrinhoEsperto)", Accept: "application/json" };

export interface GpaStore {
  id: number;
  name: string;
}

const storeCache = new Map<string, { at: number; store: GpaStore | null }>();
const STORE_CACHE_MS = 6 * 60 * 60_000;

/** Loja que entrega no CEP; o preço do Pão de Açúcar e do Extra muda de loja para loja. */
export async function storeForCep(brand: string, cep: string): Promise<GpaStore | null> {
  const key = `${brand}:${cep}`;
  const hit = storeCache.get(key);
  if (hit && Date.now() - hit.at < STORE_CACHE_MS) return hit.store;

  const resp = await fetch(`${API}/${brand}/delivery-v2/ecom/deliveryOptions?zipCode=${cep}`, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const first = ((await resp.json()).deliveryTypes ?? [])[0];
  const store = first ? { id: Number(first.storeid), name: String(first.storeName).replace(/^\d+\s*-\s*/, "") } : null;
  storeCache.set(key, { at: Date.now(), store });
  return store;
}

export function toGpaOffer(chain: Chain, p: any): Offer | null {
  if (!p?.price || p.price <= 0) return null;
  const name: string = p.name ?? "";
  const quantity = parseQuantity(name);
  const image: string | undefined = p.productImages?.[0];
  return {
    chainId: chain.id,
    productId: String(p.id),
    name,
    brand: p.brand ?? "",
    ean: null, // a busca do GPA não informa o código de barras
    price: p.price,
    listPrice: p.price,
    available: Boolean(p.stock),
    image: image ? (image.startsWith("http") ? image : `${IMAGE_HOST[chain.gpaBrand ?? "pa"]}${image}`) : null,
    url: p.urlDetails ?? `https://${chain.domain}/produto/${p.id}`,
    quantity,
    unitPrice: unitPrice(p.price, quantity),
  };
}

export async function searchGpa(chain: Chain, query: string, cep: string | null, count = 12): Promise<ChainResult> {
  const brand = chain.gpaBrand ?? "pa";
  try {
    const store = await storeForCep(brand, cep ?? DEFAULT_CEP);
    if (!store) return { chainId: chain.id, ok: false, error: "Não entrega nesse CEP", offers: [] };

    const resp = await fetch(`${API}/${brand}/search/search`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        partner: "linx",
        page: 1,
        pageSize: count,
        terms: query,
        sortBy: "relevance",
        storeId: store.id,
        customerPlus: true,
        department: "ecom",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: any = await resp.json();
    const offers = (data.products ?? [])
      .map((p: any) => toGpaOffer(chain, p))
      .filter((o: Offer | null): o is Offer => o !== null && o.available);
    return { chainId: chain.id, ok: true, note: `loja ${store.name}`, offers };
  } catch (err) {
    return { chainId: chain.id, ok: false, error: err instanceof Error ? err.message : String(err), offers: [] };
  }
}
