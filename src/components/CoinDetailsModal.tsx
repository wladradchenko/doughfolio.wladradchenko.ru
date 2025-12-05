import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  PanResponder,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Canvas, Path, Skia, Text as SkiaText, useFont, Line, Rect } from '@shopify/react-native-skia';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { EducationCard } from './EducationCard';
import { getCategoryEducation, getRandomEducationTip } from '../utils/cryptoEducation';
import {
  calculateTechnicalIndicators,
  formatIndicator,
  getRSIInterpretation,
  getMomentumInterpretation,
  getVolatilityInterpretation,
} from '../utils/technicalIndicators';

type PricePoint = [number, number]; // [timestamp, price]

type CoinDetails = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  description?: string;
  categories?: string[];
  homepage?: string;
  blockchain_site?: string[];
  github?: string;
};

type Props = {
  visible: boolean;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  coinImage: string;
  onClose: () => void;
};

const formatPrice = (price: number): string => {
  if (price < 0.01) {
    return price.toExponential(2);
  }
  if (price < 1) {
    return price.toFixed(4);
  }
  if (price < 1000) {
    return price.toFixed(2);
  }
  return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const PriceChart = ({ prices, fullPrices }: { prices: PricePoint[]; fullPrices?: PricePoint[] }) => {
  // Проверяем что prices валидный массив с данными
  if (!prices || !Array.isArray(prices) || prices.length === 0) {
    return (
      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartPlaceholderText}>No chart data available</Text>
      </View>
    );
  }

  // Фильтруем валидные точки (должны быть массивы из 2 элементов)
  const validPrices = prices.filter(
    (p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && !isNaN(p[1])
  );

  if (validPrices.length === 0) {
    return (
      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartPlaceholderText}>Invalid chart data</Text>
      </View>
    );
  }

  const chartHeight = hp('20%');
  const chartWidth = wp('80%');
  const padding = 5;

  const priceValues = validPrices.map(p => p[1]);
  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);
  const startPrice = validPrices[0][1];
  const endPrice = validPrices[validPrices.length - 1][1];
  const priceRange = maxPrice - minPrice || 1;

  const points = validPrices.map((point, index) => {
    const x = padding + (index / (validPrices.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((point[1] - minPrice) / priceRange) * (chartHeight - padding * 2);
    return { x, y, price: point[1], index };
  });

  // Состояние для интерактивной линии
  const [touchX, setTouchX] = useState<number | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [selectedY, setSelectedY] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSelectedPoint = (x: number) => {
    // Находим ближайшую точку данных
    const normalizedX = (x - padding) / (chartWidth - padding * 2);
    const targetIndex = Math.round(normalizedX * (points.length - 1));
    const clampedIndex = Math.max(0, Math.min(targetIndex, points.length - 1));
    const point = points[clampedIndex];
    
    setTouchX(point.x);
    setSelectedPrice(point.price);
    setSelectedY(point.y);
  };

  // PanResponder для обработки тача
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Очищаем предыдущий таймаут
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        const x = evt.nativeEvent.locationX;
        if (x >= padding && x <= chartWidth - padding) {
          updateSelectedPoint(x);
        }
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        if (x >= padding && x <= chartWidth - padding) {
          updateSelectedPoint(x);
        }
      },
      onPanResponderRelease: () => {
        // Оставляем линию на 2 секунды, затем скрываем
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setTouchX(null);
          setSelectedPrice(null);
          setSelectedY(null);
          timeoutRef.current = null;
        }, 2000);
      },
    })
  ).current;

  // Cleanup таймаута при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (points.length === 0) {
    return (
      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartPlaceholderText}>No chart data available</Text>
      </View>
    );
  }

  // Создаем path для линии графика
  const path = Skia.Path.Make();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y);
  }

  // Создаем area path для заливки под графиком
  const areaPath = Skia.Path.Make();
  areaPath.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    areaPath.lineTo(points[i].x, points[i].y);
  }
  areaPath.lineTo(points[points.length - 1].x, chartHeight - padding);
  areaPath.lineTo(points[0].x, chartHeight - padding);
  areaPath.close();

  // Загружаем шрифт для текста
  const font = useFont(require('../assets/fonts/Roboto-Bold.ttf'), wp('3%'));

  return (
    <View>
      {/* График с жестами */}
      <View style={styles.chartContainer} {...panResponder.panHandlers}>
        <Canvas style={{ width: chartWidth, height: chartHeight }}>
          {/* График с прозрачностью, если еще не тапнули */}
          <Path path={areaPath} color={touchX === null ? "#FF6E7640" : "#FF6E7640"} />
          <Path 
            path={path} 
            style="stroke" 
            strokeWidth={2} 
            color={touchX === null ? "#FF6E76" : "#FF6E76"}
            opacity={touchX === null ? 0.4 : 1}
          />
          
          {/* Overlay с подсказкой, если еще не тапнули */}
          {touchX === null && (
            <>
              {/* Полупрозрачный белый overlay */}
              <Rect
                x={0}
                y={0}
                width={chartWidth}
                height={chartHeight}
                color="#FFFFFF"
                opacity={0.6}
              />
              {/* Текст подсказки */}
              {font && (
                <SkiaText
                  x={chartWidth / 2 - font.measureText('Tap and drag to explore prices').width / 2}
                  y={chartHeight / 2}
                  text="Tap and drag to explore prices"
                  font={font}
                  color="#2B1D27"
                />
              )}
            </>
          )}
          
          {/* Интерактивная линия при тапе */}
          {touchX !== null && selectedPrice !== null && selectedY !== null && (
            <>
              <Line
                p1={{ x: touchX, y: padding }}
                p2={{ x: touchX, y: chartHeight - padding }}
                color="#FF6E76"
                style="stroke"
                strokeWidth={1.5}
              />
              {font && (
                <SkiaText
                  x={touchX - font.measureText(`$${formatPrice(selectedPrice)}`).width / 2}
                  y={selectedY - 10}
                  text={`$${formatPrice(selectedPrice)}`}
                  font={font}
                  color="#2B1D27"
                />
              )}
            </>
          )}
        </Canvas>
      </View>

      {/* Start и End цены внизу под графиком, ближе к графику */}
      <View style={styles.priceLabelsBottom}>
        <View style={styles.priceLabelLeft}>
          <Text style={styles.priceLabelText}>${formatPrice(startPrice)}</Text>
        </View>
        <View style={styles.priceLabelCenter}>
          <Text style={styles.chartLabel}>30 days</Text>
        </View>
        <View style={styles.priceLabelRight}>
          <Text style={styles.priceLabelText}>${formatPrice(endPrice)}</Text>
        </View>
      </View>

      {/* Technical Indicators */}
      {fullPrices && fullPrices.length >= 20 && (
        <TechnicalIndicatorsPanel prices={fullPrices} />
      )}
    </View>
  );
};

// Компонент для отображения технических индикаторов
const TechnicalIndicatorsPanel = ({ prices }: { prices: PricePoint[] }) => {
  const indicators = calculateTechnicalIndicators(prices);
  const rsiInfo = getRSIInterpretation(indicators.rsi);
  const momentumInfo = getMomentumInterpretation(indicators.momentum);
  const volatilityInfo = getVolatilityInterpretation(indicators.volatility);

  return (
    <View style={styles.indicatorsContainer}>
      <Text style={styles.indicatorsTitle}>Technical Indicators</Text>
      
      <View style={styles.indicatorsGrid}>
        {/* Volatility */}
        <View style={styles.indicatorCard}>
          <Text style={styles.indicatorLabel}>Volatility</Text>
          <Text style={[styles.indicatorValue, { color: volatilityInfo.color }]}>
            {formatIndicator(indicators.volatility, 'percentage')}
          </Text>
          <Text style={[styles.indicatorStatus, { color: volatilityInfo.color }]}>
            {volatilityInfo.label}
          </Text>
        </View>

        {/* Momentum */}
        <View style={styles.indicatorCard}>
          <Text style={styles.indicatorLabel}>Momentum</Text>
          <Text style={[styles.indicatorValue, { color: momentumInfo.color }]}>
            {formatIndicator(indicators.momentum, 'percentage')}
          </Text>
          <Text style={[styles.indicatorStatus, { color: momentumInfo.color }]}>
            {momentumInfo.label}
          </Text>
        </View>

        {/* RSI */}
        <View style={styles.indicatorCard}>
          <Text style={styles.indicatorLabel}>RSI</Text>
          <Text style={[styles.indicatorValue, { color: rsiInfo.color }]}>
            {formatIndicator(indicators.rsi, 'rsi')}
          </Text>
          <Text style={[styles.indicatorStatus, { color: rsiInfo.color }]}>
            {rsiInfo.label}
          </Text>
        </View>

        {/* Bollinger Compression */}
        <View style={styles.indicatorCard}>
          <Text style={styles.indicatorLabel}>BB Width</Text>
          <Text style={styles.indicatorValue}>
            {formatIndicator(indicators.bollingerCompression, 'percentage')}
          </Text>
          <Text style={styles.indicatorSubtext}>
            {indicators.bollingerCompression < 2 ? 'Low' : indicators.bollingerCompression < 5 ? 'Normal' : 'High'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export const CoinDetailsModal = ({
  visible,
  coinId,
  coinName,
  coinSymbol,
  coinImage,
  onClose,
}: Props) => {
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartRequested, setChartRequested] = useState(false);
  const [coinDetails, setCoinDetails] = useState<CoinDetails | null>(null);
  const [chartData, setChartData] = useState<PricePoint[]>([]);
  const [fullChartData, setFullChartData] = useState<PricePoint[]>([]); // Полные данные для расчета индикаторов
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedEducationCard, setSelectedEducationCard] = useState<string | null>(null);
  const [randomTip] = useState(() => getRandomEducationTip());

  useEffect(() => {
    if (visible && coinId) {
      loadCoinData();
    } else {
      // Сбрасываем данные при закрытии
      setCoinDetails(null);
      setChartData([]);
      setFullChartData([]);
      setLoading(true);
      setChartLoading(false);
      setChartRequested(false);
      setRetryCount(0);
      setIsRetrying(false);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }

    // Cleanup при размонтировании
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [visible, coinId]);

  const loadChartWithRetry = async (attempt: number = 0) => {
    const maxRetries = 5;
    const retryDelay = 60000; // 30 секунд

    if (attempt >= maxRetries) {
      setChartLoading(false);
      setChartData([]);
      setIsRetrying(false);
      return;
    }

    try {
      setChartLoading(true);
      setIsRetrying(attempt > 0);
      setRetryCount(attempt);

      const chartResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30`
      );

      if (chartResponse.ok) {
        const chart = await chartResponse.json();
        if (chart.prices && Array.isArray(chart.prices) && chart.prices.length > 0) {
          const allPrices: PricePoint[] = chart.prices;
          // Сохраняем полные данные для расчета индикаторов
          setFullChartData(allPrices);
          // Упрощаем: берем максимум 100 точек для плавного и быстрого графика
          const maxPoints = 100;
          const step = Math.max(1, Math.floor(allPrices.length / maxPoints));
          const simplifiedPrices = allPrices.filter((_, index) => index % step === 0);
          setChartData(simplifiedPrices);
          setChartLoading(false);
          setIsRetrying(false);
          setRetryCount(0);
          return;
        }
      }

      // Если запрос не успешен (rate limit или другая ошибка)
      if (chartResponse.status === 429 || chartResponse.status >= 500) {
        // Повторяем через 60 секунд
        retryTimerRef.current = setTimeout(() => {
          loadChartWithRetry(attempt + 1);
        }, retryDelay);
      } else {
        // Другая ошибка - не повторяем
        setChartData([]);
        setChartLoading(false);
        setIsRetrying(false);
      }
    } catch (error) {
      console.error('Failed to load chart:', error);
      // При ошибке сети тоже повторяем
      retryTimerRef.current = setTimeout(() => {
        loadChartWithRetry(attempt + 1);
      }, retryDelay);
    }
  };

  const loadCoinData = async () => {
    setLoading(true);
    setChartLoading(false);
    setChartRequested(false);
    setRetryCount(0);
    setIsRetrying(false);

    try {
      // Сначала загружаем детали монеты (быстро) - показываем UI сразу
      const detailsResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`
      );

      if (detailsResponse.ok) {
        const details = await detailsResponse.json();
        setCoinDetails({
          id: details.id,
          name: details.name,
          symbol: details.symbol,
          image: details.image?.large || coinImage,
          description: details.description?.en?.substring(0, 300) + '...',
          categories: details.categories || [],
          homepage: details.links?.homepage?.[0],
          blockchain_site: details.links?.blockchain_site?.filter((s: string) => s) || [],
          github: details.links?.repos_url?.github?.[0],
        });
      }

      // UI уже показан, график загрузится только по запросу пользователя
      setLoading(false);
    } catch (error) {
      console.error('Failed to load coin data:', error);
      setChartData([]);
      setLoading(false);
      setChartLoading(false);
    }
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={wp('6%')} color="#7A5B64" />
          </TouchableOpacity>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6E76" />
              <Text style={styles.loadingText}>Loading coin data...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.coinInfo}>
                  <Text style={styles.coinName}>{coinName}</Text>
                  <Text style={styles.coinSymbol}>{coinSymbol.toUpperCase()}</Text>
                </View>
              </View>

              {/* Chart */}
              {!chartRequested ? (
                <TouchableOpacity
                  style={styles.chartPlaceholder}
                  onPress={() => {
                    setChartRequested(true);
                    loadChartWithRetry();
                  }}
                >
                  <MaterialIcons name="show-chart" size={wp('12%')} color="#FF6E76" />
                  <Text style={styles.chartPlaceholderText}>View Price Chart</Text>
                  <Text style={styles.chartPlaceholderSubtext}>
                    Tap to load 30-day price history
                  </Text>
                </TouchableOpacity>
              ) : chartLoading ? (
                <View style={styles.chartPlaceholder}>
                  <ActivityIndicator size="small" color="#FF6E76" />
                  {isRetrying ? (
                    <>
                      <Text style={styles.chartPlaceholderText}>
                        Rate limit reached. Retrying...
                      </Text>
                      <Text style={styles.retryInfo}>
                        Attempt {retryCount + 1}/5 • Next try in 60s
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.chartPlaceholderText}>Loading chart...</Text>
                  )}
                </View>
              ) : chartData.length > 0 ? (
                <PriceChart prices={chartData} fullPrices={fullChartData} />
              ) : (
                <View style={styles.chartPlaceholder}>
                  <MaterialIcons name="error-outline" size={wp('10%')} color="#9B9B9B" />
                  <Text style={styles.chartPlaceholderText}>Chart data unavailable</Text>
                  <Text style={styles.retryInfo}>
                    CoinGecko API rate limit. Try again later.
                  </Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                      setChartRequested(true);
                      loadChartWithRetry();
                    }}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Categories */}
              {coinDetails?.categories && coinDetails.categories.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Categories</Text>
                  <View style={styles.categoriesGrid}>
                    {coinDetails.categories.map((cat, index) => {
                      const education = getCategoryEducation(cat);
                      return (
                        <TouchableOpacity
                          key={index}
                          style={styles.categoryTag}
                          onPress={() => education && setSelectedEducationCard(cat)}
                          disabled={!education}
                        >
                          <Text style={styles.categoryTagText}>{cat}</Text>
                          {education && (
                            <MaterialIcons 
                              name="info-outline" 
                              size={wp('3%')} 
                              color="#FF6E76" 
                              style={{ marginLeft: wp('1%') }}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selectedEducationCard && getCategoryEducation(selectedEducationCard) && (
                    <View style={styles.educationContainer}>
                      <EducationCard
                        card={getCategoryEducation(selectedEducationCard)!}
                        onClose={() => setSelectedEducationCard(null)}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* Description */}
              {coinDetails?.description && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.description}>{coinDetails.description}</Text>
                </View>
              )}

              {/* Links */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Links</Text>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => handleOpenLink(`https://www.coingecko.com/en/coins/${coinId}`)}
                >
                  <MaterialIcons name="open-in-new" size={wp('4%')} color="#FF6E76" />
                  <Text style={styles.linkText}>View on CoinGecko</Text>
                </TouchableOpacity>

                {coinDetails?.homepage && (
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => handleOpenLink(coinDetails.homepage!)}
                  >
                    <MaterialIcons name="language" size={wp('4%')} color="#FF6E76" />
                    <Text style={styles.linkText}>Official Website</Text>
                  </TouchableOpacity>
                )}

                {coinDetails?.github && (
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => handleOpenLink(coinDetails.github!)}
                  >
                    <MaterialIcons name="code" size={wp('4%')} color="#FF6E76" />
                    <Text style={styles.linkText}>GitHub</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Random Education Tip */}
              <View style={styles.section}>
                <EducationCard card={randomTip} />
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: wp('90%'),
    maxHeight: hp('85%'),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: hp('2.5%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: wp('1%'),
    marginBottom: hp('1%'),
  },
  loadingContainer: {
    padding: hp('5%'),
    alignItems: 'center',
  },
  loadingText: {
    marginTop: hp('2%'),
    fontSize: wp('3.5%'),
    color: '#7A5B64',
  },
  content: {
    paddingBottom: hp('2%'),
  },
  header: {
    marginBottom: hp('2%'),
  },
  coinInfo: {
    alignItems: 'center',
  },
  coinName: {
    fontSize: wp('5.5%'),
    fontWeight: '700',
    color: '#2B1D27',
  },
  coinSymbol: {
    fontSize: wp('4%'),
    color: '#7A5B64',
    marginTop: hp('0.5%'),
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: hp('2%'),
    marginBottom: 0,
  },
  priceLabelsBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: wp('80%'),
    paddingHorizontal: 5,
    marginTop: 0,
  },
  priceLabelLeft: {
    alignItems: 'flex-start',
    marginLeft: wp('1.5%'),
    flex: 1,
  },
  priceLabelCenter: {
    alignItems: 'center',
    flex: 1,
  },
  priceLabelRight: {
    alignItems: 'flex-end',
    marginRight: wp('1.5%'),
    flex: 1,
  },
  priceLabelText: {
    fontSize: wp('3.2%'),
    fontWeight: '700',
    color: '#FF6E76',
  },
  priceLabelSubtext: {
    fontSize: wp('2.5%'),
    color: '#7A5B64',
    marginTop: hp('0.3%'),
  },
  chartPlaceholder: {
    height: hp('20%'),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF3F6',
    borderRadius: 12,
    marginVertical: hp('2%'),
  },
  chartPlaceholderText: {
    marginTop: hp('1%'),
    fontSize: wp('4%'),
    color: '#FF6E76',
    fontWeight: '600',
    textAlign: 'center',
  },
  chartPlaceholderSubtext: {
    marginTop: hp('0.5%'),
    fontSize: wp('3%'),
    color: '#7A5B64',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: hp('1.5%'),
    backgroundColor: '#FF6E76',
    paddingHorizontal: wp('6%'),
    paddingVertical: hp('1%'),
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: wp('3.5%'),
    fontWeight: '600',
  },
  retryInfo: {
    marginTop: hp('0.5%'),
    fontSize: wp('2.8%'),
    color: '#9B59B6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: wp('80%'),
    marginTop: hp('1%'),
  },
  chartLabel: {
    fontSize: wp('3%'),
    color: '#7A5B64',
  },
  chartPrice: {
    fontSize: wp('3%'),
    color: '#7A5B64',
    fontWeight: '600',
  },
  section: {
    marginTop: hp('2%'),
    backgroundColor: '#FFF3F6',
    borderRadius: 16,
    padding: hp('1.5%'),
  },
  sectionTitle: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#2B1D27',
    marginBottom: hp('1%'),
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
  },
  categoryTag: {
    backgroundColor: '#FFE4E8',
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.6%'),
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  educationContainer: {
    marginTop: hp('1.5%'),
  },
  categoryTagText: {
    fontSize: wp('3.2%'),
    color: '#FF6E76',
    fontWeight: '600',
  },
  description: {
    fontSize: wp('3.5%'),
    color: '#7A5B64',
    lineHeight: wp('5%'),
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: hp('1.2%'),
    borderRadius: 12,
    marginBottom: hp('0.8%'),
    gap: wp('2%'),
  },
  linkText: {
    fontSize: wp('3.8%'),
    color: '#FF6E76',
    fontWeight: '600',
  },
  indicatorsContainer: {
    marginTop: hp('2%'),
    backgroundColor: '#FFF3F6',
    borderRadius: 16,
    padding: hp('1.5%'),
  },
  indicatorsTitle: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#2B1D27',
    marginBottom: hp('1%'),
  },
  indicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
  },
  indicatorCard: {
    flex: 1,
    minWidth: wp('35%'),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: hp('1%'),
    alignItems: 'center',
  },
  indicatorLabel: {
    fontSize: wp('2.8%'),
    color: '#7A5B64',
    marginBottom: hp('0.5%'),
  },
  indicatorValue: {
    fontSize: wp('3.5%'),
    fontWeight: '700',
    marginBottom: hp('0.3%'),
  },
  indicatorStatus: {
    fontSize: wp('2.5%'),
    fontWeight: '600',
  },
  indicatorSubtext: {
    fontSize: wp('2.5%'),
    color: '#7A5B64',
  },
});

