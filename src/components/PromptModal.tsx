import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { formatNumber, safeToFixed } from '../utils/formatNumber';

interface Data {
  name: string;
  symbol: string;
  value: number;
  percentage: number;
  color: string;
  image: string;
  url: string;
  decimals?: number;
}


export const PromptModal = ({ visible, data, onClose, onCopy }) => {
  const handlePrompt = () => {
    return [
      `You are a financial analyst specialized in cryptocurrency markets. I will provide you with data on one or more crypto tokens, including their all-time high (ATH), all-time low (ATL), current price, market cap, supply, trading volume, and recent price changes.`,
      `For each token, analyze and answer the following:`,
      `1. Risk level of investing in this token (low/medium/high) and why.`,
      `2. Profit potential – is this a good buying opportunity or not?`,
      `3. Should I buy now, wait, or is it too late to enter?`,
      `4. How popular/trusted and safe is the token (based on its market cap, rank, trading volume, and supply structure)?`,
      `5. Provide a brief, actionable recommendation for each token.`,
      `Format the response in a clear bullet-point list per token.`,
      `Here's the data:`,
      '---------------------------------',
      ...data.map(item => 
        `${item.name} with symbol (${item.symbol}):\n` +
        `- The highest price a coin has ever reached: ${formatNumber(item.maxPrice, { isCurrency: true, currency: 'USD' })}\n` +
        `- Lowest price ever: ${formatNumber(item.minPrice, { isCurrency: true, currency: 'USD' })}\n` +
        `- Current price of the coin: ${formatNumber(item.price, { isCurrency: true, currency: 'USD' })}\n` +
        `- Market capitalization is an important indicator: ${formatNumber(item.marketCap, { isCurrency: true, currency: 'USD' })}\n` +
        `- Capitalization growth over the last 24 hours: ${safeToFixed(item.marketCapChangePercentage24h)}%\n` +
        `- Price increase over the last 24 hours: ${safeToFixed(item.priceChangePercentage24h)}%\n` +
        `- Number of coins in circulation: ${formatNumber(item.circulatingSupply, { isCurrency: false })}\n` +
        `- Maximum number of coins in circulation: ${formatNumber(item.maxSupply, { isCurrency: false })}\n` +
        `- Trading volume for 24 hours: ${formatNumber(item.totalVolume, { isCurrency: false })}\n` +
        `- I wanna buy this coin on sum: ${formatNumber(item.value, { isCurrency: true, currency: 'USD' })}\n` +
        '---------------------------------'
      ),
      '\nMade with Doughfolio App'
    ].join('\n');
  };

  const promptContent = handlePrompt();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Prompt of generation</Text>
          
          {data.length === 0 ? (
            <Text style={styles.emptyText}>Prompt is empty</Text>
          ) : (
            <ScrollView style={{ maxHeight: hp('80%') }}>
              <Text style={{ color: 'black', padding: 10 }}>
                {promptContent}
              </Text>
            </ScrollView>
          )}

          <View style={[{flexDirection: 'row', gap: 20, alignItems: 'center', justifyContent: 'space-between', marginTop: hp('0.95%'),}]}>
            {data.length !== 0 && (
            <TouchableOpacity 
              onPress={() => {
                onCopy(promptContent);
                Alert.alert('Copied', 'Prompt copied to clipboard');
              }} 
              style={styles.copyButton}>
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
            )}
            
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
  copyButton: {
    backgroundColor: '#FF6E76',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1
  },
  copyText: {
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
    marginVertical: wp('1.9%'),
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