import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, useWindowDimensions,
} from 'react-native';
import { Button } from '@/components/common/Button';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';

interface OnboardingShellProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
}

export function OnboardingShell({
  step, totalSteps, title, subtitle, children,
  onNext, onBack, nextLabel = 'Continue', nextDisabled = false, loading = false,
}: OnboardingShellProps) {
  const { width } = useWindowDimensions();
  const isWide = width > 768;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, isWide && styles.cardWide]}>
          {/* Progress */}
          <View style={styles.progressRow}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[styles.progressDot, i < step && styles.progressDotActive, i === step - 1 && styles.progressDotCurrent]}
              />
            ))}
          </View>
          <Text style={styles.stepLabel}>Step {step} of {totalSteps}</Text>

          {/* Header */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Content */}
          <View style={styles.content}>{children}</View>

          {/* Actions */}
          <View style={styles.actions}>
            {onBack && (
              <Button title="Back" onPress={onBack} variant="ghost" style={styles.backBtn} />
            )}
            <Button
              title={nextLabel}
              onPress={onNext}
              disabled={nextDisabled}
              loading={loading}
              size="lg"
              style={styles.nextBtn}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },
  scrollWide: { alignItems: 'center' },
  card: { width: '100%' },
  cardWide: {
    maxWidth: 520, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 8,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  progressDot: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
  },
  progressDotActive: { backgroundColor: Colors.primary },
  progressDotCurrent: { backgroundColor: Colors.primaryLight, width: 56 },
  stepLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center', marginBottom: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 24 },
  content: { marginBottom: Spacing.xl },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
  backBtn: { flex: 0 },
  nextBtn: { flex: 1 },
});
