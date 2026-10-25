import { CHAINS, chainById } from "../shared/chains.js";
import type { SearchResponse } from "../shared/types.js";
import { searchChain } from "./vtex.js";
import { findNearby } from "./nearby.js";

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

export async function search(q: Query): Promise<ApiResult> {
  const query = param(q, "q").trim();
  if (query.length < 2) return { status: 400, body: { error: "Digite pelo menos 2 letras." } };

  const ids = param(q, "chains").split(",").filter(Boolean);
  const selected = ids.length ? ids.map(chainById).filter((c) => c !== undefined) : CHAINS;
  const results = await Promise.all(selected.map((c) => searchChain(c, query)));
  return { status: 200, body: { query, results } satisfies SearchResponse, cacheSeconds: 600 };
}

export async function nearby(q: Query): Promise<ApiResult> {
  const lat = Number(param(q, "lat"));
  const lon = Number(param(q, "lon"));
  const radius = Math.min(Math.max(Number(param(q, "radius")) || 3000, 300), 15000);
  if (!param(q, "lat") || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { status: 400, body: { error: "Informe lat e lon." } };
  }
  try {
    return { status: 200, body: await findNearby(lat, lon, radius), cacheSeconds: 3600 };
  } catch (err) {
    return { status: 502, body: { error: err instanceof Error ? err.message : "Erro ao buscar mercados" } };
  }
}
