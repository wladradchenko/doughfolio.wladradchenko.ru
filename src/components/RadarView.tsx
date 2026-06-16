import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, AppState, ScrollView } from 'react-native';
import { Canvas, Circle, Group } from '@shopify/react-native-skia';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import {
  generateSpawns,
  haversine,
  bearing,
  hashStr,
  COLLECT_RADIUS_M,
  RADAR_MAX_M,
} from '../utils/geo';
import { deriveRarity, RARITY_LABELS } from '../utils/rarity';
import { computeSafetyScore } from '../utils/safetyScore';
import type { DiscoveryCoin } from '../api/discovery';
import { useRadar } from '../hooks/useRadar';

type Props = {
  active: boolean;
  pool: DiscoveryCoin[];
  onCatch: (coin: DiscoveryCoin) => void;
};

type Perm = 'undetermined' | 'granted' | 'denied';
type Pos = { lat: number; lng: number; accuracy?: number };
type AnySub = { remove: () => void } | null;

const SIZE = wp('78%');
const C = SIZE / 2;
const EDGE = C - wp('5%');

const toRad = (d: number) => (d * Math.PI) / 180;
const todayStr = () => new Date().toISOString().slice(0, 10);

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const dirLabel = (deg: number) => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

export const RadarView = ({ active, pool, onCatch }: Props) => {
  const [perm, setPerm] = useState<Perm>('undetermined');
  const [pos, setPos] = useState<Pos | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const { collectedSpawnIds, markCollected } = useRadar();
  const dateStr = todayStr();

  const startWatching = useCallback(async (): Promise<AnySub[]> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPerm('denied');
      return [];
    }
    setPerm('granted');
    const posSub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
      loc => setPos({ lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy ?? undefined }),
    );
    let headSub: AnySub = null;
    try {
      headSub = await Location.watchHeadingAsync(h => {
        const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        if (deg != null && deg >= 0) setHeading(deg);
      });
    } catch {
      /* compass unavailable (e.g. emulator) — radar falls back to north-up */
    }
    return [posSub, headSub].filter(Boolean) as AnySub[];
  }, []);

  useEffect(() => {
    if (!active) return;
    let subs: AnySub[] = [];
    let cancelled = false;
    const begin = () =>
      startWatching().then(s => {
        if (cancelled) s.forEach(x => x?.remove());
        else subs = s;
      });
    begin();
    const appSub = AppState.addEventListener('change', next => {
      if (next !== 'active') {
        subs.forEach(x => x?.remove());
        subs = [];
      } else if (subs.length === 0 && !cancelled) {
        begin();
      }
    });
    return () => {
      cancelled = true;
      subs.forEach(x => x?.remove());
      appSub.remove();
    };
  }, [active, startWatching]);

  const spawns = useMemo(() => {
    if (!pos || pool.length === 0) return [];
    return generateSpawns(pos.lat, pos.lng, dateStr)
      .filter(s => !collectedSpawnIds.includes(s.id))
      .map(s => {
        const coin = pool[hashStr(s.id) % pool.length];
        const dist = haversine(pos.lat, pos.lng, s.lat, s.lng);
        const brng = bearing(pos.lat, pos.lng, s.lat, s.lng);
        return { ...s, coin, dist, brng };
      })
      .sort((a, b) => a.dist - b.dist);
  }, [pos, pool, dateStr, collectedSpawnIds]);

  const nearby = spawns.slice(0, 4);
  const headingUp = heading != null;

  const handleCatch = (spawnId: string, coin: DiscoveryCoin) => {
    markCollected(spawnId);
    onCatch(coin);
  };

  const screenFor = (dist: number, brng: number) => {
    const rPix = (Math.min(dist, RADAR_MAX_M) / RADAR_MAX_M) * EDGE;
    const a = toRad(brng - (headingUp ? (heading as number) : 0));
    return { x: C + rPix * Math.sin(a), y: C - rPix * Math.cos(a) };
  };

  if (perm === 'denied') {
    return (
      <View style={styles.center}>
        <MaterialIcons name="location-off" size={wp('14%')} color="#E0A9B0" />
        <Text style={styles.centerText}>Location permission is needed to scan for nearby coins.</Text>
        <TouchableOpacity style={styles.button} onPress={() => startWatching()}>
          <Text style={styles.buttonText}>Grant location</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!pos) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6E76" />
        <Text style={styles.centerText}>Finding your location…</Text>
      </View>
    );
  }
  if (pool.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6E76" />
        <Text style={styles.centerText}>Loading the coin pool…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.radarWrap}>
        {/* "Ahead" / North marker at the top of the radar */}
        <View style={styles.aheadMarker}>
          <MaterialIcons name="arrow-drop-up" size={wp('7%')} color="#FF6E76" />
          <Text style={styles.aheadText}>{headingUp ? 'Ahead' : 'North'}</Text>
        </View>

        <Canvas style={{ width: SIZE, height: SIZE }}>
          {[50, 150, 300].map(m => (
            <Circle key={m} cx={C} cy={C} r={(m / RADAR_MAX_M) * EDGE} style="stroke" strokeWidth={1.5} color="rgba(255,110,118,0.35)" />
          ))}
          <Circle cx={C} cy={C} r={(COLLECT_RADIUS_M / RADAR_MAX_M) * EDGE} color="rgba(43,182,115,0.10)" />
          {/* You */}
          <Circle cx={C} cy={C} r={wp('2.6%')} color="#FF6E76" />
          <Circle cx={C} cy={C} r={wp('4.5%')} style="stroke" strokeWidth={2} color="#FF6E76" />
          {/* Blips */}
          {spawns.map(s => {
            const { x, y } = screenFor(s.dist, s.brng);
            const isReady = s.dist <= COLLECT_RADIUS_M;
            const color = deriveRarity(s.coin).color;
            return (
              <Group key={s.id}>
                {isReady && <Circle cx={x} cy={y} r={wp('4%')} style="stroke" strokeWidth={2} color={color} />}
                <Circle cx={x} cy={y} r={wp('2.2%')} color={color} />
              </Group>
            );
          })}
        </Canvas>
        {pos.accuracy != null && <Text style={styles.accuracy}>GPS ±{Math.round(pos.accuracy)}m</Text>}
      </View>

      {/* Nearby list — what's around, how interesting, which way */}
      <View style={styles.panel}>
        {nearby.length === 0 ? (
          <Text style={styles.hint}>No coins nearby right now — move around to find fresh spawns.</Text>
        ) : (
          nearby.map(s => {
            const rarity = deriveRarity(s.coin);
            const safety = computeSafetyScore(s.coin).score;
            const isReady = s.dist <= COLLECT_RADIUS_M;
            const top = rarity.tier === 'epic' || rarity.tier === 'legendary';
            return (
              <View key={s.id} style={[styles.row, { borderColor: rarity.color }]}>
                <View style={[styles.dot, { backgroundColor: rarity.color }]} />
                <View style={styles.rowInfo}>
                  <View style={styles.rowTitle}>
                    <Text style={styles.sym} numberOfLines={1}>{s.coin.symbol}</Text>
                    {top && <MaterialIcons name="star" size={wp('3.6%')} color="#F59E0B" />}
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    <Text style={{ color: rarity.color, fontWeight: '700' }}>{RARITY_LABELS[rarity.tier]}</Text>
                    {`  ·  Safety ${safety}`}
                  </Text>
                </View>
                {isReady ? (
                  <TouchableOpacity style={[styles.collectBtn, { backgroundColor: rarity.color }]} onPress={() => handleCatch(s.id, s.coin)}>
                    <MaterialIcons name="catching-pokemon" size={wp('4.6%')} color="#FFFFFF" />
                    <Text style={styles.collectText}>Collect</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.dir}>
                    <Text style={styles.dist}>{Math.round(s.dist)}m</Text>
                    <Text style={styles.dirText}>{dirLabel(s.brng)}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Pink explainer */}
      <View style={styles.info}>
        <Text style={styles.infoText}>
          Coins spawn around you and refresh daily. Turn until a coin sits at the top ({headingUp ? '“Ahead”' : '“North”'}),
          walk to it, and once you’re within ~50m tap <Text style={{ fontWeight: 'bold' }}>Collect</Text>. Rarer coins
          (★ epic/legendary) are worth the walk!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: hp('1.5%'), paddingBottom: hp('5%') },
  radarWrap: { alignItems: 'center', paddingTop: hp('2.5%') },
  aheadMarker: { position: 'absolute', top: 0, alignItems: 'center', zIndex: 2 },
  aheadText: { fontSize: wp('2.8%'), color: '#FF6E76', fontWeight: '700', marginTop: -hp('0.6%') },
  accuracy: { fontSize: wp('3%'), color: '#9B7077', marginTop: hp('1%') },
  panel: { width: '100%', paddingHorizontal: wp('6%'), marginTop: hp('2%') },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: hp('1.1%'),
    paddingHorizontal: wp('3.5%'),
    marginBottom: hp('1%'),
    gap: wp('2.5%'),
  },
  dot: { width: wp('3%'), height: wp('3%'), borderRadius: wp('1.5%') },
  rowInfo: { flex: 1 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: wp('1.5%') },
  sym: { fontSize: wp('4.2%'), fontWeight: 'bold', color: '#2B1D27' },
  meta: { fontSize: wp('3.2%'), color: '#9B7077', marginTop: hp('0.2%') },
  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('1%'),
    borderRadius: 14,
  },
  collectText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: wp('3.6%') },
  dir: { alignItems: 'flex-end' },
  dist: { fontSize: wp('3.8%'), fontWeight: '700', color: '#2B1D27' },
  dirText: { fontSize: wp('3.2%'), color: '#FF6E76', fontWeight: '700' },
  info: {
    backgroundColor: '#FFE4E8',
    borderRadius: 16,
    marginHorizontal: wp('6%'),
    marginTop: hp('1.5%'),
    padding: wp('4%'),
  },
  infoText: { fontSize: wp('3.3%'), color: '#7A5B64', lineHeight: wp('4.8%') },
  hint: { fontSize: wp('3.6%'), color: '#9B7077', textAlign: 'center', paddingVertical: hp('1%') },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: wp('10%') },
  centerText: { fontSize: wp('3.8%'), color: '#9B7077', textAlign: 'center', marginTop: hp('1.5%') },
  button: { marginTop: hp('2%'), backgroundColor: '#FF6E76', paddingHorizontal: wp('8%'), paddingVertical: hp('1.4%'), borderRadius: 20 },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: wp('3.8%') },
});
