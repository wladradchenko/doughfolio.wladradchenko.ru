import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'doughfolio_radar_v1';
const todayStr = () => new Date().toISOString().slice(0, 10);

type RadarState = { date: string; collected: string[] };

/** Tracks which radar spawns the user has already caught today (daily reset). */
export const useRadar = () => {
  const [collected, setCollected] = useState<string[]>([]);
  const ref = useRef<string[]>([]);
  ref.current = collected;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return;
        const s: RadarState = JSON.parse(raw);
        if (s.date === todayStr()) {
          setCollected(s.collected ?? []);
        } else {
          // New day → reset.
          AsyncStorage.setItem(KEY, JSON.stringify({ date: todayStr(), collected: [] })).catch(() => {});
        }
      } catch {
        /* keep empty */
      }
    })();
  }, []);

  const isSpawnCollected = useCallback((id: string) => ref.current.includes(id), []);

  const markCollected = useCallback((id: string) => {
    setCollected(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      AsyncStorage.setItem(KEY, JSON.stringify({ date: todayStr(), collected: next })).catch(() => {});
      return next;
    });
  }, []);

  return { collectedSpawnIds: collected, isSpawnCollected, markCollected };
};
