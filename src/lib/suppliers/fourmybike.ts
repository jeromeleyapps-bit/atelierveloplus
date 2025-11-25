import type { SupplierConnector, AvailabilityResult, LookupInput } from "./base";

// 4mybike.de connector — real HTTP flow with configurable endpoints via credentials.extra
// extra supports:
// {
//   "loginUrl": "https://4mybike.de/account/login",
//   "loginUserField": "login[username]",
//   "loginPassField": "login[password]",
//   "searchUrl": "https://4mybike.de/search",
//   "skuParam": "q",
//   "priceRegex": "\\b(\\d+[,.]\\d{2})\\s*€",
//   "availabilityRegex": "(En stock|Disponible|Rupture|Sous\\s*\\d+\\s*j)"
// }
export class FourMyBikeConnector implements SupplierConnector {
  async checkAvailability(input: LookupInput): Promise<AvailabilityResult> {
    const key = (input.sku || input.ean || "").trim();
    if (!key) return { priceHT: null, available: null, leadTimeDays: null };

    const username = input.credentials?.username?.trim();
    const password = input.credentials?.password?.trim();
    const extra = (input.credentials?.extra as Record<string, string>) || {};

    const loginUrl: string = extra.loginUrl || 'https://4mybike.de/account/login';
    const loginUserField: string = extra.loginUserField || 'login[username]';
    const loginPassField: string = extra.loginPassField || 'login[password]';
    const searchUrlBase: string = extra.searchUrl || 'https://4mybike.de/search';
    const skuParam: string = extra.skuParam || 'q';
    const priceRegexStr: string = extra.priceRegex || '\\b(\\\\d+[,.]\\\\d{2})\\\\s*€';
    const availabilityRegexStr: string = extra.availabilityRegex || '(En stock|Disponible|Rupture|Sous\\\\s*\\\\d+\\\\s*j)';
    const timeoutMs: number = Number(extra.timeoutMs || 12000);
    const retries: number = Math.max(0, Math.min(3, Number(extra.retries ?? 1)));
    const debug: boolean = !!extra.debug;

    const priceRe = new RegExp(priceRegexStr, 'i');
    const availRe = new RegExp(availabilityRegexStr, 'i');

    // Minimal cookie jar
    let cookies: string[] = [];
    const baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    } as const;
    const makeHeaders = (overrides?: Record<string, string>) => ({
      ...baseHeaders,
      ...(cookies.length ? { 'Cookie': cookies.join('; ') } : {}),
      ...(overrides || {}),
    });
    const fetchWithTimeout = async (url: string, init: RequestInit, toMs: number) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), toMs);
      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        return res;
      } finally {
        clearTimeout(id);
      }
    };
    const fetchWithRetry = async (url: string, init: RequestInit, toMs: number, maxRetries: number, tag: string) => {
      let lastErr: Error | null = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const start = Date.now();
          const res = await fetchWithTimeout(url, init, toMs);
          if (debug) console.log(`[fourmybike] ${tag} status=${res.status} dur=${Date.now() - start}ms`);
          if (!res.ok && res.status >= 500 && attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
            continue;
          }
          return res;
        } catch (e) {
          lastErr = e;
          if (debug) console.warn(`[fourmybike] ${tag} error attempt=${attempt}`, e);
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
            continue;
          }
          throw e;
        }
      }
      throw lastErr;
    };
    const readSetCookie = (res: Response) => {
      const headersRaw = (res.headers as unknown as { raw?: () => Record<string, string[]> }).raw;
      const set = headersRaw?.()['set-cookie'] || [];
      for (const c of set) {
        const nameValue = c.split(';')[0];
        if (!nameValue) continue;
        const name = nameValue.split('=')[0];
        // replace if existing
        cookies = [
          ...cookies.filter((x) => !x.startsWith(name + '=')),
          nameValue,
        ];
      }
    };
    const _cookieHeader = () => (cookies.length ? cookies.join('; ') : undefined);

    // 1) GET login to initialize session
    try {
      const r0 = await fetchWithRetry(loginUrl, { method: 'GET', headers: makeHeaders() }, timeoutMs, retries, 'GET login');
      readSetCookie(r0);
    } catch {}

    // 2) POST login if creds present
    if (username && password) {
      const form = new URLSearchParams();
      form.set(loginUserField, username);
      form.set(loginPassField, password);
      try {
        const r1 = await fetchWithRetry(loginUrl, {
          method: 'POST',
          headers: makeHeaders({ 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': new URL(loginUrl).origin, 'Referer': loginUrl }),
          body: form.toString(),
          redirect: 'manual',
        }, timeoutMs, retries, 'POST login');
        readSetCookie(r1);
      } catch {}
    }

    // 3) Search by SKU/EAN
    const url = new URL(searchUrlBase);
    url.searchParams.set(skuParam, key);
    let html = '';
    try {
      const r2 = await fetchWithRetry(url.toString(), {
        method: 'GET',
        headers: makeHeaders({ 'Referer': loginUrl }),
      }, timeoutMs, retries, 'GET search');
      html = await r2.text();
    } catch {
      return { priceHT: null, available: null, leadTimeDays: null };
    }

    // 4) Parse HTML using regexes
    let priceHT: number | null = null;
    let available: string | null = null;
    let leadTimeDays: number | null = null;

    const pm = html.match(priceRe);
    if (pm && pm[1]) {
      const raw = pm[1].replace(',', '.');
      const num = parseFloat(raw);
      if (!Number.isNaN(num)) priceHT = num;
    }
    const am = html.match(availRe);
    if (am && am[1]) {
      available = am[1].toUpperCase();
      const daysMatch = available.match(/SOU[S\s]*?(\d+)\s*J/i);
      if (daysMatch && daysMatch[1]) leadTimeDays = parseInt(daysMatch[1], 10);
      if (available.includes('RUPTURE')) leadTimeDays = leadTimeDays ?? 14;
      if (available.includes('EN STOCK')) leadTimeDays = 0;
    }

    return { priceHT: priceHT ?? null, available: available ?? null, leadTimeDays: leadTimeDays ?? null };
  }
}
