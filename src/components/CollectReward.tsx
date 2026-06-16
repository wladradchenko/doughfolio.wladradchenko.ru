import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

export type RewardInfo = {
  symbol: string;
  rarityLabel: string;
  rarityColor: string;
  holo: boolean;
};

type Props = {
  reward: RewardInfo | null;
  onDone: () => void;
};

/**
 * Brief celebratory "New card!" reveal when a coin is collected for the first time.
 * Uses the core Animated API (like SplashScreen) — no worklet complexity.
 */
export const CollectReward = ({ reward, onDone }: Props) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!reward) return;
    opacity.setValue(0);
    scale.setValue(0.6);
    shimmer.setValue(0);

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
    );
    if (reward.holo) shimmerLoop.start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]),
      Animated.delay(1100),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      shimmerLoop.stop();
      onDone();
    });
  }, [reward, opacity, scale, shimmer, onDone]);

  if (!reward) return null;

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-wp('30%'), wp('30%')],
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.card,
          { borderColor: reward.rarityColor, opacity, transform: [{ scale }] },
        ]}
      >
        <Text style={styles.newLabel}>New card!</Text>
        <View style={[styles.coinCircle, { backgroundColor: reward.rarityColor }]}>
          <Text style={styles.coinInitial}>{reward.symbol.slice(0, 1)}</Text>
          {reward.holo && (
            <Animated.View
              style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }, { rotate: '20deg' }] }]}
            />
          )}
        </View>
        <Text style={styles.symbol}>{reward.symbol}</Text>
        <View style={styles.rarityRow}>
          <Text style={[styles.rarity, { color: reward.rarityColor }]}>{reward.rarityLabel}</Text>
          {reward.holo && (
            <View style={styles.holoBadge}>
              <MaterialIcons name="auto-awesome" size={wp('3.4%')} color="#fff" />
              <Text style={styles.holoText}>HOLO</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 3,
    paddingVertical: hp('3%'),
    paddingHorizontal: wp('10%'),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  newLabel: {
    fontSize: wp('4%'),
    fontWeight: 'bold',
    color: '#FF6E76',
    marginBottom: hp('1.5%'),
  },
  coinCircle: {
    width: wp('22%'),
    height: wp('22%'),
    borderRadius: wp('11%'),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coinInitial: {
    color: '#FFFFFF',
    fontSize: wp('10%'),
    fontWeight: 'bold',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: wp('12%'),
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  symbol: {
    fontSize: wp('6%'),
    fontWeight: 'bold',
    color: '#2B1D27',
    marginTop: hp('1.5%'),
  },
  rarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp('0.6%'),
    gap: wp('2%'),
  },
  rarity: {
    fontSize: wp('4%'),
    fontWeight: '700',
  },
  holoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A855F7',
    borderRadius: 8,
    paddingHorizontal: wp('1.6%'),
    paddingVertical: 2,
    gap: 2,
  },
  holoText: {
    color: '#FFFFFF',
    fontSize: wp('2.8%'),
    fontWeight: 'bold',
  },
});
