/**
 * Types for B2B supplier integration
 */

export interface SupplierCredentials {
  username?: string;
  password?: string;
  apiKey?: string;
  extra?: Record<string, any>;
}

export interface SupplierSearchResult {
  externalId: string;
  name: string;
  description?: string;
  reference?: string;
  brand?: string;
  price: number;
  priceHT?: number;
  currency: string;
  availability: 'in_stock' | 'out_of_stock' | 'on_order' | 'unknown';
  stock?: number;
  deliveryDays?: number;
  url?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
}

export interface SupplierProduct extends SupplierSearchResult {
  ean?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  specifications?: Record<string, any>;
}

export interface SupplierAvailability {
  available: boolean;
  stock?: number;
  deliveryDays?: number;
  price?: number;
  lastUpdated: Date;
}

export interface SupplierSearchOptions {
  query: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  limit?: number;
  offset?: number;
}
