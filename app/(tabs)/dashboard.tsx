import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, useWindowDimensions, RefreshControl, Platform,
} from 'react-native';
import { useAuthStore } from '@/hooks/useAuthStore';
import { UserAvatar } from '@/components/common/UserAvatar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CoachingCard } from '@/components/dashboard/CoachingCard';
import { GoalProgress } from '@/components/dashboard/GoalProgress';
import { ConnectDataSourceCard } from '@/components/dashboard/ConnectDataSourceCard';
import { Card } from '@/components/common/Card';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { getTodaysSummary, DailyHealthSummary } from '@/services/appleHealth';
import { fetchGoogleFitSummary } from '@/services/googleFit';
import { signInWithGoogleFitScopes } from '@/services/auth';
import { Ionicons } from '@expo/vector-icons';

const DEMO_COACHING = "Based on your recent data, your post-meal blood glucose tends to spike after lunch. Try adding a 15-minute walk after your midday meal — studies show this can reduce post-prandial glucose by 20-30%. Your sleep has also improved, which is great for insulin sensitivity. This week, focus on increasing fiber intake at breakfast.";

function buildMetrics(data: DailyHealthSummary | null) {
  if (!data) return [];
  return [
    { title: 'Steps', value: data.steps.toLocaleString(), unit: 'steps', icon: 'walk-outline' as const, color: Colors.metricSteps, trend: 'up' as const, trendLabel: `${data.distanceKm} km walked` },
    { title: 'Heart Rate', value: String(data.heartRateAvg), unit: 'bpm', icon: 'heart-outline' as const, color: Colors.metricHeartRate, trend: 'stable' as const, trendLabel: `${data.heartRateMin}-${data.heartRateMax} range` },
    { title: 'Blood Glucose', value: '118', unit: 'mg/dL', icon: 'water-outline' as const, color: Colors.metricGlucose, trend: 'down' as const, trendLabel: '-8 from last week' },
    { title: 'Sleep', value: String(data.sleepHours), unit: 'hrs', icon: 'moon-outline' as const, color: Colors.metricSleep, trend: data.sleepHours >= 7 ? 'up' as const : 'down' as const, trendLabel: data.sleepHours >= 7 ? 'Good rest' : 'Below target' },
    { title: 'Calories', value: String(data.activeCalories), unit: 'kcal', icon: 'flame-outline' as const, color: Colors.metricWeight, trend: 'up' as const, trendLabel: `${data.restingCalories + data.activeCalories} total` },
    { title: 'Blood Oxygen', value: data.bloodOxygen ? String(data.bloodOxygen) : '--', unit: '%', icon: 'pulse-outline' as const, color: Colors.metricBloodPressure, trend: 'stable' as const, trendLabel: 'Normal range' },
  ];
}

const GFIT_PENDING_KEY = 'google_fit_pending';

export default function DashboardScreen() {
  const { profile, user, session } = useAuthStore();
  const { width } = useWindowDimensions();
  const isWide = width > 768;
  const [refreshing, setRefreshing] = React.useState(false);
  const [healthData, setHealthData] = useState<DailyHealthSummary | null>(null);
  const [connectedSources, setConnectedSources] = React.useState<string[]>([]);
  const [gfitError, setGfitError] = useState<string | null>(null);

  const loadHealthData = async () => {
    try {
      const data = await getTodaysSummary();
      setHealthData(data);
    } catch (e) {
      console.warn('Failed to load health data:', e);
    }
  };

  useEffect(() => {
    loadHealthData();
  }, []);

  // Detect return from Google Fit OAuth — session updates after Supabase processes the redirect
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (window.localStorage.getItem(GFIT_PENDING_KEY) !== '1') return;
    if (!session) return; // still initializing

    window.localStorage.removeItem(GFIT_PENDING_KEY);
    const providerToken = session.provider_token;
    if (!providerToken) {
      setGfitError('Google Fit not authorized — fitness scopes may not be approved on the OAuth consent screen.');
      return;
    }

    fetchGoogleFitSummary(providerToken).then((data) => {
      if (!data) {
        setGfitError('Failed to fetch Google Fit data. Verify the Fitness API is enabled for this OAuth client in Google Cloud.');
        return;
      }
      setGfitError(null);
      setConnectedSources((prev) => prev.includes('google_fit') ? prev : [...prev, 'google_fit']);
      setHealthData(data);
    });
  }, [session]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHealthData();
    setRefreshing(false);
  };

  const handleConnect = async (id: string) => {
    if (id === 'google_fit') {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem(GFIT_PENDING_KEY, '1');
        try {
          await signInWithGoogleFitScopes();
        } catch (e: any) {
          window.localStorage.removeItem(GFIT_PENDING_KEY);
          setGfitError(`Google Fit sign-in failed: ${e?.message ?? 'unknown error'}`);
        }
        return; // page redirects to Google OAuth on success
      }
    }
    setConnectedSources((prev) => [...prev, id]);
    if (id === 'apple_health') {
      loadHealthData();
    }
  };

  const hasData = connectedSources.length > 0;
  const sourceLabel = connectedSources.length > 0
    ? connectedSources.map((s) => ({ apple_health: 'Apple Health', google_fit: 'Google Fit', strava: 'Strava', myfitnesspal: 'MyFitnessPal' }[s] ?? s)).join(', ')
    : 'Demo';

  const firstName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const displayName = profile?.full_name || user?.user_metadata?.full_name || firstName;
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || profile?.avatar_url || null;
  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';
  const metrics = buildMetrics(healthData);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <View style={styles.greetingRow}>
            <UserAvatar
              name={displayName}
              avatarUrl={avatarUrl}
              size={48}
              borderColor={Colors.primary}
            />
            <View style={styles.greetingText}>
              <Text style={styles.greetingHeadline}>Good {timeOfDay}, {firstName}</Text>
              <Text style={styles.greetingSub}>Here's your health snapshot</Text>
            </View>
          </View>
        </View>

        {/* Connect Health Data */}
        <ConnectDataSourceCard
          connectedIds={connectedSources}
          onConnect={handleConnect}
        />
        {gfitError && (
          <View style={styles.gfitErrorBanner} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.gfitErrorText}>{gfitError}</Text>
          </View>
        )}

        {/* Empty state — shown when nothing is connected */}
        {!hasData && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={52} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No data connected yet</Text>
            <Text style={styles.emptyDesc}>
              Connect a health source above to see your real metrics, coaching insights, and goal progress.
            </Text>
          </View>
        )}

        {/* All data sections — only when at least one source is connected */}
        {hasData && (
          <>
            {/* Health Score */}
            <Card style={styles.scoreCard}>
              <View style={styles.scoreRow}>
                <View>
                  <Text style={styles.scoreLabel}>Health Score</Text>
                  <Text style={styles.scoreSub}>Based on your last 7 days</Text>
                </View>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreValue}>74</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
              </View>
            </Card>

            {/* Coaching Card */}
            <CoachingCard
              summary={DEMO_COACHING}
              generatedAt={new Date().toISOString()}
            />

            {/* Data Source Badge */}
            <View style={styles.sourceRow}>
              <Ionicons name="heart-circle" size={16} color={Colors.accent} />
              <Text style={styles.sourceText}>Data from {sourceLabel}</Text>
              <Text style={styles.syncText}>Synced just now</Text>
            </View>

            {/* Metrics Grid */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Metrics</Text>
            </View>
            <View style={[styles.metricsGrid, isWide && styles.metricsGridWide]}>
              {metrics.map((m) => (
                <MetricCard key={m.title} {...m} />
              ))}
            </View>

            {/* Goal Progress */}
            <Card title="Goal Progress" style={styles.goalsCard}>
              <GoalProgress title="Lower Blood Glucose" current={118} target={100} unit="mg/dL" color={Colors.metricGlucose} />
              <GoalProgress title="Reach 75 kg" current={78.5} target={75} unit="kg" color={Colors.metricWeight} />
              <GoalProgress title="Walk 10K Steps Daily" current={healthData?.steps || 0} target={10000} unit="steps" color={Colors.metricSteps} />
              <GoalProgress title="Sleep 7+ Hours" current={healthData?.sleepHours || 0} target={7} unit="hrs" color={Colors.metricSleep} />
            </Card>

            {/* Today's Meals */}
            <Card title="Today's Meals" style={styles.mealsCard}>
              <View style={styles.mealRow}>
                <Text style={styles.mealType}>Breakfast</Text>
                <Text style={styles.mealDesc}>Oatmeal with berries, chia seeds</Text>
                <Text style={styles.mealCal}>320 kcal</Text>
              </View>
              <View style={styles.mealDivider} />
              <View style={styles.mealRow}>
                <Text style={styles.mealType}>Lunch</Text>
                <Text style={styles.mealDesc}>Grilled chicken salad, olive oil dressing</Text>
                <Text style={styles.mealCal}>480 kcal</Text>
              </View>
              <View style={styles.mealDivider} />
              <View style={styles.mealRow}>
                <Text style={[styles.mealType, { color: Colors.textTertiary }]}>Dinner</Text>
                <Text style={[styles.mealDesc, { color: Colors.textTertiary, fontStyle: 'italic' }]}>Not logged yet</Text>
              </View>
            </Card>
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  contentWide: { maxWidth: 800, alignSelf: 'center', width: '100%' },
  greeting: { marginBottom: Spacing.xs },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  greetingText: { flex: 1 },
  greetingHeadline: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  greetingSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  scoreCard: { padding: Spacing.md },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  scoreSub: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  scoreBadge: { flexDirection: 'row', alignItems: 'baseline' },
  scoreValue: { fontSize: 36, fontWeight: FontWeight.bold, color: Colors.accent },
  scoreMax: { fontSize: FontSize.md, color: Colors.textTertiary },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.xs },
  sourceText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1 },
  syncText: { fontSize: FontSize.xs, color: Colors.accent },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center', maxWidth: 300, lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metricsGridWide: { gap: Spacing.md },
  goalsCard: { marginTop: Spacing.xs },
  mealsCard: { marginTop: Spacing.xs },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  mealType: { width: 70, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  mealDesc: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  mealCal: { fontSize: FontSize.xs, color: Colors.textTertiary },
  mealDivider: { height: 1, backgroundColor: Colors.borderLight },
  gfitErrorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.error + '12', borderWidth: 1, borderColor: Colors.error + '40', borderRadius: BorderRadius.md, padding: Spacing.sm },
  gfitErrorText: { flex: 1, fontSize: FontSize.sm, color: Colors.error, lineHeight: 20 },
});
