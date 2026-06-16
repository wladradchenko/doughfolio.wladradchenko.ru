import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, Modal, Dimensions, StatusBar, Platform, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { MaterialIcons } from '@expo/vector-icons';
import { useCanvasRef } from '@shopify/react-native-skia';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { formatNumber, safeToFixed } from '../utils/formatNumber';
import { ShareCard } from './ShareCard';

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

type ShareButtonProps = {
  data: Data[];
  totalValue: number;
};

export const ShareButton = ({ data, totalValue }: ShareButtonProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useCanvasRef();

  const handleShareImage = async () => {
    try {
      if (!data || data.length === 0) {
        Alert.alert('Error', 'Generate a portfolio first');
        return;
      }
      setExporting(true);
      // Give the offscreen Skia canvas a moment to load fonts and draw.
      await new Promise(resolve => setTimeout(resolve, 450));

      const image = await canvasRef.current?.makeImageSnapshotAsync();
      if (!image) {
        Alert.alert('Error', 'Could not render the image. Please try again.');
        return;
      }
      const base64 = image.encodeToBase64();
      const fileUri = `${FileSystem.cacheDirectory}doughfolio_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'The "Share" function is not available');
        return;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your donut',
        UTI: 'public.png',
      });
      setModalVisible(false);
    } catch (error) {
      console.error('Image sharing failed:', error);
      Alert.alert('Error', 'Failed to export image');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async (format: 'text' | 'json' | 'csv') => {
    try {
      // 1. Проверка данных
      if (!data || data.length === 0) {
        Alert.alert('Error', 'Generate a portfolio first');
        return;
      }

      let content = '';
      let fileExtension = '';
      let mimeType = '';
      let fileName = '';

      // 2. Формирование содержимого в зависимости от формата
      switch (format) {
        case 'text':
          content = [
            `📊 Crypto Portfolio - $${safeToFixed(totalValue)}`,
            `Generated: ${new Date().toLocaleString()}`,
            '',
            '═══════════════════════════════════',
            ...data.map(item => 
              `\n${item.name} (${item.symbol.toUpperCase()})\n` +
              `  • Allocation: ${item.percentage}%\n` +
              `  • Value: ${formatNumber(item.value, { isCurrency: true, currency: 'USD' })}`
            ),
            '',
            '═══════════════════════════════════',
            '\n🍩 Made with Doughfolio App'
          ].join('\n');
          fileExtension = 'txt';
          mimeType = 'text/plain';
          fileName = `portfolio_${Date.now()}.txt`;
          break;

        case 'json':
          content = JSON.stringify({
            portfolio: {
              totalValue,
              generatedAt: new Date().toISOString(),
              coins: data.map(item => ({
                name: item.name,
                symbol: item.symbol,
                percentage: item.percentage,
                value: item.value,
                url: item.url,
              })),
            },
            app: 'Doughfolio',
          }, null, 2);
          fileExtension = 'json';
          mimeType = 'application/json';
          fileName = `portfolio_${Date.now()}.json`;
          break;

        case 'csv':
          // CSV заголовок
          content = 'Name,Symbol,Percentage,Value (USD),URL\n';
          // CSV данные
          content += data.map(item => 
            `"${item.name}","${item.symbol}",${item.percentage},${item.value},"${item.url || ''}"`
          ).join('\n');
          fileExtension = 'csv';
          mimeType = 'text/csv';
          fileName = `portfolio_${Date.now()}.csv`;
          break;
      }

      // 3. Создание временного файла
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 4. Проверка возможности шаринга
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'The "Share" function is not available');
        return;
      }

      // 5. Открытие диалога шаринга
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Export portfolio as ${format.toUpperCase()}`,
        UTI: format === 'csv' ? 'public.comma-separated-values-text' : format === 'json' ? 'public.json' : 'public.plain-text',
      });

      setModalVisible(false);
    } catch (error) {
      console.error('Sharing failed:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const screenData = Dimensions.get('screen');

  return (
    <>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.button}>
        <MaterialIcons name="share" size={wp('5.09%')} color="#FF6E76" />
        <Text style={styles.text}>Share</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <StatusBar hidden={Platform.OS === 'android'} />
        <View style={[styles.modalOverlay, { width: screenData.width, height: screenData.height }]}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export Portfolio</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={wp('6%')} color="#FF6E76" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Choose export format:</Text>

            <TouchableOpacity
              style={[styles.formatButton, styles.imageButton]}
              onPress={handleShareImage}
              disabled={exporting}
            >
              <MaterialIcons name="image" size={wp('6%')} color="#FFFFFF" />
              <View style={styles.formatButtonText}>
                <Text style={[styles.formatButtonTitle, styles.imageButtonTitle]}>
                  {exporting ? 'Baking image…' : 'Image (PNG)'}
                </Text>
                <Text style={[styles.formatButtonDesc, styles.imageButtonDesc]}>
                  A cute card to post on Stories / Twitter / Telegram
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.formatButton}
              onPress={() => handleShare('text')}
            >
              <MaterialIcons name="description" size={wp('6%')} color="#FF6E76" />
              <View style={styles.formatButtonText}>
                <Text style={styles.formatButtonTitle}>Text File</Text>
                <Text style={styles.formatButtonDesc}>Easy to read, share via any app</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.formatButton}
              onPress={() => handleShare('json')}
            >
              <MaterialIcons name="code" size={wp('6%')} color="#FF6E76" />
              <View style={styles.formatButtonText}>
                <Text style={styles.formatButtonTitle}>JSON</Text>
                <Text style={styles.formatButtonDesc}>Structured data for developers</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.formatButton}
              onPress={() => handleShare('csv')}
            >
              <MaterialIcons name="table-chart" size={wp('6%')} color="#FF6E76" />
              <View style={styles.formatButtonText}>
                <Text style={styles.formatButtonTitle}>CSV</Text>
                <Text style={styles.formatButtonDesc}>Open in Excel, Google Sheets</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Offscreen Skia card — mounted while the share sheet is open so it can be snapshotted to PNG. */}
      {modalVisible && data.length > 0 && (
        <View style={styles.offscreenCard} pointerEvents="none">
          <ShareCard canvasRef={canvasRef} data={data} totalValue={totalValue} />
        </View>
      )}
    </>
  );
};


const styles = StyleSheet.create({
  button: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 13,
    margin: 5,
    flexDirection: 'row', // иконка + текст в ряд
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    width: wp('21.81%'),
    justifyContent: 'center'
  },
  text: {
    color: 'black',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: wp('3.63%')
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,216,223,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: wp('5%'),
    borderRadius: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  modalTitle: {
    fontSize: wp('5%'),
    fontWeight: 'bold',
    color: '#FF6E76',
  },
  modalSubtitle: {
    fontSize: wp('3.8%'),
    color: '#666',
    marginBottom: hp('2%'),
  },
  formatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: wp('4%'),
    borderRadius: 15,
    marginBottom: hp('1.5%'),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  formatButtonText: {
    marginLeft: wp('3%'),
    flex: 1,
  },
  formatButtonTitle: {
    fontSize: wp('4.2%'),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp('0.3%'),
  },
  formatButtonDesc: {
    fontSize: wp('3.2%'),
    color: '#666',
  },
  imageButton: {
    backgroundColor: '#FF6E76',
    borderColor: '#FF6E76',
  },
  imageButtonTitle: {
    color: '#FFFFFF',
  },
  imageButtonDesc: {
    color: '#FFE4E8',
  },
  offscreenCard: {
    position: 'absolute',
    left: -10000,
    top: 0,
    width: 340,
    height: 420,
  },
});
