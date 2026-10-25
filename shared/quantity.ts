import type { Quantity } from "./types.js";

const UNIT_RE =
  /(\d+(?:[.,]\d+)?)\s*(kg|quilos?|g|gr|gramas?|mg|l|lt|litros?|ml)\b/gi;
const MULTI_RE = /(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(kg|g|gr|l|lt|ml)\b/i;

function toBase(value: number, unit: string): Quantity | null {
  const u = unit.toLowerCase();
  if (u === "kg" || u.startsWith("quilo")) return { amount: value, unit: "kg" };
  if (u === "g" || u === "gr" || u.startsWith("grama")) return { amount: value / 1000, unit: "kg" };
  if (u === "mg") return null;
  if (u === "l" || u === "lt" || u.startsWith("litro")) return { amount: value, unit: "l" };
  if (u === "ml") return { amount: value / 1000, unit: "l" };
  return null;
}

const num = (s: string) => parseFloat(s.replace(",", "."));

/** Extrai a quantidade do nome do produto: "Arroz Tio João 5kg" -> 5 kg. */
export function parseQuantity(name: string): Quantity | null {
  const multi = name.match(MULTI_RE);
  if (multi) {
    const q = toBase(num(multi[2]), multi[3]);
    if (q) return { ...q, amount: q.amount * parseInt(multi[1], 10) };
  }
  // Usa a última ocorrência: "Leite 1L Caixa 12 unidades" etc. costuma ter a medida no fim.
  let last: Quantity | null = null;
  for (const m of name.matchAll(UNIT_RE)) {
    const q = toBase(num(m[1]), m[2]);
    if (q && q.amount > 0) last = q;
  }
  // "Picanha kg", "Açúcar Guarani kg": preço por quilo.
  if (!last && /(^|\s)kg$/i.test(name.trim())) return { amount: 1, unit: "kg" };
  // "Leite UHT ... TP Litro": um litro.
  if (!last && /(^|\s)litro(\s|$)/i.test(name)) return { amount: 1, unit: "l" };
  return last;
}

export function unitPrice(price: number, q: Quantity | null): number | null {
  if (!q || q.amount <= 0 || price <= 0) return null;
  return Math.round((price / q.amount) * 100) / 100;
}

export function unitLabel(q: Quantity | null): string {
  if (!q) return "";
  return q.unit === "kg" ? "/kg" : q.unit === "l" ? "/L" : "/un";
}
