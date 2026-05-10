import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, useWindowDimensions, RefreshControl,
} from 'react-native';
import { useAuthStore } from '@/hooks/useAuthStore';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CoachingCard } from '@/components/dashboard/CoachingCard';
import { GoalProgress } from '@/components/dashboard/GoalProgress';
import { Card } from '@/components/common/Card';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/theme';

// Demo data — replace with real API calls once Supabase is connected
const DEMO_METRICS = [
  { title: 'Steps', value: '7,842', unit: 'steps', icon: 'walk-outline' as const, color: Colors.metricSteps, trend: 'up' as const, trendLabel: '+12% vs last week' },
  { title: 'Heart Rate', value: '72', unit: 'bpm', icon: 'heart-outline' as const, color: Colors.metricHeartRate, trend: 'stable' as const, trendLabel: 'Normal range' },
  { title: 'Blood Glucose', value: '118', unit: 'mg/dL', icon: 'water-outline' as const, color: Colors.metricGlucose, trend: 'down' as const, trendLabel: '-8 from last week' },
  { title: 'Sleep', value: '7.2', unit: 'hrs', icon: 'moon-outline' as const, color: Colors.metricSleep, trend: 'up' as const, trendLabel: '+0.5 hrs avg' },
  { title: 'Weight', value: '78.5', unit: 'kg', icon: 'scale-outline' as const, color: Colors.metricWeight, trend: 'down' as const, trendLabel: '-1.2 kg this month' },
  { title: 'Blood Pressure', value: '128/82', unit: 'mmHg', icon: 'pulse-outline' as const, color: Colors.metricBloodPressure, trend: 'down' as const, trendLabel: 'Improving' },
];

const DEMO_COACHING = "Based on your recent data, your post-meal blood glucose tends to spike after lunch. Try adding a 15-minute walk after your midday meal — studies show this can reduce post-prandial glucose by 20-30%. Your sleep has also improved, which is great for insulin sensitivity. This week, focus on increasing fiber intake at breakfast.";

export default function DashboardScreen() {
  const { profile } = useAuthStore();
  const { width } = useWindowDimensions();
  const isWide = width > 768;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Refresh metrics from Supabase
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isWide && styles.contentWide]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {firstName}
          </Text>
          <Text style={styles.greetingSub}>Here's your health snapshot</Text>
        </View>

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

        {/* Metrics Grid */}
        <Text style={styles.sectionTitle}>Your Metrics</Text>
        <View style={[styles.metricsGrid, isWide && styles.metricsGridWide]}>
          {DEMO_METRICS.map((m) => (
            <MetricCard key={m.title} {...m} />
          ))}
        </View>

        {/* Goal Progress */}
        <Card title="Goal Progress" style={styles.goalsCard}>
          <GoalProgress title="Lower Blood Glucose" current={118} target={100} unit="mg/dL" color={Colors.metricGlucose} />
          <GoalProgress title="Reach 75 kg" current={78.5} target={75} unit="kg" color={Colors.metricWeight} />
          <GoalProgress title="Walk 10K Steps Daily" current={7842} target={10000} unit="steps" color={Colors.metricSteps} />
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
  greetingText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  greetingSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  scoreCard: { padding: Spacing.md },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  scoreSub: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  scoreBadge: { flexDirection: 'row', alignItems: 'baseline' },
  scoreValue: { fontSize: 36, fontWeight: FontWeight.bold, color: Colors.accent },
  scoreMax: { fontSize: FontSize.md, color: Colors.textTertiary },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginTop: Spacing.sm },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metricsGridWide: { gap: Spacing.md },
  goalsCard: { marginTop: Spacing.xs },
  mealsCard: { marginTop: Spacing.xs },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  mealType: { width: 70, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  mealDesc: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  mealCal: { fontSize: FontSize.xs, color: Colors.textTertiary },
  mealDivider: { height: 1, backgroundColor: Colors.borderLight },
});
