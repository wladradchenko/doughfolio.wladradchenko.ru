import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import type { CategoryBreakdown } from '../utils/analyzeCategories';
import type { PortfolioMetrics } from '../utils/portfolioMetrics';
import { EducationCard } from './EducationCard';
import { getCategoryEducation } from '../utils/cryptoEducation';

type Props = {
  categories: CategoryBreakdown[];
  metrics: PortfolioMetrics;
  expanded: boolean;
  onToggle: () => void;
};

const RiskBadge = ({ level }: { level: PortfolioMetrics['riskLevel'] }) => {
  const colors = {
    Low: '#4CAF50',
    Medium: '#FFC107',
    High: '#FF9800',
    'Very High': '#F44336',
  };

  return (
    <View style={[styles.riskBadge, { backgroundColor: `${colors[level]}20` }]}>
      <View style={[styles.riskDot, { backgroundColor: colors[level] }]} />
      <Text style={[styles.riskText, { color: colors[level] }]}>{level} Risk</Text>
    </View>
  );
};

export const PortfolioInsights = ({ categories, metrics, expanded, onToggle }: Props) => {
  const topCategory = categories.length > 0 ? categories[0] : null;
  const [selectedEducationCategory, setSelectedEducationCategory] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Portfolio Analytics</Text>
          <Text style={styles.headerSubtitle}>
            {categories.length} categories • {metrics.diversificationScore}% diversified
          </Text>
        </View>
        <MaterialIcons
          name={expanded ? 'expand-less' : 'expand-more'}
          size={wp('6%')}
          color="#FF6E76"
        />
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Risk & Metrics */}
          <View style={styles.section}>
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Risk Level</Text>
                <RiskBadge level={metrics.riskLevel} />
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Diversification</Text>
                <Text style={styles.metricValue}>{metrics.diversificationScore}%</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${metrics.diversificationScore}%` }]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Avg Volatility</Text>
                <Text style={styles.metricValue}>{metrics.averageVolatility}%</Text>
                <Text style={styles.metricSubtext}>
                  Range: {metrics.minVolatility}% - {metrics.maxVolatility}%
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Avg Market Cap Rank</Text>
                <Text style={styles.metricValue}>#{metrics.averageMarketCapRank}</Text>
                <Text style={styles.metricSubtext}>
                  {metrics.averageMarketCapRank <= 50 ? 'Top tier' : 'Mid tier'}
                </Text>
              </View>
            </View>

            {(metrics.topPerformer || metrics.worstPerformer) && (
              <View style={styles.performersRow}>
                {metrics.topPerformer && (
                  <View style={styles.performerCard}>
                    <MaterialIcons name="trending-up" size={wp('4%')} color="#4CAF50" />
                    <Text style={styles.performerLabel}>Top</Text>
                    <Text style={styles.performerName}>{metrics.topPerformer}</Text>
                  </View>
                )}
                {metrics.worstPerformer && (
                  <View style={styles.performerCard}>
                    <MaterialIcons name="trending-down" size={wp('4%')} color="#F44336" />
                    <Text style={styles.performerLabel}>Worst</Text>
                    <Text style={styles.performerName}>{metrics.worstPerformer}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Categories */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category Breakdown</Text>
              {topCategory && (
                <TouchableOpacity
                  style={styles.topCategoryCard}
                  onPress={() => {
                    const education = getCategoryEducation(topCategory.category);
                    if (education) {
                      setSelectedEducationCategory(
                        selectedEducationCategory === topCategory.category ? null : topCategory.category
                      );
                    }
                  }}
                >
                  <View style={styles.topCategoryContent}>
                    <View>
                      <Text style={styles.topCategoryLabel}>Top Category</Text>
                      <Text style={styles.topCategoryName}>{topCategory.category}</Text>
                      <Text style={styles.topCategoryPercent}>{topCategory.percentage}%</Text>
                      <Text style={styles.topCategoryCoins}>
                        {topCategory.coins.length} coin{topCategory.coins.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {getCategoryEducation(topCategory.category) && (
                      <MaterialIcons name="info-outline" size={wp('5%')} color="#FF6E76" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              {selectedEducationCategory && getCategoryEducation(selectedEducationCategory) && (
                <View style={styles.educationContainer}>
                  <EducationCard
                    card={getCategoryEducation(selectedEducationCategory)!}
                    onClose={() => setSelectedEducationCategory(null)}
                  />
                </View>
              )}

              <View style={styles.categoriesList}>
                {categories.slice(0, 5).map((cat, index) => {
                  const education = getCategoryEducation(cat.category);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.categoryRow}
                      onPress={() => {
                        if (education) {
                          setSelectedEducationCategory(
                            selectedEducationCategory === cat.category ? null : cat.category
                          );
                        }
                      }}
                      disabled={!education}
                    >
                      <View style={styles.categoryInfo}>
                        <View style={styles.categoryNameRow}>
                          <Text style={styles.categoryName}>{cat.category}</Text>
                          {education && (
                            <MaterialIcons name="info-outline" size={wp('3.5%')} color="#FF6E76" />
                          )}
                        </View>
                        <Text style={styles.categoryCoins}>
                          {cat.coins.length} coin{cat.coins.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={styles.categoryStats}>
                        <Text style={styles.categoryPercent}>{cat.percentage}%</Text>
                        <View style={styles.categoryBar}>
                          <View
                            style={[
                              styles.categoryBarFill,
                              { width: `${cat.percentage}%` },
                            ]}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    backgroundColor: '#FFF3F6',
    borderRadius: 24,
    padding: hp('2%'),
    marginVertical: hp('1%'),
    shadowColor: '#9B8084',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: wp('4.5%'),
    fontWeight: '700',
    color: '#2B1D27',
  },
  headerSubtitle: {
    fontSize: wp('3.3%'),
    color: '#7A5B64',
    marginTop: 4,
  },
  section: {
    marginTop: hp('2%'),
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: hp('1.5%'),
  },
  sectionTitle: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#2B1D27',
    marginBottom: hp('1.5%'),
  },
  metricsRow: {
    flexDirection: 'row',
    gap: wp('2%'),
    marginBottom: hp('1%'),
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFF3F6',
    borderRadius: 12,
    padding: hp('1.2%'),
  },
  metricLabel: {
    fontSize: wp('3%'),
    color: '#7A5B64',
    marginBottom: hp('0.5%'),
  },
  metricValue: {
    fontSize: wp('4.5%'),
    fontWeight: '700',
    color: '#2B1D27',
  },
  metricSubtext: {
    fontSize: wp('2.8%'),
    color: '#7A5B64',
    marginTop: hp('0.3%'),
  },
  progressBar: {
    height: hp('0.6%'),
    backgroundColor: '#F2CBD4',
    borderRadius: 999,
    marginTop: hp('0.5%'),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6E76',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('2%'),
    paddingVertical: hp('0.4%'),
    borderRadius: 12,
    marginTop: hp('0.5%'),
    alignSelf: 'flex-start',
  },
  riskDot: {
    width: wp('2%'),
    height: wp('2%'),
    borderRadius: wp('1%'),
    marginRight: wp('1.5%'),
  },
  riskText: {
    fontSize: wp('3.2%'),
    fontWeight: '600',
  },
  performersRow: {
    flexDirection: 'row',
    gap: wp('2%'),
    marginTop: hp('1%'),
  },
  performerCard: {
    flex: 1,
    backgroundColor: '#FFF3F6',
    borderRadius: 12,
    padding: hp('1.2%'),
    alignItems: 'center',
  },
  performerLabel: {
    fontSize: wp('2.8%'),
    color: '#7A5B64',
    marginTop: hp('0.3%'),
  },
  performerName: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    color: '#2B1D27',
    marginTop: hp('0.2%'),
  },
  topCategoryCard: {
    backgroundColor: '#FFE4E8',
    borderRadius: 12,
    padding: hp('1.5%'),
    marginBottom: hp('1.5%'),
  },
  topCategoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('1%'),
  },
  educationContainer: {
    marginTop: hp('1.5%'),
  },
  topCategoryLabel: {
    fontSize: wp('3%'),
    color: '#7A5B64',
  },
  topCategoryName: {
    fontSize: wp('4.5%'),
    fontWeight: '700',
    color: '#FF6E76',
    marginTop: hp('0.3%'),
  },
  topCategoryPercent: {
    fontSize: wp('5.5%'),
    fontWeight: '700',
    color: '#2B1D27',
    marginTop: hp('0.5%'),
  },
  topCategoryCoins: {
    fontSize: wp('3%'),
    color: '#7A5B64',
    marginTop: hp('0.3%'),
  },
  categoriesList: {
    gap: hp('1%'),
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp('0.8%'),
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: wp('3.5%'),
    fontWeight: '600',
    color: '#2B1D27',
  },
  categoryCoins: {
    fontSize: wp('2.8%'),
    color: '#7A5B64',
    marginTop: hp('0.2%'),
  },
  categoryStats: {
    alignItems: 'flex-end',
    width: wp('25%'),
  },
  categoryPercent: {
    fontSize: wp('3.8%'),
    fontWeight: '700',
    color: '#FF6E76',
    marginBottom: hp('0.3%'),
  },
  categoryBar: {
    width: '100%',
    height: hp('0.8%'),
    backgroundColor: '#F2CBD4',
    borderRadius: 999,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: '#FF6E76',
  },
});

