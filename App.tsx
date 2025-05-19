/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Clipboard
} from 'react-native';
import DonutChart from './src/components/DonutChart';
import { useFont } from '@shopify/react-native-skia';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { calculatePercentage } from './src/utils/calculatePercentage';
import { generateRandomNumbers } from './src/utils/generateRandomNumbers';
import RenderItem from './src/components/RenderItem';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShareButton } from './src/components/ShareButton';
import { HistoryModal } from './src/components/HistoryModal';
import { PromptModal } from './src/components/PromptModal';
import { useHistory } from './src/hooks/useHistory';
import { MaterialIcons } from '@expo/vector-icons';
import SplashScreen from './SplashScreen';
import { useFonts } from 'expo-font';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

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

const RADIUS = 160;
const STROKE_WIDTH = wp('5.45%');
const OUTER_STROKE_WIDTH = wp('8.36%');
const GAP = 0.05;
const DONUT_IMAGES_VERTICAL = [
  require('./assets/donuts/donuts_vertical_1.png'),
  require('./assets/donuts/donuts_vertical_2.png'),
  require('./assets/donuts/donuts_vertical_3.png'),
  require('./assets/donuts/donuts_vertical_4.png'),
  require('./assets/donuts/donuts_vertical_5.png'),
  require('./assets/donuts/donuts_vertical_6.png'),
  require('./assets/donuts/donuts_vertical_7.png'),
  require('./assets/donuts/donuts_vertical_8.png'),
  require('./assets/donuts/donuts_vertical_9.png')
];
const DONUT_IMAGES_HORIZONTAL = [
  require('./assets/donuts/donuts_horizontal_1.png'),
  require('./assets/donuts/donuts_horizontal_2.png'),
  require('./assets/donuts/donuts_horizontal_3.png'),
  require('./assets/donuts/donuts_horizontal_4.png'),
  require('./assets/donuts/donuts_horizontal_5.png'),
  require('./assets/donuts/donuts_horizontal_6.png'),
  require('./assets/donuts/donuts_horizontal_7.png'),
  require('./assets/donuts/donuts_horizontal_8.png'),
  require('./assets/donuts/donuts_horizontal_9.png'),
  require('./assets/donuts/donuts_horizontal_10.png'),
  require('./assets/donuts/donuts_horizontal_11.png'),
  require('./assets/donuts/donuts_horizontal_12.png'),
  require('./assets/donuts/donuts_horizontal_13.png')
];
const DONUT_IMAGES = DONUT_IMAGES_HORIZONTAL;

function getShuffledDonutImages() {
  const keys = Object.keys(DONUT_IMAGES);
  const shuffled = keys.sort(() => 0.5 - Math.random());
  return shuffled.map(key => DONUT_IMAGES[key]);
}


function generateRandomColor(count = 10) {
  const letters = '0123456789ABCDEF';
  let colorList = [];
  for (let j = 0; j < count; j++) {
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    colorList.push(color);
  }
  return colorList;
}

const DonutChartContainer = () => {
  const n = 8;
  const [data, setData] = useState<Data[]>([]);
  const [images, setImages] = useState<URL[]>([]);
  const totalValue = useSharedValue(0);
  const decimals = useSharedValue<number[]>([]);
  const colors = generateRandomColor(n);
  const [amount, setAmount] = useState(1000); // State to manage the input value
  const { history, addToHistory, clearHistory } = useHistory();
  const [isHistoryVisible, setHistoryVisible] = useState(false);
  const [isPromptVisible, setPromptVisible] = useState(false);
  const [disclaimerShown, setDisclaimerShown] = useState(false);

  // Функция для получения данных с CoinGecko API
  async function fetchCryptoData() {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1');
    const data = await response.json();
    return data;
  }

  // Функция для случайного выбора 10 криптовалют
  function getRandomCryptos(data, count = 10, maxIndex = 200) {
    const minSlice = Math.floor(Math.random() * (maxIndex - count + 1));  // from 0 to 90
    const maxSlice = minSlice + count;
    return data.slice(minSlice, maxSlice);
  }

   const handleHistorySelect = (item: any) => {
    setData(item.data);
    // Обновляем totalValue через withTiming для плавной анимации
    totalValue.value = withTiming(item.totalValue, { duration: 500 });
    // Пересчитываем проценты
    decimals.value = item.data.map(crypto => crypto.percentage / 100);
  };

  // Function to handle slider value change
  const handleSliderChange = (newValue) => {
    setAmount(newValue);
  };

  // Function to handle input value change
  const handleInputChange = (text) => {
    // Parse the text input to a number
    const newValue = parseFloat(text);
    // Ensure the input value is within the range
    if (!isNaN(newValue) && newValue >= 1 && newValue <= 10000) {
      setAmount(newValue);
    } else {
      // Optional: Handle cases where the value is out of range or not a number
      // setValue('');
    }
  };

  async function generateData() {
    if (!disclaimerShown) {
      await new Promise<void>(resolve => {
        Alert.alert(
          'Legal Disclaimer',
          'This app generates random cryptocurrency distributions for visualization purposes only and does not constitute financial advice. Cryptocurrency investments involve risk.',
          [{ text: 'I Agree', onPress: () => {
            setDisclaimerShown(true);
            resolve();
          }}]
        );
      });
    }
    
    try {
      setImages(getShuffledDonutImages());

      // Шаг 1: Получаем данные с API
      const cryptoData = await fetchCryptoData();

      // Шаг 2: Случайным образом выбираем 10 криптовалют
      const selectedCryptos = getRandomCryptos(cryptoData, 10);


      // Шаг 3: Генерируем случайные числа для распределения весов
      const generateNumbers = generateRandomNumbers(n, amount);

      // Вычисляем общую сумму этих чисел
      const total = generateNumbers.reduce((acc, currentValue) => acc + currentValue, 0);

      // Вычисляем проценты для каждого числа
      const generatePercentages = calculatePercentage(generateNumbers, total);

      // Округляем проценты и делаем их в формате 0.00
      const generateDecimals = generatePercentages.map((number) => {
        if (number != null && !isNaN(number)) {
          return Number(number.toFixed(0)) / 100;
        }
        return 0;
      });

      totalValue.value = withTiming(total, { duration: 1000 });

      decimals.value = [...generateDecimals];

      // Генерируем массив объектов с данными
      const arrayOfObjects = generateNumbers.map((value, index) => ({
        name: selectedCryptos[index].name,
        image: selectedCryptos[index].image,
        symbol: selectedCryptos[index].symbol,
        minPrice: selectedCryptos[index].ath,
        maxPrice: selectedCryptos[index].atl,
        price: selectedCryptos[index].current_price,
        marketCap: selectedCryptos[index].market_cap,
        marketCapChangePercentage24h: selectedCryptos[index].market_cap_change_percentage_24h,
        priceChangePercentage24h: selectedCryptos[index].price_change_percentage_24h,
        circulatingSupply: selectedCryptos[index].circulating_supply,
        maxSupply: selectedCryptos[index].max_supply,
        totalVolume: selectedCryptos[index].total_volume,
        value,
        percentage: generatePercentages[index],
        decimals: generateDecimals[index] / 100,
        color: colors[index], // Генерация случайного цвета
        url: 'https://www.coingecko.com/en/coins/' + selectedCryptos[index].id,
      }));

      // Выводим данные в консоль (можно заменить на setData(arrayOfObjects); если используете React)
      setData(arrayOfObjects);
      await addToHistory(arrayOfObjects); // Сохраняем данные + общую сумму
    } catch (error) {
      console.error('Ошибка при генерации данных:', error);
    }
  }

  const font = useFont(require('./src/assets/fonts/Roboto-Bold.ttf'), wp('20%'));
  const smallFont = useFont(require('./src/assets/fonts/Roboto-Light.ttf'), wp('9.09%'));

  if (!font || !smallFont) {
    return <View />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.general]}>
          <Text style={[styles.label, {color: 'black'}]}>Enter amount: $</Text>
          <TextInput
            style={[styles.input]}
            value={amount.toString()}
            onChangeText={handleInputChange}
            keyboardType='numeric'
            placeholder='100 - 1000'
          />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', padding: 10 }}>
        <TouchableOpacity onPress={() => setHistoryVisible(true)} style={styles.historyButton}>
          <MaterialIcons name="history" size={wp('5.09%')} color="#FF6E76" />
          <Text style={styles.historyText}>History</Text>
        </TouchableOpacity>

        <ShareButton data={data} totalValue={totalValue.value} />

        <TouchableOpacity onPress={() => setPromptVisible(true)} style={styles.promptButton}>
          <MaterialIcons name="info" size={wp('5.09%')} color="#FF6E76" />
          <Text style={styles.promptText}>Prompt</Text>
        </TouchableOpacity>
      </View>

        <View style={styles.chartContainer}>
          <DonutChart
            radius={RADIUS}
            gap={GAP}
            strokeWidth={STROKE_WIDTH}
            outerStrokeWidth={OUTER_STROKE_WIDTH}
            font={font}
            smallFont={smallFont}
            totalValue={totalValue}
            n={n}
            decimals={decimals}
            colors={colors}
          />
        </View>
        <TouchableOpacity onPress={generateData}>
          <Text style={[styles.buttonText, styles.button3d]}>Mix the Dough</Text>
        </TouchableOpacity>
        {data.map((item, index) => (
          <RenderItem item={item} key={index} index={index} donutImages={images} />
        ))}
      </ScrollView>
      <StatusBar style="auto" />

      <HistoryModal
        visible={isHistoryVisible}
        history={history}
        onClose={() => setHistoryVisible(false)}
        onSelect={handleHistorySelect}
        onClear={async () => {
          await clearHistory();
        }}/>

      <PromptModal
        visible={isPromptVisible}
        data={data}
        onClose={() => setPromptVisible(false)}
        onCopy={(text) => Clipboard.setString(text)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  general: {color: 'white', flexDirection: 'row', alignItems: 'center', marginLeft: wp('9.09%'), marginTop: hp('9.52%'), marginBottom: hp('0.952%')},
  input: {color: 'black', fontSize: wp('4.36%'), fontWeight: '700'},
  label: {
    fontSize: wp('4.36%'), fontWeight: '700'
  },
  promptButton: {
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
  promptText: {
    color: 'black',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: wp('3.63%')
  },
  historyButton: {
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
  historyText: {
    color: 'black',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: wp('3.63%')
  },
  container: {
    flex: 1,
    backgroundColor: '#FFD8DF',
  },
  chartContainer: {
    width: RADIUS * 2,
    height: RADIUS * 2,
    marginTop: hp('0.95%'),
  },
  button3d: {
    backgroundColor: 'white',
    borderRadius: 28,

    // Тень для Android
    elevation: 6,

    // Тень для iOS
    shadowColor: '#9B8084',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,

    paddingHorizontal: wp('12.72%'),
    paddingVertical: hp('2%'),
    marginBottom: hp('5.71%'),
    alignItems: 'center',
    justifyContent: 'center'
  },
  button: {
    marginVertical: hp('3.8%'),
    backgroundColor: '#9AFF9A',
    paddingHorizontal: wp('10.9%'),
    paddingVertical: hp('1.42%'),
    borderRadius: 10,
  },
  buttonText: {
    color: 'black',
    textTransform: 'uppercase',
    fontSize: wp('4.72%'),
    fontWeight: 'bold',
  },
});


export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);

  const [fontsLoaded] = useFonts({
    'Roboto-Bold': require('./src/assets/fonts/Roboto-Bold.ttf'),
    'Roboto-Light': require('./src/assets/fonts/Roboto-Light.ttf'),
  });

  return (
    <View style={{ flex: 1 }}>
      <DonutChartContainer />
      {splashVisible && (
        <SplashScreen onHide={() => setSplashVisible(false)} />
      )}
    </View>
  );
}