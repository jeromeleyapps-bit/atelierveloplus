/**
 * P2R Expert Connector
 * https://www.p2r-expert.com
 */

import type { 
import { logger } from '@/lib/logger';
  SupplierConnector, 
  AvailabilityResult, 
  LookupInput,
  SearchOptions,
  SearchResult,
  SupplierCredentials
} from "./base";

export class P2RConnector implements SupplierConnector {
  private baseUrl = "https://www.p2r-expert.com";
  private loginUrl = `${this.baseUrl}/fr/authentification?back=my-account`;
  private searchUrl = `${this.baseUrl}/fr/recherche`;
  
  /**
   * Login to P2R and get session cookie
   */
  private async login(credentials: SupplierCredentials): Promise<string | null> {
    if (!credentials.username || !credentials.password) {
      throw new Error("P2R credentials required (username and password)");
    }

    try {
      // Step 1: Get login page to extract form token
      const loginPageResponse = await fetch(this.loginUrl);
      const loginPageHtml = await loginPageResponse.text();
      
      // Extract CSRF token or form token if needed
      // P2R might use PrestaShop, which often has a token in the form
      const _tokenMatch = loginPageHtml.match(/name="token"\s+value="([^"]+)"/);
      // Token extracted but not currently used in form submission

      // Step 2: Submit login form
      // P2R uses 'code' and 'passwd' as field names
      const formData = new URLSearchParams({
        code: credentials.username,     // Customer number
        passwd: credentials.password,   // Password
        back: 'my-account'
      });

      const loginResponse = await fetch(this.loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: formData.toString(),
        redirect: 'manual' // Don't follow redirects automatically
      });

      // Extract session cookie
      const cookies = loginResponse.headers.get('set-cookie');
      if (cookies) {
        // P2R uses PrestaShop cookie
        const sessionMatch = cookies.match(/PrestaShop-[^=]+=([^;]+)/);
        if (sessionMatch) {
          return sessionMatch[0]; // Return full cookie (name=value)
        }
      }

      return null;
    } catch (error) {
      logger.error('P2R login error:', error);
      return null;
    }
  }

  /**
   * Search products on P2R
   */
  async search(options: SearchOptions, credentials?: SupplierCredentials): Promise<SearchResult[]> {
    if (!credentials) {
      throw new Error("P2R credentials required for search");
    }

    try {
      // Login first
      const sessionId = await this.login(credentials);
      if (!sessionId) {
        throw new Error("P2R login failed");
      }

      // Perform search
      const searchParams = new URLSearchParams({
        controller: 'search',
        s: options.query,
        orderby: 'position',
        orderway: 'desc'
      });

      const searchResponse = await fetch(`${this.searchUrl}?${searchParams}`, {
        headers: {
          'Cookie': sessionId, // sessionId already contains full cookie
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const html = await searchResponse.text();

      // Parse HTML to extract products
      const products = this.parseSearchResults(html);

      return products.slice(0, options.limit || 20);
    } catch (error) {
      logger.error('P2R search error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`P2R search failed: ${message}`);
    }
  }

  /**
   * Parse search results from HTML
   */
  private parseSearchResults(html: string): SearchResult[] {
    const results: SearchResult[] = [];

    // P2R uses PrestaShop, typical product structure:
    // <article class="product-miniature">
    //   <div class="product-description">
    //     <h3 class="product-title"><a href="...">Product Name</a></h3>
    //     <div class="product-price-and-shipping">
    //       <span class="price">XX,XX €</span>
    //     </div>
    //   </div>
    // </article>

    // Extract product blocks
    const productRegex = /<article[^>]*class="[^"]*product-miniature[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let match;

    while ((match = productRegex.exec(html)) !== null) {
      const productHtml = match[1];

      // Extract product name
      const nameMatch = productHtml.match(/<h3[^>]*class="[^"]*product-title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
      const name = nameMatch ? nameMatch[1].trim() : '';

      // Extract product URL
      const urlMatch = productHtml.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*product[^"]*"/i);
      const url = urlMatch ? urlMatch[1] : '';

      // Extract price
      const priceMatch = productHtml.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/span>/i);
      const priceText = priceMatch ? priceMatch[1].trim() : '';
      const price = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

      // Extract reference
      const refMatch = productHtml.match(/Réf[^:]*:\s*([^<\s]+)/i);
      const reference = refMatch ? refMatch[1].trim() : '';

      // Extract image
      const imgMatch = productHtml.match(/<img[^>]*src="([^"]+)"/i);
      const imageUrl = imgMatch ? imgMatch[1] : '';

      // Extract availability
      const availMatch = productHtml.match(/<span[^>]*class="[^"]*product-availability[^"]*"[^>]*>([^<]+)<\/span>/i);
      const availText = availMatch ? availMatch[1].trim().toLowerCase() : '';
      
      let availability: string;
      if (availText.includes('stock') || availText.includes('disponible')) {
        availability = 'in_stock';
      } else if (availText.includes('commande')) {
        availability = 'on_order';
      } else {
        availability = 'out_of_stock';
      }

      if (name && price > 0) {
        results.push({
          externalId: reference || url.split('/').pop() || `p2r-${results.length}`,
          name,
          description: name,
          reference,
          brand: 'P2R',
          price,
          priceHT: Math.round(price / 1.20 * 100) / 100,
          currency: 'EUR',
          availability,
          url: url.startsWith('http') ? url : `${this.baseUrl}${url}`,
          imageUrl: imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`,
          metadata: {
            source: 'p2r-expert'
          }
        });
      }
    }

    return results;
  }

  /**
   * Get single product details
   */
  async getProduct(externalId: string, credentials?: SupplierCredentials): Promise<SearchResult | null> {
    // For now, search by ID
    const results = await this.search({ query: externalId }, credentials);
    return results[0] || null;
  }

  /**
   * Check availability (legacy method)
   */
  async checkAvailability(input: LookupInput): Promise<AvailabilityResult> {
    // Use search method
    if (!input.sku && !input.ean) {
      return { priceHT: null, available: null, leadTimeDays: null };
    }

    try {
      const results = await this.search(
        { query: input.sku || input.ean || '' },
        input.credentials || undefined
      );

      if (results.length > 0) {
        const product = results[0];
        return {
          priceHT: product.priceHT,
          available: product.availability === 'in_stock' ? 'EN STOCK' : 
                    product.availability === 'on_order' ? 'SUR COMMANDE' : 'RUPTURE',
          leadTimeDays: product.deliveryDays || null
        };
      }

      return { priceHT: null, available: 'NON TROUVÉ', leadTimeDays: null };
    } catch {
      return { priceHT: null, available: 'ERREUR', leadTimeDays: null };
    }
  }
}
