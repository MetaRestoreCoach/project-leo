import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadow, FontSize, FontWeight } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function Card({ children, title, style, noPadding }: CardProps) {
  return (
    <View style={[styles.card, !noPadding && styles.padding, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  padding: {
    padding: Spacing.md,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
});
