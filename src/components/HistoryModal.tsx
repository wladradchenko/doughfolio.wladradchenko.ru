// src/components/HistoryModal.tsx
import { FlatList, View, Text, TouchableOpacity, Modal, StyleSheet, Alert, Image } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { MaterialIcons } from '@expo/vector-icons';


export const HistoryModal = ({ visible, history, onClose, onSelect, onClear, onRemove }) => {
  const handleClear = () => {
    Alert.alert(
      "Clear history",
      "Are you sure you want to delete all history?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", onPress: onClear }
      ]
    );
  };

  const getTopCoins = (data) => {
    if (!data || data.length === 0) return [];
    return [...data]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);
  };

  const handleRemoveItem = (index: number, e: any) => {
    e.stopPropagation();
    Alert.alert(
      "Delete portfolio",
      "Are you sure you want to delete this portfolio from history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            if (onRemove) {
              onRemove(index);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Saved Portfolios</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeIconButton}>
              <MaterialIcons name="close" size={wp('6%')} color="#FF6E76" />
            </TouchableOpacity>
          </View>
          
          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={wp('15%')} color="#CCCCCC" />
              <Text style={styles.emptyText}>No saved portfolios yet</Text>
              <Text style={styles.emptySubtext}>Generate a portfolio and save it to see it here</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={history}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => {
                  const topCoins = getTopCoins(item.data);
                  return (
                    <View style={styles.itemWrapper}>
                      <TouchableOpacity 
                        onPress={() => {
                          onSelect(item);
                          onClose();
                        }}
                        style={styles.item}
                      >
                        <TouchableOpacity
                          onPress={(e) => handleRemoveItem(index, e)}
                          style={styles.deleteButton}
                        >
                          <MaterialIcons name="close" size={wp('3.5%')} color="#666" />
                        </TouchableOpacity>
                        <View style={styles.itemHeader}>
                          <View style={styles.itemInfo}>
                            <Text style={styles.date}>{item.date}</Text>
                            <Text style={styles.totalValue}>${item.totalValue.toLocaleString()}</Text>
                          </View>
                          <View style={styles.coinsCount}>
                            <MaterialIcons name="account-balance-wallet" size={wp('5%')} color="#FF6E76" />
                            <Text style={styles.coinsCountText}>{item.data.length}</Text>
                          </View>
                        </View>
                      
                      {topCoins.length > 0 && (
                        <View style={styles.topCoinsContainer}>
                          <Text style={styles.topCoinsLabel}>Top holdings:</Text>
                          <View style={styles.topCoinsList}>
                            {topCoins.map((coin, index) => (
                              <View key={index} style={styles.topCoinItem}>
                                <Image
                                  source={{ uri: coin.image }}
                                  style={styles.coinIcon}
                                  resizeMode="contain"
                                />
                                <Text style={styles.coinSymbol}>{coin.symbol.toUpperCase()}</Text>
                                <Text style={styles.coinPercentage}>{coin.percentage.toFixed(1)}%</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            </>
          )}

          {history.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                <MaterialIcons name="delete-outline" size={wp('4.5%')} color="#FFFFFF" />
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255,216,223,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: wp('5%'),
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  title: {
    fontSize: wp('5%'),
    fontWeight: 'bold',
    color: '#FF6E76',
  },
  closeIconButton: {
    padding: wp('1%'),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp('5%'),
  },
  emptyText: {
    color: '#333',
    fontSize: wp('4.5%'),
    fontWeight: '600',
    marginTop: hp('2%'),
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    fontSize: wp('3.5%'),
    marginTop: hp('1%'),
    textAlign: 'center',
  },
  itemWrapper: {
    marginBottom: hp('1.5%'),
    position: 'relative',
  },
  item: {
    padding: wp('4%'),
    backgroundColor: '#F8F8F8',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  deleteButton: {
    position: 'absolute',
    top: wp('2%'),
    right: wp('2%'),
    width: wp('6%'),
    height: wp('6%'),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1%'),
  },
  itemInfo: {
    flex: 1,
  },
  date: {
    fontSize: wp('3.5%'),
    color: '#666',
    marginBottom: hp('0.5%'),
  },
  totalValue: {
    fontSize: wp('5%'),
    fontWeight: 'bold',
    color: '#FF6E76',
  },
  coinsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1%'),
    backgroundColor: '#FFE5E8',
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.8%'),
    marginRight: wp('3.5%'),
    marginTop: hp('2%'),
    borderRadius: 15,
  },
  coinsCountText: {
    fontSize: wp('4%'),
    fontWeight: 'bold',
    color: '#FF6E76',
  },
  topCoinsContainer: {
    marginTop: hp('1%'),
    paddingTop: hp('1%'),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  topCoinsLabel: {
    fontSize: wp('3.2%'),
    color: '#666',
    marginBottom: hp('0.8%'),
  },
  topCoinsList: {
    flexDirection: 'row',
    gap: wp('3%'),
    flexWrap: 'wrap',
  },
  topCoinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1.5%'),
    backgroundColor: 'white',
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.5%'),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  coinIcon: {
    width: wp('4%'),
    height: wp('4%'),
  },
  coinSymbol: {
    fontSize: wp('3.2%'),
    fontWeight: '600',
    color: '#333',
  },
  coinPercentage: {
    fontSize: wp('3.2%'),
    color: '#FF6E76',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: hp('2%'),
    paddingTop: hp('1.5%'),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6E76',
    padding: hp('1.5%'),
    borderRadius: 12,
    gap: wp('2%'),
  },
  clearText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: wp('4%'),
  },
});