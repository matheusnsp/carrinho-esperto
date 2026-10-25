import { describe, expect, it } from "vitest";
import { matchChain } from "../shared/chains";
import { distanceMeters } from "../shared/geo";
import { parseElements } from "../shared/overpass";

describe("matchChain", () => {
  it("reconhece redes pelo nome ou marca", () => {
    expect(matchChain({ name: "Supermercado Zona Sul" })?.id).toBe("zonasul");
    expect(matchChain({ brand: "Prezunic", name: "Prezunic Tijuca" })?.id).toBe("prezunic");
    expect(matchChain({ name: "Carrefour Express" })?.id).toBe("carrefour");
    expect(matchChain({ name: "Sam's Club" })?.id).toBe("samsclub");
  });
  it("ignora mercados sem loja online conhecida", () => {
    expect(matchChain({ name: "Supermercados Guanabara" })).toBeNull();
    expect(matchChain({})).toBeNull();
  });
});

describe("distanceMeters", () => {
  it("Copacabana -> Centro do Rio fica entre 6 e 8 km", () => {
    const d = distanceMeters(-22.9711, -43.1822, -22.9035, -43.1772);
    expect(d).toBeGreaterThan(6000);
    expect(d).toBeLessThan(8000);
  });
});

describe("parseElements", () => {
  it("usa o centro de áreas e ordena por distância", () => {
    const stores = parseElements(
      [
        { type: "way", id: 1, center: { lat: -22.98, lon: -43.19 }, tags: { name: "Prezunic" } },
        { type: "node", id: 2, lat: -22.9712, lon: -43.1823, tags: { name: "Zona Sul" } },
        { type: "node", id: 3, tags: { name: "Sem coordenada" } },
      ],
      -22.9711,
      -43.1822,
    );
    expect(stores.map((s) => s.chainId)).toEqual(["zonasul", "prezunic"]);
    expect(stores[0].distanceM).toBeLessThan(50);
  });
});

describe("queryOverpass", () => {
  it("usa o primeiro servidor que responder, mesmo se outros falharem", async () => {
    const { queryOverpass } = await import("../shared/overpass");
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async (url: string) => {
      calls++;
      if (url.includes("overpass-api.de")) return new Response("busy", { status: 504 });
      if (url.includes("kumi")) {
        return Response.json({ elements: [{ type: "node", id: 9, lat: -22.97, lon: -43.18, tags: { name: "Prezunic" } }] });
      }
      return new Promise(() => {}); // servidor travado
    }) as typeof fetch;
    try {
      const stores = await queryOverpass(-22.97, -43.18, 1000, { timeoutMs: 2000 });
      expect(stores[0].chainId).toBe("prezunic");
      expect(calls).toBe(4);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("dá um erro claro quando nenhum servidor responde", async () => {
    const { queryOverpass } = await import("../shared/overpass");
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("", { status: 429 })) as typeof fetch;
    try {
      await expect(queryOverpass(0, 0, 1000, { timeoutMs: 1000 })).rejects.toThrow(/OpenStreetMap/);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
