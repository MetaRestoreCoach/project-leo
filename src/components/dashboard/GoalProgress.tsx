import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

interface GoalProgressProps {
  title: string;
  current: number;
  target: number;
  unit: string;
  color?: string;
}

export function GoalProgress({ title, current, target, unit, color = Colors.primary }: GoalProgressProps) {
  const pct = Math.min(Math.round((current / target) * 100), 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.detail}>
        {current} / {target} {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  pct: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
  barBg: {
    height: 8, borderRadius: 4, backgroundColor: Colors.surfaceSecondary, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  detail: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4 },
});
