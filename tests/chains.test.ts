import { describe, expect, it } from "vitest";
import { matchChain } from "../shared/chains";
import { distanceMeters } from "../shared/geo";

describe("matchChain", () => {
  it("reconhece redes pelo nome ou marca", () => {
    expect(matchChain({ name: "Supermercado Zona Sul" })?.id).toBe("zonasul");
    expect(matchChain({ brand: "Prezunic", name: "Prezunic Tijuca" })?.id).toBe("prezunic");
    expect(matchChain({ name: "Carrefour Express" })?.id).toBe("carrefour");
  });
  it("ignora mercados sem loja online conhecida", () => {
    expect(matchChain({ name: "Supermercados Mundial" })).toBeNull();
    expect(matchChain({ name: "Supermercados Guanabara" })?.id).toBe("guanabara");
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

describe("nearbyStores", () => {
  it("filtra pelo raio e ordena por distância", async () => {
    const { nearbyStores } = await import("../shared/nearby");
    const row = (id: string, lat: number, lon: number) => ({ id, name: id, lat, lon, chainId: "zonasul", address: null });
    const stores = nearbyStores([row("longe", -22.9, -43.3), row("perto", -22.9712, -43.1823), row("medio", -22.98, -43.19)], -22.9711, -43.1822, 3000);
    expect(stores.map((s) => s.id)).toEqual(["perto", "medio"]);
    expect(stores[0].distanceM).toBeLessThan(50);
  });

  it("a lista de lojas do Rio tem todas as redes, com coordenadas no Rio", async () => {
    const rows = (await import("../shared/stores-rj.json")).default as Array<{ chainId: string; lat: number; lon: number }>;
    const { CHAINS } = await import("../shared/chains");
    for (const c of CHAINS) expect(rows.filter((r) => r.chainId === c.id).length, c.name).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.lat).toBeGreaterThan(-23.2);
      expect(r.lat).toBeLessThan(-22.5);
    }
  });
});

describe("Carrefour", () => {
  it("consulta a API pelo domínio interno e gera links para o site", async () => {
    const { toOffer } = await import("../server/vtex");
    const { chainById } = await import("../shared/chains");
    const chain = chainById("carrefour")!;
    expect(chain.apiDomain).toContain("vtexcommercestable");
    const o = toOffer(chain, {
      productId: "1",
      productName: "Arroz Camil 5kg",
      link: "https://carrefourbrfood.vtexcommercestable.com.br/arroz-camil-5kg/p",
      items: [{ ean: "789", images: [], sellers: [{ commertialOffer: { Price: 22.29, ListPrice: 22.29, AvailableQuantity: 5 } }] }],
    });
    expect(o?.url).toBe("https://mercado.carrefour.com.br/arroz-camil-5kg/p");
  });
});

describe("Pão de Açúcar e Extra", () => {
  it("reconhece as lojas no mapa sem confundir com outras marcas", () => {
    expect(matchChain({ name: "Supermercado Pão de Açúcar" })?.id).toBe("paodeacucar");
    expect(matchChain({ name: "Extra Supermercado" })?.id).toBe("extra");
    expect(matchChain({ name: "Mercado Extra" })?.id).toBe("extra");
    expect(matchChain({ name: "Extrafarma" })).toBeNull();
  });

  it("converte o produto do GPA em oferta", async () => {
    const { toGpaOffer } = await import("../server/gpa");
    const { chainById } = await import("../shared/chains");
    const o = toGpaOffer(chainById("paodeacucar")!, {
      id: 41329,
      stock: true,
      price: 25.99,
      brand: "CAMIL",
      productImages: ["/img/uploads/1/224/33031224.jpg"],
      urlDetails: "https://www.paodeacucar.com/produto/41329/arroz-camil-5kg",
      name: "Arroz Agulhinha Tipo 1 CAMIL Pacote 5kg",
    });
    expect(o?.image).toBe("https://static.paodeacucar.com/img/uploads/1/224/33031224.jpg");
    const ex = toGpaOffer(chainById("extra")!, { id: 1, stock: true, price: 4.99, productImages: ["/img/a.jpg"], name: "Leite 1L" });
    expect(ex?.image).toBe("https://static.extramercado.com.br/img/a.jpg");
    expect(o?.unitPrice).toBeCloseTo(5.2);
    expect(o?.available).toBe(true);
  });
});

describe("Guanabara", () => {
  const html = `
    <div class="col item"><div class="row">
      <div class="col image" style="background-image: url('//www.supermercadosguanabara.com.br:443/sites/default/files/cafe.png');">
        <div class="price"><div class="vertical-align"><span class="number">25,80</span> </div></div>
      </div>
      <div class="col text"><div class="vertical-align"><div class="name">Café 3 Corações 500g</div></div></div>
    </div></div>
    <div class="col item"><div class="row">
      <div class="col image" style="background-image: url('//x/aveia.png');">
        <div class="price"><div class="vertical-align"><span class="number">3,69</span> <span class="unity">cada</span></div></div>
      </div>
      <div class="col text"><div class="vertical-align"><div class="name">Aveia em Flocos Quaker 165g</div></div></div>
    </div></div>
    <div class="col item"><a href="/produtos/42"><div class="name">Açougue</div></a></div>
    Validade: 26/10/2026`;

  it("lê produtos, preços e validade da página", async () => {
    const { parseCategory } = await import("../server/guanabara");
    const { items, validUntil } = parseCategory(html, 12);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: "Café 3 Corações 500g", price: 25.8, category: 12 });
    expect(items[0].image).toBe("https://www.supermercadosguanabara.com.br/sites/default/files/cafe.png");
    expect(validUntil).toBe("26/10");
  });

  it("busca exige o produto e prioriza quem casa com mais palavras", async () => {
    const { searchItems } = await import("../server/guanabara");
    const item = (name: string) => ({ name, price: 1, image: null, category: 1 });
    const items = [item("Café 3 Corações 500g"), item("Café Pilão 250g"), item("Leite UHT Glória Integral TP Litro"), item("Leite em Pó Glória 360g")];
    expect(searchItems(items, "café 500g").map((i) => i.name)).toEqual(["Café 3 Corações 500g"]);
    expect(searchItems(items, "leite integral").map((i) => i.name)).toEqual(["Leite UHT Glória Integral TP Litro"]);
    expect(searchItems(items, "arroz")).toEqual([]);
  });

  it("produto vendido por kg tem preço por quilo", async () => {
    const { parseQuantity } = await import("../shared/quantity");
    expect(parseQuantity("Picanha Bovina kg")).toEqual({ amount: 1, unit: "kg" });
    expect(parseQuantity("Leite UHT Longa Vida Italac Integral TP Litro")).toEqual({ amount: 1, unit: "l" });
  });
});
