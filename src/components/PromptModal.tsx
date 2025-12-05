import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Modal, StyleSheet, Alert, Linking } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { MaterialIcons } from '@expo/vector-icons';
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


type PromptTemplate = 'detailed' | 'brief' | 'technical' | 'investment';

export const PromptModal = ({ visible, data, onClose, onCopy }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate>('detailed');

  const getCoinData = (item: any) => {
    return [
      `${item.name} (${item.symbol}):`,
      `  ATH: ${formatNumber(item.maxPrice, { isCurrency: true, currency: 'USD' })}`,
      `  ATL: ${formatNumber(item.minPrice, { isCurrency: true, currency: 'USD' })}`,
      `  Current Price: ${formatNumber(item.price, { isCurrency: true, currency: 'USD' })}`,
      `  Market Cap: ${formatNumber(item.marketCap, { isCurrency: true, currency: 'USD' })}`,
      `  Market Cap Rank: ${item.marketCapRank || 'N/A'}`,
      `  Market Cap Change 24h: ${safeToFixed(item.marketCapChangePercentage24h)}%`,
      `  Price Change 24h: ${safeToFixed(item.priceChangePercentage24h)}%`,
      `  Circulating Supply: ${formatNumber(item.circulatingSupply, { isCurrency: false })}`,
      `  Max Supply: ${item.maxSupply ? formatNumber(item.maxSupply, { isCurrency: false }) : 'Unlimited'}`,
      `  Trading Volume 24h: ${formatNumber(item.totalVolume, { isCurrency: true, currency: 'USD' })}`,
      `  Investment Amount: ${formatNumber(item.value, { isCurrency: true, currency: 'USD' })}`,
      `  Portfolio Allocation: ${item.percentage}%`,
    ].join('\n');
  };

  const generatePrompt = (template: PromptTemplate): string => {
    const coinData = data.map(item => getCoinData(item)).join('\n\n');

    switch (template) {
      case 'brief':
        return [
          `Analyze these cryptocurrencies and provide a brief assessment:`,
          ``,
          coinData,
          ``,
          `Provide: 1) Risk level, 2) Buy/Hold/Sell recommendation, 3) Key concerns or opportunities.`,
          `Keep it concise and actionable.`,
        ].join('\n');

      case 'technical':
        return [
          `You are a technical analyst. Analyze these cryptocurrencies based on technical indicators:`,
          ``,
          coinData,
          ``,
          `For each token, provide:`,
          `1. Technical analysis based on ATH/ATL distance from current price`,
          `2. Volume analysis (trading volume vs market cap)`,
          `3. Momentum indicators (24h price and market cap changes)`,
          `4. Support/resistance levels based on historical data`,
          `5. Technical buy/sell signals`,
          ``,
          `Format as structured technical analysis per token.`,
        ].join('\n');

      case 'investment':
        return [
          `You are an investment advisor. I'm considering investing in these cryptocurrencies:`,
          ``,
          coinData,
          ``,
          `For each token, provide investment advice:`,
          `1. Is this a good investment opportunity? Why or why not?`,
          `2. What is the risk/reward ratio?`,
          `3. Should I invest the allocated amount now, wait, or avoid?`,
          `4. What percentage of my portfolio should this represent?`,
          `5. What are the main risks and potential rewards?`,
          `6. Time horizon recommendation (short/medium/long term)`,
          ``,
          `Provide clear, actionable investment recommendations.`,
        ].join('\n');

      case 'detailed':
      default:
        return [
          `You are a financial analyst specialized in cryptocurrency markets. I will provide you with data on one or more crypto tokens, including their all-time high (ATH), all-time low (ATL), current price, market cap, supply, trading volume, and recent price changes.`,
          ``,
          `For each token, analyze and answer the following:`,
          `1. Risk level of investing in this token (low/medium/high) and why.`,
          `2. Profit potential – is this a good buying opportunity or not?`,
          `3. Should I buy now, wait, or is it too late to enter?`,
          `4. How popular/trusted and safe is the token (based on its market cap, rank, trading volume, and supply structure)?`,
          `5. Provide a brief, actionable recommendation for each token.`,
          ``,
          `Format the response in a clear bullet-point list per token.`,
          ``,
          `Here's the data:`,
          `─────────────────────────────────`,
          coinData,
          `─────────────────────────────────`,
          ``,
          `Made with Doughfolio App`,
        ].join('\n');
    }
  };

  const promptContent = generatePrompt(selectedTemplate);

  const handleOpenAI = () => {
    const encodedPrompt = encodeURIComponent(promptContent);
    Linking.openURL(`https://chat.openai.com/?q=${encodedPrompt}`).catch(() => {
      Linking.openURL('https://chat.openai.com/');
    });
  };

  const handleClaude = () => {
    Linking.openURL('https://claude.ai/');
  };

  const handlePerplexity = () => {
    const encodedPrompt = encodeURIComponent(promptContent);
    Linking.openURL(`https://www.perplexity.ai/?q=${encodedPrompt}`).catch(() => {
      Linking.openURL('https://www.perplexity.ai/');
    });
  };

  const handleGemini = () => {
    // Gemini не поддерживает передачу промпта через URL, просто открываем страницу
    Linking.openURL('https://gemini.google.com/').catch(() => {
      Alert.alert('Error', 'Could not open Gemini');
    });
  };

  const templates: { key: PromptTemplate; label: string; desc: string }[] = [
    { key: 'brief', label: 'Brief', desc: 'Quick overview' },
    { key: 'detailed', label: 'Detailed', desc: 'Full analysis (default)' },
    { key: 'technical', label: 'Technical', desc: 'Technical indicators' },
    { key: 'investment', label: 'Investment', desc: 'Investment advice' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>AI Analysis Prompt</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={wp('6%')} color="#FF6E76" />
            </TouchableOpacity>
          </View>
          
          {data.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Generate a portfolio first</Text>
            </View>
          ) : (
            <>
              <View style={styles.templateSelector}>
                <Text style={styles.templateLabel}>Template:</Text>
                <View style={styles.templateButtons}>
                  {templates.map(template => (
                    <TouchableOpacity
                      key={template.key}
                      onPress={() => setSelectedTemplate(template.key)}
                      style={[
                        styles.templateButton,
                        selectedTemplate === template.key && styles.templateButtonActive
                      ]}
                    >
                      <Text style={[
                        styles.templateButtonText,
                        selectedTemplate === template.key && styles.templateButtonTextActive
                      ]}>
                        {template.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <ScrollView style={styles.promptScroll} showsVerticalScrollIndicator={true}>
                <Text style={styles.promptText} selectable>
                  {promptContent}
                </Text>
              </ScrollView>

              <View style={styles.quickActions}>
                <Text style={styles.quickActionsLabel}>Quick Actions:</Text>
                <View style={styles.quickActionsButtons}>
                  <TouchableOpacity
                    onPress={handleOpenAI}
                    style={styles.quickActionButton}
                  >
                    <MaterialIcons name="smart-toy" size={wp('4%')} color="#FFFFFF" />
                    <Text style={styles.quickActionText}>ChatGPT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleClaude}
                    style={styles.quickActionButton}
                  >
                    <MaterialIcons name="psychology" size={wp('4%')} color="#FFFFFF" />
                    <Text style={styles.quickActionText}>Claude</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleGemini}
                    style={styles.quickActionButton}
                  >
                    <MaterialIcons name="auto-awesome" size={wp('4%')} color="#FFFFFF" />
                    <Text style={styles.quickActionText}>Gemini</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handlePerplexity}
                    style={styles.quickActionButton}
                  >
                    <MaterialIcons name="search" size={wp('4%')} color="#FFFFFF" />
                    <Text style={styles.quickActionText}>Perplexity</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.footer}>
                <TouchableOpacity 
                  onPress={async () => {
                    await onCopy(promptContent);
                    Alert.alert('Copied', 'Prompt copied to clipboard');
                  }} 
                  style={styles.copyButton}
                >
                  <MaterialIcons name="content-copy" size={wp('4.5%')} color="#FFFFFF" />
                  <Text style={styles.copyText}>Copy</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>
            </>
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
    maxHeight: '85%',
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
  emptyContainer: {
    paddingVertical: hp('5%'),
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: wp('4%'),
    textAlign: 'center',
  },
  templateSelector: {
    marginBottom: hp('2%'),
  },
  templateLabel: {
    fontSize: wp('3.5%'),
    color: '#666',
    marginBottom: hp('1%'),
    fontWeight: '600',
  },
  templateButtons: {
    flexDirection: 'row',
    gap: wp('2%'),
    flexWrap: 'wrap',
  },
  templateButton: {
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('0.8%'),
    borderRadius: 15,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  templateButtonActive: {
    backgroundColor: '#FF6E76',
    borderColor: '#FF6E76',
  },
  templateButtonText: {
    fontSize: wp('3.5%'),
    color: '#666',
    fontWeight: '600',
  },
  templateButtonTextActive: {
    color: '#FFFFFF',
  },
  promptScroll: {
    maxHeight: hp('40%'),
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: wp('3%'),
    marginBottom: hp('2%'),
  },
  promptText: {
    color: '#333',
    fontSize: wp('3.2%'),
    fontFamily: 'monospace',
    lineHeight: hp('2.5%'),
  },
  quickActions: {
    marginBottom: hp('2%'),
    paddingTop: hp('1.5%'),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  quickActionsLabel: {
    fontSize: wp('3.5%'),
    color: '#666',
    marginBottom: hp('1%'),
    fontWeight: '600',
  },
  quickActionsButtons: {
    flexDirection: 'row',
    gap: wp('2%'),
    flexWrap: 'wrap',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6E76',
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('1%'),
    borderRadius: 12,
    gap: wp('1.5%'),
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: wp('3.5%'),
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: wp('3%'),
    marginTop: hp('1%'),
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6E76',
    padding: hp('1.5%'),
    borderRadius: 12,
    flex: 1,
    gap: wp('2%'),
  },
  copyText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: wp('4%'),
  },
  closeButton: {
    backgroundColor: '#333',
    padding: hp('1.5%'),
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  closeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: wp('4%'),
  },
});