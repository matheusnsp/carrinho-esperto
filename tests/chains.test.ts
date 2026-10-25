import { describe, expect, it } from "vitest";
import { matchChain } from "../shared/chains";
import { distanceMeters } from "../shared/geo";
import { parseElements } from "../server/nearby";

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
