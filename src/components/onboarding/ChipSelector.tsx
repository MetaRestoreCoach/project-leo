import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

interface ChipSelectorProps<T extends string> {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  multi?: boolean;
}

export function ChipSelector<T extends string>({
  options, selected, onToggle, multi = true,
}: ChipSelectorProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onToggle(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  labelSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});
