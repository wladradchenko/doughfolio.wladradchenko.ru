import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'doughfolio_arcade_v2';

type MissionBlueprint = {
  id: string;
  title: string;
  description: string;
  goal: number;
  reward: string;
};

export type MissionState = MissionBlueprint & {
  progress: number;
  completed: boolean;
};

type WalletState = {
  balance: number;
  invested: number;
  lastImpact: number;
};

type HoldingSnapshot = {
  name: string;
  symbol: string;
  percentage: number;
  color: string;
};

type GamificationState = {
  missions: Record<string, MissionState>;
  flavors: string[];
  totalMixes: number;
  lastReset: string;
  wallet: WalletState;
  xp: number;
  lastMixDate: string | null;
  streakCount: number;
  lastPortfolio: HoldingSnapshot[];
};

type PortfolioItem = {
  marketCapRank?: number;
  priceChangePercentage24h?: number;
  marketCapChangePercentage24h?: number;
  totalVolume?: number;
  name?: string;
  symbol?: string;
  percentage?: number;
  color?: string;
};

type RegisterPayload = {
  totalValue: number;
  portfolio: PortfolioItem[];
};

const missionBlueprints: MissionBlueprint[] = [
  {
    id: 'fresh-scout',
    title: 'Fresh Scout',
    description: 'Check today’s Fresh Batch of new coins.',
    goal: 1,
    reward: 'Fresh Glaze',
  },
  {
    id: 'collector',
    title: 'Collector',
    description: 'Collect 2 new coins today.',
    goal: 2,
    reward: 'Sprinkle Pack',
  },
  {
    id: 'duelist',
    title: 'Duelist',
    description: 'Win a duel against a friend.',
    goal: 1,
    reward: 'Champion Glaze',
  },
  {
    id: 'wild-catch',
    title: 'Wild Catch',
    description: 'Catch a coin on the radar.',
    goal: 1,
    reward: 'Wild Sprinkle',
  },
  {
    id: 'mix-master',
    title: 'Mix Master',
    description: 'Generate 3 fresh dough mixes today.',
    goal: 3,
    reward: 'Glazed Badge',
  },
  {
    id: 'high-roller',
    title: 'High Roller',
    description: 'Create a portfolio worth $5k or more.',
    goal: 1,
    reward: 'Gold Sugar',
  },
  {
    id: 'blue-chip-baker',
    title: 'Blue-Chip Baker',
    description: 'Add at least one top 10 coin.',
    goal: 1,
    reward: 'Royal Glaze',
  },
];

const getTodayStamp = () => new Date().toISOString().slice(0, 10);

const createDefaultMissions = (): Record<string, MissionState> => {
  return missionBlueprints.reduce((acc, blueprint) => {
    acc[blueprint.id] = {
      ...blueprint,
      progress: 0,
      completed: false,
    };
    return acc;
  }, {} as Record<string, MissionState>);
};

const createDefaultState = (): GamificationState => ({
  missions: createDefaultMissions(),
  flavors: [],
  totalMixes: 0,
  lastReset: getTodayStamp(),
  wallet: {
    balance: 10000,
    invested: 0,
    lastImpact: 0,
  },
  xp: 0,
  streakCount: 0,
  lastMixDate: null,
  lastPortfolio: [],
});

const deriveFlavorsForCoin = (coin: PortfolioItem): string[] => {
  const flavors: string[] = [];

  if (coin.marketCapRank && coin.marketCapRank <= 10) {
    flavors.push('Royal Glaze');
  }

  if ((coin.priceChangePercentage24h ?? 0) >= 6) {
    flavors.push('Spicy Pump');
  }

  if ((coin.priceChangePercentage24h ?? 0) <= -6) {
    flavors.push('Burnt Caramel');
  }

  if ((coin.marketCapChangePercentage24h ?? 0) >= 5) {
    flavors.push('Icing Surge');
  }

  if ((coin.totalVolume ?? 0) > 1_000_000_000) {
    flavors.push('Sugar Rush Volume');
  }

  if (!flavors.length) {
    flavors.push('Classic Sugar');
  }

  return flavors;
};

const sanitizeState = (rawState: GamificationState | null): GamificationState => {
  if (!rawState) {
    return createDefaultState();
  }

  const today = getTodayStamp();
  const hydratedMissions = { ...createDefaultMissions(), ...rawState.missions };
  const safeState: GamificationState = {
    missions: hydratedMissions,
    flavors: rawState.flavors ?? [],
    totalMixes: rawState.totalMixes ?? 0,
    lastReset: rawState.lastReset ?? today,
    wallet: rawState.wallet ?? { balance: 10000, invested: 0, lastImpact: 0 },
    xp: rawState.xp ?? 0,
    streakCount: rawState.streakCount ?? 0,
    lastMixDate: rawState.lastMixDate ?? null,
    lastPortfolio: rawState.lastPortfolio ?? [],
  };

  if (safeState.lastReset !== today) {
    const resetMissions = Object.keys(safeState.missions).reduce((acc, missionId) => {
      const mission = safeState.missions[missionId];
      acc[missionId] = { ...mission, progress: 0, completed: false };
      return acc;
    }, {} as Record<string, MissionState>);

    return {
      ...safeState,
      missions: resetMissions,
      lastReset: today,
    };
  }

  return safeState;
};

const clamp2 = (value: number) => Number(value.toFixed(2));

export const useGamification = () => {
  const [state, setState] = useState<GamificationState>(createDefaultState());

  useEffect(() => {
    const loadState = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: GamificationState = JSON.parse(stored);
          
          // Check for duplicates in lastPortfolio - if found, remove them
          if (parsed.lastPortfolio && Array.isArray(parsed.lastPortfolio)) {
            const seen = new Set<string>();
            const hasDuplicates = parsed.lastPortfolio.some((item: any) => {
              const key = (item.symbol || item.name || '').toLowerCase();
              if (!key) return false;
              if (seen.has(key)) return true; // Duplicate found
              seen.add(key);
              return false;
            });
            
            // If duplicates found, remove them
            if (hasDuplicates) {
              console.warn('Duplicates detected in lastPortfolio, removing them');
              const uniquePortfolio: any[] = [];
              const seenKeys = new Set<string>();
              parsed.lastPortfolio.forEach((item: any) => {
                const key = (item.symbol || item.name || '').toLowerCase();
                if (key && !seenKeys.has(key)) {
                  seenKeys.add(key);
                  uniquePortfolio.push(item);
                }
              });
              parsed.lastPortfolio = uniquePortfolio;
              // Save cleaned state
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            }
          }
          
          setState(sanitizeState(parsed));
        }
      } catch (error) {
        console.warn('Failed to load gamification state', error);
      }
    };

    loadState();
  }, []);

  const persistState = useCallback((next: GamificationState) => {
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(error => {
      console.warn('Failed to persist gamification state', error);
    });
  }, []);

  const updateState = useCallback(
    (updater: (prev: GamificationState) => GamificationState) => {
      setState(prev => {
        const next = updater(prev);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(error => {
          console.warn('Failed to persist gamification state', error);
        });
        return next;
      });
    },
    [],
  );

  const resetGamification = useCallback(() => {
    const nextState = createDefaultState();
    persistState(nextState);
  }, [persistState]);

  const registerMixEvent = useCallback(
    ({ totalValue, portfolio }: RegisterPayload) => {
      updateState(prev => {
        const today = getTodayStamp();
        let workingState = prev;

        if (prev.lastReset !== today) {
          const resetMissions = Object.keys(prev.missions).reduce((acc, missionId) => {
            const mission = prev.missions[missionId];
            acc[missionId] = { ...mission, progress: 0, completed: false };
            return acc;
          }, {} as Record<string, MissionState>);

          workingState = {
            ...prev,
            missions: resetMissions,
            lastReset: today,
          };
        }

        const updatedMissions = { ...workingState.missions };

        const incrementMission = (id: string, amount = 1) => {
          const mission = updatedMissions[id];
          if (!mission || mission.completed) return;

          const progress = Math.min(mission.goal, mission.progress + amount);
          updatedMissions[id] = {
            ...mission,
            progress,
            completed: progress >= mission.goal,
          };
        };

        incrementMission('mix-master');

        if (totalValue >= 5000) {
          incrementMission('high-roller');
        }

        if (portfolio.some(item => (item.marketCapRank ?? Number.MAX_SAFE_INTEGER) <= 10)) {
          incrementMission('blue-chip-baker');
        }

        const flavorSet = new Set(workingState.flavors);
        portfolio.forEach(item => {
          deriveFlavorsForCoin(item).forEach(flavor => flavorSet.add(flavor));
        });

        const xpGain = clamp2(25 + totalValue / 200);
        const newXp = workingState.xp + xpGain;

        const impact = clamp2(totalValue * (Math.random() * 0.12 - 0.03));
        const updatedWallet: WalletState = {
          balance: clamp2(Math.max(0, workingState.wallet.balance + impact)),
          invested: clamp2(totalValue),
          lastImpact: impact,
        };

        // Убираем дубликаты по символу перед сохранением
        const seenSymbols = new Set<string>();
        const uniquePortfolio = portfolio.filter(item => {
          const symbol = (item.symbol ?? '').toLowerCase();
          if (!symbol || seenSymbols.has(symbol)) return false;
          seenSymbols.add(symbol);
          return true;
        });
        
        const lastPortfolio: HoldingSnapshot[] = uniquePortfolio
          .slice(0, 3)
          .map(item => ({
            name: item.name ?? '',
            symbol: item.symbol ?? '',
            percentage: clamp2(item.percentage ?? 0),
            color: item.color ?? '#FFD8DF',
          }));

        let streakCount = workingState.streakCount;
        if (!workingState.lastMixDate) {
          streakCount = 1;
        } else if (workingState.lastMixDate === today) {
          streakCount = workingState.streakCount;
        } else {
          const prevDate = new Date(workingState.lastMixDate);
          const currentDate = new Date(today);
          const diff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
          streakCount = diff === 1 ? workingState.streakCount + 1 : 1;
        }

        return {
          ...workingState,
          missions: updatedMissions,
          flavors: Array.from(flavorSet).slice(0, 30),
          totalMixes: workingState.totalMixes + 1,
          wallet: updatedWallet,
          xp: newXp,
          streakCount,
          lastMixDate: today,
          lastPortfolio,
        };
      });
    },
    [updateState],
  );

  const registerDiscoveryVisit = useCallback(() => {
    updateState(prev => {
      const today = getTodayStamp();
      let working = prev;

      if (prev.lastReset !== today) {
        const resetMissions = Object.keys(prev.missions).reduce((acc, missionId) => {
          const mission = prev.missions[missionId];
          acc[missionId] = { ...mission, progress: 0, completed: false };
          return acc;
        }, {} as Record<string, MissionState>);
        working = { ...prev, missions: resetMissions, lastReset: today };
      }

      const mission = working.missions['fresh-scout'];
      if (!mission || mission.completed) return working;

      const progress = Math.min(mission.goal, mission.progress + 1);
      return {
        ...working,
        missions: {
          ...working.missions,
          'fresh-scout': { ...mission, progress, completed: progress >= mission.goal },
        },
        xp: working.xp + 5,
      };
    });
  }, [updateState]);

  const bumpMission = useCallback(
    (missionId: string, xpGain = 5) => {
      updateState(prev => {
        const today = getTodayStamp();
        let working = prev;
        if (prev.lastReset !== today) {
          const resetMissions = Object.keys(prev.missions).reduce((acc, id) => {
            const mission = prev.missions[id];
            acc[id] = { ...mission, progress: 0, completed: false };
            return acc;
          }, {} as Record<string, MissionState>);
          working = { ...prev, missions: resetMissions, lastReset: today };
        }
        const mission = working.missions[missionId];
        if (!mission || mission.completed) return working;
        const progress = Math.min(mission.goal, mission.progress + 1);
        return {
          ...working,
          missions: {
            ...working.missions,
            [missionId]: { ...mission, progress, completed: progress >= mission.goal },
          },
          xp: working.xp + xpGain,
        };
      });
    },
    [updateState],
  );

  const registerCollect = useCallback(() => bumpMission('collector', 5), [bumpMission]);
  const registerDuelWin = useCallback(() => bumpMission('duelist', 15), [bumpMission]);
  const registerWildCatch = useCallback(() => bumpMission('wild-catch', 10), [bumpMission]);

  const boostWallet = useCallback(() => {
    updateState(prev => ({
      ...prev,
      wallet: {
        ...prev.wallet,
        balance: clamp2(prev.wallet.balance + 250),
        lastImpact: 250,
      },
      xp: prev.xp + 10,
    }));
  }, [updateState]);

  const missions = useMemo(() => Object.values(state.missions), [state.missions]);
  const dailyMixes = state.missions['mix-master']?.progress ?? 0;
  const level = Math.max(1, Math.floor(state.xp / 120) + 1);

  return {
    missions,
    flavors: state.flavors,
    totalMixes: state.totalMixes,
    dailyMixes,
    wallet: state.wallet,
    xp: state.xp,
    level,
    streakCount: state.streakCount,
    lastPortfolio: state.lastPortfolio,
    registerMixEvent,
    registerDiscoveryVisit,
    registerCollect,
    registerDuelWin,
    registerWildCatch,
    resetGamification,
    boostWallet,
  };
};



