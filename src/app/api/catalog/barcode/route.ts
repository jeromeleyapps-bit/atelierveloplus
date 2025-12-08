import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * API route to lookup product information by EAN/barcode
 * Uses multiple public APIs to find product data
 */

interface ProductLookupResult {
  found: boolean;
  barcode: string;
  name?: string;
  brand?: string;
  category?: string;
  image?: string;
  source?: string;
}

/**
 * Try Open Food Facts API (primarily food products)
 */
async function lookupOpenFoodFacts(barcode: string): Promise<ProductLookupResult | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
      headers: { 'User-Agent': 'Atelier-Velo-Plus/1.0' },
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    
    if (data.status === 1 && data.product) {
      const p = data.product;
      return {
        found: true,
        barcode,
        name: p.product_name || p.product_name_fr || undefined,
        brand: p.brands || undefined,
        // Ne pas renvoyer la catégorie - l'utilisateur la choisira manuellement
        image: p.image_url || undefined,
        source: 'Open Food Facts',
      };
    }
  } catch (e) {
    logger.error('OpenFoodFacts lookup error:', e);
  }
  return null;
}

/**
 * Try Open Product Data API (general products)
 */
async function lookupOpenProductData(barcode: string): Promise<ProductLookupResult | null> {
  try {
    const res = await fetch(`https://opengtindb.org/?ean=${barcode}&cmd=json`, {
      headers: { 'User-Agent': 'Atelier-Velo-Plus/1.0' },
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    
    if (data && data.name) {
      return {
        found: true,
        barcode,
        name: data.name || undefined,
        brand: data.vendor || undefined,
        // Ne pas renvoyer la catégorie
        source: 'Open Product Data',
      };
    }
  } catch (e) {
    logger.error('OpenProductData lookup error:', e);
  }
  return null;
}

/**
 * Try UPCitemdb API (requires free API key, fallback without)
 */
async function lookupUPCItemDB(barcode: string): Promise<ProductLookupResult | null> {
  try {
    // Free tier allows limited requests without API key
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`, {
      headers: { 
        'User-Agent': 'Atelier-Velo-Plus/1.0',
        'Accept': 'application/json',
      },
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        found: true,
        barcode,
        name: item.title || undefined,
        brand: item.brand || undefined,
        // Ne pas renvoyer la catégorie
        image: item.images?.[0] || undefined,
        source: 'UPC Item DB',
      };
    }
  } catch (e) {
    logger.error('UPCItemDB lookup error:', e);
  }
  return null;
}

/**
 * Try bike-specific retailers via web search
 * Uses a lightweight approach: search for barcode on specific domains
 */
async function lookupBikeRetailers(barcode: string): Promise<ProductLookupResult | null> {
  const retailers = [
    { name: 'Alltricks', domain: 'alltricks.fr', lang: 'fr' },
    { name: 'Probikeshop', domain: 'probikeshop.fr', lang: 'fr' },
    { name: 'Bike24', domain: 'bike24.com', lang: 'en' },
    { name: 'Decathlon', domain: 'decathlon.fr', lang: 'fr' },
  ];

  // Try a simple approach: check if barcode appears in product URLs/pages
  // This is a fallback and won't work for all products
  for (const retailer of retailers) {
    try {
      // Try direct search on the site (some sites have barcode in URL or searchable)
      const searchUrl = `https://www.${retailer.domain}/search?q=${barcode}`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      if (res.ok) {
        const html = await res.text();
        
        // Very basic extraction - look for product name in common HTML patterns
        // This is fragile but better than nothing
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const productMatch = html.match(/data-product-name="([^"]+)"/i) || 
                           html.match(/product-name[^>]*>([^<]+)</i);

        let productName = productMatch?.[1] || h1Match?.[1] || titleMatch?.[1];
        
        // Clean up the name
        if (productName) {
          productName = productName
            .replace(/\s*-\s*(Alltricks|Probikeshop|Bike24|Decathlon).*$/i, '')
            .replace(/\s*\|\s*.*$/,'')
            .trim();
          
          // Only return if it looks like a real product name (not just site name)
          if (productName.length > 5 && !productName.toLowerCase().includes('search')) {
            return {
              found: true,
              barcode,
              name: productName,
              source: retailer.name,
            };
          }
        }
      }
    } catch (_e) {
      // Timeout or error - continue to next retailer
      continue;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get('barcode');
  const searchRetailers = searchParams.get('searchRetailers') === 'true';

  if (!barcode) {
    return NextResponse.json(
      { error: 'Missing barcode parameter' },
      { status: 400 }
    );
  }

  // Validate barcode format (EAN-8, EAN-13, UPC-A, etc.)
  if (!/^\d{8,14}$/.test(barcode)) {
    return NextResponse.json(
      { error: 'Invalid barcode format. Must be 8-14 digits.' },
      { status: 400 }
    );
  }

  // Try multiple sources in parallel - public APIs first (fast)
  const publicResults = await Promise.all([
    lookupOpenFoodFacts(barcode),
    lookupOpenProductData(barcode),
    lookupUPCItemDB(barcode),
  ]);

  // Return first successful result from public APIs
  const publicFound = publicResults.find(r => r && r.found);
  
  if (publicFound) {
    return NextResponse.json(publicFound);
  }

  // If not found in public APIs and user authorized retailer search
  if (searchRetailers) {
    logger.info(`Barcode ${barcode} not found in public APIs, trying bike retailers...`);
    const bikeResult = await lookupBikeRetailers(barcode);
    
    if (bikeResult) {
      return NextResponse.json(bikeResult);
    }
  }

  // No results found (or retailer search not authorized)
  return NextResponse.json({
    found: false,
    barcode,
    message: 'Product not found in databases. You can still add it manually.',
    canSearchRetailers: !searchRetailers, // Indicate if retailer search is available
  });
}
