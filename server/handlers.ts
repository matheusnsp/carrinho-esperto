import { CHAINS, chainById } from "../shared/chains.js";
import type { Chain, ChainResult, SearchResponse } from "../shared/types.js";
import { searchChain } from "./vtex.js";
import { searchGpa } from "./gpa.js";
import { searchGuanabara } from "./guanabara.js";
import { searchMundial } from "./mundial.js";
import { searchSupermarket } from "./supermarket.js";

export interface ApiResult {
  status: number;
  body: unknown;
  /** Tempo de cache na CDN, em segundos. */
  cacheSeconds?: number;
}

type Query = Record<string, string | string[] | undefined>;
const param = (q: Query, k: string) => {
  const v = q[k];
  return String(Array.isArray(v) ? v[0] : (v ?? ""));
};

export function chains(): ApiResult {
  return { status: 200, body: CHAINS, cacheSeconds: 3600 };
}

function searchFor(chain: Chain, query: string, cep: string | null): Promise<ChainResult> {
  switch (chain.platform) {
    case "gpa":
      return searchGpa(chain, query, cep);
    case "guanabara":
      return searchGuanabara(chain, query);
    case "mundial":
      return searchMundial(chain, query);
    case "supermarket":
      return searchSupermarket(chain, query);
    default:
      return searchChain(chain, query);
  }
}

export async function search(q: Query): Promise<ApiResult> {
  const query = param(q, "q").trim();
  if (query.length < 2) return { status: 400, body: { error: "Digite pelo menos 2 letras." } };

  const ids = param(q, "chains").split(",").filter(Boolean);
  const selected = ids.length ? ids.map(chainById).filter((c) => c !== undefined) : CHAINS;
  const cep = param(q, "cep").replace(/\D/g, "");
  const validCep = cep.length === 8 ? cep : null;
  const results = await Promise.all(
    selected.map((c) => searchFor(c, query, validCep)),
  );
  return { status: 200, body: { query, results } satisfies SearchResponse, cacheSeconds: 600 };
}

