import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';

interface CoachingCardProps {
  summary: string;
  generatedAt?: string;
  onViewPlan?: () => void;
}

export function CoachingCard({ summary, generatedAt }: CoachingCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBg}>
          <Ionicons name="sparkles" size={20} color={Colors.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Weekly Coaching</Text>
          {generatedAt && (
            <Text style={styles.date}>
              Updated {new Date(generatedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.summary}>{summary}</Text>
      <View style={styles.footer}>
        <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
        <Text style={styles.footerLink}>View Full Plan</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  iconBg: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  summary: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});
