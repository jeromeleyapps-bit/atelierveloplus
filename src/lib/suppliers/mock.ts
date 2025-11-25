import type { 
  SupplierConnector, 
  AvailabilityResult, 
  LookupInput,
  SearchOptions,
  SearchResult,
  SupplierCredentials as _SupplierCredentials
} from "./base";

export class MockConnector implements SupplierConnector {
  async checkAvailability(input: LookupInput): Promise<AvailabilityResult> {
    // Simple deterministic mock: price based on sku hash and availability toggled
    const base = Math.abs((input.sku || input.ean || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0));
    const priceHT = Math.max(1, Math.round(((base % 100) + 10 + Math.random() * 5) * 100) / 100);
    const availability = (base % 3 === 0) ? 'EN STOCK' : (base % 3 === 1) ? 'RUPTURE' : 'SOUS 3J';
    const leadTimeDays = availability === 'SOUS 3J' ? 3 : availability === 'RUPTURE' ? 14 : 0;
    return { priceHT, available: availability, leadTimeDays };
  }
  
  async search(options: SearchOptions): Promise<SearchResult[]> {
    // Mock search results for testing
    const query = options.query.toLowerCase();
    const limit = options.limit || 10;
    
    // Generate mock results based on query
    const mockProducts = [
      { name: 'Shimano Deore XT', brand: 'Shimano', category: 'Transmission', basePrice: 89.99 },
      { name: 'Shimano Deore M6100', brand: 'Shimano', category: 'Transmission', basePrice: 129.99 },
      { name: 'SRAM GX Eagle', brand: 'SRAM', category: 'Transmission', basePrice: 159.99 },
      { name: 'Pneu Schwalbe Marathon', brand: 'Schwalbe', category: 'Pneus', basePrice: 45.99 },
      { name: 'Pneu Continental Grand Prix', brand: 'Continental', category: 'Pneus', basePrice: 52.99 },
      { name: 'Chaîne KMC X11', brand: 'KMC', category: 'Transmission', basePrice: 29.99 },
      { name: 'Cassette Shimano 11-42', brand: 'Shimano', category: 'Transmission', basePrice: 79.99 },
      { name: 'Frein Shimano BR-MT200', brand: 'Shimano', category: 'Freinage', basePrice: 39.99 },
      { name: 'Disque de frein 180mm', brand: 'Shimano', category: 'Freinage', basePrice: 24.99 },
      { name: 'Guidon Ritchey WCS', brand: 'Ritchey', category: 'Cockpit', basePrice: 69.99 },
    ];
    
    // Filter by query
    const filtered = mockProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
    
    // Generate results
    const results: SearchResult[] = filtered.slice(0, limit).map((product, index) => {
      const priceVariation = 1 + (Math.random() * 0.2 - 0.1); // ±10%
      const price = Math.round(product.basePrice * priceVariation * 100) / 100;
      const priceHT = Math.round(price / 1.20 * 100) / 100;
      const availabilities: Array<'in_stock' | 'on_order' | 'out_of_stock'> = ['in_stock', 'on_order', 'out_of_stock'];
      const availability = availabilities[index % 3];
      
      return {
        externalId: `MOCK-${product.brand.toUpperCase()}-${index}`,
        name: product.name,
        description: `${product.name} - Produit de qualité professionnelle`,
        reference: `REF-${Math.random().toString(36).substring(7).toUpperCase()}`,
        brand: product.brand,
        price,
        priceHT,
        currency: 'EUR',
        availability,
        stock: availability === 'in_stock' ? Math.floor(Math.random() * 50) + 5 : 0,
        deliveryDays: availability === 'on_order' ? Math.floor(Math.random() * 7) + 3 : 1,
        url: `https://example.com/product/${index}`,
        imageUrl: `https://via.placeholder.com/300x300?text=${encodeURIComponent(product.name)}`,
        metadata: {
          category: product.category,
          weight: Math.floor(Math.random() * 500) + 100,
        }
      };
    });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    
    return results;
  }
  
  async getProduct(externalId: string): Promise<SearchResult | null> {
    // Mock single product fetch
    const results = await this.search({ query: externalId });
    return results[0] || null;
  }
}
