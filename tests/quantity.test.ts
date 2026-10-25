import { describe, expect, it } from "vitest";
import { parseQuantity, unitPrice } from "../shared/quantity";

describe("parseQuantity", () => {
  it.each([
    ["Arroz Branco Tio João 1kg", { amount: 1, unit: "kg" }],
    ["Feijão Preto Combrasil Tipo1 1Kg", { amount: 1, unit: "kg" }],
    ["Café Pilão 500g", { amount: 0.5, unit: "kg" }],
    ["Leite Integral Itambé 1L", { amount: 1, unit: "l" }],
    ["Refrigerante Coca-Cola 2 Litros", { amount: 2, unit: "l" }],
    ["Cerveja Heineken 350ml", { amount: 0.35, unit: "l" }],
    ["Iogurte 6x170g", { amount: 1.02, unit: "kg" }],
    ["Azeite 0,5 l", { amount: 0.5, unit: "l" }],
  ])("%s", (name, expected) => {
    const q = parseQuantity(name);
    expect(q?.unit).toBe(expected.unit);
    expect(q?.amount).toBeCloseTo(expected.amount);
  });

  it("retorna null quando não há medida", () => {
    expect(parseQuantity("Cebolinha Unidade")).toBeNull();
    expect(parseQuantity("Arroz Tipo 1")).toBeNull();
  });
});

describe("unitPrice", () => {
  it("calcula preço por kg", () => {
    expect(unitPrice(3.5, { amount: 0.5, unit: "kg" })).toBe(7);
  });
  it("retorna null sem quantidade", () => {
    expect(unitPrice(3.5, null)).toBeNull();
  });
});
