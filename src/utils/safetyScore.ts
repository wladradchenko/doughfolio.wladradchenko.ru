/**
 * Donut Safety Score — a friendly, transparent heuristic that gives a coin a
 * one-glance "how sketchy does this look" read using only the key-less on-chain
 * data we already fetch (liquidity, age, volume, buy/sell balance, FDV).
 *
 * This is NOT a honeypot/contract audit and NOT financial advice — it cannot
 * detect hidden mint authority, fake LP locks, or malicious code. It only flags
 * the statistically obvious risk shapes. Always show DISCLAIMER alongside it.
 */

import type { DiscoveryCoin } from '../api/discovery';

export type SafetyLevel = 'green' | 'yellow' | 'red';

export type SafetyResult = {
  score: number; // 0–100, higher = looks safer
  level: SafetyLevel;
  label: string;
  color: string;
  flags: string[]; // short human-readable notes, most important first
};

export const SAFETY_DISCLAIMER =
  'Heuristic signal from public market data — not a contract audit or financial advice. Always DYOR.';

export const SAFETY_COLORS: Record<SafetyLevel, string> = {
  green: '#2BB673',
  yellow: '#E6A700',
  red: '#E5484D',
};

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

export const computeSafetyScore = (coin: DiscoveryCoin): SafetyResult => {
  const flags: string[] = [];
  let score = 8; // baseline

  const { liquidityUsd, ageHours, volume24hUsd, fdvUsd, buys24h, sells24h, marketCapUsd } = coin;

  /* --- Liquidity depth: the single biggest rug signal --- */
  if (liquidityUsd == null) {
    // No pool liquidity (e.g. a CoinGecko-listed coin) — lean on market cap.
    if ((marketCapUsd ?? 0) > 50_000_000) score += 25;
    else if ((marketCapUsd ?? 0) > 1_000_000) score += 16;
    else score += 6;
  } else if (liquidityUsd < 2_000) {
    flags.push('Very low liquidity');
  } else if (liquidityUsd < 10_000) {
    score += 6;
    flags.push('Low liquidity');
  } else if (liquidityUsd < 50_000) {
    score += 14;
  } else if (liquidityUsd < 250_000) {
    score += 20;
  } else {
    score += 25;
  }

  /* --- Age: surviving over time is itself a safety signal --- */
  if (ageHours == null) {
    score += 8;
  } else if (ageHours < 1) {
    score += 2;
    flags.push('Brand new (<1h)');
  } else if (ageHours < 6) {
    score += 6;
    flags.push('Very young');
  } else if (ageHours < 24) {
    score += 10;
  } else if (ageHours < 24 * 7) {
    score += 16;
  } else {
    score += 22;
  }

  /* --- Volume / liquidity turnover: too high hints at wash trading --- */
  if (liquidityUsd != null && liquidityUsd > 0 && volume24hUsd != null) {
    const ratio = volume24hUsd / liquidityUsd;
    if (ratio === 0) {
      score += 2;
      flags.push('No 24h volume');
    } else if (ratio < 0.05) {
      score += 6;
    } else if (ratio <= 3) {
      score += 18;
    } else if (ratio <= 10) {
      score += 10;
    } else {
      score += 3;
      flags.push('Volume >> liquidity (possible wash trading)');
    }
  } else {
    score += 8;
  }

  /* --- Buy / sell balance: heavy selling = people heading for the exit --- */
  const buys = buys24h ?? 0;
  const sells = sells24h ?? 0;
  const totalTx = buys + sells;
  if (buys24h == null && sells24h == null) {
    score += 6;
  } else if (totalTx < 20) {
    score += 3;
    flags.push('Thin trading activity');
  } else {
    const sellRatio = sells / totalTx;
    if (sellRatio > 0.7) {
      score += 3;
      flags.push('Heavy sell pressure');
    } else if (sellRatio >= 0.4) {
      score += 13;
    } else {
      score += 10;
    }
  }

  /* --- FDV vs liquidity sanity: huge valuation on thin liquidity is fragile --- */
  if (fdvUsd != null && liquidityUsd != null && liquidityUsd > 0) {
    const fdvLiq = fdvUsd / liquidityUsd;
    if (fdvLiq > 5000) {
      flags.push('FDV vastly exceeds liquidity');
    } else if (fdvLiq > 1000) {
      score += 3;
    } else {
      score += 8;
    }
  } else {
    score += 5;
  }

  score = clamp(Math.round(score));

  let level: SafetyLevel;
  let label: string;
  if (score >= 67) {
    level = 'green';
    label = 'Looks established';
  } else if (score >= 40) {
    level = 'yellow';
    label = 'Caution';
  } else {
    level = 'red';
    label = 'High risk';
  }

  return {
    score,
    level,
    label,
    color: SAFETY_COLORS[level],
    flags: flags.slice(0, 3),
  };
};
