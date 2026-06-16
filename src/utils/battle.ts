/**
 * Duel engine — fully offline, no backend.
 *
 * A challenge encodes the challenger's 3-card deck + a seed into a short code.
 * The friend pastes the code, picks their own 3 cards, and the battle resolves
 * DETERMINISTICALLY from both decks + the seed (same inputs → same result on any
 * device). Rarer / holo cards hit harder, so prized cards matter — like real pogs.
 */

import {
  RarityTier,
  RARITY_BASE_POWER,
  RARITY_ORDER,
  HOLO_POWER_BONUS,
} from './rarity';

export type BattleFichka = {
  sym: string;
  name: string;
  rarity: RarityTier;
  holo: boolean;
  safety: number; // 0–100
};

export type RoundResult = {
  challengerPower: number;
  accepterPower: number;
  winner: 'challenger' | 'accepter';
};

export type BattleResult = {
  rounds: RoundResult[];
  challengerWins: number;
  accepterWins: number;
  winner: 'challenger' | 'accepter';
};

export type Challenge = {
  seed: number;
  deck: BattleFichka[];
};

export const DECK_SIZE = 3;

/** Raw battle power of a single card. */
export const power = (f: BattleFichka): number =>
  RARITY_BASE_POWER[f.rarity] + f.safety / 20 + (f.holo ? HOLO_POWER_BONUS : 0);

/* --------------------------- seeded PRNG (mulberry32) --------------------------- */

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Resolve a best-of-3 duel. Deterministic for a given (challenger, accepter, seed):
 * each round adds a seeded 0–6 "luck" roll to each side's power so it feels alive
 * but reproduces identically on both devices.
 */
export const resolveBattle = (
  challenger: BattleFichka[],
  accepter: BattleFichka[],
  seed: number,
): BattleResult => {
  const rng = mulberry32(seed);
  const rounds: RoundResult[] = [];
  let challengerWins = 0;
  let accepterWins = 0;

  for (let i = 0; i < DECK_SIZE; i++) {
    const cLuck = rng() * 6;
    const aLuck = rng() * 6;
    const cPow = (challenger[i] ? power(challenger[i]) : 0) + cLuck;
    const aPow = (accepter[i] ? power(accepter[i]) : 0) + aLuck;
    const winner = cPow >= aPow ? 'challenger' : 'accepter';
    if (winner === 'challenger') challengerWins++;
    else accepterWins++;
    rounds.push({
      challengerPower: Math.round(cPow * 10) / 10,
      accepterPower: Math.round(aPow * 10) / 10,
      winner,
    });
  }

  return {
    rounds,
    challengerWins,
    accepterWins,
    winner: challengerWins >= accepterWins ? 'challenger' : 'accepter',
  };
};

/* ------------------------------- challenge codec ------------------------------- */

// Compact base64 over an ASCII string (we encodeURIComponent first → guaranteed ASCII),
// so we don't depend on btoa/atob being present in the RN runtime.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const b64encode = (s: string): string => {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c1 = s.charCodeAt(i++);
    const c2 = i < s.length ? s.charCodeAt(i++) : NaN;
    const c3 = i < s.length ? s.charCodeAt(i++) : NaN;
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
    const e3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6);
    const e4 = isNaN(c3) ? 64 : c3 & 63;
    out += B64[e1] + B64[e2] + (e3 === 64 ? '=' : B64[e3]) + (e4 === 64 ? '=' : B64[e4]);
  }
  return out;
};

const b64decode = (str: string): string => {
  const clean = str.replace(/[^A-Za-z0-9+/=]/g, '');
  let out = '';
  let i = 0;
  while (i < clean.length) {
    const d1 = B64.indexOf(clean[i++]);
    const d2 = B64.indexOf(clean[i++]);
    const d3 = B64.indexOf(clean[i++]);
    const d4 = B64.indexOf(clean[i++]);
    out += String.fromCharCode((d1 << 2) | (d2 >> 4));
    if (d3 !== 64 && d3 !== -1) {
      out += String.fromCharCode(((d2 & 15) << 4) | (d3 >> 2));
      if (d4 !== 64 && d4 !== -1) {
        out += String.fromCharCode(((d3 & 3) << 6) | d4);
      }
    }
  }
  return out;
};

// Compact serialization: seed~sym.rarIdx.holo.safety.encodedName | ...
const serialize = (c: Challenge): string => {
  const deck = c.deck
    .map(
      f =>
        `${f.sym}.${RARITY_ORDER.indexOf(f.rarity)}.${f.holo ? 1 : 0}.${Math.round(
          f.safety,
        )}.${encodeURIComponent(f.name)}`,
    )
    .join('|');
  return `${c.seed}~${deck}`;
};

const deserialize = (s: string): Challenge | null => {
  const [seedStr, deckStr] = s.split('~');
  const seed = Number(seedStr);
  if (!Number.isFinite(seed) || !deckStr) return null;
  const deck: BattleFichka[] = deckStr
    .split('|')
    .map(part => {
      const [sym, rarIdx, holo, safety, name] = part.split('.');
      const rarity = RARITY_ORDER[Number(rarIdx)];
      if (!sym || !rarity) return null;
      return {
        sym,
        name: name ? decodeURIComponent(name) : sym,
        rarity,
        holo: holo === '1',
        safety: Number(safety) || 0,
      } as BattleFichka;
    })
    .filter((f): f is BattleFichka => f != null);
  return deck.length > 0 ? { seed, deck } : null;
};

export const encodeChallenge = (c: Challenge): string => b64encode(encodeURIComponent(serialize(c)));

export const decodeChallenge = (code: string): Challenge | null => {
  try {
    return deserialize(decodeURIComponent(b64decode(code.trim())));
  } catch {
    return null;
  }
};

/** Seed derived from picked cards + a caller-supplied salt (avoids Math.random for reproducibility). */
export const makeSeed = (deck: BattleFichka[], salt: number): number => {
  let h = 2166136261 ^ (salt | 0);
  const s = deck.map(f => f.sym + f.rarity + (f.holo ? 'H' : '')).join('');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
