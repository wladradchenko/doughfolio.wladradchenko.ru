// src/components/HistoryModal.tsx
import { FlatList, View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';


export const HistoryModal = ({ visible, history, onClose, onSelect, onClear }) => {
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

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>History of generations</Text>
          
          {history.length === 0 ? (
            <Text style={styles.emptyText}>History is empty</Text>
          ) : (
            <>
              <FlatList
                data={history}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                    style={styles.item}
                  >
                    <Text style={styles.date}>{item.date}</Text>
                    <Text style={[{color: 'black'}]}>Sum: ${item.totalValue}</Text>
                    <Text style={[{color: 'black'}]}>{item.data.length} crypto assets</Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          <View style={[{flexDirection: 'row', gap: 20, alignItems: 'center', justifyContent: 'space-between', marginTop: hp('0.95%'),}]}>
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                <Text style={styles.clearText}>Clear history</Text>
              </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  clearButton: {
    backgroundColor: '#FF6E76',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1
  },
  clearText: {
    color: 'white',
    fontWeight: 'bold'
  },  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255,216,223,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '70%',
  },
  title: {
    fontSize: wp('3.63%'),
    fontWeight: 'bold',
    color: '#FF6E76',
    marginBottom: hp('1.42%'),
    textAlign: 'center',
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  date: {
    fontWeight: 'bold',
    color: '#FF6E76',
  },
  emptyText: {
    color: 'black',
    textAlign: 'center',
    marginVertical: hp('1.9%'),
  },
  closeButton: {
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1
  },
  closeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});