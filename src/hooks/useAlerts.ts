import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiscoveryCoin } from '../api/discovery';
import {
  configureNotifications,
  ensureAndroidChannel,
  scheduleDailyReminder,
  cancelDailyReminder,
  presentImmediateAlert,
  requestNotificationPermissions,
} from '../utils/notifications';

const STORAGE_KEY = 'doughfolio_alerts_v1';
const CHECK_INTERVAL = 15 * 60 * 1000; // don't poll prices more than every 15 min
const ALERT_COOLDOWN = 6 * 60 * 60 * 1000; // max one move-alert per coin per 6h
const MAX_WATCHLIST = 25;

export type WatchedCoin = {
  key: string;
  name: string;
  symbol: string;
  coingeckoId?: string;
  network?: string;
  url: string;
  image?: string;
};

export type AlertState = {
  dailyReminderEnabled: boolean;
  dailyHour: number;
  dailyMinute: number;
  moveThreshold: number; // % 24h move that triggers an alert
  watchlist: WatchedCoin[];
  lastNotifiedAt: Record<string, number>;
};

const defaultState: AlertState = {
  dailyReminderEnabled: false,
  dailyHour: 9,
  dailyMinute: 0,
  moveThreshold: 10,
  watchlist: [],
  lastNotifiedAt: {},
};

const persist = (next: AlertState): AlertState => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  return next;
};

export const useAlerts = () => {
  const [state, setState] = useState<AlertState>(defaultState);
  const stateRef = useRef(state);
  const lastCheckRef = useRef(0);
  stateRef.current = state;

  // Load persisted settings + configure the notification handler/channel once.
  useEffect(() => {
    configureNotifications();
    ensureAndroidChannel();
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState({ ...defaultState, ...parsed });
        }
      } catch {
        /* keep defaults */
      }
    })();
  }, []);

  const update = useCallback((updater: (prev: AlertState) => AlertState) => {
    setState(prev => persist(updater(prev)));
  }, []);

  const isWatched = useCallback(
    (coin: { key: string; symbol?: string; coingeckoId?: string }) =>
      stateRef.current.watchlist.some(
        w =>
          w.key === coin.key ||
          (coin.coingeckoId != null && w.coingeckoId === coin.coingeckoId),
      ),
    [],
  );

  const toggleWatch = useCallback(
    (coin: DiscoveryCoin) => {
      update(prev => {
        const exists = prev.watchlist.some(
          w => w.key === coin.key || (coin.coingeckoId != null && w.coingeckoId === coin.coingeckoId),
        );
        if (exists) {
          return {
            ...prev,
            watchlist: prev.watchlist.filter(
              w => !(w.key === coin.key || (coin.coingeckoId != null && w.coingeckoId === coin.coingeckoId)),
            ),
          };
        }
        if (prev.watchlist.length >= MAX_WATCHLIST) return prev;
        // Asking for permission the moment a user opts into alerts.
        requestNotificationPermissions();
        const watched: WatchedCoin = {
          key: coin.key,
          name: coin.name,
          symbol: coin.symbol,
          coingeckoId: coin.coingeckoId,
          network: coin.network,
          url: coin.url,
          image: coin.image,
        };
        return { ...prev, watchlist: [watched, ...prev.watchlist] };
      });
    },
    [update],
  );

  const setDailyReminder = useCallback(
    async (enabled: boolean, hour = stateRef.current.dailyHour, minute = stateRef.current.dailyMinute) => {
      if (enabled) {
        const ok = await scheduleDailyReminder(hour, minute);
        if (!ok) return false; // permission denied — leave toggle off
        update(prev => ({ ...prev, dailyReminderEnabled: true, dailyHour: hour, dailyMinute: minute }));
        return true;
      }
      await cancelDailyReminder();
      update(prev => ({ ...prev, dailyReminderEnabled: false }));
      return true;
    },
    [update],
  );

  const setMoveThreshold = useCallback(
    (percent: number) => update(prev => ({ ...prev, moveThreshold: percent })),
    [update],
  );

  /** Poll watchlist prices and fire local alerts for big 24h moves (app must be open). */
  const checkWatchlist = useCallback(async () => {
    const current = stateRef.current;
    const ids = current.watchlist.map(c => c.coingeckoId).filter(Boolean) as string[];
    if (ids.length === 0) return;

    const now = Date.now();
    if (now - lastCheckRef.current < CHECK_INTERVAL) return;
    lastCheckRef.current = now;

    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const updates: Record<string, number> = {};

      for (const coin of current.watchlist) {
        if (!coin.coingeckoId) continue;
        const entry = data[coin.coingeckoId];
        const change = Number(entry?.usd_24h_change);
        if (!Number.isFinite(change)) continue;
        if (Math.abs(change) < current.moveThreshold) continue;

        const last = current.lastNotifiedAt[coin.key] ?? 0;
        if (now - last < ALERT_COOLDOWN) continue;

        const dir = change >= 0 ? '📈' : '📉';
        await presentImmediateAlert(
          `${dir} ${coin.symbol} ${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
          `${coin.name} is ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% over 24h.`,
        );
        updates[coin.key] = now;
      }

      if (Object.keys(updates).length > 0) {
        update(prev => ({
          ...prev,
          lastNotifiedAt: { ...prev.lastNotifiedAt, ...updates },
        }));
      }
    } catch {
      /* network hiccup — try again next foreground */
    }
  }, [update]);

  // Check on mount and whenever the app comes to the foreground.
  useEffect(() => {
    checkWatchlist();
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') checkWatchlist();
    });
    return () => sub.remove();
  }, [checkWatchlist]);

  return {
    dailyReminderEnabled: state.dailyReminderEnabled,
    dailyHour: state.dailyHour,
    dailyMinute: state.dailyMinute,
    moveThreshold: state.moveThreshold,
    watchlist: state.watchlist,
    isWatched,
    toggleWatch,
    setDailyReminder,
    setMoveThreshold,
  };
};
