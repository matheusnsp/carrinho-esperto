export interface Chain {
  id: string;
  name: string;
  /** Domínio da loja online (VTEX), usado nos links dos produtos. */
  domain: string;
  /** Domínio para a API, quando o site bloqueia consultas automáticas. */
  apiDomain?: string;
  /** Origem dos preços. VTEX é o padrão; "gpa" = Pão de Açúcar e Extra; os outros leem as ofertas do site da rede. */
  platform?: "vtex" | "gpa" | "guanabara" | "mundial" | "supermarket";
  /** Código da bandeira na API do GPA. */
  gpaBrand?: "pa" | "ex";
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
  /** Observação mostrada junto da rede, ex.: "loja Paróquia" ou "preços até 26/10". */
  note?: string;
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
