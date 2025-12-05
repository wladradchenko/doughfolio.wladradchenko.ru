interface CoinMetrics {
  percentage: number;
  value: number;
  priceChangePercentage24h?: number;
  marketCap?: number;
  marketCapRank?: number;
  totalVolume?: number;
}

export type PortfolioMetrics = {
  totalValue: number;
  averageVolatility: number;
  maxVolatility: number;
  minVolatility: number;
  diversificationScore: number; // 0-100
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  topPerformer: string | null;
  worstPerformer: string | null;
  averageMarketCapRank: number;
  concentrationRisk: number; // 0-100, чем выше, тем больше концентрация
};

export const calculatePortfolioMetrics = (
  coins: Array<CoinMetrics & { name: string }>
): PortfolioMetrics => {
  if (!coins || coins.length === 0) {
    return {
      totalValue: 0,
      averageVolatility: 0,
      maxVolatility: 0,
      minVolatility: 0,
      diversificationScore: 0,
      riskLevel: 'Low',
      topPerformer: null,
      worstPerformer: null,
      averageMarketCapRank: 0,
      concentrationRisk: 0,
    };
  }

  const totalValue = coins.reduce((sum, coin) => sum + coin.value, 0);

  // Волатильность
  const volatilities = coins
    .map(coin => Math.abs(coin.priceChangePercentage24h ?? 0))
    .filter(v => !isNaN(v) && v > 0);

  const averageVolatility = volatilities.length > 0
    ? volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length
    : 0;

  const maxVolatility = volatilities.length > 0 ? Math.max(...volatilities) : 0;
  const minVolatility = volatilities.length > 0 ? Math.min(...volatilities) : 0;

  // Топ и худший перформер
  const performers = coins
    .filter(coin => coin.priceChangePercentage24h !== undefined)
    .sort((a, b) => (b.priceChangePercentage24h ?? 0) - (a.priceChangePercentage24h ?? 0));

  const topPerformer = performers.length > 0 ? performers[0].name : null;
  const worstPerformer = performers.length > 0 ? performers[performers.length - 1].name : null;

  // Средний ранг по капитализации
  const ranks = coins
    .map(coin => coin.marketCapRank ?? 999)
    .filter(r => r > 0);

  const averageMarketCapRank = ranks.length > 0
    ? Math.round(ranks.reduce((sum, r) => sum + r, 0) / ranks.length)
    : 0;

  // Оценка диверсификации (чем больше монет и равномернее распределение, тем выше)
  const percentages = coins.map(coin => coin.percentage);
  const maxPercentage = Math.max(...percentages);
  const percentageVariance = percentages.reduce((sum, p) => {
    const avg = 100 / coins.length;
    return sum + Math.pow(p - avg, 2);
  }, 0) / coins.length;

  // Диверсификация: 100 - (концентрация + неравномерность)
  const concentrationRisk = maxPercentage; // Процент самой большой позиции
  const diversificationScore = Math.max(0, Math.min(100, 
    100 - concentrationRisk - (percentageVariance / 10)
  ));

  // Уровень риска на основе волатильности и концентрации
  let riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  if (averageVolatility < 2 && concentrationRisk < 30) {
    riskLevel = 'Low';
  } else if (averageVolatility < 5 && concentrationRisk < 50) {
    riskLevel = 'Medium';
  } else if (averageVolatility < 10) {
    riskLevel = 'High';
  } else {
    riskLevel = 'Very High';
  }

  return {
    totalValue,
    averageVolatility: Math.round(averageVolatility * 100) / 100,
    maxVolatility: Math.round(maxVolatility * 100) / 100,
    minVolatility: Math.round(minVolatility * 100) / 100,
    diversificationScore: Math.round(diversificationScore),
    riskLevel,
    topPerformer,
    worstPerformer,
    averageMarketCapRank,
    concentrationRisk: Math.round(concentrationRisk * 10) / 10,
  };
};

