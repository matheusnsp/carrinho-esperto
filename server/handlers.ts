import { CHAINS, chainById } from "../shared/chains.js";
import type { SearchResponse } from "../shared/types.js";
import { searchChain } from "./vtex.js";
import { searchGpa } from "./gpa.js";
import { searchGuanabara } from "./guanabara.js";
import { queryPhoton } from "../shared/photon.js";

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
  const cep = param(q, "cep").replace(/\D/g, "");
  const validCep = cep.length === 8 ? cep : null;
  const results = await Promise.all(
    selected.map((c) =>
      c.platform === "gpa"
        ? searchGpa(c, query, validCep)
        : c.platform === "guanabara"
          ? searchGuanabara(c, query)
          : searchChain(c, query),
    ),
  );
  return { status: 200, body: { query, results } satisfies SearchResponse, cacheSeconds: 600 };
}

/** Reserva para quando o navegador não consegue falar com o OpenStreetMap. */
export async function nearby(q: Query): Promise<ApiResult> {
  const lat = Number(param(q, "lat"));
  const lon = Number(param(q, "lon"));
  const radius = Math.min(Math.max(Number(param(q, "radius")) || 3000, 300), 15000);
  if (!param(q, "lat") || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { status: 400, body: { error: "Informe lat e lon." } };
  }
  try {
    const stores = await queryPhoton(lat, lon, radius, {
      timeoutMs: 15_000,
      headers: { "User-Agent": "CarrinhoEsperto/0.1 (comparador de precos)" },
    });
    return { status: 200, body: stores, cacheSeconds: 86400 };
  } catch (err) {
    return { status: 502, body: { error: err instanceof Error ? err.message : "Erro ao buscar mercados" } };
  }
}
