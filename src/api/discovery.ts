/**
 * Discovery API — powers the "Fresh Batch" feed (new & trending coins).
 *
 * Sources (all key-less, no backend required):
 *  - GeckoTerminal  : on-chain new pools + trending pools across all networks.
 *                     Returns clean per-token name/symbol/price/liquidity/age.
 *                     Rate limit ~30 req/min (shared per IP) → we cache aggressively.
 *  - CoinGecko      : /search/trending — friendly, well-known trending coins that
 *                     carry a coingecko id (so their cards open CoinDetailsModal).
 *
 * Everything is wrapped in try/catch and TTL-cached so a hiccup or a 429 never
 * breaks the feed — we fall back to the last cached batch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GT_BASE = 'https://api.geckoterminal.com/api/v2';
const GT_HEADERS = { Accept: 'application/json;version=20230203' };
const CG_BASE = 'https://api.coingecko.com/api/v3';

const CACHE_PREFIX = 'discovery_';
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes — fresh enough, gentle on rate limits

export type DiscoverySource =
  | 'gecko-new'
  | 'gecko-trending'
  | 'coingecko-trending';

export type DiscoveryCoin = {
  key: string; // stable unique key for list rendering / watchlist
  name: string;
  symbol: string;
  image?: string;
  url: string; // external link (GeckoTerminal / CoinGecko)
  source: DiscoverySource;
  network?: string; // e.g. 'eth', 'solana', 'bsc'
  coingeckoId?: string; // present → can open CoinDetailsModal
  priceUsd?: number;
  priceChange24h?: number;
  liquidityUsd?: number;
  volume24hUsd?: number;
  fdvUsd?: number;
  marketCapUsd?: number;
  poolCreatedAt?: number; // ms timestamp
  ageHours?: number;
  buys24h?: number;
  sells24h?: number;
};

/* ----------------------------- cache helpers ----------------------------- */

type CacheEntry = { data: DiscoveryCoin[]; cachedAt: number };

const readCache = async (key: string): Promise<DiscoveryCoin[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt < CACHE_TTL) {
      return entry.data;
    }
    return null;
  } catch {
    return null;
  }
};

const writeCache = async (key: string, data: DiscoveryCoin[]): Promise<void> => {
  try {
    const entry: CacheEntry = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    /* ignore cache write failures */
  }
};

/** Last-resort: return the stale cache even if expired (better than empty). */
const readStaleCache = async (key: string): Promise<DiscoveryCoin[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    return entry.data ?? null;
  } catch {
    return null;
  }
};

const safeFetchJson = async (
  url: string,
  headers?: Record<string, string>,
): Promise<any | null> => {
  try {
    const res = await fetch(url, headers ? { headers } : undefined);
    if (!res.ok) return null; // includes 429 — caller falls back to cache
    return await res.json();
  } catch {
    return null;
  }
};

/* --------------------------- GeckoTerminal parse -------------------------- */

const buildIncludedMap = (included: any[]): Map<string, any> => {
  const map = new Map<string, any>();
  if (Array.isArray(included)) {
    included.forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });
  }
  return map;
};

const parseGeckoPool = (
  pool: any,
  includedMap: Map<string, any>,
  source: DiscoverySource,
): DiscoveryCoin | null => {
  try {
    const attr = pool?.attributes;
    if (!attr) return null;

    // pool.id looks like "eth_0xabc..." → network prefix
    const network = typeof pool.id === 'string' ? pool.id.split('_')[0] : undefined;
    const poolAddress = attr.address;

    const baseTokenRef = pool?.relationships?.base_token?.data?.id;
    const baseToken = baseTokenRef ? includedMap.get(baseTokenRef) : null;
    const tokenAttr = baseToken?.attributes ?? {};

    // Fall back to parsing the pool name ("PEPE / WETH") if token isn't included
    const poolName: string = attr.name ?? '';
    const fallbackSymbol = poolName.split('/')[0]?.trim();

    const symbol: string = (tokenAttr.symbol || fallbackSymbol || '???').toString();
    const name: string = (tokenAttr.name || symbol).toString();

    const createdRaw = attr.pool_created_at;
    const poolCreatedAt = createdRaw ? new Date(createdRaw).getTime() : undefined;
    const ageHours =
      poolCreatedAt != null
        ? Math.max(0, (Date.now() - poolCreatedAt) / (1000 * 60 * 60))
        : undefined;

    const num = (v: any): number | undefined => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const buys = num(attr?.transactions?.h24?.buys);
    const sells = num(attr?.transactions?.h24?.sells);

    return {
      key: `${network ?? 'x'}_${poolAddress ?? symbol}_${source}`,
      name,
      symbol: symbol.toUpperCase(),
      image: tokenAttr.image_url && tokenAttr.image_url !== 'missing.png' ? tokenAttr.image_url : undefined,
      url: network && poolAddress
        ? `https://www.geckoterminal.com/${network}/pools/${poolAddress}`
        : 'https://www.geckoterminal.com',
      source,
      network,
      coingeckoId: tokenAttr.coingecko_coin_id || undefined,
      priceUsd: num(attr.base_token_price_usd),
      priceChange24h: num(attr?.price_change_percentage?.h24),
      liquidityUsd: num(attr.reserve_in_usd),
      volume24hUsd: num(attr?.volume_usd?.h24),
      fdvUsd: num(attr.fdv_usd),
      marketCapUsd: num(attr.market_cap_usd),
      poolCreatedAt,
      ageHours,
      buys24h: buys,
      sells24h: sells,
    };
  } catch {
    return null;
  }
};

const dedupeCoins = (coins: DiscoveryCoin[]): DiscoveryCoin[] => {
  const seen = new Set<string>();
  const out: DiscoveryCoin[] = [];
  for (const c of coins) {
    // dedupe by symbol+network so the same token from two sources collapses
    const id = `${c.symbol}_${c.network ?? c.coingeckoId ?? c.key}`.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(c);
  }
  return out;
};

/* -------------------------------- New launches --------------------------- */

/**
 * Newly created pools across all networks, youngest first, filtered to cut the
 * obvious junk (no/low liquidity). This is the "be early" feed.
 */
export const fetchNewLaunches = async (
  minLiquidityUsd = 3000,
): Promise<DiscoveryCoin[]> => {
  const cacheKey = 'new';
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const json = await safeFetchJson(
    `${GT_BASE}/networks/new_pools?include=base_token,dex&page=1`,
    GT_HEADERS,
  );

  if (!json || !Array.isArray(json.data)) {
    return (await readStaleCache(cacheKey)) ?? [];
  }

  const includedMap = buildIncludedMap(json.included ?? []);
  const coins = json.data
    .map((pool: any) => parseGeckoPool(pool, includedMap, 'gecko-new'))
    .filter((c: DiscoveryCoin | null): c is DiscoveryCoin => c != null)
    .filter((c: DiscoveryCoin) => (c.liquidityUsd ?? 0) >= minLiquidityUsd)
    .sort(
      (a: DiscoveryCoin, b: DiscoveryCoin) =>
        (b.poolCreatedAt ?? 0) - (a.poolCreatedAt ?? 0),
    );

  const result = dedupeCoins(coins);
  if (result.length > 0) await writeCache(cacheKey, result);
  return result.length > 0 ? result : (await readStaleCache(cacheKey)) ?? [];
};

/* --------------------------------- Trending ------------------------------ */

const fetchGeckoTrending = async (): Promise<DiscoveryCoin[]> => {
  const json = await safeFetchJson(
    `${GT_BASE}/networks/trending_pools?include=base_token&page=1`,
    GT_HEADERS,
  );
  if (!json || !Array.isArray(json.data)) return [];
  const includedMap = buildIncludedMap(json.included ?? []);
  return json.data
    .map((pool: any) => parseGeckoPool(pool, includedMap, 'gecko-trending'))
    .filter((c: DiscoveryCoin | null): c is DiscoveryCoin => c != null);
};

const fetchCoinGeckoTrending = async (): Promise<DiscoveryCoin[]> => {
  const json = await safeFetchJson(`${CG_BASE}/search/trending`);
  if (!json || !Array.isArray(json.coins)) return [];
  return json.coins
    .map((entry: any): DiscoveryCoin | null => {
      const item = entry?.item;
      if (!item || !item.id) return null;
      const data = item.data ?? {};
      const num = (v: any): number | undefined => {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };
      return {
        key: `cg_${item.id}`,
        name: item.name ?? item.symbol ?? item.id,
        symbol: (item.symbol ?? '').toString().toUpperCase(),
        image: item.thumb || item.small || undefined,
        url: `https://www.coingecko.com/en/coins/${item.id}`,
        source: 'coingecko-trending',
        coingeckoId: item.id,
        priceUsd: num(data.price),
        priceChange24h: num(data?.price_change_percentage_24h?.usd),
        volume24hUsd:
          typeof data.total_volume === 'string'
            ? num(data.total_volume.replace(/[^0-9.]/g, ''))
            : num(data.total_volume),
        marketCapUsd:
          typeof data.market_cap === 'string'
            ? num(data.market_cap.replace(/[^0-9.]/g, ''))
            : num(data.market_cap),
      };
    })
    .filter((c: DiscoveryCoin | null): c is DiscoveryCoin => c != null);
};

/**
 * Trending now — on-chain hot pools (GeckoTerminal) plus the friendlier,
 * well-known CoinGecko trending coins. CoinGecko entries are appended after the
 * on-chain ones and deduped.
 */
export const fetchTrending = async (): Promise<DiscoveryCoin[]> => {
  const cacheKey = 'trending';
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const [gecko, coingecko] = await Promise.all([
    fetchGeckoTrending(),
    fetchCoinGeckoTrending(),
  ]);

  const result = dedupeCoins([...gecko, ...coingecko]);
  if (result.length > 0) await writeCache(cacheKey, result);
  return result.length > 0 ? result : (await readStaleCache(cacheKey)) ?? [];
};

/** Format a coin's age for display, e.g. "3h", "45m", "2d". */
export const formatAge = (ageHours?: number): string => {
  if (ageHours == null) return '—';
  if (ageHours < 1) return `${Math.max(1, Math.round(ageHours * 60))}m`;
  if (ageHours < 24) return `${Math.round(ageHours)}h`;
  return `${Math.round(ageHours / 24)}d`;
};
