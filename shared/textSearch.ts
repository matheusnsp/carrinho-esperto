import { normalizeText } from "./geo.js";

const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "e", "com", "em", "tipo"]);
export const tokens = (s: string) => normalizeText(s).split(/[^a-z0-9,]+/).filter((t) => t && !STOPWORDS.has(t));

const isMeasure = (t: string) => /^\d/.test(t);

/**
 * Busca por palavras para redes que só publicam uma lista de preços (sem busca própria).
 * Todas as palavras do produto precisam aparecer ("óleo de soja" não traz óleo de coco);
 * medidas como "500g" ou "5kg" são opcionais e só colocam na frente quem as tem.
 */
export function searchByWords<T extends { name: string }>(items: T[], query: string, count = 12): T[] {
  const q = tokens(query);
  const required = q.filter((t) => !isMeasure(t));
  const optional = q.filter(isMeasure);
  if (!required.length) return [];
  return items
    .map((item) => {
      const words = tokens(item.name);
      const has = (t: string) => words.some((w) => w === t || (t.length >= 4 && w.startsWith(t)));
      return { item, ok: required.every(has), score: optional.filter(has).length };
    })
    .filter((s) => s.ok)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item)
    .slice(0, count);
}

/** "R$ 1.234,56" ou "4,47" -> 1234.56 */
export const parseBrl = (s: string) => parseFloat(s.replace(/[^\d,]/g, "").replace(",", "."));
