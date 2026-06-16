import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiscoveryCoin } from '../api/discovery';
import { deriveRarity, rollHolo, WILD_HOLO_CHANCE, RarityTier, RARITY_ORDER } from '../utils/rarity';
import { computeSafetyScore } from '../utils/safetyScore';
import type { BattleFichka } from '../utils/battle';

const COINDEX_KEY = 'doughfolio_coindex_v1';
const BATTLES_KEY = 'doughfolio_battles_v1';

export type CollectedFichka = {
  key: string;
  symbol: string;
  name: string;
  image?: string;
  network?: string;
  coingeckoId?: string;
  url: string;
  rarity: RarityTier;
  holo: boolean;
  wild?: boolean; // caught on the radar (vs tapped in the feed)
  safetyScore: number;
  collectedAt: number;
  snapshot: { priceUsd?: number; liquidityUsd?: number; ageHoursAtCatch?: number };
};

export type BattleRecord = {
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
};

const defaultRecord: BattleRecord = { wins: 0, losses: 0, streak: 0, bestStreak: 0 };

export type CollectResult = { isNew: boolean; fichka: CollectedFichka };

export type CoinDexStats = {
  total: number;
  byRarity: Record<RarityTier, number>;
  holoCount: number;
};

const emptyByRarity = (): Record<RarityTier, number> =>
  RARITY_ORDER.reduce((acc, t) => {
    acc[t] = 0;
    return acc;
  }, {} as Record<RarityTier, number>);

/** Map a stored card to the minimal shape the battle engine needs. */
export const toBattleFichka = (f: CollectedFichka): BattleFichka => ({
  sym: f.symbol,
  name: f.name,
  rarity: f.rarity,
  holo: f.holo,
  safety: f.safetyScore,
});

export const useCoinDex = () => {
  const [collection, setCollection] = useState<CollectedFichka[]>([]);
  const [record, setRecord] = useState<BattleRecord>(defaultRecord);
  const collectionRef = useRef<CollectedFichka[]>([]);
  collectionRef.current = collection;

  useEffect(() => {
    (async () => {
      try {
        const [rawDex, rawRec] = await Promise.all([
          AsyncStorage.getItem(COINDEX_KEY),
          AsyncStorage.getItem(BATTLES_KEY),
        ]);
        if (rawDex) setCollection(JSON.parse(rawDex));
        if (rawRec) setRecord({ ...defaultRecord, ...JSON.parse(rawRec) });
      } catch {
        /* keep empty */
      }
    })();
  }, []);

  const persistCollection = (next: CollectedFichka[]) => {
    AsyncStorage.setItem(COINDEX_KEY, JSON.stringify(next)).catch(() => {});
  };
  const persistRecord = (next: BattleRecord) => {
    AsyncStorage.setItem(BATTLES_KEY, JSON.stringify(next)).catch(() => {});
  };

  const isCollected = useCallback(
    (key: string) => collectionRef.current.some(f => f.key === key),
    [],
  );

  /** Catch a coin into the dex. Returns isNew=false (with the existing card) if already owned. */
  const collect = useCallback((coin: DiscoveryCoin, opts?: { wild?: boolean }): CollectResult => {
    const existing = collectionRef.current.find(f => f.key === coin.key);
    if (existing) return { isNew: false, fichka: existing };

    const rarity = deriveRarity(coin);
    const safety = computeSafetyScore(coin).score;
    const wild = opts?.wild ?? false;
    const fichka: CollectedFichka = {
      key: coin.key,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      network: coin.network,
      coingeckoId: coin.coingeckoId,
      url: coin.url,
      rarity: rarity.tier,
      holo: rollHolo(wild ? WILD_HOLO_CHANCE : undefined),
      wild,
      safetyScore: safety,
      collectedAt: Date.now(),
      snapshot: {
        priceUsd: coin.priceUsd,
        liquidityUsd: coin.liquidityUsd,
        ageHoursAtCatch: coin.ageHours,
      },
    };

    const next = [fichka, ...collectionRef.current];
    collectionRef.current = next;
    setCollection(next);
    persistCollection(next);
    return { isNew: true, fichka };
  }, []);

  const recordBattle = useCallback((didWin: boolean) => {
    setRecord(prev => {
      const streak = didWin ? prev.streak + 1 : 0;
      const next: BattleRecord = {
        wins: prev.wins + (didWin ? 1 : 0),
        losses: prev.losses + (didWin ? 0 : 1),
        streak,
        bestStreak: Math.max(prev.bestStreak, streak),
      };
      persistRecord(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setCollection([]);
    collectionRef.current = [];
    persistCollection([]);
  }, []);

  const stats: CoinDexStats = {
    total: collection.length,
    byRarity: collection.reduce((acc, f) => {
      acc[f.rarity] = (acc[f.rarity] ?? 0) + 1;
      return acc;
    }, emptyByRarity()),
    holoCount: collection.filter(f => f.holo).length,
  };

  return { collection, record, stats, collect, isCollected, recordBattle, clear };
};
