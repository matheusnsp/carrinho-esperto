export interface Chain {
  id: string;
  name: string;
  /** Domínio da loja online (VTEX). */
  domain: string;
  /** Cor usada no mapa e nos selos. */
  color: string;
  /** Termos que identificam a rede nos dados do OpenStreetMap (sem acento, minúsculo). */
  osmMatch: string[];
}

export interface Quantity {
  amount: number;
  unit: "kg" | "l" | "un";
}

export interface Offer {
  chainId: string;
  productId: string;
  name: string;
  brand: string;
  ean: string | null;
  price: number;
  listPrice: number;
  available: boolean;
  image: string | null;
  url: string;
  quantity: Quantity | null;
  /** Preço por kg, litro ou unidade, quando a quantidade é conhecida. */
  unitPrice: number | null;
}

export interface ChainResult {
  chainId: string;
  ok: boolean;
  error?: string;
  offers: Offer[];
}

export interface SearchResponse {
  query: string;
  results: ChainResult[];
}

export interface NearbyStore {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceM: number;
  chainId: string | null;
  address: string | null;
}
