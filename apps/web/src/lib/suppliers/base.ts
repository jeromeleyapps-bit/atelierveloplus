export type AvailabilityResult = {
  priceHT?: number | null;
  available?: string | null; // e.g., 'EN STOCK', 'RUPTURE', 'SOUS 3J'
  leadTimeDays?: number | null;
};

export type SupplierInfo = {
  id: string;
  name: string;
  connectorType: string;
};

export type SupplierCredentials = {
  username?: string | null;
  password?: string | null;
  extra?: Record<string, any> | null;
};

export type LookupInput = {
  supplier: SupplierInfo;
  credentials?: SupplierCredentials | null;
  sku?: string | null;
  ean?: string | null;
};

export type SearchResult = {
  externalId: string;
  name: string;
  description?: string;
  reference?: string;
  brand?: string;
  price: number;
  priceHT?: number;
  currency: string;
  availability: string;
  stock?: number;
  deliveryDays?: number;
  url?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
};

export type SearchOptions = {
  query: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  limit?: number;
  offset?: number;
};

export interface SupplierConnector {
  checkAvailability(input: LookupInput): Promise<AvailabilityResult>;
  
  // B2B Live Search
  search?(options: SearchOptions, credentials?: SupplierCredentials): Promise<SearchResult[]>;
  getProduct?(externalId: string, credentials?: SupplierCredentials): Promise<SearchResult | null>;
}
