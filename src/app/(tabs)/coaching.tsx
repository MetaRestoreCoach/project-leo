import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/common/Card';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';

const DEMO_PLAN = {
  diet: [
    { title: 'Increase fiber at breakfast', description: 'Swap white toast for steel-cut oats or whole grain bread with avocado. Aim for 8-10g fiber in your first meal.', reason: 'Fiber slows glucose absorption, reducing morning blood sugar spikes.' },
    { title: 'Add leafy greens to lunch', description: 'Include a large portion of spinach, kale, or arugula with your midday meal.', reason: 'Magnesium in dark greens supports insulin sensitivity.' },
    { title: 'Limit refined carbs after 6 PM', description: 'Choose protein + vegetables for dinner. If you need carbs, opt for sweet potato or quinoa.', reason: 'Evening carb reduction improves fasting glucose readings.' },
  ],
  exercise: [
    { title: '15-minute post-meal walk', description: 'Walk at moderate pace after lunch and dinner.', reason: 'Post-meal walking reduces glucose spikes by 20-30%.' },
    { title: '3x strength training', description: 'Bodyweight or resistance training, 20 minutes, 3 times per week.', reason: 'Muscle mass improves glucose uptake and resting metabolic rate.' },
  ],
  supplements: [
    { title: 'Berberine 500mg', description: 'Take with meals, twice daily. Consult your doctor before starting.', reason: 'Research shows berberine may support healthy blood sugar levels.' },
    { title: 'Magnesium Glycinate 400mg', description: 'Take at bedtime.', reason: 'May improve sleep quality and insulin sensitivity.' },
  ],
};

function RecommendationItem({ title, description, reason }: { title: string; description: string; reason: string }) {
  return (
    <View style={styles.recItem}>
      <Text style={styles.recTitle}>{title}</Text>
      <Text style={styles.recDesc}>{description}</Text>
      <View style={styles.reasonRow}>
        <Ionicons name="bulb-outline" size={14} color={Colors.accent} />
        <Text style={styles.reasonText}>{reason}</Text>
      </View>
    </View>
  );
}

export default function CoachingScreen() {
  const { width } = useWindowDimensions();
  const isWide = width > 768;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        <Text style={styles.heading}>Your Coaching Plan</Text>
        <Text style={styles.subheading}>Personalized for this week based on your health data</Text>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
          <Text style={styles.disclaimerText}>
            These recommendations are AI-generated and not medical advice. Always consult your healthcare provider.
          </Text>
        </View>

        {/* Diet */}
        <Card title="Diet Recommendations" style={styles.section}>
          {DEMO_PLAN.diet.map((r, i) => (
            <RecommendationItem key={i} {...r} />
          ))}
        </Card>

        {/* Exercise */}
        <Card title="Exercise Plan" style={styles.section}>
          {DEMO_PLAN.exercise.map((r, i) => (
            <RecommendationItem key={i} {...r} />
          ))}
        </Card>

        {/* Supplements */}
        <Card title="Supplement Suggestions" style={styles.section}>
          {DEMO_PLAN.supplements.map((r, i) => (
            <RecommendationItem key={i} {...r} />
          ))}
        </Card>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  contentWide: { maxWidth: 700, alignSelf: 'center', width: '100%' },
  heading: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subheading: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.info + '10',
    borderRadius: BorderRadius.md, marginBottom: Spacing.md,
  },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
  section: { marginBottom: Spacing.md, padding: Spacing.md },
  recItem: { marginBottom: Spacing.md, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  recTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: 4 },
  recDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.sm },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  reasonText: { flex: 1, fontSize: FontSize.xs, color: Colors.accent, fontStyle: 'italic', lineHeight: 18 },
});
