// ============================================================
// Project LEO — OnboardingQuestion
// Renders a single onboarding question based on its type:
//   textarea    → multiline TextInput
//   multitext   → dynamic list of TextInput items
//   select      → list of tappable option chips
// ============================================================

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import type { QuestionStep } from '@/config/onboardingConfig';
import { STEP_TYPES } from '@/config/onboardingConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingQuestionProps {
  question: QuestionStep;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TextareaInput({
  question,
  value,
  onChange,
}: {
  question: QuestionStep;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <TextInput
      style={styles.textarea}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
      value={value}
      onChangeText={onChange}
      placeholder={question.placeholder ?? ''}
      placeholderTextColor={Colors.textTertiary}
      maxLength={question.maxLength}
      accessibilityLabel={question.question}
    />
  );
}

function MultiTextInput({
  question,
  value,
  onChange,
}: {
  question: QuestionStep;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const maxItems = question.maxItems ?? 5;
  const items = value.length > 0 ? value : [''];

  const update = (index: number, text: string) => {
    const next = [...items];
    next[index] = text;
    onChange(next);
  };

  const addItem = () => {
    if (items.length < maxItems) {
      onChange([...items, '']);
    }
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : ['']);
  };

  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={styles.multitextRow}>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            value={item}
            onChangeText={(t) => update(idx, t)}
            placeholder={question.placeholder ?? `Item ${idx + 1}`}
            placeholderTextColor={Colors.textTertiary}
            accessibilityLabel={`${question.question} item ${idx + 1}`}
          />
          {items.length > 1 && (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeItem(idx)}
              accessibilityLabel="Remove item"
            >
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {items.length < maxItems && (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={addItem}
          accessibilityLabel="Add another item"
        >
          <Text style={styles.addBtnText}>+ Add another</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SelectInput({
  question,
  value,
  onChange,
}: {
  question: QuestionStep;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.optionsList}>
      {(question.options ?? []).map((opt) => {
        const selected = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.optionChip, selected && styles.optionChipSelected]}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={opt.label}
          >
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OnboardingQuestion({
  question,
  value,
  onChange,
  error,
}: OnboardingQuestionProps) {
  return (
    <View style={styles.container}>
      {question.hint ? (
        <Text style={styles.hint}>{question.hint}</Text>
      ) : null}

      {question.type === STEP_TYPES.TEXTAREA && (
        <TextareaInput
          question={question}
          value={(value as string) ?? ''}
          onChange={onChange as (v: string) => void}
        />
      )}

      {question.type === STEP_TYPES.MULTITEXT && (
        <MultiTextInput
          question={question}
          value={(value as string[]) ?? ['']}
          onChange={onChange as (v: string[]) => void}
        />
      )}

      {question.type === STEP_TYPES.SELECT && (
        <SelectInput
          question={question}
          value={(value as string) ?? ''}
          onChange={onChange as (v: string) => void}
        />
      )}

      {error ? (
        <Text
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  hint: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  textarea: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    minHeight: 100,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  multitextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  removeBtn: {
    padding: Spacing.sm,
  },
  removeBtnText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
  addBtn: {
    paddingVertical: Spacing.sm,
  },
  addBtnText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  optionsList: {
    gap: Spacing.sm,
  },
  optionChip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
  optionChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '15',
  },
  optionText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});

export default OnboardingQuestion;
