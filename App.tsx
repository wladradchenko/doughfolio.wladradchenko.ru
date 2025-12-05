/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
import { GamificationPanel } from './src/components/GamificationPanel';
import { useGamification } from './src/hooks/useGamification';
import { getCachedCoinList, cacheCoinList, addCoinsToCache, clearAllCache } from './src/utils/coinCache';
import { AmountModal } from './src/components/AmountModal';
import { PortfolioInsights } from './src/components/PortfolioInsights';
import { CoinDetailsModal } from './src/components/CoinDetailsModal';
import { CoinSearchModal } from './src/components/CoinSearchModal';
import { analyzeCategories } from './src/utils/analyzeCategories';
import { calculatePortfolioMetrics } from './src/utils/portfolioMetrics';
import { initializeNotifications, requestNotificationPermissions } from './src/utils/notifications';

interface Data {
  id: string;
  name: string;
  symbol: string;
  value: number;
  percentage: number;
  color: string;
  image: string;
  url: string;
  decimals?: number;
  minPrice?: number;
  maxPrice?: number;
  price?: number;
  marketCap?: number;
  marketCapChangePercentage24h?: number;
  priceChangePercentage24h?: number;
  circulatingSupply?: number;
  maxSupply?: number;
  totalVolume?: number;
  marketCapRank?: number;
  categories?: string[];
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
  const { history, addToHistory, clearHistory, removeFromHistory } = useHistory();
  const [isHistoryVisible, setHistoryVisible] = useState(false);
  const [isPromptVisible, setPromptVisible] = useState(false);
  const [isAmountModalVisible, setAmountModalVisible] = useState(false);
  const [isInsightsExpanded, setInsightsExpanded] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<{ id: string; name: string; symbol: string; image: string } | null>(null);
  const [disclaimerShown, setDisclaimerShown] = useState(false);
  const [isArcadeExpanded, setArcadeExpanded] = useState(true);
  const [isCoinSearchVisible, setCoinSearchVisible] = useState(false);
  const [selectedCoins, setSelectedCoins] = useState<Array<{ id: string; name: string; symbol: string; image: string; market_cap_rank?: number }>>([]);
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState(false);
  const [loadingCoins, setLoadingCoins] = useState<Array<{ id: string; name: string; symbol: string; image: string }>>([]);
  const selectedCoinsRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Инициализация картинок пончиков при загрузке компонента
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (selectedCoinsRetryTimerRef.current) {
        clearTimeout(selectedCoinsRetryTimerRef.current);
        selectedCoinsRetryTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setImages(getShuffledDonutImages());
  }, []);

  // Инициализация уведомлений при первом запуске
  useEffect(() => {
    if (!notificationsInitialized) {
      requestNotificationPermissions().then((granted) => {
        if (granted) {
          initializeNotifications();
        }
        setNotificationsInitialized(true);
      });
    }
  }, [notificationsInitialized]);
  const {
    missions,
    flavors,
    registerMixEvent,
    resetGamification,
    totalMixes,
    dailyMixes,
    wallet,
    xp,
    level,
    streakCount,
    boostWallet,
    lastPortfolio,
  } = useGamification();

  // Функция для получения данных с CoinGecko API
  async function fetchCryptoData() {
    try {
      // Check cache first
      const cachedData = await getCachedCoinList();
      if (cachedData && cachedData.length > 0) {
        // Use cached data - randomness is preserved by selecting random coins from the list
        return cachedData;
      }

      // If no cache, fetch from API with random page
      const page = Math.floor(Math.random() * 50) + 1;
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=${page}`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }
      
      // Cache the fetched data for 1 day
      await cacheCoinList(data);
      
      return data;
    } catch (error) {
      return [];
    }
  }

  // Функция для случайного выбора криптовалют
  function getRandomCryptos(data, count = 10, maxIndex = 200) {
    const minSlice = Math.floor(Math.random() * (maxIndex - count + 1));  // from 0 to 90
    const maxSlice = minSlice + count;
    return data.slice(minSlice, maxSlice);
  }

  // Функция для получения данных монет по ID из CoinGecko с retry при rate limit
  async function fetchCoinsByIds(coinIds: string[], attempt: number = 0): Promise<any[]> {
    if (coinIds.length === 0) return [];
    
    const maxRetries = 5;
    const retryDelay = 60000; // 60 seconds

    try {
      const ids = coinIds.join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=250&page=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          // Add fetched coins to cache
          await addCoinsToCache(data);
          
          // Remove loaded coins from loadingCoins
          setLoadingCoins(prev => prev.filter(coin => !coinIds.includes(coin.id)));
          
          if (selectedCoinsRetryTimerRef.current) {
            clearTimeout(selectedCoinsRetryTimerRef.current);
            selectedCoinsRetryTimerRef.current = null;
          }
          
          // If we have a portfolio, add these coins to it
          setData(currentPortfolio => {
            if (currentPortfolio.length > 0 && data.length > 0) {
              // Calculate average value per coin in current portfolio
              const currentTotal = currentPortfolio.reduce((sum, item) => sum + item.value, 0);
              const avgValuePerCoin = currentTotal / currentPortfolio.length;
              
              // Add loaded coins to current portfolio
              const newCoins = data.map(coin => {
                const value = avgValuePerCoin;
                return {
                  id: coin.id,
                  name: coin.name,
                  symbol: coin.symbol,
                  value: value,
                  percentage: 0, // Will be recalculated
                  color: generateRandomColor(1)[0],
                  image: coin.image,
                  url: `https://www.coingecko.com/en/coins/${coin.id}`,
                  decimals: 0,
                };
              });
              
              // Update portfolio with new coins
              const updatedData = [...currentPortfolio, ...newCoins];
              const newTotal = updatedData.reduce((sum, item) => sum + item.value, 0);
              const recalculatedData = updatedData.map(item => ({
                ...item,
                percentage: Number(((item.value / newTotal) * 100).toFixed(2)),
                decimals: item.value / newTotal,
              }));
              
              totalValue.value = withTiming(newTotal, { duration: 500 });
              decimals.value = recalculatedData.map(crypto => crypto.percentage / 100);
              
              return recalculatedData;
            }
            return currentPortfolio;
          });
          
          return data;
        }
      }

      // If rate limit (429) or server error (500+), retry
      if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
        // Retry after 60 seconds
        selectedCoinsRetryTimerRef.current = setTimeout(() => {
          fetchCoinsByIds(coinIds, attempt + 1);
        }, retryDelay);
        return []; // Return empty for now, will retry
      }

      // Other errors or max retries reached
      setLoadingCoins(prev => prev.filter(coin => !coinIds.includes(coin.id)));
      return [];
    } catch (error) {
      // Network errors - retry if we haven't exceeded max retries
      if (attempt < maxRetries) {
        selectedCoinsRetryTimerRef.current = setTimeout(() => {
          fetchCoinsByIds(coinIds, attempt + 1);
        }, retryDelay);
        return [];
      }
      setLoadingCoins(prev => prev.filter(coin => !coinIds.includes(coin.id)));
      return [];
    }
  }

   const handleHistorySelect = (item: any) => {
    setData(item.data);
    // Обновляем totalValue через withTiming для плавной анимации
    totalValue.value = withTiming(item.totalValue, { duration: 500 });
    // Пересчитываем проценты
    decimals.value = item.data.map(crypto => crypto.percentage / 100);
    // Обновляем картинки при загрузке из истории
    setImages(getShuffledDonutImages());
    // Помечаем, что портфель загружен из истории
    setIsFromHistory(true);
  };

  // Функция для сохранения текущего портфеля в историю
  const handleSavePortfolio = async () => {
    if (data.length === 0) {
      Alert.alert('No portfolio', 'Please generate a portfolio first');
      return;
    }
    const currentTotal = data.reduce((sum, item) => sum + item.value, 0);
    await addToHistory(data);
    Alert.alert('Saved!', 'Portfolio has been saved to history');
  };

  // Функция для удаления пончика с перерасчетом процентов
  const handleRemoveCoin = (indexToRemove: number) => {
    if (data.length <= 1) {
      Alert.alert('Cannot remove', 'Portfolio must have at least one coin');
      return;
    }

    const newData = data.filter((_, index) => index !== indexToRemove);
    const newTotal = newData.reduce((sum, item) => sum + item.value, 0);
    
    // Пересчитываем проценты
    const recalculatedData = newData.map(item => {
      const newPercentage = (item.value / newTotal) * 100;
      return {
        ...item,
        percentage: Number(newPercentage.toFixed(2)),
        decimals: newPercentage / 100,
      };
    });

    setData(recalculatedData);
    totalValue.value = withTiming(newTotal, { duration: 500 });
    decimals.value = recalculatedData.map(crypto => crypto.percentage / 100);
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
      setLoadingCoins([]); // Очищаем загружающиеся монеты при новой генерации

      let selectedCryptos: any[] = [];
      const coinsNeeded = n;

      // Если есть выбранные монеты, используем их + дополняем рандомными
      if (selectedCoins.length > 0) {
        // Сначала проверяем кеш для выбранных монет
        const cachedData = await getCachedCoinList();
        const cachedSelectedCoins = cachedData ? cachedData.filter(c => selectedCoins.some(sc => sc.id === c.id)) : [];
        
        // Получаем данные для выбранных монет (с retry при rate limit)
        const selectedCoinsData = await fetchCoinsByIds(selectedCoins.map(c => c.id));
        
        // Определяем какие монеты загружены, а какие еще загружаются
        const loadedCoinIds = new Set(selectedCoinsData.map(c => c.id));
        const loadingCoinIds = selectedCoins.filter(sc => !loadedCoinIds.has(sc.id) && !cachedSelectedCoins.some(c => c.id === sc.id));
        
        // Устанавливаем загружающиеся монеты для отображения
        if (loadingCoinIds.length > 0) {
          setLoadingCoins(loadingCoinIds.map(sc => ({
            id: sc.id,
            name: sc.name,
            symbol: sc.symbol,
            image: sc.image,
          })));
        }
        
        // Если данные загружены, используем их, иначе используем из кеша если есть
        const finalSelectedCoins = selectedCoinsData.length > 0 ? selectedCoinsData : cachedSelectedCoins;
        
        // Количество монет для основного портфеля = 10 - количество загружающихся
        const availableSlots = coinsNeeded - loadingCoinIds.length;
        
        // Если нужно больше монет, дополняем рандомными
        if (finalSelectedCoins.length < availableSlots) {
          const cryptoData = await fetchCryptoData();
          if (cryptoData && Array.isArray(cryptoData) && cryptoData.length > 0) {
            // Исключаем уже выбранные монеты и загружающиеся
            const selectedIds = new Set([...finalSelectedCoins.map(c => c.id), ...loadingCoinIds.map(c => c.id)]);
            const availableCryptos = cryptoData.filter(c => !selectedIds.has(c.id));
            const randomCount = availableSlots - finalSelectedCoins.length;
            const randomCryptos = getRandomCryptos(availableCryptos, randomCount, availableCryptos.length);
            selectedCryptos = [...finalSelectedCoins, ...randomCryptos];
          } else {
            selectedCryptos = finalSelectedCoins;
          }
        } else {
          selectedCryptos = finalSelectedCoins.slice(0, availableSlots);
        }
      } else {
        // Обычный режим: только рандомные монеты
        const cryptoData = await fetchCryptoData();
        if (!cryptoData || !Array.isArray(cryptoData) || cryptoData.length === 0) {
          return;
        }
        selectedCryptos = getRandomCryptos(cryptoData, coinsNeeded);
      }

      if (selectedCryptos.length === 0) {
        Alert.alert('Error', 'Could not fetch cryptocurrency data. Please try again.');
        return;
      }


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

      // Фильтруем валидные монеты и убираем дубликаты по id
      const seenIds = new Set<string>();
      const validSelectedCryptos = selectedCryptos.filter(c => {
        if (!c || !c.id) return false;
        if (seenIds.has(c.id)) return false;
        seenIds.add(c.id);
        return true;
      });
      
      if (validSelectedCryptos.length === 0) {
        Alert.alert('Error', 'No valid cryptocurrency data available. Please try again.');
        return;
      }
      
      // Генерируем массив объектов с данными
      const arrayOfObjects = generateNumbers.map((value, index) => {
        const crypto = validSelectedCryptos[index] || validSelectedCryptos[validSelectedCryptos.length - 1];
        if (!crypto || !crypto.id) {
          throw new Error('No valid cryptocurrency data available');
        }
        return {
          id: crypto.id,
          name: crypto.name || 'Unknown',
          image: crypto.image || '',
          symbol: crypto.symbol || 'UNK',
          minPrice: crypto.ath || 0,
          maxPrice: crypto.atl || 0,
          price: crypto.current_price || 0,
          marketCap: crypto.market_cap || 0,
          marketCapChangePercentage24h: crypto.market_cap_change_percentage_24h || 0,
          priceChangePercentage24h: crypto.price_change_percentage_24h || 0,
          circulatingSupply: crypto.circulating_supply || 0,
          maxSupply: crypto.max_supply || 0,
          totalSupply: crypto.total_supply || 0,
          totalVolume: crypto.total_volume || 0,
          marketCapRank: crypto.market_cap_rank || 0,
          value,
          percentage: generatePercentages[index] || 0,
          decimals: (generateDecimals[index] || 0) / 100,
          color: colors[index] || generateRandomColor(1)[0],
          url: 'https://www.coingecko.com/en/coins/' + crypto.id,
          categories: [], // Будет загружено позже
        };
      });

      // Загружаем категории для каждой монеты (параллельно, но с ограничением)
      const coinsWithCategories = await Promise.all(
        arrayOfObjects.map(async (coin) => {
          try {
            const response = await fetch(
              `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`
            );
            if (response.ok) {
              const coinData = await response.json();
              return {
                ...coin,
                categories: coinData.categories || [],
              };
            }
          } catch (error) {
            console.error(`Failed to load categories for ${coin.id}:`, error);
          }
          return coin;
        })
      );

      // Выводим данные в консоль (можно заменить на setData(arrayOfObjects); если используете React)
      setData(coinsWithCategories);
      // Убрали автоматическое сохранение - теперь пользователь сохраняет вручную
      registerMixEvent({ totalValue: total, portfolio: coinsWithCategories });
      // Помечаем, что это новый сгенерированный портфель
      setIsFromHistory(false);
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
        contentContainerStyle={{ alignItems: 'center', paddingBottom: hp('10%') }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="normal"
        snapToAlignment="start"
        snapToInterval={undefined}
      >
        <View style={[styles.general]}>
          <Text style={[styles.label, {color: 'black'}]}>Portfolio amount:</Text>
          <TouchableOpacity
            onPress={() => setAmountModalVisible(true)}
            style={styles.amountButton}
          >
            <Text style={styles.amountButtonText}>${amount.toLocaleString()}</Text>
            <MaterialIcons name="edit" size={wp('4%')} color="#FF6E76" />
          </TouchableOpacity>
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
        <View style={{ flexDirection: 'row', gap: wp('2%'), marginBottom: hp('5.71%') }}>
          <TouchableOpacity
            onPress={() => setCoinSearchVisible(true)}
            style={[styles.addCoinsButton, selectedCoins.length > 0 && styles.addCoinsButtonActive]}
          >
            <MaterialIcons 
              name={selectedCoins.length > 0 ? "check-circle" : "add-circle-outline"} 
              size={wp('4.5%')} 
              color={selectedCoins.length > 0 ? "#FFFFFF" : "#FF6E76"} 
            />
            <Text style={[styles.addCoinsText, selectedCoins.length > 0 && styles.addCoinsTextActive]}>
              {selectedCoins.length > 0 ? `${selectedCoins.length} Selected` : 'Add Coins'}
            </Text>
          </TouchableOpacity>
        </View>

        {data.length > 0 && (
          <View style={styles.panelWrapper}>
            <PortfolioInsights
              categories={analyzeCategories(data)}
              metrics={calculatePortfolioMetrics(data)}
              expanded={isInsightsExpanded}
              onToggle={() => setInsightsExpanded(prev => !prev)}
            />
          </View>
        )}

        <View style={styles.panelWrapper}>
          <GamificationPanel
            missions={missions}
            flavors={flavors}
            expanded={isArcadeExpanded}
            onToggle={() => setArcadeExpanded(prev => !prev)}
            onReset={resetGamification}
            totalMixes={totalMixes}
            dailyMixes={dailyMixes}
            wallet={wallet}
            level={level}
            xp={xp}
            streakCount={streakCount}
            onBoost={boostWallet}
            lastPortfolio={lastPortfolio}
          />
        </View>
        {data.map((item, index) => (
          <RenderItem
            item={item}
            key={`${item.id}-${index}`}
            index={index}
            donutImages={images}
            onPress={(coin) => setSelectedCoin({ id: coin.id, name: coin.name, symbol: coin.symbol, image: coin.image })}
            onRemove={() => handleRemoveCoin(index)}
            showRemoveButton={!isFromHistory}
          />
        ))}
        
        {/* Loading coins - показываем отдельно ниже основных пончиков */}
        {loadingCoins.length > 0 && loadingCoins.map((loadingCoin, index) => {
          const loadingItem = {
            id: loadingCoin.id,
            name: loadingCoin.name,
            symbol: loadingCoin.symbol,
            value: 0,
            percentage: 0,
            color: generateRandomColor(1)[0],
            image: loadingCoin.image,
            url: `https://www.coingecko.com/en/coins/${loadingCoin.id}`,
            decimals: 0,
          };
          return (
            <RenderItem
              item={loadingItem}
              key={`loading-${loadingCoin.id}-${index}`}
              index={data.length + index}
              donutImages={images}
              onPress={(coin) => setSelectedCoin({ id: coin.id, name: coin.name, symbol: coin.symbol, image: coin.image })}
              isLoading={true}
            />
          );
        })}
        
        {data.length > 0 && !isFromHistory && (
          <TouchableOpacity onPress={handleSavePortfolio} style={styles.saveButton}>
            <MaterialIcons name="save" size={wp('5%')} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Portfolio</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <StatusBar style="auto" />

      <HistoryModal
        visible={isHistoryVisible}
        history={history}
        onClose={() => setHistoryVisible(false)}
        onSelect={handleHistorySelect}
        onClear={async () => {
          await clearHistory();
        }}
        onRemove={async (index) => {
          await removeFromHistory(index);
        }}/>

      <PromptModal
        visible={isPromptVisible}
        data={data}
        onClose={() => setPromptVisible(false)}
        onCopy={async (text) => {
          await Clipboard.setStringAsync(text);
        }}
      />

      <AmountModal
        visible={isAmountModalVisible}
        currentAmount={amount}
        onClose={() => setAmountModalVisible(false)}
        onConfirm={(newAmount) => setAmount(newAmount)}
      />

      <CoinDetailsModal
        visible={selectedCoin !== null}
        coinId={selectedCoin?.id || ''}
        coinName={selectedCoin?.name || ''}
        coinSymbol={selectedCoin?.symbol || ''}
        coinImage={selectedCoin?.image || ''}
        onClose={() => setSelectedCoin(null)}
      />

      <CoinSearchModal
        visible={isCoinSearchVisible}
        onClose={() => setCoinSearchVisible(false)}
        onSelectCoins={(coins) => setSelectedCoins(coins)}
        selectedCoins={selectedCoins}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  general: {color: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: wp('9.09%'), marginRight: wp('9.09%'), marginTop: hp('9.52%'), marginBottom: hp('0.952%')},
  input: {color: 'black', fontSize: wp('4.36%'), fontWeight: '700'},
  label: {
    fontSize: wp('4.36%'), fontWeight: '700'
  },
  amountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('1%'),
  },
  amountButtonText: {
    color: '#FF6E76',
    fontSize: wp('4.5%'),
    fontWeight: '700',
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
    marginBottom: hp('1%'),
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
  panelWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  addCoinsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.2%'),
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF6E76',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  addCoinsButtonActive: {
    backgroundColor: '#FF6E76',
    borderColor: '#FF6E76',
  },
  addCoinsText: {
    marginLeft: wp('2%'),
    fontSize: wp('3.8%'),
    fontWeight: '600',
    color: '#FF6E76',
  },
  addCoinsTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6E76',
    paddingHorizontal: wp('8%'),
    paddingVertical: hp('2%'),
    borderRadius: 25,
    marginTop: hp('2%'),
    marginBottom: hp('3%'),
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    gap: wp('2%'),
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: wp('4.5%'),
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