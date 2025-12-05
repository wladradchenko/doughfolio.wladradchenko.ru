// Technical indicators calculations based on price data only

type PricePoint = [number, number]; // [timestamp, price]

export interface TechnicalIndicators {
  volatility: number; // Волатильность (%)
  momentum: number; // Momentum/ROC (%)
  rsi: number; // RSI (0-100)
  bollingerUpper: number; // Верхняя полоса Боллинджера
  bollingerMiddle: number; // Средняя линия (SMA)
  bollingerLower: number; // Нижняя полоса Боллинджера
  bollingerCompression: number; // Сжатие полос (%)
}

/**
 * Рассчитывает технические индикаторы на основе данных цен
 */
export function calculateTechnicalIndicators(prices: PricePoint[]): TechnicalIndicators {
  if (!prices || prices.length < 20) {
    // Недостаточно данных для расчета
    return {
      volatility: 0,
      momentum: 0,
      rsi: 50,
      bollingerUpper: 0,
      bollingerMiddle: 0,
      bollingerLower: 0,
      bollingerCompression: 0,
    };
  }

  const priceValues = prices.map(p => p[1]).filter(p => p > 0);

  // 1. Волатильность (стандартное отклонение процентных изменений)
  const volatility = calculateVolatility(priceValues);

  // 2. Momentum/ROC (Rate of Change за 10 периодов)
  const momentum = calculateMomentum(priceValues, 10);

  // 3. RSI (Relative Strength Index, 14 периодов)
  const rsi = calculateRSI(priceValues, 14);

  // 4. Bollinger Bands (20 периодов, 2 стандартных отклонения)
  const bollinger = calculateBollingerBands(priceValues, 20, 2);

  return {
    volatility,
    momentum,
    rsi,
    bollingerUpper: bollinger.upper,
    bollingerMiddle: bollinger.middle,
    bollingerLower: bollinger.lower,
    bollingerCompression: bollinger.compression,
  };
}

/**
 * Рассчитывает волатильность как стандартное отклонение процентных изменений
 */
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const change = ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
    changes.push(change);
  }

  const mean = changes.reduce((sum, val) => sum + val, 0) / changes.length;
  const variance = changes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / changes.length;
  const stdDev = Math.sqrt(variance);

  // Годовая волатильность (умножаем на sqrt(365) для дневных данных)
  return stdDev * Math.sqrt(365);
}

/**
 * Рассчитывает Momentum/ROC (Rate of Change)
 */
function calculateMomentum(prices: number[], periods: number = 10): number {
  if (prices.length < periods + 1) return 0;

  const currentPrice = prices[prices.length - 1];
  const pastPrice = prices[prices.length - 1 - periods];

  if (pastPrice === 0) return 0;

  return ((currentPrice - pastPrice) / pastPrice) * 100;
}

/**
 * Рассчитывает RSI (Relative Strength Index)
 */
function calculateRSI(prices: number[], periods: number = 14): number {
  if (prices.length < periods + 1) return 50;

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }

  // Берем последние N периодов
  const recentGains = gains.slice(-periods);
  const recentLosses = losses.slice(-periods);

  const avgGain = recentGains.reduce((sum, val) => sum + val, 0) / periods;
  const avgLoss = recentLosses.reduce((sum, val) => sum + val, 0) / periods;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Math.max(0, Math.min(100, rsi));
}

/**
 * Рассчитывает Bollinger Bands
 */
function calculateBollingerBands(
  prices: number[],
  periods: number = 20,
  numStdDev: number = 2
): {
  upper: number;
  middle: number;
  lower: number;
  compression: number;
} {
  if (prices.length < periods) {
    const lastPrice = prices[prices.length - 1] || 0;
    return {
      upper: lastPrice,
      middle: lastPrice,
      lower: lastPrice,
      compression: 0,
    };
  }

  // Берем последние N периодов
  const recentPrices = prices.slice(-periods);
  const middle = recentPrices.reduce((sum, val) => sum + val, 0) / periods;

  // Стандартное отклонение
  const variance = recentPrices.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / periods;
  const stdDev = Math.sqrt(variance);

  const upper = middle + numStdDev * stdDev;
  const lower = middle - numStdDev * stdDev;

  // Сжатие полос (процент от средней цены)
  const bandWidth = (upper - lower) / middle;
  const compression = bandWidth * 100;

  return {
    upper,
    middle,
    lower,
    compression,
  };
}

/**
 * Форматирует значение индикатора для отображения
 */
export function formatIndicator(value: number, type: 'percentage' | 'number' | 'rsi'): string {
  if (isNaN(value) || !isFinite(value)) return 'N/A';

  if (type === 'percentage') {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  if (type === 'rsi') {
    return value.toFixed(1);
  }

  return value.toFixed(4);
}

/**
 * Получает интерпретацию RSI
 */
export function getRSIInterpretation(rsi: number): { label: string; color: string } {
  if (rsi >= 70) {
    return { label: 'Overbought', color: '#F44336' }; // Перекупленность
  }
  if (rsi <= 30) {
    return { label: 'Oversold', color: '#4CAF50' }; // Перепроданность
  }
  return { label: 'Neutral', color: '#7A5B64' }; // Нейтрально
}

/**
 * Получает интерпретацию Momentum
 */
export function getMomentumInterpretation(momentum: number): { label: string; color: string } {
  if (momentum > 5) {
    return { label: 'Strong Up', color: '#4CAF50' };
  }
  if (momentum > 0) {
    return { label: 'Up', color: '#8BC34A' };
  }
  if (momentum < -5) {
    return { label: 'Strong Down', color: '#F44336' };
  }
  if (momentum < 0) {
    return { label: 'Down', color: '#FF9800' };
  }
  return { label: 'Neutral', color: '#7A5B64' };
}

/**
 * Получает интерпретацию волатильности
 */
export function getVolatilityInterpretation(volatility: number): { label: string; color: string } {
  if (volatility > 100) {
    return { label: 'Very High', color: '#F44336' };
  }
  if (volatility > 50) {
    return { label: 'High', color: '#FF9800' };
  }
  if (volatility > 20) {
    return { label: 'Moderate', color: '#FFC107' };
  }
  return { label: 'Low', color: '#4CAF50' };
}

