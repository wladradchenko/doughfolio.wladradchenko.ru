/**
 * Rarity for collectible Coin-Dex cards. Derived deterministically from
 * the data the discovery feed already loaded — NO extra API calls. Rarer cards are
 * worth more in duels (see battle.ts), exactly like the prized shiny pogs/cards of
 * the 90s/2000s.
 */

import type { DiscoveryCoin } from '../api/discovery';

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type Rarity = {
  tier: RarityTier;
  label: string;
  color: string;
};

export const RARITY_ORDER: RarityTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const RARITY_COLORS: Record<RarityTier, string> = {
  common: '#9AA0A6',
  uncommon: '#2BB673',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

export const RARITY_LABELS: Record<RarityTier, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

/** Base battle power per tier (used by battle.ts). */
export const RARITY_BASE_POWER: Record<RarityTier, number> = {
  common: 5,
  uncommon: 8,
  rare: 12,
  epic: 16,
  legendary: 22,
};

// TEMP (testing): set to 1 so every newly-collected card is holo and you can see
// the foil effect. REVERT to 0.07 before shipping.
export const HOLO_CHANCE = 0.07
export const HOLO_POWER_BONUS = 4;

/**
 * Derive a rarity tier from on-chain liquidity (preferred) or market cap (fallback
 * for CoinGecko-listed coins that have no pool liquidity).
 */
export const deriveRarity = (coin: Pick<DiscoveryCoin, 'liquidityUsd' | 'marketCapUsd'>): Rarity => {
  const liq = coin.liquidityUsd;
  const mcap = coin.marketCapUsd ?? 0;

  let tier: RarityTier;
  if ((liq != null && liq > 1_000_000) || mcap > 100_000_000) {
    tier = 'legendary';
  } else if ((liq != null && liq >= 250_000) || mcap > 10_000_000) {
    tier = 'epic';
  } else if ((liq != null && liq >= 50_000) || mcap > 1_000_000) {
    tier = 'rare';
  } else if (liq != null && liq >= 10_000) {
    tier = 'uncommon';
  } else {
    tier = 'common';
  }

  return { tier, label: RARITY_LABELS[tier], color: RARITY_COLORS[tier] };
};

/** One-time holo roll at collection time (~7%). */
// Wild (radar-caught) coins are more likely to be holo — that's their reward.
export const WILD_HOLO_CHANCE = 0.25;

export const rollHolo = (chance: number = HOLO_CHANCE): boolean => Math.random() < chance;
