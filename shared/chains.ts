import type { Chain } from "./types";
import { normalizeText } from "./geo";

/**
 * Redes de supermercado com loja online na plataforma VTEX.
 * Para adicionar uma rede, confira se esta URL responde com JSON:
 *   https://<dominio>/api/io/_v/api/intelligent-search/product_search/?query=arroz
 */
export const CHAINS: Chain[] = [
  { id: "zonasul", name: "Zona Sul", domain: "www.zonasul.com.br", color: "#0a7d3b", osmMatch: ["zona sul"] },
  { id: "prezunic", name: "Prezunic", domain: "www.prezunic.com.br", color: "#e30613", osmMatch: ["prezunic"] },
  { id: "hortifruti", name: "Hortifruti", domain: "www.hortifruti.com.br", color: "#f28c00", osmMatch: ["hortifruti", "natural da terra"] },
  { id: "carrefour", name: "Carrefour", domain: "mercado.carrefour.com.br", color: "#1e5bc6", osmMatch: ["carrefour"] },
  { id: "samsclub", name: "Sam's Club", domain: "www.samsclub.com.br", color: "#0067a0", osmMatch: ["sam's club", "sams club"] },
  { id: "mambo", name: "Mambo", domain: "www.mambo.com.br", color: "#c8102e", osmMatch: ["mambo"] },
  { id: "covabra", name: "Covabra", domain: "www.covabra.com.br", color: "#00843d", osmMatch: ["covabra"] },
  { id: "savegnago", name: "Savegnago", domain: "www.savegnago.com.br", color: "#e2001a", osmMatch: ["savegnago"] },
  { id: "supernosso", name: "Super Nosso", domain: "www.supernosso.com", color: "#ffb400", osmMatch: ["super nosso", "supernosso"] },
  { id: "bistek", name: "Bistek", domain: "www.bistek.com.br", color: "#d71920", osmMatch: ["bistek"] },
  { id: "giassi", name: "Giassi", domain: "www.giassi.com.br", color: "#005baa", osmMatch: ["giassi"] },
];

export const chainById = (id: string) => CHAINS.find((c) => c.id === id);

/** Descobre a rede de um supermercado a partir das tags do OpenStreetMap. */
export function matchChain(tags: Record<string, string | undefined>): Chain | null {
  const haystack = normalizeText([tags.brand, tags.name, tags.operator].filter(Boolean).join(" | "));
  if (!haystack) return null;
  return CHAINS.find((c) => c.osmMatch.some((m) => haystack.includes(m))) ?? null;
}
