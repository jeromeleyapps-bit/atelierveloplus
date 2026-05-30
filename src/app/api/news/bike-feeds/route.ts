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
  },

  // Candidats ajoutés mai 2026 — TOUS vérifiés actifs (test live des flux).
  // Un flux qui tomberait en panne est de toute façon ignoré automatiquement
  // (parseFeed renvoie [] → l'article n'apparaît pas, aucune erreur affichée).
  {
    name: '3bikes',
    url: 'https://www.3bikes.fr/feed/',
    category: 'Matériel'
  },
  {
    name: 'Vojo',
    url: 'https://www.vojomag.com/feed/',
    category: 'VTT'
  },
  {
    name: 'Vélo Channel',
    url: 'https://www.velochannel.com/feed/',
    category: 'Actu'
  },
  {
    name: 'Le Gruppetto',
    url: 'https://legruppetto.fr/feed/',
    category: 'Pro'
  },

  // Flux internationaux (anglais) — vérifiés actifs.
  {
    name: 'CyclingNews',
    url: 'https://www.cyclingnews.com/rss/',
    category: 'Pro'
  },
  {
    name: 'road.cc',
    url: 'https://road.cc/rss',
    category: 'Route'
  }

  // FLUX TESTÉS NON RETENUS (mai 2026) :
  // - Matos Vélo (réponse vide) · UltimateBike, Bike Avenue (connexion refusée)
  // - Bikepacking.fr (certificat invalide) · BikeRadar (404, pas de flux public)
  // - Pinkbike (403, bloque les bots)
  // FLUX SUPPRIMÉS antérieurs (Nov 2025) : Bike Café, Vélo Vert, Direct Vélo,
  // Enduro Tribe, Lecyclo.com (404 / fetch failed)
];

interface FeedItem {
  title: string;
  link: string;
  source: string;
  category: string;
  pubDate: string;
}

// Entités HTML nommées les plus courantes dans les flux RSS.
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  laquo: '«', raquo: '»', hellip: '…', mdash: '—', ndash: '–',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', eacute: 'é',
  egrave: 'è', agrave: 'à', ccedil: 'ç', ocirc: 'ô', ecirc: 'ê',
  acirc: 'â', icirc: 'î', ucirc: 'û', euml: 'ë', iuml: 'ï',
  uuml: 'ü', ouml: 'ö', auml: 'ä', ugrave: 'ù', times: '×', deg: '°',
};

/**
 * Décode toutes les entités HTML d'une chaîne : nommées, numériques décimales
 * (&#8211;) et hexadécimales (&#x2013;). Supprime aussi les balises résiduelles.
 */
function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<[^>]+>/g, '') // tags HTML résiduels
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) =>
      Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : m,
    )
    .trim();
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
        // Décodage complet des entités HTML (nommées + numériques déc/hex)
        const title = decodeHtmlEntities(titleMatch[1]);

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
    logger.error(`[RSS] ${source} ERROR`, { error: message });
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
    logger.error('[RSS] Erreur globale', { error: message });
    return NextResponse.json({ 
      items: [], 
      count: 0,
      error: 'Impossible de charger les actualités'
    }, { status: 500 });
  }
}
