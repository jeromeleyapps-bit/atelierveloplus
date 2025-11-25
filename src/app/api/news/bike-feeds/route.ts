import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 21600; // Cache 6h (6 * 60 * 60)

// Liste magazines vélo français - Flux actifs uniquement (Novembre 2025)
const BIKE_FEEDS = [
  // Magazines français vérifiés fonctionnels
  {
    name: 'Top Vélo',
    url: 'https://www.topvelo.fr/feed/',
    category: 'Matériel'
  },
  {
    name: 'Le Cycle',
    url: 'https://www.lecycle.fr/feed/',
    category: 'Route'
  },
  {
    name: 'Vélo 101',
    url: 'https://www.velo101.com/feed/',
    category: 'Pro'
  },
  {
    name: 'Citycle',
    url: 'https://www.citycle.com/feed/',
    category: 'Urbain'
  },
  {
    name: 'Weelz',
    url: 'https://www.weelz.fr/fr/feed/',
    category: 'Mobilité'
  },
  {
    name: 'enDHurobike',
    url: 'https://endhuro-bike.com/feed/',
    category: 'Enduro'
  },
  {
    name: 'Full Attack',
    url: 'https://fullattack.cc/feed/',
    category: 'DH/Enduro'
  },
  {
    name: 'VTTAE.fr',
    url: 'https://vttae.fr/feed/',
    category: 'VTTAE'
  }
  
  // FLUX SUPPRIMÉS (404/fetch failed - Nov 2025):
  // - Bike Café (fetch failed)
  // - Vélo Vert (404)
  // - Direct Vélo (404)
  // - Vojo Magazine (fetch failed)
  // - Enduro Tribe (fetch failed)
  // - Lecyclo.com (404)
];

interface FeedItem {
  title: string;
  link: string;
  source: string;
  category: string;
  pubDate: string;
}

async function parseFeed(feedUrl: string, source: string, category: string): Promise<FeedItem[]> {
  try {
    logger.info(`[RSS] Fetching ${source} from ${feedUrl}...`);
    
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      logger.error(`[RSS] ${source} HTTP ${response.status}: ${response.statusText}`);
      return [];
    }

    const xml = await response.text();
    logger.info(`[RSS] ${source} XML length: ${xml.length} chars`);
    
    // Parser XML amélioré - Support multiple formats
    const items: FeedItem[] = [];
    
    // Essayer <item> (RSS 2.0)
    let itemMatches = Array.from(xml.matchAll(/<item[^>]*>(.*?)<\/item>/gs));
    
    // Si pas d'items, essayer <entry> (Atom)
    if (itemMatches.length === 0) {
      itemMatches = Array.from(xml.matchAll(/<entry[^>]*>(.*?)<\/entry>/gs));
      logger.info(`[RSS] ${source} format Atom détecté`);
    }
    
    logger.info(`[RSS] ${source} found ${itemMatches.length} items`);
    
    for (const match of itemMatches) {
      const itemXml = match[1];
      
      // Title: Support CDATA, HTML entities, plain text
      const titleMatch = 
        itemXml.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>/s) || 
        itemXml.match(/<title[^>]*>(.*?)<\/title>/s);
      
      // Link: Multiple formats
      const linkMatch = 
        itemXml.match(/<link[^>]*>(https?:\/\/[^<]+)<\/link>/s) ||
        itemXml.match(/<link[^>]*href=["'](https?:\/\/[^"']+)["']/s) ||
        itemXml.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/s);
      
      const pubDateMatch = 
        itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/s) ||
        itemXml.match(/<updated[^>]*>(.*?)<\/updated>/s) ||
        itemXml.match(/<published[^>]*>(.*?)<\/published>/s);
      
      if (titleMatch && linkMatch) {
        // Nettoyer le titre (decode HTML entities basiques)
        const title = titleMatch[1].trim()
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#8217;/g, "'")
          .replace(/&#8220;/g, '"')
          .replace(/&#8221;/g, '"')
          .replace(/<[^>]+>/g, ''); // Supprimer tags HTML
        
        items.push({
          title,
          link: linkMatch[1].trim(),
          source,
          category,
          pubDate: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString()
        });
      }
      
      // Limiter à 1 article par source (plus de variété entre magazines)
      if (items.length >= 1) break;
    }
    
    logger.info(`[RSS] ${source} parsed ${items.length} valid items`);
    return items;
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur de parsing';
    logger.error(`[RSS] ${source} ERROR:`, message);
    return [];
  }
}

export async function GET() {
  try {
    // Fetch tous les feeds en parallèle
    const feedPromises = BIKE_FEEDS.map(feed => 
      parseFeed(feed.url, feed.name, feed.category)
    );
    
    const results = await Promise.all(feedPromises);
    const allItems = results.flat();
    
    // Trier par date (plus récent d'abord)
    allItems.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });
    
    // Limiter à 5 lignes max comme demandé
    const topItems = allItems.slice(0, 5);
    
    logger.info(`[RSS] Total articles: ${topItems.length} from ${allItems.length} fetched (${BIKE_FEEDS.length} sources)`);
    
    return NextResponse.json({
      items: topItems,
      count: topItems.length,
      sources: BIKE_FEEDS.length,
      totalFetched: allItems.length,
      successfulSources: results.filter(r => r.length > 0).length
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur globale RSS';
    logger.error('[RSS] Erreur globale:', message);
    return NextResponse.json({ 
      items: [], 
      count: 0,
      error: 'Impossible de charger les actualités'
    }, { status: 500 });
  }
}
