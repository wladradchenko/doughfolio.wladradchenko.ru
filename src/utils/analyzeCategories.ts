interface CoinData {
  id: string;
  name: string;
  symbol: string;
  categories?: string[];
  percentage: number;
  value: number;
}

export type CategoryBreakdown = {
  category: string;
  percentage: number;
  coins: string[];
  totalValue: number;
};

export const analyzeCategories = (coins: CoinData[]): CategoryBreakdown[] => {
  const categoryMap = new Map<string, { percentage: number; coins: string[]; totalValue: number }>();

  coins.forEach(coin => {
    const categories = coin.categories || ['Uncategorized'];
    const coinContribution = coin.percentage / categories.length; // Распределяем процент поровну между категориями

    categories.forEach(category => {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { percentage: 0, coins: [], totalValue: 0 });
      }

      const entry = categoryMap.get(category)!;
      entry.percentage += coinContribution;
      entry.totalValue += coin.value / categories.length;
      
      if (!entry.coins.includes(coin.name)) {
        entry.coins.push(coin.name);
      }
    });
  });

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      percentage: Math.round(data.percentage * 10) / 10,
      coins: data.coins,
      totalValue: data.totalValue,
    }))
    .sort((a, b) => b.percentage - a.percentage);
};

export const getTopCategory = (breakdown: CategoryBreakdown[]): string | null => {
  return breakdown.length > 0 ? breakdown[0].category : null;
};

export const getCategoryDiversity = (breakdown: CategoryBreakdown[]): number => {
  return breakdown.length;
};

