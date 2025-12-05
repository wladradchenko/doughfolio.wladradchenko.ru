import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import type { MissionState } from '../hooks/useGamification';

type WalletProps = {
  balance: number;
  invested: number;
  lastImpact: number;
};

type Holding = {
  name: string;
  symbol: string;
  percentage: number;
  color: string;
};

type Props = {
  missions: MissionState[];
  flavors: string[];
  expanded: boolean;
  onToggle: () => void;
  onReset: () => void;
  totalMixes: number;
  dailyMixes: number;
  wallet: WalletProps;
  level: number;
  xp: number;
  streakCount: number;
  onBoost: () => void;
  lastPortfolio: Holding[];
};

const MissionRow = ({ mission }: { mission: MissionState }) => {
  const progressWidth = `${(mission.progress / mission.goal) * 100}%`;
  return (
    <View style={styles.missionRow}>
      <View style={styles.missionHeader}>
        <Text style={styles.missionTitle}>{mission.title}</Text>
        {mission.completed && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>DONE</Text>
          </View>
        )}
      </View>
      <Text style={styles.missionDescription}>{mission.description}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <View style={styles.progressFooter}>
        <Text style={styles.progressText}>
          {mission.progress} / {mission.goal}
        </Text>
        <Text style={styles.rewardText}>{mission.reward}</Text>
      </View>
    </View>
  );
};

const WalletCard = ({ wallet, level, xp, streak, onBoost }: { wallet: WalletProps; level: number; xp: number; streak: number; onBoost: () => void }) => {
  const impactPositive = wallet.lastImpact >= 0;
  return (
    <View style={styles.walletCard}>
      <View style={styles.walletHeader}>
        <View>
          <Text style={styles.walletLabel}>Donut Wallet</Text>
          <Text style={styles.walletBalance}>${wallet.balance.toLocaleString()}</Text>
        </View>
        <View style={styles.levelPill}>
          <Text style={styles.levelText}>Lv. {level}</Text>
          <Text style={styles.levelSub}>{Math.floor(xp)} XP</Text>
        </View>
      </View>
      <View style={styles.walletStats}>
        <View>
          <Text style={styles.statLabel}>Invested today</Text>
          <Text style={styles.statValue}>${wallet.invested.toLocaleString()}</Text>
        </View>
        <View>
          <Text style={styles.statLabel}>Last impact</Text>
          <Text style={[styles.statValue, impactPositive ? styles.positive : styles.negative]}>
            {impactPositive ? '+' : ''}
            ${wallet.lastImpact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={styles.statValue}>{streak}d</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.boostButton} onPress={onBoost}>
        <MaterialIcons name="bolt" color="#2B1D27" size={wp('4.5%')} />
        <Text style={styles.boostText}>Boost wallet +$250</Text>
      </TouchableOpacity>
    </View>
  );
};

const LatestBake = ({ portfolio }: { portfolio: Holding[] }) => {
  if (!portfolio.length) {
    return (
      <View style={styles.latestCard}>
        <Text style={styles.sectionTitle}>Latest Bake</Text>
        <Text style={styles.placeholder}>Mix the dough to track your tastiest picks.</Text>
      </View>
    );
  }

  return (
    <View style={styles.latestCard}>
      <Text style={styles.sectionTitle}>Latest Bake</Text>
      {portfolio.map(holding => (
        <View key={holding.symbol} style={styles.holdingRow}>
          <View style={[styles.colorDot, { backgroundColor: holding.color }]} />
          <Text style={styles.holdingName}>
            {holding.name} ({holding.symbol?.toUpperCase()})
          </Text>
          <Text style={styles.holdingPercent}>{holding.percentage}%</Text>
        </View>
      ))}
    </View>
  );
};

export const GamificationPanel = ({
  missions,
  flavors,
  expanded,
  onToggle,
  onReset,
  totalMixes,
  dailyMixes,
  wallet,
  level,
  xp,
  streakCount,
  onBoost,
  lastPortfolio,
}: Props) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Arcade Oven</Text>
          <Text style={styles.headerSubtitle}>
            {dailyMixes} daily mixes · {totalMixes} lifetime
          </Text>
        </View>
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={wp('6%')} color="#FF6E76" />
      </TouchableOpacity>
      {expanded && (
        <>
          <WalletCard wallet={wallet} level={level} xp={xp} streak={streakCount} onBoost={onBoost} />

          <LatestBake portfolio={lastPortfolio} />

          <View>
            {missions.map(mission => (
              <MissionRow mission={mission} key={mission.id} />
            ))}
          </View>

          <View style={styles.flavorSection}>
            <View style={styles.flavorHeader}>
              <Text style={styles.sectionTitle}>Unlocked Flavors</Text>
              <Text style={styles.sectionSubtitle}>{flavors.length}/30</Text>
            </View>
            <View style={styles.flavorGrid}>
              {flavors.length === 0 && <Text style={styles.placeholder}>Mix to discover new donut flavors!</Text>}
              {flavors.map(flavor => (
                <View style={styles.flavorPill} key={flavor}>
                  <Text style={styles.flavorText}>{flavor}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={onReset}>
            <MaterialIcons name="restart-alt" color="#FF6E76" size={wp('4.5%')} />
            <Text style={styles.resetText}>Reset arcade progress</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    backgroundColor: '#FFF3F6',
    borderRadius: 24,
    padding: hp('2%'),
    marginVertical: hp('2%'),
    shadowColor: '#9B8084',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: wp('4.5%'),
    fontWeight: '700',
    color: '#2B1D27',
  },
  headerSubtitle: {
    fontSize: wp('3.3%'),
    color: '#7A5B64',
    marginTop: 4,
  },
  missionRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: hp('1.8%'),
    marginTop: hp('1.2%'),
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  missionTitle: {
    fontSize: wp('3.9%'),
    fontWeight: '600',
    color: '#2B1D27',
  },
  missionDescription: {
    fontSize: wp('3.3%'),
    color: '#7A5B64',
    marginTop: 4,
  },
  progressBar: {
    height: hp('1%'),
    backgroundColor: '#F2CBD4',
    borderRadius: 999,
    marginTop: hp('1.2%'),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6E76',
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp('0.8%'),
    alignItems: 'center',
  },
  progressText: {
    fontSize: wp('3.3%'),
    color: '#2B1D27',
    fontWeight: '600',
  },
  rewardText: {
    fontSize: wp('3.1%'),
    color: '#FF6E76',
  },
  badge: {
    backgroundColor: '#FFE4E8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: wp('3%'),
    color: '#FF6E76',
    fontWeight: '700',
  },
  flavorSection: {
    marginTop: hp('2%'),
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: hp('1.5%'),
  },
  flavorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1%'),
  },
  sectionTitle: {
    fontSize: wp('3.9%'),
    fontWeight: '600',
    color: '#2B1D27',
  },
  sectionSubtitle: {
    fontSize: wp('3.3%'),
    color: '#7A5B64',
  },
  flavorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flavorPill: {
    backgroundColor: '#FFE0E6',
    borderRadius: 999,
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.5%'),
  },
  flavorText: {
    fontSize: wp('3.1%'),
    color: '#2B1D27',
    fontWeight: '600',
  },
  placeholder: {
    fontSize: wp('3.3%'),
    color: '#7A5B64',
  },
  resetButton: {
    marginTop: hp('1.5%'),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resetText: {
    fontSize: wp('3.2%'),
    color: '#FF6E76',
    fontWeight: '600',
  },
  walletCard: {
    marginTop: hp('1.5%'),
    backgroundColor: '#2B1D27',
    borderRadius: 20,
    padding: hp('2%'),
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: {
    color: '#FFE0E6',
    fontSize: wp('3.6%'),
    fontWeight: '600',
  },
  walletBalance: {
    color: '#FFFFFF',
    fontSize: wp('6%'),
    fontWeight: '700',
  },
  levelPill: {
    backgroundColor: '#FFE0E6',
    borderRadius: 12,
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.5%'),
    alignItems: 'flex-end',
  },
  levelText: {
    fontSize: wp('3.5%'),
    color: '#2B1D27',
    fontWeight: '700',
  },
  levelSub: {
    fontSize: wp('2.8%'),
    color: '#2B1D27',
  },
  walletStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp('1.5%'),
  },
  statLabel: {
    color: '#FFE0E6',
    fontSize: wp('3%'),
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: wp('4%'),
    fontWeight: '600',
  },
  positive: {
    color: '#58F5A6',
  },
  negative: {
    color: '#FF8B8B',
  },
  boostButton: {
    marginTop: hp('1.4%'),
    backgroundColor: '#FFE269',
    borderRadius: 14,
    paddingVertical: hp('1%'),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  boostText: {
    fontSize: wp('3.5%'),
    color: '#2B1D27',
    fontWeight: '700',
  },
  latestCard: {
    marginTop: hp('1.5%'),
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: hp('1.8%'),
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp('0.6%'),
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginRight: 8,
  },
  holdingName: {
    flex: 1,
    fontSize: wp('3.5%'),
    color: '#2B1D27',
    marginLeft: 8,
  },
  holdingPercent: {
    fontSize: wp('3.5%'),
    fontWeight: '700',
    color: '#FF6E76',
  },
});

