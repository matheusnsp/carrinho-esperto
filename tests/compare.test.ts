import { describe, expect, it } from "vitest";
import { flattenOffers, groupByEan } from "../shared/compare";
import type { ChainResult, Offer } from "../shared/types";

const offer = (chainId: string, price: number, ean: string | null, unitPrice: number | null = null): Offer => ({
  chainId,
  productId: `${chainId}-${price}`,
  name: `Produto ${ean}`,
  brand: "",
  ean,
  price,
  listPrice: price,
  available: true,
  image: null,
  url: "",
  quantity: null,
  unitPrice,
});

const results: ChainResult[] = [
  { chainId: "a", ok: true, offers: [offer("a", 8.99, "111"), offer("a", 5, "222", 10)] },
  { chainId: "b", ok: true, offers: [offer("b", 7.19, "111"), offer("b", 4, null, 2)] },
  { chainId: "c", ok: false, offers: [] },
];

describe("groupByEan", () => {
  it("agrupa o mesmo produto em redes diferentes", () => {
    const groups = groupByEan(results);
    expect(groups).toHaveLength(1);
    expect(groups[0].ean).toBe("111");
    expect(groups[0].offers.map((o) => o.chainId)).toEqual(["b", "a"]);
    expect(groups[0].savings).toBe(1.8);
  });
});

describe("flattenOffers", () => {
  it("ordena por preço", () => {
    expect(flattenOffers(results, "price").map((o) => o.price)).toEqual([4, 5, 7.19, 8.99]);
  });
  it("ordena por preço unitário, deixando os sem medida no fim", () => {
    expect(flattenOffers(results, "unitPrice").map((o) => o.price)).toEqual([4, 5, 7.19, 8.99]);
  });
  it("intercala as redes na relevância", () => {
    expect(flattenOffers(results, "relevance").map((o) => o.chainId)).toEqual(["a", "b", "a", "b"]);
  });
});
