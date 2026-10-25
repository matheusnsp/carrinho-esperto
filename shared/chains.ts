import type { Chain } from "./types.js";
import { normalizeText } from "./geo.js";

/**
 * Redes de supermercado com loja online. A maioria usa a plataforma VTEX;
 * Pão de Açúcar e Extra usam a API própria do GPA (veja server/gpa.ts). Guanabara, Mundial e
 * Supermarket não vendem online: lemos as ofertas que publicam (server/guanabara.ts, mundial.ts, supermarket.ts).
 * Para adicionar uma rede, confira se esta URL responde com JSON:
 *   https://<dominio>/api/io/_v/api/intelligent-search/product_search/?query=arroz
 */
export const CHAINS: Chain[] = [
  { id: "zonasul", name: "Zona Sul", domain: "www.zonasul.com.br", color: "#0a7d3b", osmMatch: ["zona sul"] },
  { id: "prezunic", name: "Prezunic", domain: "www.prezunic.com.br", color: "#e30613", osmMatch: ["prezunic"] },
  { id: "hortifruti", name: "Hortifruti", domain: "www.hortifruti.com.br", color: "#f28c00", osmMatch: ["hortifruti", "natural da terra"] },
  {
    id: "carrefour",
    name: "Carrefour",
    domain: "mercado.carrefour.com.br",
    // O site bloqueia robôs (503); o domínio interno da VTEX responde normalmente.
    apiDomain: "carrefourbrfood.vtexcommercestable.com.br",
    color: "#1e5bc6",
    osmMatch: ["carrefour"],
  },
  {
    id: "paodeacucar",
    name: "Pão de Açúcar",
    domain: "www.paodeacucar.com",
    platform: "gpa",
    gpaBrand: "pa",
    color: "#7a9a01",
    osmMatch: ["pao de acucar"],
  },
  {
    id: "extra",
    name: "Extra",
    domain: "www.extramercado.com.br",
    platform: "gpa",
    gpaBrand: "ex",
    color: "#d52b1e",
    osmMatch: ["extra"],
  },
  {
    id: "guanabara",
    name: "Guanabara",
    domain: "www.supermercadosguanabara.com.br",
    platform: "guanabara",
    color: "#c58a00",
    osmMatch: ["guanabara"],
  },
  {
    id: "mundial",
    name: "Mundial",
    domain: "www.supermercadosmundial.com.br",
    platform: "mundial",
    color: "#1d4f9c",
    osmMatch: ["mundial"],
  },
  {
    id: "supermarket",
    name: "Supermarket",
    domain: "www.redesupermarket.com.br",
    platform: "supermarket",
    color: "#e2001a",
    osmMatch: ["supermarket"],
  },
];

export const chainById = (id: string) => CHAINS.find((c) => c.id === id);

const wordRegex = (term: string) =>
  new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`);

/** Descobre a rede de um supermercado a partir das tags do OpenStreetMap. */
export function matchChain(tags: Record<string, string | undefined>): Chain | null {
  const haystack = normalizeText([tags.brand, tags.name, tags.operator].filter(Boolean).join(" | "));
  if (!haystack) return null;
  // Palavra inteira: "extra" não pode casar com "Extrafarma".
  return CHAINS.find((c) => c.osmMatch.some((m) => wordRegex(m).test(haystack))) ?? null;
}
