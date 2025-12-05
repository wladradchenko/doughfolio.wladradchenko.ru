import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { getCachedSearchResults, cacheSearchResults } from '../utils/coinCache';

interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  market_cap_rank?: number;
}

interface SelectedCoin {
  id: string;
  name: string;
  symbol: string;
  image: string;
  market_cap_rank?: number;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectCoins: (coins: SelectedCoin[]) => void;
  selectedCoins: SelectedCoin[];
};

export const CoinSearchModal = ({ visible, onClose, onSelectCoins, selectedCoins }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CoinSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [localSelected, setLocalSelected] = useState<SelectedCoin[]>(selectedCoins);

  useEffect(() => {
    setLocalSelected(selectedCoins);
  }, [selectedCoins, visible]);

  const searchCoins = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Извлекаем первые 2 буквы для кеширования
      const prefix = query.substring(0, 2).toLowerCase();
      
      // Проверяем кеш для первых 2 букв
      const cachedResults = await getCachedSearchResults(prefix);
      
      if (cachedResults && cachedResults.length > 0) {
        // Если есть кеш, фильтруем результаты локально
        const filtered = cachedResults.filter(coin => {
          const name = (coin.name || '').toLowerCase();
          const symbol = (coin.symbol || '').toLowerCase();
          const queryLower = query.toLowerCase();
          return name.includes(queryLower) || symbol.includes(queryLower);
        });
        
        setSearchResults(filtered.slice(0, 20));
        setLoading(false);
        return;
      }
      
      // Если кеша нет, делаем запрос к API
      const response = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(prefix)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.coins && Array.isArray(data.coins)) {
          // Кешируем результаты для первых 2 букв
          await cacheSearchResults(prefix, data.coins);
          
          // Фильтруем результаты по полному запросу
          const filtered = data.coins.filter((coin: any) => {
            const name = (coin.name || '').toLowerCase();
            const symbol = (coin.symbol || '').toLowerCase();
            const queryLower = query.toLowerCase();
            return name.includes(queryLower) || symbol.includes(queryLower);
          });
          
          // Ограничиваем до 20 результатов
          setSearchResults(filtered.slice(0, 20));
        } else {
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCoins(searchQuery);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchCoins]);

  const toggleCoinSelection = (coin: CoinSearchResult) => {
    const isSelected = localSelected.some(c => c.id === coin.id);
    
    if (isSelected) {
      setLocalSelected(localSelected.filter(c => c.id !== coin.id));
    } else {
      // Максимум 10 монет
      if (localSelected.length >= 10) {
        return;
      }
      setLocalSelected([
        ...localSelected,
        {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          image: coin.thumb,
          market_cap_rank: coin.market_cap_rank,
        },
      ]);
    }
  };

  const handleConfirm = () => {
    onSelectCoins(localSelected);
    onClose();
  };

  const handleClear = () => {
    setLocalSelected([]);
    onSelectCoins([]);
  };

  const isCoinSelected = (coinId: string) => {
    return localSelected.some(c => c.id === coinId);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Your Coins</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={wp('6%')} color="#7A5B64" />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={wp('5%')} color="#7A5B64" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or symbol (e.g., Bitcoin, BTC)"
              placeholderTextColor="#9B9B9B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <MaterialIcons name="clear" size={wp('4%')} color="#7A5B64" />
              </TouchableOpacity>
            )}
          </View>

          {/* Selected Coins Count */}
          {localSelected.length > 0 && (
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedText}>
                {localSelected.length} coin{localSelected.length !== 1 ? 's' : ''} selected
              </Text>
              <TouchableOpacity onPress={handleClear} style={styles.clearAllButton}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Results */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6E76" />
            </View>
          ) : searchQuery.length >= 2 && searchResults.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={wp('15%')} color="#D0D0D0" />
              <Text style={styles.emptyText}>No coins found</Text>
            </View>
          ) : searchQuery.length < 2 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search" size={wp('15%')} color="#D0D0D0" />
              <Text style={styles.emptyText}>Type at least 2 characters to search</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const selected = isCoinSelected(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.coinItem, selected && styles.coinItemSelected]}
                    onPress={() => toggleCoinSelection(item)}
                    disabled={!selected && localSelected.length >= 10}
                  >
                    <Image
                      source={{ uri: item.thumb }}
                      style={styles.coinImage}
                      defaultSource={require('../../assets/donuts/donuts_horizontal_1.png')}
                    />
                    <View style={styles.coinInfo}>
                      <Text style={styles.coinName}>{item.name}</Text>
                      <Text style={styles.coinSymbol}>{item.symbol.toUpperCase()}</Text>
                      {item.market_cap_rank && (
                        <Text style={styles.coinRank}>Rank #{item.market_cap_rank}</Text>
                      )}
                    </View>
                    <View style={styles.checkboxContainer}>
                      {selected ? (
                        <View style={styles.checkboxChecked}>
                          <MaterialIcons name="check" size={wp('4%')} color="#FFFFFF" />
                        </View>
                      ) : localSelected.length >= 10 ? (
                        <View style={styles.checkboxDisabled}>
                          <Text style={styles.maxText}>Max</Text>
                        </View>
                      ) : (
                        <View style={styles.checkboxUnchecked} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              style={styles.resultsList}
              contentContainerStyle={styles.resultsContent}
            />
          )}

          {/* Selected Coins Preview */}
          {localSelected.length > 0 && (
            <View style={styles.selectedPreview}>
              <Text style={styles.previewTitle}>Selected:</Text>
              <View style={styles.selectedChips}>
                {localSelected.map((coin) => (
                  <View key={coin.id} style={styles.chip}>
                    <Image
                      source={{ uri: coin.image }}
                      style={styles.chipImage}
                    />
                    <Text style={styles.chipText}>{coin.symbol.toUpperCase()}</Text>
                    <TouchableOpacity
                      onPress={() => toggleCoinSelection(coin)}
                      style={styles.chipRemove}
                    >
                      <MaterialIcons name="close" size={wp('3%')} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.confirmButton, localSelected.length === 0 && styles.confirmButtonDisabled]}
              disabled={localSelected.length === 0}
            >
              <Text style={styles.confirmText}>
                {localSelected.length > 0 ? `Add ${localSelected.length} Coin${localSelected.length !== 1 ? 's' : ''}` : 'Add Coins'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: hp('85%'),
    padding: hp('2%'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  title: {
    fontSize: wp('5.5%'),
    fontWeight: '700',
    color: '#2B1D27',
  },
  closeButton: {
    padding: wp('1%'),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: wp('3%'),
    marginBottom: hp('1.5%'),
    height: hp('6%'),
  },
  searchIcon: {
    marginRight: wp('2%'),
  },
  searchInput: {
    flex: 1,
    fontSize: wp('4%'),
    color: '#2B1D27',
  },
  clearButton: {
    padding: wp('1%'),
  },
  selectedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1%'),
    paddingHorizontal: wp('1%'),
  },
  selectedText: {
    fontSize: wp('3.5%'),
    color: '#7A5B64',
    fontWeight: '600',
  },
  clearAllButton: {
    padding: wp('1%'),
  },
  clearAllText: {
    fontSize: wp('3.5%'),
    color: '#FF6E76',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: hp('5%'),
    alignItems: 'center',
  },
  emptyContainer: {
    padding: hp('5%'),
    alignItems: 'center',
  },
  emptyText: {
    marginTop: hp('2%'),
    fontSize: wp('4%'),
    color: '#9B9B9B',
  },
  resultsList: {
    maxHeight: hp('40%'),
  },
  resultsContent: {
    paddingBottom: hp('1%'),
  },
  coinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: hp('1.5%'),
    borderRadius: 12,
    marginBottom: hp('1%'),
    backgroundColor: '#F9F9F9',
  },
  coinItemSelected: {
    backgroundColor: '#FFF3F6',
    borderWidth: 2,
    borderColor: '#FF6E76',
  },
  coinImage: {
    width: wp('10%'),
    height: wp('10%'),
    borderRadius: wp('5%'),
    marginRight: wp('3%'),
  },
  coinInfo: {
    flex: 1,
  },
  coinName: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#2B1D27',
  },
  coinSymbol: {
    fontSize: wp('3.5%'),
    color: '#7A5B64',
    marginTop: hp('0.3%'),
  },
  coinRank: {
    fontSize: wp('3%'),
    color: '#9B9B9B',
    marginTop: hp('0.2%'),
  },
  checkboxContainer: {
    marginLeft: wp('2%'),
  },
  checkboxUnchecked: {
    width: wp('6%'),
    height: wp('6%'),
    borderRadius: wp('3%'),
    borderWidth: 2,
    borderColor: '#D0D0D0',
  },
  checkboxChecked: {
    width: wp('6%'),
    height: wp('6%'),
    borderRadius: wp('3%'),
    backgroundColor: '#FF6E76',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDisabled: {
    width: wp('6%'),
    height: wp('6%'),
    borderRadius: wp('3%'),
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  maxText: {
    fontSize: wp('2.5%'),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedPreview: {
    marginTop: hp('1%'),
    marginBottom: hp('1%'),
    paddingTop: hp('1.5%'),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  previewTitle: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    color: '#7A5B64',
    marginBottom: hp('1%'),
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6E76',
    borderRadius: 20,
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.8%'),
    marginRight: wp('2%'),
    marginBottom: hp('0.8%'),
  },
  chipImage: {
    width: wp('4%'),
    height: wp('4%'),
    borderRadius: wp('2%'),
    marginRight: wp('1.5%'),
  },
  chipText: {
    fontSize: wp('3%'),
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: wp('1%'),
  },
  chipRemove: {
    padding: wp('0.5%'),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp('1%'),
    paddingTop: hp('1.5%'),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    padding: hp('1.5%'),
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginRight: wp('2%'),
    alignItems: 'center',
  },
  cancelText: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#7A5B64',
  },
  confirmButton: {
    flex: 1,
    padding: hp('1.5%'),
    borderRadius: 12,
    backgroundColor: '#FF6E76',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  confirmText: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

