import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import type { WatchedCoin } from '../hooks/useAlerts';
import type { DiscoveryCoin } from '../api/discovery';

type Props = {
  visible: boolean;
  onClose: () => void;
  dailyReminderEnabled: boolean;
  dailyHour: number;
  dailyMinute: number;
  moveThreshold: number;
  watchlist: WatchedCoin[];
  onSetDailyReminder: (enabled: boolean, hour?: number, minute?: number) => Promise<boolean> | boolean;
  onSetMoveThreshold: (percent: number) => void;
  onToggleWatch: (coin: DiscoveryCoin) => void;
};

const TIME_PRESETS = [
  { label: '08:00', hour: 8 },
  { label: '09:00', hour: 9 },
  { label: '12:00', hour: 12 },
  { label: '18:00', hour: 18 },
  { label: '21:00', hour: 21 },
];

const THRESHOLD_PRESETS = [5, 10, 20, 50];

export const AlertsModal = ({
  visible,
  onClose,
  dailyReminderEnabled,
  dailyHour,
  moveThreshold,
  watchlist,
  onSetDailyReminder,
  onSetMoveThreshold,
  onToggleWatch,
}: Props) => {
  const handleToggleDaily = async (value: boolean) => {
    const ok = await onSetDailyReminder(value, dailyHour, 0);
    if (value && !ok) {
      Alert.alert(
        'Notifications off',
        'Enable notifications for Doughfolio in your system settings to get the daily reminder.',
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar hidden={Platform.OS === 'android'} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <MaterialIcons name="notifications-none" size={wp('6.5%')} color="#FF6E76" />
            <Text style={styles.headerTitle}>Alerts</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="close" size={wp('7%')} color="#FF6E76" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Daily reminder */}
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={styles.flex1}>
                <Text style={styles.sectionTitle}>Daily fresh-batch reminder</Text>
                <Text style={styles.sectionDesc}>A gentle nudge to check today’s new coins.</Text>
              </View>
              <Switch
                value={dailyReminderEnabled}
                onValueChange={handleToggleDaily}
                trackColor={{ false: '#E7C9CF', true: '#FF6E76' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {dailyReminderEnabled && (
              <View style={styles.chipsRow}>
                {TIME_PRESETS.map(preset => (
                  <TouchableOpacity
                    key={preset.hour}
                    style={[styles.chip, dailyHour === preset.hour && styles.chipActive]}
                    onPress={() => onSetDailyReminder(true, preset.hour, 0)}
                  >
                    <Text style={[styles.chipText, dailyHour === preset.hour && styles.chipTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Move threshold */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alert me on a 24h move of</Text>
            <Text style={styles.sectionDesc}>
              Watchlist coins that move at least this much in 24h ping you (checked while the app is open).
            </Text>
            <View style={styles.chipsRow}>
              {THRESHOLD_PRESETS.map(percent => (
                <TouchableOpacity
                  key={percent}
                  style={[styles.chip, moveThreshold === percent && styles.chipActive]}
                  onPress={() => onSetMoveThreshold(percent)}
                >
                  <Text style={[styles.chipText, moveThreshold === percent && styles.chipTextActive]}>
                    ±{percent}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Watchlist */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Watchlist ({watchlist.length})</Text>
            {watchlist.length === 0 ? (
              <Text style={styles.sectionDesc}>
                Tap the ★ on any coin in Fresh Batch to watch it here.
              </Text>
            ) : (
              watchlist.map(coin => (
                <View key={coin.key} style={styles.watchRow}>
                  <View style={styles.flex1}>
                    <Text style={styles.watchSymbol}>{coin.symbol}</Text>
                    <Text style={styles.watchName} numberOfLines={1}>
                      {coin.coingeckoId ? coin.name : `${coin.name} · price alerts n/a (on-chain)`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      onToggleWatch({
                        key: coin.key,
                        name: coin.name,
                        symbol: coin.symbol,
                        url: coin.url,
                        coingeckoId: coin.coingeckoId,
                        network: coin.network,
                        image: coin.image,
                        source: 'gecko-new',
                      })
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="star" size={wp('6%')} color="#FFB300" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <Text style={styles.footnote}>
            Notifications are local and best-effort — Android may delay them to save battery. No account or
            server involved.
          </Text>
        </ScrollView>
      </View>
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
    paddingBottom: hp('1.5%'),
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: wp('2%') },
  headerTitle: { fontSize: wp('6.5%'), fontWeight: 'bold', color: '#FF6E76' },
  content: { paddingHorizontal: wp('6%'), paddingBottom: hp('6%') },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: wp('4.5%'),
    marginBottom: hp('1.8%'),
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex1: { flex: 1, paddingRight: wp('3%') },
  sectionTitle: { fontSize: wp('4.2%'), fontWeight: 'bold', color: '#2B1D27' },
  sectionDesc: { fontSize: wp('3.3%'), color: '#9B7077', marginTop: hp('0.4%') },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: hp('1.5%'), gap: wp('2%') },
  chip: {
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('0.9%'),
    borderRadius: 14,
    backgroundColor: '#FFF3F6',
    borderWidth: 1,
    borderColor: '#FFE4E8',
  },
  chipActive: { backgroundColor: '#FF6E76', borderColor: '#FF6E76' },
  chipText: { fontSize: wp('3.6%'), fontWeight: '700', color: '#FF6E76' },
  chipTextActive: { color: '#FFFFFF' },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp('1.2%'),
    borderTopWidth: 1,
    borderTopColor: '#FFF3F6',
  },
  watchSymbol: { fontSize: wp('4%'), fontWeight: 'bold', color: '#2B1D27' },
  watchName: { fontSize: wp('3.2%'), color: '#9B7077', marginTop: hp('0.2%') },
  footnote: {
    fontSize: wp('3%'),
    color: '#B79AA0',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: hp('1%'),
  },
});
