import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Share,
  Alert,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { RARITY_COLORS, RarityTier } from '../utils/rarity';
import {
  encodeChallenge,
  decodeChallenge,
  resolveBattle,
  makeSeed,
  Challenge,
  BattleResult,
  BattleFichka,
  DECK_SIZE,
} from '../utils/battle';
import { CollectedFichka, BattleRecord, toBattleFichka } from '../hooks/useCoinDex';

type Mode = 'menu' | 'create' | 'accept' | 'result';

type Props = {
  visible: boolean;
  onClose: () => void;
  collection: CollectedFichka[];
  record: BattleRecord;
  recordBattle: (didWin: boolean) => void;
  onDuelWin?: () => void;
};

export const BattleModal = ({ visible, onClose, collection, record, recordBattle, onDuelWin }: Props) => {
  const [mode, setMode] = useState<Mode>('menu');
  const [picks, setPicks] = useState<string[]>([]); // selected card keys
  const [code, setCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [opponent, setOpponent] = useState<Challenge | null>(null);
  const [result, setResult] = useState<BattleResult | null>(null);

  const reset = () => {
    setMode('menu');
    setPicks([]);
    setCode(null);
    setCodeInput('');
    setOpponent(null);
    setResult(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const togglePick = (key: string) => {
    setPicks(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= DECK_SIZE) return prev;
      return [...prev, key];
    });
  };

  const myDeck = (): BattleFichka[] =>
    picks
      .map(k => collection.find(f => f.key === k))
      .filter((f): f is CollectedFichka => f != null)
      .map(toBattleFichka);

  const handleGenerate = () => {
    const deck = myDeck();
    const seed = makeSeed(deck, Math.floor(Math.random() * 1_000_000_000));
    setCode(encodeChallenge({ seed, deck }));
  };

  const handleShareCode = async () => {
    if (!code) return;
    await Share.share({
      message:
        `🍩 I challenge you to a Doughfolio duel!\n\n` +
        `Open Doughfolio → Discover → Coin-Dex → "Duel a friend" → Accept, and paste this code:\n\n${code}\n\n` +
        `Get Doughfolio on Google Play.`,
    });
  };

  const handleLoadCode = () => {
    const decoded = decodeChallenge(codeInput);
    if (!decoded) {
      Alert.alert('Invalid code', 'That challenge code could not be read. Check it and try again.');
      return;
    }
    setOpponent(decoded);
    setPicks([]);
  };

  const handleBattle = () => {
    if (!opponent) return;
    const res = resolveBattle(opponent.deck, myDeck(), opponent.seed);
    setResult(res);
    const iWon = res.winner === 'accepter';
    recordBattle(iWon);
    if (iWon) onDuelWin?.();
    setMode('result');
  };

  const renderPickItem = ({ item }: { item: CollectedFichka }) => {
    const sel = picks.includes(item.key);
    const color = RARITY_COLORS[item.rarity];
    return (
      <TouchableOpacity
        style={[styles.pickCell, { borderColor: sel ? '#FF6E76' : color }, sel && styles.pickCellSel]}
        onPress={() => togglePick(item.key)}
      >
        <View style={[styles.pickMedallion, { backgroundColor: color }]}>
          <Text style={styles.pickInitial}>{item.symbol.slice(0, 1)}</Text>
        </View>
        <Text style={styles.pickSym} numberOfLines={1}>{item.symbol}</Text>
        {sel && <MaterialIcons name="check-circle" size={wp('4.5%')} color="#FF6E76" style={styles.pickCheck} />}
      </TouchableOpacity>
    );
  };

  // The card picker is its OWN scroll container (FlatList) — never nested in a
  // ScrollView — to avoid the VirtualizedList nesting warning / broken windowing.
  const renderPickerList = (
    header: React.ReactNode,
    confirmLabel: string,
    onConfirm: () => void,
    confirmEnabled: boolean,
  ) => (
    <FlatList
      data={collection}
      keyExtractor={f => f.key}
      numColumns={4}
      columnWrapperStyle={styles.pickRow}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      renderItem={renderPickItem}
      ListHeaderComponent={
        <View>
          {header}
          <Text style={styles.sectionLabel}>Pick your team ({picks.length}/{DECK_SIZE})</Text>
        </View>
      }
      ListFooterComponent={
        <TouchableOpacity
          style={[styles.primaryButton, !confirmEnabled && styles.primaryButtonDisabled]}
          disabled={!confirmEnabled}
          onPress={onConfirm}
        >
          <Text style={styles.primaryButtonText}>{confirmLabel}</Text>
        </TouchableOpacity>
      }
    />
  );

  const oppFichkaRow = (deck: BattleFichka[], label: string) => (
    <View style={styles.deckPreview}>
      <Text style={styles.deckLabel}>{label}</Text>
      <View style={styles.deckRow}>
        {deck.map((f, i) => (
          <View key={i} style={[styles.deckChip, { borderColor: RARITY_COLORS[f.rarity as RarityTier] }]}>
            <Text style={styles.deckChipSym}>{f.sym}</Text>
            {f.holo && <MaterialIcons name="auto-awesome" size={wp('3%')} color="#A855F7" />}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={close}>
      <StatusBar hidden={Platform.OS === 'android'} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            {mode !== 'menu' && (
              <TouchableOpacity onPress={reset} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialIcons name="arrow-back" size={wp('6.5%')} color="#FF6E76" />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>Duel</Text>
          </View>
          <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="close" size={wp('7%')} color="#FF6E76" />
          </TouchableOpacity>
        </View>

        {mode === 'create' && code == null ? (
          renderPickerList(null, 'Generate challenge', handleGenerate, picks.length === DECK_SIZE)
        ) : mode === 'accept' && opponent != null ? (
          renderPickerList(
            oppFichkaRow(opponent.deck, 'Opponent’s team'),
            'Battle!',
            handleBattle,
            picks.length === DECK_SIZE,
          )
        ) : (
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {mode === 'menu' && (
              <>
                <Text style={styles.record}>Record: {record.wins}W – {record.losses}L · best streak {record.bestStreak}</Text>
                <Text style={styles.hint}>Rarer & holo cards hit harder — just like the prized ones.</Text>
                <TouchableOpacity style={styles.bigButton} onPress={() => setMode('create')}>
                  <MaterialIcons name="send" size={wp('6%')} color="#FFFFFF" />
                  <Text style={styles.bigButtonText}>Create a challenge</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.bigButton, styles.bigButtonAlt]} onPress={() => setMode('accept')}>
                  <MaterialIcons name="login" size={wp('6%')} color="#FF6E76" />
                  <Text style={[styles.bigButtonText, { color: '#FF6E76' }]}>Accept a code</Text>
                </TouchableOpacity>
              </>
            )}

            {mode === 'create' && code != null && (
              <View style={styles.codeBox}>
                <Text style={styles.sectionLabel}>Your challenge code</Text>
                <Text style={styles.codeText} selectable>{code}</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={handleShareCode}>
                  <Text style={styles.primaryButtonText}>Share challenge</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={async () => { await Clipboard.setStringAsync(code); Alert.alert('Copied', 'Challenge code copied.'); }}
                >
                  <Text style={styles.secondaryButtonText}>Copy code</Text>
                </TouchableOpacity>
                <Text style={styles.hint}>Send it to a friend — they paste it under “Accept a code”.</Text>
              </View>
            )}

            {mode === 'accept' && opponent == null && (
              <View>
                <Text style={styles.sectionLabel}>Paste your friend’s code</Text>
                <TextInput
                  style={styles.input}
                  value={codeInput}
                  onChangeText={setCodeInput}
                  placeholder="Paste challenge code…"
                  placeholderTextColor="#C9A9AE"
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.primaryButton, !codeInput.trim() && styles.primaryButtonDisabled]}
                  disabled={!codeInput.trim()}
                  onPress={handleLoadCode}
                >
                  <Text style={styles.primaryButtonText}>Load challenge</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'result' && result && (
              <View style={styles.resultBox}>
                <Text style={[styles.resultBanner, { color: result.winner === 'accepter' ? '#2BB673' : '#E5484D' }]}>
                  {result.winner === 'accepter' ? '🏆 You win!' : 'You lost'}
                </Text>
                {result.rounds.map((r, i) => (
                  <View key={i} style={styles.roundRow}>
                    <Text style={styles.roundLabel}>Round {i + 1}</Text>
                    <Text style={styles.roundScore}>
                      You {r.accepterPower} — {r.challengerPower} Opp
                    </Text>
                    <MaterialIcons
                      name={r.winner === 'accepter' ? 'check-circle' : 'cancel'}
                      size={wp('5%')}
                      color={r.winner === 'accepter' ? '#2BB673' : '#E5484D'}
                    />
                  </View>
                ))}
                <TouchableOpacity style={styles.primaryButton} onPress={reset}>
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
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
    paddingBottom: hp('1%'),
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: wp('3%') },
  headerTitle: { fontSize: wp('6.5%'), fontWeight: 'bold', color: '#FF6E76' },
  body: { paddingHorizontal: wp('6%'), paddingBottom: hp('5%') },
  record: { fontSize: wp('4%'), fontWeight: '700', color: '#2B1D27', textAlign: 'center', marginTop: hp('2%') },
  hint: { fontSize: wp('3.3%'), color: '#9B7077', textAlign: 'center', marginVertical: hp('1.5%') },
  bigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp('2.5%'),
    backgroundColor: '#FF6E76',
    paddingVertical: hp('2%'),
    borderRadius: 20,
    marginTop: hp('1.5%'),
    elevation: 5,
  },
  bigButtonAlt: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#FF6E76' },
  bigButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: wp('4.4%') },
  sectionLabel: { fontSize: wp('4%'), fontWeight: 'bold', color: '#2B1D27', marginTop: hp('1.5%'), marginBottom: hp('1%') },
  pickContent: { paddingBottom: hp('1%') },
  pickRow: { justifyContent: 'space-between', marginBottom: hp('1.2%') },
  pickCell: {
    width: wp('19%'),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: hp('1%'),
    alignItems: 'center',
  },
  pickCellSel: { backgroundColor: '#FFE4E8' },
  pickMedallion: { width: wp('9%'), height: wp('9%'), borderRadius: wp('4.5%'), alignItems: 'center', justifyContent: 'center' },
  pickInitial: { color: '#FFFFFF', fontWeight: 'bold', fontSize: wp('4.2%') },
  pickSym: { fontSize: wp('2.8%'), fontWeight: 'bold', color: '#2B1D27', marginTop: 2 },
  pickCheck: { position: 'absolute', top: 2, right: 2 },
  primaryButton: {
    backgroundColor: '#FF6E76',
    paddingVertical: hp('1.7%'),
    borderRadius: 18,
    alignItems: 'center',
    marginTop: hp('1.5%'),
    elevation: 4,
  },
  primaryButtonDisabled: { backgroundColor: '#E7AEB5' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: wp('4.2%') },
  secondaryButton: {
    backgroundColor: '#FFE4E8',
    paddingVertical: hp('1.5%'),
    borderRadius: 18,
    alignItems: 'center',
    marginTop: hp('1%'),
  },
  secondaryButtonText: { color: '#FF6E76', fontWeight: 'bold', fontSize: wp('4%') },
  codeBox: { marginTop: hp('1%') },
  codeText: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: wp('4%'),
    color: '#2B1D27',
    fontSize: wp('3.2%'),
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: wp('4%'),
    minHeight: hp('10%'),
    color: '#2B1D27',
    fontSize: wp('3.4%'),
    textAlignVertical: 'top',
  },
  deckPreview: { marginTop: hp('1.5%') },
  deckLabel: { fontSize: wp('3.6%'), fontWeight: 'bold', color: '#9B7077', marginBottom: hp('0.8%') },
  deckRow: { flexDirection: 'row', gap: wp('2%') },
  deckChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.8%'),
  },
  deckChipSym: { fontWeight: 'bold', color: '#2B1D27', fontSize: wp('3.4%') },
  resultBox: { alignItems: 'center', marginTop: hp('2%') },
  resultBanner: { fontSize: wp('7%'), fontWeight: 'bold', marginBottom: hp('2%') },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.3%'),
    marginBottom: hp('1%'),
  },
  roundLabel: { fontSize: wp('3.6%'), fontWeight: 'bold', color: '#9B7077' },
  roundScore: { fontSize: wp('3.8%'), fontWeight: '700', color: '#2B1D27' },
});
