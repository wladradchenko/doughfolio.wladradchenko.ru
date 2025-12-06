import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { fetchGitHubMetrics, formatRelativeTime, GitHubMetrics } from '../utils/githubData';
import { getCachedGitHubMetrics, cacheGitHubMetrics } from '../utils/coinCache';
import { getGitHubMetricEducation } from '../utils/cryptoEducation';
import { EducationCard } from './EducationCard';

type Props = {
  githubUrl: string;
  onDataLoaded?: (success: boolean) => void;
  compact?: boolean; // If true, show compact version without header
};

const MetricCard = ({
  icon,
  label,
  value,
  metricKey,
  onPress,
}: {
  icon: string;
  label: string;
  value: string | number;
  metricKey: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.metricCard} onPress={onPress}>
    <View style={styles.metricHeader}>
      <MaterialIcons name={icon as any} size={wp('5%')} color="#FF6E76" />
      <Text style={styles.metricLabel}>{label}</Text>
      {getGitHubMetricEducation(metricKey) && (
        <MaterialIcons name="info-outline" size={wp('3.5%')} color="#FF6E76" style={{ marginLeft: wp('1%') }} />
      )}
    </View>
    <Text style={styles.metricValue}>{value}</Text>
  </TouchableOpacity>
);

export const GitHubMetricsPanel = ({ githubUrl, onDataLoaded, compact = false }: Props) => {
  const [metrics, setMetrics] = useState<GitHubMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadMetrics = async () => {
      setLoading(true);
      setError(false);

      try {
        // Check cache first
        const cachedData = await getCachedGitHubMetrics(githubUrl);
        if (cachedData) {
          if (isMounted) {
            setMetrics(cachedData);
            onDataLoaded?.(true);
            setLoading(false);
          }
          return;
        }

        // If no cache, fetch from API
        const data = await fetchGitHubMetrics(githubUrl);
        if (isMounted) {
          if (data) {
            setMetrics(data);
            // Cache the data
            await cacheGitHubMetrics(githubUrl, data);
            onDataLoaded?.(true);
          } else {
            setError(true);
            onDataLoaded?.(false);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
          onDataLoaded?.(false);
        }
      }
    };

    loadMetrics();

    return () => {
      isMounted = false;
    };
  }, [githubUrl, onDataLoaded]);

  if (loading) {
    if (compact) {
      return (
        <View style={styles.compactLoadingContainer}>
          <ActivityIndicator size="small" color="#FF6E76" />
          <Text style={styles.compactLoadingText}>Loading GitHub data...</Text>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialIcons name="code" size={wp('5%')} color="#FF6E76" />
          <Text style={styles.title}>GitHub Activity</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF6E76" />
          <Text style={styles.loadingText}>Loading repository data...</Text>
        </View>
      </View>
    );
  }

  if (error || !metrics) {
    return null; // Don't show anything if failed to load
  }

  if (compact) {
    // Compact version for Links panel
    const education = selectedMetric ? getGitHubMetricEducation(selectedMetric) : null;
    
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactMetricsGrid}>
          <TouchableOpacity
            style={styles.compactMetricItem}
            onPress={() => setSelectedMetric(selectedMetric === 'stars' ? null : 'stars')}
          >
            <MaterialIcons name="star" size={wp('4%')} color="#FF6E76" />
            <Text style={styles.compactMetricValue}>{metrics.stars.toLocaleString()}</Text>
            <Text style={styles.compactMetricLabel}>Stars</Text>
            {getGitHubMetricEducation('stars') && (
              <MaterialIcons name="info-outline" size={wp('3%')} color="#FF6E76" style={{ marginLeft: wp('1%') }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.compactMetricItem}
            onPress={() => setSelectedMetric(selectedMetric === 'forks' ? null : 'forks')}
          >
            <MaterialIcons name="call-split" size={wp('4%')} color="#FF6E76" />
            <Text style={styles.compactMetricValue}>{metrics.forks.toLocaleString()}</Text>
            <Text style={styles.compactMetricLabel}>Forks</Text>
            {getGitHubMetricEducation('forks') && (
              <MaterialIcons name="info-outline" size={wp('3%')} color="#FF6E76" style={{ marginLeft: wp('1%') }} />
            )}
          </TouchableOpacity>
          {metrics.contributorsCount > 0 && (
            <TouchableOpacity
              style={styles.compactMetricItem}
              onPress={() => setSelectedMetric(selectedMetric === 'contributors' ? null : 'contributors')}
            >
              <MaterialIcons name="people" size={wp('4%')} color="#FF6E76" />
              <Text style={styles.compactMetricValue}>{metrics.contributorsCount.toLocaleString()}</Text>
              <Text style={styles.compactMetricLabel}>Contributors</Text>
              {getGitHubMetricEducation('contributors') && (
                <MaterialIcons name="info-outline" size={wp('3%')} color="#FF6E76" style={{ marginLeft: wp('1%') }} />
              )}
            </TouchableOpacity>
          )}
          {metrics.license && (
            <TouchableOpacity
              style={styles.compactMetricItem}
              onPress={() => setSelectedMetric(selectedMetric === 'license' ? null : 'license')}
            >
              <MaterialIcons name="gavel" size={wp('4%')} color="#FF6E76" />
              <Text style={styles.compactMetricValue}>{metrics.license}</Text>
              <Text style={styles.compactMetricLabel}>License</Text>
              {getGitHubMetricEducation('license') && (
                <MaterialIcons name="info-outline" size={wp('3%')} color="#FF6E76" style={{ marginLeft: wp('1%') }} />
              )}
            </TouchableOpacity>
          )}
          {metrics.lastCommit && (
            <TouchableOpacity
              style={styles.compactMetricItem}
              onPress={() => setSelectedMetric(selectedMetric === 'last-update' ? null : 'last-update')}
            >
              <MaterialIcons name="update" size={wp('4%')} color="#FF6E76" />
              <Text style={styles.compactMetricValue}>{formatRelativeTime(metrics.lastCommit)}</Text>
              <Text style={styles.compactMetricLabel}>Last Update</Text>
              {getGitHubMetricEducation('last-update') && (
                <MaterialIcons name="info-outline" size={wp('3%')} color="#FF6E76" style={{ marginLeft: wp('1%') }} />
              )}
            </TouchableOpacity>
          )}
        </View>
        {education && (
          <View style={styles.educationContainer}>
            <EducationCard
              card={education}
              onClose={() => setSelectedMetric(null)}
            />
          </View>
        )}
      </View>
    );
  }

  // Full version with header
  const education = selectedMetric ? getGitHubMetricEducation(selectedMetric) : null;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="code" size={wp('5%')} color="#FF6E76" />
        <Text style={styles.title}>GitHub Activity</Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          icon="star"
          label="Stars"
          value={metrics.stars.toLocaleString()}
          metricKey="stars"
          onPress={() => setSelectedMetric(selectedMetric === 'stars' ? null : 'stars')}
        />

        <MetricCard
          icon="call-split"
          label="Forks"
          value={metrics.forks.toLocaleString()}
          metricKey="forks"
          onPress={() => setSelectedMetric(selectedMetric === 'forks' ? null : 'forks')}
        />

        <MetricCard
          icon="visibility"
          label="Watchers"
          value={metrics.watchers.toLocaleString()}
          metricKey="watchers"
          onPress={() => setSelectedMetric(selectedMetric === 'watchers' ? null : 'watchers')}
        />

        <MetricCard
          icon="bug-report"
          label="Open Issues"
          value={metrics.openIssues.toLocaleString()}
          metricKey="open-issues"
          onPress={() => setSelectedMetric(selectedMetric === 'open-issues' ? null : 'open-issues')}
        />

        {metrics.contributorsCount > 0 && (
          <MetricCard
            icon="people"
            label="Contributors"
            value={metrics.contributorsCount.toLocaleString()}
            metricKey="contributors"
            onPress={() => setSelectedMetric(selectedMetric === 'contributors' ? null : 'contributors')}
          />
        )}

        {metrics.language && (
          <MetricCard
            icon="code"
            label="Language"
            value={metrics.language}
            metricKey="language"
            onPress={() => setSelectedMetric(selectedMetric === 'language' ? null : 'language')}
          />
        )}

        {metrics.license && (
          <MetricCard
            icon="gavel"
            label="License"
            value={metrics.license}
            metricKey="license"
            onPress={() => setSelectedMetric(selectedMetric === 'license' ? null : 'license')}
          />
        )}

        {metrics.lastCommit && (
          <MetricCard
            icon="update"
            label="Last Update"
            value={formatRelativeTime(metrics.lastCommit)}
            metricKey="last-update"
            onPress={() => setSelectedMetric(selectedMetric === 'last-update' ? null : 'last-update')}
          />
        )}
      </View>
      
      {education && (
        <View style={styles.educationContainer}>
          <EducationCard
            card={education}
            onClose={() => setSelectedMetric(null)}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: wp('5%'),
    marginBottom: wp('2%'),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('3%'),
  },
  title: {
    fontSize: wp('4.5%'),
    fontWeight: 'bold',
    color: '#333',
    marginLeft: wp('2%'),
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: wp('4%'),
  },
  loadingText: {
    marginLeft: wp('2%'),
    fontSize: wp('3.5%'),
    color: '#666',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: wp('3%'),
    padding: wp('3%'),
    marginBottom: wp('2%'),
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: wp('1%'),
  },
  metricLabel: {
    fontSize: wp('3.2%'),
    fontWeight: '600',
    color: '#333',
    marginLeft: wp('1.5%'),
  },
  metricValue: {
    fontSize: wp('4%'),
    fontWeight: 'bold',
    color: '#FF6E76',
    marginTop: wp('1%'),
  },
  compactContainer: {
    marginTop: wp('2%'),
    marginBottom: wp('1%'),
  },
  compactLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: wp('2%'),
    marginTop: wp('2%'),
  },
  compactLoadingText: {
    marginLeft: wp('2%'),
    fontSize: wp('3%'),
    color: '#666',
  },
  compactMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
  },
  compactMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: wp('2.5%'),
    paddingVertical: wp('1.5%'),
    borderRadius: wp('2%'),
    borderWidth: 1,
    borderColor: '#E9ECEF',
    gap: wp('1%'),
  },
  compactMetricValue: {
    fontSize: wp('3.2%'),
    fontWeight: 'bold',
    color: '#FF6E76',
  },
  compactMetricLabel: {
    fontSize: wp('2.8%'),
    color: '#666',
  },
  educationContainer: {
    marginTop: wp('2%'),
  },
});

