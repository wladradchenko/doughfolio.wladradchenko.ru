/**
 * Utility functions for caching coin data
 * - Coin details (description, links, categories): cached forever
 * - Chart data: cached for 1 day
 * - GitHub metrics: cached for 1 day
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GitHubMetrics } from './githubData';

const COIN_DETAILS_PREFIX = 'coin_details_';
const COIN_CHART_PREFIX = 'coin_chart_';
const GITHUB_METRICS_PREFIX = 'github_metrics_';
const COIN_LIST_PREFIX = 'coin_list_';
const COIN_SEARCH_PREFIX = 'coin_search_';
const CHART_CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day in milliseconds
const GITHUB_CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day in milliseconds
const COIN_LIST_CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day in milliseconds
const SEARCH_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

export type CachedCoinDetails = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  description?: string;
  categories?: string[];
  homepage?: string;
  blockchain_site?: string[];
  github?: string;
  cachedAt: number;
};

export type CachedChartData = {
  prices: [number, number][];
  cachedAt: number;
};

/**
 * Get cached coin details
 */
export const getCachedCoinDetails = async (coinId: string): Promise<CachedCoinDetails | null> => {
  try {
    const key = `${COIN_DETAILS_PREFIX}${coinId}`;
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached) as CachedCoinDetails;
    }
    return null;
  } catch (error) {
    console.error('Failed to get cached coin details:', error);
    return null;
  }
};

/**
 * Cache coin details (forever)
 */
export const cacheCoinDetails = async (coinId: string, details: Omit<CachedCoinDetails, 'cachedAt'>): Promise<void> => {
  try {
    const key = `${COIN_DETAILS_PREFIX}${coinId}`;
    const data: CachedCoinDetails = {
      ...details,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache coin details:', error);
  }
};

/**
 * Get cached chart data (if not older than 1 day)
 */
export const getCachedChartData = async (coinId: string): Promise<[number, number][] | null> => {
  try {
    const key = `${COIN_CHART_PREFIX}${coinId}`;
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const data: CachedChartData = JSON.parse(cached);
      const now = Date.now();
      const age = now - data.cachedAt;

      // Check if cache is still valid (less than 1 day old)
      if (age < CHART_CACHE_DURATION) {
        return data.prices;
      } else {
        // Cache expired, remove it
        await AsyncStorage.removeItem(key);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to get cached chart data:', error);
    return null;
  }
};

/**
 * Cache chart data (for 1 day)
 */
export const cacheChartData = async (coinId: string, prices: [number, number][]): Promise<void> => {
  try {
    const key = `${COIN_CHART_PREFIX}${coinId}`;
    const data: CachedChartData = {
      prices,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache chart data:', error);
  }
};

export type CachedGitHubMetrics = {
  metrics: GitHubMetrics;
  cachedAt: number;
};

/**
 * Get cached GitHub metrics (if not older than 1 day)
 */
export const getCachedGitHubMetrics = async (githubUrl: string): Promise<GitHubMetrics | null> => {
  try {
    const key = `${GITHUB_METRICS_PREFIX}${githubUrl}`;
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const data: CachedGitHubMetrics = JSON.parse(cached);
      const now = Date.now();
      const age = now - data.cachedAt;

      // Check if cache is still valid (less than 1 day old)
      if (age < GITHUB_CACHE_DURATION) {
        return data.metrics;
      } else {
        // Cache expired, remove it
        await AsyncStorage.removeItem(key);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to get cached GitHub metrics:', error);
    return null;
  }
};

/**
 * Cache GitHub metrics (for 1 day)
 */
export const cacheGitHubMetrics = async (githubUrl: string, metrics: GitHubMetrics): Promise<void> => {
  try {
    const key = `${GITHUB_METRICS_PREFIX}${githubUrl}`;
    const data: CachedGitHubMetrics = {
      metrics,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache GitHub metrics:', error);
  }
};

export type CachedCoinList = {
  coins: any[];
  cachedAt: number;
};

/**
 * Get cached coin list (if not older than 1 day)
 */
export const getCachedCoinList = async (): Promise<any[] | null> => {
  try {
    const key = COIN_LIST_PREFIX;
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const data: CachedCoinList = JSON.parse(cached);
      const now = Date.now();
      const age = now - data.cachedAt;

      // Check if cache is still valid (less than 1 day old)
      if (age < COIN_LIST_CACHE_DURATION) {
        // Check for duplicates - if found, clear cache
        const seen = new Map<string, any>();
        const duplicates: string[] = [];
        
        data.coins.forEach(coin => {
          if (coin && coin.id) {
            if (seen.has(coin.id)) {
              duplicates.push(coin.id);
            } else {
              seen.set(coin.id, coin);
            }
          }
        });
        
        // If duplicates found, clear cache and return null
        if (duplicates.length > 0) {
          console.warn('Duplicates detected in coin cache, clearing:', duplicates);
          await AsyncStorage.removeItem(key);
          return null;
        }
        
        // Return unique coins
        return Array.from(seen.values());
      } else {
        // Cache expired, remove it
        await AsyncStorage.removeItem(key);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to get cached coin list:', error);
    return null;
  }
};

/**
 * Cache coin list (for 1 day)
 */
export const cacheCoinList = async (coins: any[]): Promise<void> => {
  try {
    const key = COIN_LIST_PREFIX;
    const data: CachedCoinList = {
      coins,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache coin list:', error);
  }
};

/**
 * Add coins to cached coin list (if cache exists)
 * This is useful when user selects specific coins - we add them to the cache
 */
export const addCoinsToCache = async (newCoins: any[]): Promise<void> => {
  try {
    if (newCoins.length === 0) return;

    const cachedData = await getCachedCoinList();
    if (cachedData && cachedData.length > 0) {
      // Create a map of existing coins by id for quick lookup
      const existingCoinsMap = new Map(cachedData.map(coin => [coin.id, coin]));
      
      // Add new coins that don't already exist in cache
      let hasNewCoins = false;
      newCoins.forEach(coin => {
        if (!existingCoinsMap.has(coin.id)) {
          existingCoinsMap.set(coin.id, coin);
          hasNewCoins = true;
        }
      });

      // If we added new coins, update the cache
      if (hasNewCoins) {
        const updatedCoins = Array.from(existingCoinsMap.values());
        await cacheCoinList(updatedCoins);
      }
    } else {
      // If no cache exists, create one with new coins
      await cacheCoinList(newCoins);
    }
  } catch (error) {
    console.error('Failed to add coins to cache:', error);
  }
};

export type CachedSearchResults = {
  results: any[];
  cachedAt: number;
};

/**
 * Get cached search results for a 2-letter prefix (if not older than 1 week)
 */
export const getCachedSearchResults = async (prefix: string): Promise<any[] | null> => {
  try {
    const key = `${COIN_SEARCH_PREFIX}${prefix.toLowerCase()}`;
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const data: CachedSearchResults = JSON.parse(cached);
      const now = Date.now();
      const age = now - data.cachedAt;

      // Check if cache is still valid (less than 1 week old)
      if (age < SEARCH_CACHE_DURATION) {
        return data.results;
      } else {
        // Cache expired, remove it
        await AsyncStorage.removeItem(key);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to get cached search results:', error);
    return null;
  }
};

/**
 * Cache search results for a 2-letter prefix (for 1 week)
 */
export const cacheSearchResults = async (prefix: string, results: any[]): Promise<void> => {
  try {
    const key = `${COIN_SEARCH_PREFIX}${prefix.toLowerCase()}`;
    const data: CachedSearchResults = {
      results,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache search results:', error);
  }
};

/**
 * Clear all cached coin data (useful for debugging or reset)
 */
export const clearCoinCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const coinKeys = keys.filter(
      key => 
        key.startsWith(COIN_DETAILS_PREFIX) || 
        key.startsWith(COIN_CHART_PREFIX) ||
        key.startsWith(GITHUB_METRICS_PREFIX) ||
        key.startsWith(COIN_LIST_PREFIX) ||
        key.startsWith(COIN_SEARCH_PREFIX)
    );
    await AsyncStorage.multiRemove(coinKeys);
  } catch (error) {
    console.error('Failed to clear coin cache:', error);
  }
};

/**
 * Clear ALL app cache including gamification, history, and coin data
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const allCacheKeys = keys.filter(
      key => 
        key.startsWith(COIN_DETAILS_PREFIX) || 
        key.startsWith(COIN_CHART_PREFIX) ||
        key.startsWith(GITHUB_METRICS_PREFIX) ||
        key.startsWith(COIN_LIST_PREFIX) ||
        key.startsWith(COIN_SEARCH_PREFIX) ||
        key === 'doughfolio_arcade_v2' ||
        key === 'cryptoDonutHistory'
    );
    await AsyncStorage.multiRemove(allCacheKeys);
    console.log('All cache cleared successfully');
  } catch (error) {
    console.error('Failed to clear all cache:', error);
  }
};

