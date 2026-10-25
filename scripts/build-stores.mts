/**
 * Gera shared/stores-rj.json com as lojas das redes do app na Grande Rio,
 * a partir do OpenStreetMap (via Photon). Rode de vez em quando para atualizar:
 *   npx tsx scripts/build-stores.mts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { CHAINS } from "../shared/chains.js";
import { normalizeText } from "../shared/geo.js";
import type { StoreRow } from "../shared/nearby.js";

// Grande Rio: de Santa Cruz/Itaguaí até Niterói/Maricá, de Nova Iguaçu/Caxias até a orla. [oeste, sul, leste, norte]
const AREA = [-43.9, -23.1, -42.75, -22.6];
const LIMIT = 50;

/** Tipos de loja aceitos e, quando o nome é genérico, quais nomes contam como a rede. */
const RULES: Record<string, { types: string[]; names?: RegExp }> = {
  zonasul: { types: ["supermarket"], names: /^(supermercados? )?zona sul\b/ },
  prezunic: { types: ["supermarket"], names: /prezunic/ },
  // "hortifruti" também é nome de quitanda qualquer; só vale o nome da rede.
  hortifruti: { types: ["greengrocer", "supermarket"], names: /^(hortifruti|natural da terra)( - .*)?$/ },
  carrefour: { types: ["supermarket", "convenience"], names: /carrefour/ },
  paodeacucar: { types: ["supermarket", "convenience"], names: /pao de acucar/ },
  extra: { types: ["supermarket", "convenience"], names: /^((mercado|supermercado|minimercado) )?extra( (mercado|supermercado|hiper))?\b/ },
  guanabara: { types: ["supermarket"], names: /^(supermercados? )?guanabara\b/ },
  mundial: { types: ["supermarket"], names: /^(supermercados? )?mundial\b/ },
  supermarket: { types: ["supermarket"], names: /^(rede )?supermarket\b/ },
};

const OUT = new URL("../shared/stores-rj.json", import.meta.url);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class PhotonError extends Error {}

async function photon(term: string, bbox: number[], types: string[]): Promise<any[]> {
  const params = new URLSearchParams({ q: term, bbox: bbox.join(","), limit: String(LIMIT) });
  for (const t of types) params.append("osm_tag", `shop:${t}`);
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(attempt ? 3000 * 2 ** attempt : 700); // o Photon recusa (503) quem consulta rápido demais
    try {
      const resp = await fetch(`https://photon.komoot.io/api/?${params}`, {
        headers: { "User-Agent": "CarrinhoEsperto/0.1 (lista de lojas)" },
        signal: AbortSignal.timeout(20_000),
      });
      if (resp.ok) return (await resp.json()).features ?? [];
      console.warn(`HTTP ${resp.status}`, term, bbox.join(","));
    } catch (err) {
      console.warn(String(err), term, bbox.join(","));
    }
  }
  throw new PhotonError(`Photon não respondeu para "${term}"`);
}

/** Consulta a área; se vier o limite de resultados, divide em 4 e consulta cada parte. */
async function collect(term: string, bbox: number[], types: string[], depth = 0): Promise<any[]> {
  const features = await photon(term, bbox, types);
  if (features.length < LIMIT || depth >= 4) return features;
  const [w, s, e, n] = bbox;
  const mx = (w + e) / 2;
  const my = (s + n) / 2;
  const parts = [
    [w, s, mx, my],
    [mx, s, e, my],
    [w, my, mx, n],
    [mx, my, e, n],
  ];
  const all = [];
  for (const p of parts) all.push(...(await collect(term, p, types, depth + 1)));
  return all;
}

const previous: StoreRow[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
const stores = new Map<string, StoreRow>();
for (const chain of CHAINS) {
  const rule = RULES[chain.id];
  if (!rule) throw new Error(`Sem regra para ${chain.id}`);
  let features: any[];
  try {
    features = await collect(chain.name, AREA, rule.types);
  } catch (err) {
    // Mantém a lista anterior da rede em vez de apagá-la por uma falha temporária.
    const kept = previous.filter((r) => r.chainId === chain.id);
    for (const r of kept) stores.set(r.id, r);
    console.warn(`${chain.name}: ${(err as Error).message}; mantidas ${kept.length} lojas da lista anterior`);
    continue;
  }
  let count = 0;
  for (const f of features) {
    const p = f.properties ?? {};
    const [lon, lat] = f.geometry?.coordinates ?? [];
    if (lat == null || !p.name || !rule.types.includes(p.osm_value)) continue;
    if (rule.names && !rule.names.test(normalizeText(p.name))) continue;
    if (/\b(antig[oa]|fechad[oa]|desativad[oa])\b/.test(normalizeText(p.name))) continue;
    const id = `${p.osm_type}/${p.osm_id}`;
    if (stores.has(id)) continue;
    const street = [p.street, p.housenumber].filter(Boolean).join(", ");
    stores.set(id, {
      id,
      name: p.name,
      lat: +lat.toFixed(6),
      lon: +lon.toFixed(6),
      chainId: chain.id,
      address: [street, p.district ?? p.city].filter(Boolean).join(" - ") || null,
    });
    count++;
  }
  console.log(`${chain.name}: ${count} lojas (${features.length} resultados)`);
}

const rows = [...stores.values()].sort((a, b) => a.chainId.localeCompare(b.chainId) || a.id.localeCompare(b.id));
writeFileSync(OUT, JSON.stringify(rows) + "\n");
console.log(`Total: ${rows.length} lojas`);
