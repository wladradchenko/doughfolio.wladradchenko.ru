import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import {
  fetchNewLaunches,
  fetchTrending,
  formatAge,
  DiscoveryCoin,
} from '../api/discovery';
import { computeSafetyScore, SAFETY_DISCLAIMER } from '../utils/safetyScore';
import { RARITY_COLORS, RARITY_LABELS } from '../utils/rarity';
import { useCoinDex } from '../hooks/useCoinDex';
import { CoinDetailsModal } from './CoinDetailsModal';
import { CoinDexModal } from './CoinDexModal';
import { CollectReward, RewardInfo } from './CollectReward';
import { RadarView } from './RadarView';

type Tab = 'new' | 'trending' | 'radar';

type Props = {
  visible: boolean;
  onClose: () => void;
  isWatched?: (coin: DiscoveryCoin) => boolean;
  onToggleWatch?: (coin: DiscoveryCoin) => void;
  onCollectNew?: () => void;
  onDuelWin?: () => void;
  onWildCatch?: () => void;
};

const formatCompact = (n?: number): string => {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
};

const formatPrice = (n?: number): string => {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n < 0.000001) return `$${n.toExponential(2)}`;
  if (n < 1) return `$${n.toPrecision(3)}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

export const DiscoveryModal = ({ visible, onClose, isWatched, onToggleWatch, onCollectNew, onDuelWin, onWildCatch }: Props) => {
  const [tab, setTab] = useState<Tab>('new');
  const [newCoins, setNewCoins] = useState<DiscoveryCoin[]>([]);
  const [trendingCoins, setTrendingCoins] = useState<DiscoveryCoin[]>([]);
  const [loadingNew, setLoadingNew] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detailCoin, setDetailCoin] = useState<DiscoveryCoin | null>(null);
  const [reward, setReward] = useState<RewardInfo | null>(null);
  const [coinDexVisible, setCoinDexVisible] = useState(false);

  const { collection, stats, record, collect, isCollected, recordBattle } = useCoinDex();

  const loadNew = useCallback(async () => {
    setLoadingNew(true);
    try {
      const coins = await fetchNewLaunches();
      setNewCoins(coins);
    } finally {
      setLoadingNew(false);
    }
  }, []);

  const loadTrending = useCallback(async () => {
    setLoadingTrending(true);
    try {
      const coins = await fetchTrending();
      setTrendingCoins(coins);
    } finally {
      setLoadingTrending(false);
    }
  }, []);

  // Load the active tab's data when the modal opens or the tab changes.
  useEffect(() => {
    if (!visible) return;
    if (tab === 'new' && newCoins.length === 0) loadNew();
    if (tab === 'trending' && trendingCoins.length === 0) loadTrending();
    // Radar needs a coin pool to assign to spawns — load both feeds if empty.
    if (tab === 'radar' && newCoins.length === 0 && trendingCoins.length === 0) {
      loadNew();
      loadTrending();
    }
  }, [visible, tab, newCoins.length, trendingCoins.length, loadNew, loadTrending]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === 'new') {
        const coins = await fetchNewLaunches();
        setNewCoins(coins);
      } else {
        const coins = await fetchTrending();
        setTrendingCoins(coins);
      }
    } finally {
      setRefreshing(false);
    }
  }, [tab]);

  const handlePressCoin = useCallback(
    (coin: DiscoveryCoin) => {
      // Collecting on first encounter — like a Pokédex "seen".
      const { isNew, fichka } = collect(coin);
      if (isNew) {
        setReward({
          symbol: fichka.symbol,
          rarityLabel: RARITY_LABELS[fichka.rarity],
          rarityColor: RARITY_COLORS[fichka.rarity],
          holo: fichka.holo,
        });
        onCollectNew?.();
      }
      if (coin.coingeckoId) {
        setDetailCoin(coin);
      } else {
        Linking.openURL(coin.url).catch(() => {});
      }
    },
    [collect, onCollectNew],
  );

  // Radar catch: collect as "wild", show reward for a new card, count missions.
  const handleWildCatch = useCallback(
    (coin: DiscoveryCoin) => {
      const { isNew, fichka } = collect(coin, { wild: true });
      if (isNew) {
        setReward({
          symbol: fichka.symbol,
          rarityLabel: RARITY_LABELS[fichka.rarity],
          rarityColor: RARITY_COLORS[fichka.rarity],
          holo: fichka.holo,
        });
        onCollectNew?.();
      }
      onWildCatch?.();
    },
    [collect, onCollectNew, onWildCatch],
  );

  const activeData = tab === 'new' ? newCoins : trendingCoins;
  const activeLoading = tab === 'new' ? loadingNew : loadingTrending;

  const renderCoin = ({ item }: { item: DiscoveryCoin }) => {
    const safety = computeSafetyScore(item);
    const change = item.priceChange24h;
    const changeColor = change == null ? '#888' : change >= 0 ? '#2BB673' : '#E5484D';
    const watched = isWatched ? isWatched(item) : false;
    const collected = isCollected(item.key);

    return (
      <TouchableOpacity style={styles.card} onPress={() => handlePressCoin(item)} activeOpacity={0.8}>
        <View style={styles.cardTop}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.coinImage} />
          ) : (
            <View style={[styles.coinImage, styles.coinImageFallback]}>
              <Text style={styles.coinImageFallbackText}>{item.symbol.slice(0, 1)}</Text>
            </View>
          )}

          <View style={styles.cardTitleBlock}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.coinSymbol} numberOfLines={1}>{item.symbol}</Text>
              {collected ? (
                <MaterialIcons name="check-circle" size={wp('3.8%')} color="#2BB673" style={{ marginLeft: wp('1.2%') }} />
              ) : null}
              {item.network ? <Text style={styles.networkBadge}>{item.network}</Text> : null}
              {tab === 'new' && item.ageHours != null ? (
                <View style={styles.ageBadge}>
                  <MaterialIcons name="schedule" size={wp('3.2%')} color="#9B7077" />
                  <Text style={styles.ageBadgeText}>{formatAge(item.ageHours)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.coinName} numberOfLines={1}>{item.name}</Text>
          </View>

          {/* Donut Safety Score ring */}
          <View style={[styles.safetyRing, { borderColor: safety.color }]}>
            <Text style={[styles.safetyScore, { color: safety.color }]}>{safety.score}</Text>
          </View>

          {onToggleWatch ? (
            <TouchableOpacity
              onPress={() => onToggleWatch(item)}
              style={styles.starButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons
                name={watched ? 'star' : 'star-border'}
                size={wp('6%')}
                color={watched ? '#FFB300' : '#C9A9AE'}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Price</Text>
            <Text style={styles.metricValue}>{formatPrice(item.priceUsd)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>24h</Text>
            <Text style={[styles.metricValue, { color: changeColor }]}>
              {change == null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Liquidity</Text>
            <Text style={styles.metricValue}>{formatCompact(item.liquidityUsd)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Vol 24h</Text>
            <Text style={styles.metricValue}>{formatCompact(item.volume24hUsd)}</Text>
          </View>
        </View>

        <View style={styles.safetyFooter}>
          <Text style={[styles.safetyLabel, { color: safety.color }]}>{safety.label}</Text>
          {safety.flags.length > 0 ? (
            <Text style={styles.safetyFlags} numberOfLines={1}>· {safety.flags.join(' · ')}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden={Platform.OS === 'android'} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <View style={styles.headerTitleRow}>
              <MaterialIcons name="donut-large" size={wp('6.5%')} color="#FF6E76" />
              <Text style={styles.headerTitle}>Fresh Batch</Text>
            </View>
            <Text style={styles.headerSubtitle}>New & trending coins, baked hourly</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.dexButton} onPress={() => setCoinDexVisible(true)}>
              <MaterialIcons name="grid-view" size={wp('5.5%')} color="#FF6E76" />
              {stats.total > 0 && (
                <View style={styles.dexBadge}>
                  <Text style={styles.dexBadgeText}>{stats.total}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={wp('7%')} color="#FF6E76" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === 'new' && styles.tabActive]}
            onPress={() => setTab('new')}
          >
            <MaterialIcons name="auto-awesome" size={wp('4.6%')} color={tab === 'new' ? '#FFFFFF' : '#FF6E76'} />
            <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'trending' && styles.tabActive]}
            onPress={() => setTab('trending')}
          >
            <MaterialIcons name="local-fire-department" size={wp('4.6%')} color={tab === 'trending' ? '#FFFFFF' : '#FF6E76'} />
            <Text style={[styles.tabText, tab === 'trending' && styles.tabTextActive]}>Trending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'radar' && styles.tabActive]}
            onPress={() => setTab('radar')}
          >
            <MaterialIcons name="radar" size={wp('4.6%')} color={tab === 'radar' ? '#FFFFFF' : '#FF6E76'} />
            <Text style={[styles.tabText, tab === 'radar' && styles.tabTextActive]}>Radar</Text>
          </TouchableOpacity>
        </View>

        {tab === 'radar' ? (
          <RadarView
            active={visible}
            pool={[...newCoins, ...trendingCoins]}
            onCatch={handleWildCatch}
          />
        ) : activeLoading && activeData.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FF6E76" />
            <Text style={styles.centerText}>Sniffing out fresh coins…</Text>
          </View>
        ) : activeData.length === 0 ? (
          <View style={styles.center}>
            <MaterialIcons name="search-off" size={wp('14%')} color="#E0A9B0" />
            <Text style={styles.centerText}>Couldn’t load the batch right now.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={activeData}
            keyExtractor={(item) => item.key}
            renderItem={renderCoin}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6E76" colors={['#FF6E76']} />
            }
            ListFooterComponent={
              <Text style={styles.disclaimer}>{SAFETY_DISCLAIMER}</Text>
            }
          />
        )}
      </View>

      <CoinDetailsModal
        visible={detailCoin !== null}
        coinId={detailCoin?.coingeckoId || ''}
        coinName={detailCoin?.name || ''}
        coinSymbol={detailCoin?.symbol || ''}
        coinImage={detailCoin?.image || ''}
        onClose={() => setDetailCoin(null)}
      />

      <CoinDexModal
        visible={coinDexVisible}
        onClose={() => setCoinDexVisible(false)}
        collection={collection}
        stats={stats}
        record={record}
        recordBattle={recordBattle}
        onDuelWin={onDuelWin}
      />

      <CollectReward reward={reward} onDone={() => setReward(null)} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFD8DF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: hp('6%'),
    paddingHorizontal: wp('6%'),
    paddingBottom: hp('1.5%'),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('2%'),
  },
  headerTitle: {
    fontSize: wp('6.5%'),
    fontWeight: 'bold',
    color: '#FF6E76',
  },
  headerSubtitle: {
    fontSize: wp('3.4%'),
    color: '#9B7077',
    marginTop: hp('0.3%'),
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('3.5%'),
  },
  dexButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: wp('1.8%'),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  dexBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF6E76',
    borderRadius: 9,
    minWidth: wp('4.2%'),
    height: wp('4.2%'),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  dexBadgeText: {
    color: '#FFFFFF',
    fontSize: wp('2.5%'),
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: wp('6%'),
    backgroundColor: '#FFF3F6',
    borderRadius: 16,
    padding: wp('1%'),
    marginBottom: hp('1.5%'),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: hp('1.2%'),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp('1.5%'),
  },
  tabActive: {
    backgroundColor: '#FF6E76',
  },
  tabText: {
    fontSize: wp('3.8%'),
    fontWeight: '700',
    color: '#FF6E76',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: wp('5%'),
    paddingBottom: hp('5%'),
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: wp('4%'),
    marginBottom: hp('1.5%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinImage: {
    width: wp('11%'),
    height: wp('11%'),
    borderRadius: wp('5.5%'),
    backgroundColor: '#FFE4E8',
  },
  coinImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinImageFallbackText: {
    color: '#FF6E76',
    fontWeight: 'bold',
    fontSize: wp('5%'),
  },
  cardTitleBlock: {
    flex: 1,
    marginLeft: wp('3%'),
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  coinSymbol: {
    fontSize: wp('4.4%'),
    fontWeight: 'bold',
    color: '#2B1D27',
    maxWidth: wp('30%'),
  },
  networkBadge: {
    fontSize: wp('2.8%'),
    color: '#9B7077',
    backgroundColor: '#FFF3F6',
    paddingHorizontal: wp('1.6%'),
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: wp('1.5%'),
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: wp('1.5%'),
  },
  ageBadgeText: {
    fontSize: wp('2.9%'),
    color: '#9B7077',
    marginLeft: wp('0.5%'),
  },
  coinName: {
    fontSize: wp('3.3%'),
    color: '#9B7077',
    marginTop: hp('0.2%'),
  },
  safetyRing: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: wp('2%'),
  },
  safetyScore: {
    fontSize: wp('3.6%'),
    fontWeight: 'bold',
  },
  starButton: {
    marginLeft: wp('1.5%'),
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp('1.5%'),
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: wp('2.8%'),
    color: '#B79AA0',
  },
  metricValue: {
    fontSize: wp('3.4%'),
    fontWeight: '700',
    color: '#2B1D27',
    marginTop: hp('0.2%'),
  },
  safetyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp('1.2%'),
    flexWrap: 'nowrap',
  },
  safetyLabel: {
    fontSize: wp('3.2%'),
    fontWeight: 'bold',
  },
  safetyFlags: {
    fontSize: wp('3%'),
    color: '#9B7077',
    marginLeft: wp('1.5%'),
    flexShrink: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp('10%'),
  },
  centerEmoji: {
    fontSize: wp('12%'),
    marginBottom: hp('1.5%'),
  },
  centerText: {
    fontSize: wp('3.8%'),
    color: '#9B7077',
    marginTop: hp('1.5%'),
    textAlign: 'center',
  },
  retryButton: {
    marginTop: hp('2%'),
    backgroundColor: '#FF6E76',
    paddingHorizontal: wp('8%'),
    paddingVertical: hp('1.4%'),
    borderRadius: 20,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: wp('3.8%'),
  },
  disclaimer: {
    fontSize: wp('2.9%'),
    color: '#B79AA0',
    textAlign: 'center',
    marginTop: hp('1.5%'),
    paddingHorizontal: wp('4%'),
    fontStyle: 'italic',
  },
});
