import type { IncomingMessage, ServerResponse } from "node:http";
import type { ApiResult } from "../server/handlers.js";

/** Requisição/resposta das Vercel Functions (Node), que adicionam `query`. */
export type VercelReq = IncomingMessage & { query: Record<string, string | string[] | undefined> };

export function send(res: ServerResponse, r: ApiResult) {
  res.statusCode = r.status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (r.cacheSeconds && r.status === 200) {
    res.setHeader("Cache-Control", `public, s-maxage=${r.cacheSeconds}, stale-while-revalidate=${r.cacheSeconds}`);
  }
  res.end(JSON.stringify(r.body));
}
