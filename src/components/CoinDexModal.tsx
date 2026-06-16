import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  StatusBar,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCanvasRef } from '@shopify/react-native-skia';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RARITY_COLORS, RARITY_LABELS, RARITY_ORDER, RarityTier } from '../utils/rarity';
import type { CollectedFichka, BattleRecord, CoinDexStats } from '../hooks/useCoinDex';
import { FichkaShareCard } from './FichkaShareCard';
import { BattleModal } from './BattleModal';

const withAlpha = (hex: string, a: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  collection: CollectedFichka[];
  stats: CoinDexStats;
  record: BattleRecord;
  recordBattle: (didWin: boolean) => void;
  onDuelWin?: () => void;
};

type Filter = 'all' | RarityTier;

export const CoinDexModal = ({
  visible,
  onClose,
  collection,
  stats,
  record,
  recordBattle,
  onDuelWin,
}: Props) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<CollectedFichka | null>(null);
  const [shareFichka, setShareFichka] = useState<CollectedFichka | null>(null);
  const [battleVisible, setBattleVisible] = useState(false);
  const canvasRef = useCanvasRef();
  const tilt = useRef(new Animated.Value(0)).current;

  // Gentle 3D tilt of the open card (perspective + rotateY) for a foil-like feel.
  useEffect(() => {
    if (!selected) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [selected, tilt]);

  const filtered = filter === 'all' ? collection : collection.filter(f => f.rarity === filter);

  const handleShare = async (f: CollectedFichka) => {
    try {
      setShareFichka(f);
      // Slightly longer so the remote coin logo has time to load into the Skia canvas.
      await new Promise(r => setTimeout(r, 750));
      const image = await canvasRef.current?.makeImageSnapshotAsync();
      if (!image) {
        Alert.alert('Error', 'Could not render the image.');
        return;
      }
      const base64 = image.encodeToBase64();
      const uri = `${FileSystem.cacheDirectory}fichka_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your card', UTI: 'public.png' });
      }
    } catch (e) {
      console.error('card share failed', e);
      Alert.alert('Error', 'Failed to share.');
    } finally {
      setShareFichka(null);
    }
  };

  const renderCell = ({ item }: { item: CollectedFichka }) => {
    const color = RARITY_COLORS[item.rarity];
    return (
      <TouchableOpacity
        style={[styles.cell, { borderColor: color, backgroundColor: withAlpha(color, 0.1) }]}
        onPress={() => setSelected(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cellGloss} />
        {item.holo && <View style={styles.holoStripe} />}
        <View style={[styles.cellMedallion, { borderColor: withAlpha(color, 0.5) }]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.cellImage} />
          ) : (
            <View style={[styles.cellImage, { backgroundColor: color, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={styles.cellInitial}>{item.symbol.slice(0, 1)}</Text>
            </View>
          )}
          <View style={styles.cellMedallionGloss} />
        </View>
        <Text style={styles.cellSymbol} numberOfLines={1}>{item.symbol}</Text>
        <Text style={[styles.cellRarity, { color }]} numberOfLines={1}>{RARITY_LABELS[item.rarity]}</Text>
        {item.holo && <MaterialIcons name="auto-awesome" size={wp('3.8%')} color="#A855F7" style={styles.holoIcon} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar hidden={Platform.OS === 'android'} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <MaterialIcons name="grid-view" size={wp('6.5%')} color="#FF6E76" />
            <Text style={styles.headerTitle}>Coin-Dex</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="close" size={wp('7%')} color="#FF6E76" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          {stats.total} collected · {stats.holoCount} holo · W{record.wins}–L{record.losses}
          {record.streak > 1 ? ` · 🔥${record.streak}` : ''}
        </Text>

        <TouchableOpacity
          style={[styles.battleButton, collection.length === 0 && styles.battleButtonDisabled]}
          onPress={() => (collection.length > 0 ? setBattleVisible(true) : Alert.alert('No cards yet', 'Collect coins first, then duel a friend.'))}
          activeOpacity={0.85}
        >
          <MaterialIcons name="sports-kabaddi" size={wp('5.5%')} color="#FFFFFF" />
          <Text style={styles.battleButtonText}>Duel a friend</Text>
        </TouchableOpacity>

        {/* Rarity filter chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['all', ...RARITY_ORDER] as Filter[]}
          keyExtractor={t => t}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => {
            const active = filter === item;
            const label = item === 'all' ? `All ${stats.total}` : `${RARITY_LABELS[item as RarityTier]} ${stats.byRarity[item as RarityTier] ?? 0}`;
            return (
              <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(item)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {filtered.length === 0 ? (
          <View style={styles.center}>
            <MaterialIcons name="catching-pokemon" size={wp('16%')} color="#E0A9B0" />
            <Text style={styles.centerText}>Discover coins in Fresh Batch to start your collection.</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={f => f.key}
            renderItem={renderCell}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Fichka detail */}
      <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.detailOverlay}>
          {selected && (
            <View style={styles.detailWrap}>
              <Animated.View
                style={{
                  transform: [
                    { perspective: 900 },
                    { rotateY: tilt.interpolate({ inputRange: [0, 1], outputRange: ['-7deg', '7deg'] }) },
                  ],
                }}
              >
                <FichkaShareCard fichka={selected} />
              </Animated.View>

              <View style={styles.detailButtons}>
                <TouchableOpacity style={styles.detailShare} onPress={() => handleShare(selected)}>
                  <MaterialIcons name="image" size={wp('5%')} color="#FFFFFF" />
                  <Text style={styles.detailShareText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.detailClose} onPress={() => setSelected(null)}>
                  <Text style={styles.detailCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <BattleModal
        visible={battleVisible}
        onClose={() => setBattleVisible(false)}
        collection={collection}
        record={record}
        recordBattle={recordBattle}
        onDuelWin={onDuelWin}
      />

      {/* Offscreen Skia card for PNG export */}
      {shareFichka && (
        <View style={styles.offscreen} pointerEvents="none">
          <FichkaShareCard canvasRef={canvasRef} fichka={shareFichka} />
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFD8DF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: hp('6%'),
    paddingHorizontal: wp('6%'),
    paddingBottom: hp('0.5%'),
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: wp('2%') },
  headerTitle: { fontSize: wp('6.5%'), fontWeight: 'bold', color: '#FF6E76' },
  subtitle: { fontSize: wp('3.4%'), color: '#9B7077', paddingHorizontal: wp('6%'), marginBottom: hp('1%') },
  battleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp('2%'),
    backgroundColor: '#FF6E76',
    marginHorizontal: wp('6%'),
    paddingVertical: hp('1.4%'),
    borderRadius: 18,
    marginBottom: hp('1.2%'),
    elevation: 5,
  },
  battleButtonDisabled: { backgroundColor: '#E7AEB5' },
  battleButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: wp('4.2%') },
  filterRow: { maxHeight: hp('5.5%'), flexGrow: 0 },
  filterContent: { paddingHorizontal: wp('6%'), gap: wp('2%'), alignItems: 'center' },
  chip: {
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('0.7%'),
    borderRadius: 13,
    backgroundColor: '#FFF3F6',
    borderWidth: 1,
    borderColor: '#FFE4E8',
  },
  chipActive: { backgroundColor: '#FF6E76', borderColor: '#FF6E76' },
  chipText: { fontSize: wp('3.2%'), fontWeight: '700', color: '#FF6E76' },
  chipTextActive: { color: '#FFFFFF' },
  gridContent: { paddingHorizontal: wp('4%'), paddingTop: hp('1%'), paddingBottom: hp('5%') },
  gridRow: { justifyContent: 'flex-start', gap: wp('3.5%') },
  cell: {
    width: wp('28%'),
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    padding: wp('2%'),
    marginBottom: hp('1.5%'),
    alignItems: 'center',
    overflow: 'hidden',
  },
  holoStripe: {
    position: 'absolute',
    top: -wp('10%'),
    left: -wp('10%'),
    width: wp('20%'),
    height: wp('60%'),
    backgroundColor: 'rgba(168,85,247,0.14)',
    transform: [{ rotate: '25deg' }],
  },
  cellGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '38%', backgroundColor: 'rgba(255,255,255,0.28)' },
  cellMedallion: {
    width: wp('15%'),
    height: wp('15%'),
    borderRadius: wp('7.5%'),
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cellMedallionGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.35)' },
  cellImage: { width: wp('14%'), height: wp('14%'), borderRadius: wp('7%'), backgroundColor: '#FFE4E8' },
  cellInitial: { color: '#FFFFFF', fontWeight: 'bold', fontSize: wp('6%') },
  cellSymbol: { fontSize: wp('3.2%'), fontWeight: 'bold', color: '#2B1D27', marginTop: hp('0.6%') },
  cellRarity: { fontSize: wp('2.7%'), fontWeight: '700', marginTop: 1 },
  holoIcon: { position: 'absolute', top: wp('1.5%'), right: wp('1.5%') },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: wp('10%') },
  centerText: { fontSize: wp('3.8%'), color: '#9B7077', marginTop: hp('1.5%'), textAlign: 'center' },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43,29,39,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp('8%'),
  },
  detailWrap: {
    alignItems: 'center',
  },
  detailCard: {
    backgroundColor: '#FFF3F6',
    borderRadius: 24,
    borderWidth: 3,
    padding: wp('6%'),
    alignItems: 'center',
    width: '100%',
  },
  detailMedallion: {
    width: wp('26%'),
    height: wp('26%'),
    borderRadius: wp('13%'),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  detailImage: { width: wp('26%'), height: wp('26%') },
  detailInitial: { color: '#FFFFFF', fontSize: wp('12%'), fontWeight: 'bold' },
  detailSymbol: { fontSize: wp('6%'), fontWeight: 'bold', color: '#2B1D27', marginTop: hp('1.5%') },
  detailName: { fontSize: wp('3.6%'), color: '#9B7077', marginTop: hp('0.3%') },
  detailRarity: { fontSize: wp('4.2%'), fontWeight: '700', marginTop: hp('0.8%') },
  detailStat: { fontSize: wp('3.6%'), color: '#2B1D27', marginTop: hp('0.4%') },
  detailButtons: { flexDirection: 'row', gap: wp('3%'), marginTop: hp('2.5%') },
  detailShare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
    backgroundColor: '#FF6E76',
    paddingHorizontal: wp('7%'),
    paddingVertical: hp('1.3%'),
    borderRadius: 18,
  },
  detailShareText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: wp('4%') },
  detailClose: {
    paddingHorizontal: wp('6%'),
    paddingVertical: hp('1.3%'),
    borderRadius: 18,
    backgroundColor: '#FFE4E8',
  },
  detailCloseText: { color: '#FF6E76', fontWeight: 'bold', fontSize: wp('4%') },
  offscreen: { position: 'absolute', left: -10000, top: 0, width: 320, height: 430 },
});
