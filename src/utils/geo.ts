/**
 * Geo helpers for the Crypto Radar — pure JS, NO native dependency, NO backend.
 *
 * Spawns are generated DETERMINISTICALLY from a coarse location grid cell + the
 * date, so every device computes the same coins at the same real-world spots for
 * a given day, and they refresh daily. Anchoring to a snapped grid node (not the
 * user's exact position) keeps spawns fixed in the world as the user walks toward
 * them; crossing into a new ~150 m node reveals a fresh batch.
 */

export type Spawn = {
  id: string;
  lat: number;
  lng: number;
};

const R = 6371e3; // Earth radius, metres
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance between two coords, in metres. */
export const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const dφ = toRad(lat2 - lat1);
  const dλ = toRad(lng2 - lng1);
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Initial bearing from point 1 to point 2, degrees [0, 360). */
export const bearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const dλ = toRad(lng2 - lng1);
  const y = Math.sin(dλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/** New coord reached by travelling `dist` metres along `brng` degrees from a coord. */
export const destination = (lat: number, lng: number, brng: number, dist: number) => {
  const δ = dist / R;
  const θ = toRad(brng);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: toDeg(φ2), lng: ((toDeg(λ2) + 540) % 360) - 180 };
};

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hashStr = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const GRID = 0.0015; // ~150 m snap so spawns stay put as the user moves a little
const SPAWNS_PER_CELL = 6;
const MIN_DIST = 30; // metres
const MAX_DIST = 250;

/** The grid-cell key for a coordinate (stable anchor for nearby spawns). */
export const cellKey = (lat: number, lng: number): string =>
  `${Math.round(lat / GRID)}_${Math.round(lng / GRID)}`;

/**
 * Deterministic spawns near the user for a given day. Anchored to the snapped grid
 * node so they don't drift with the user. `dateStr` should be 'YYYY-MM-DD'.
 */
export const generateSpawns = (lat: number, lng: number, dateStr: string): Spawn[] => {
  const key = cellKey(lat, lng);
  const anchorLat = Math.round(lat / GRID) * GRID;
  const anchorLng = Math.round(lng / GRID) * GRID;
  const rng = mulberry32(hashStr(`${key}|${dateStr}`));

  const spawns: Spawn[] = [];
  for (let i = 0; i < SPAWNS_PER_CELL; i++) {
    const dist = MIN_DIST + rng() * (MAX_DIST - MIN_DIST);
    const brng = rng() * 360;
    const p = destination(anchorLat, anchorLng, brng, dist);
    spawns.push({ id: `${key}_${dateStr}_${i}`, lat: p.lat, lng: p.lng });
  }
  return spawns;
};

export const COLLECT_RADIUS_M = 50; // generous, to absorb Android GPS jitter
export const RADAR_MAX_M = 300; // outer ring distance for the radar display
