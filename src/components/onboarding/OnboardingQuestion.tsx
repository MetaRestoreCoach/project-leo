import React, { useState } from 'react';
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

export interface OnboardingQuestionProps {
  question: QuestionStep;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  error?: string | null;
}

// ── TextareaInput ─────────────────────────────────────────────────────────────

function TextareaInput({ question, value, onChange }: {
  question: QuestionStep; value: string; onChange: (v: string) => void;
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

// ── MultiTextInput ────────────────────────────────────────────────────────────

function MultiTextInput({ question, value, onChange }: {
  question: QuestionStep; value: string[]; onChange: (v: string[]) => void;
}) {
  const maxItems = question.maxItems ?? 5;
  const items = value.length > 0 ? value : [''];

  const update = (index: number, text: string) => {
    const next = [...items]; next[index] = text; onChange(next);
  };
  const addItem = () => { if (items.length < maxItems) onChange([...items, '']); };
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
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(idx)} accessibilityLabel="Remove item">
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {items.length < maxItems && (
        <TouchableOpacity style={styles.addBtn} onPress={addItem} accessibilityLabel="Add another item">
          <Text style={styles.addBtnText}>+ Add another</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── SelectInput ───────────────────────────────────────────────────────────────

function SelectInput({ question, value, onChange }: {
  question: QuestionStep; value: string; onChange: (v: string) => void;
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
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── PillsInput ────────────────────────────────────────────────────────────────

const OTHER_KEY = '__other__';

function PillsInput({ question, value, onChange }: {
  question: QuestionStep;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  const isMulti = question.multiSelect ?? false;
  const maxSel = question.maxSelections ?? Infinity;

  // Normalise to array for uniform logic; re-serialise on emit
  const selected: string[] = isMulti
    ? (Array.isArray(value) ? value : value ? [value as string] : [])
    : (value ? [value as string] : []);

  // The "other" text is the element that doesn't match any option value
  const optionValues = new Set((question.options ?? []).map((o) => o.value));
  const otherText = selected.find((v) => !optionValues.has(v) && v !== OTHER_KEY) ?? '';
  const otherSelected = selected.includes(OTHER_KEY) || (otherText.length > 0);

  const [localOther, setLocalOther] = useState(otherText);

  const emit = (next: string[]) => {
    if (isMulti) onChange(next);
    else onChange(next[0] ?? '');
  };

  const toggle = (val: string) => {
    if (val === OTHER_KEY) {
      if (otherSelected) {
        // deselect other: remove OTHER_KEY and any free-text entry
        const next = selected.filter((v) => v !== OTHER_KEY && optionValues.has(v));
        emit(next);
      } else {
        if (!isMulti) {
          emit([OTHER_KEY]);
        } else if (selected.filter((v) => v !== OTHER_KEY).length < maxSel) {
          emit([...selected.filter((v) => v !== OTHER_KEY), OTHER_KEY]);
        }
      }
      return;
    }
    if (isMulti) {
      if (selected.includes(val)) {
        emit(selected.filter((v) => v !== val));
      } else if (selected.filter((v) => optionValues.has(v)).length < maxSel) {
        emit([...selected.filter((v) => v !== OTHER_KEY), val]);
      }
    } else {
      emit(selected[0] === val ? [] : [val]);
    }
  };

  const commitOther = (text: string) => {
    setLocalOther(text);
    if (!isMulti) {
      emit(text.trim() ? [text] : []);
    } else {
      const base = selected.filter((v) => v !== OTHER_KEY && optionValues.has(v));
      emit(text.trim() ? [...base, text] : base);
    }
  };

  const options = question.options ?? [];

  return (
    <View>
      <View style={styles.pillsGrid}>
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          const disabled = !active && isMulti &&
            selected.filter((v) => optionValues.has(v)).length >= maxSel;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.pill, active && styles.pillActive, disabled && styles.pillDisabled]}
              onPress={() => !disabled && toggle(opt.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active, disabled }}
              accessibilityLabel={opt.label}
            >
              {active && <Text style={styles.pillCheck}>✓ </Text>}
              <Text style={[styles.pillText, active && styles.pillTextActive, disabled && styles.pillTextDisabled]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {question.hasOther && (
          <TouchableOpacity
            style={[styles.pill, otherSelected && styles.pillActive]}
            onPress={() => toggle(OTHER_KEY)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: otherSelected }}
            accessibilityLabel="Other"
          >
            {otherSelected && <Text style={styles.pillCheck}>✓ </Text>}
            <Text style={[styles.pillText, otherSelected && styles.pillTextActive]}>Other</Text>
          </TouchableOpacity>
        )}
      </View>

      {otherSelected && (
        <TextInput
          style={[styles.textInput, styles.otherInput]}
          value={localOther}
          onChangeText={commitOther}
          placeholder="Type your answer…"
          placeholderTextColor={Colors.textTertiary}
          autoFocus
          accessibilityLabel="Other — custom answer"
        />
      )}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OnboardingQuestion({ question, value, onChange, error }: OnboardingQuestionProps) {
  return (
    <View style={styles.container}>
      {question.hint ? <Text style={styles.hint}>{question.hint}</Text> : null}

      {question.type === STEP_TYPES.TEXTAREA && (
        <TextareaInput question={question} value={(value as string) ?? ''} onChange={onChange as (v: string) => void} />
      )}
      {question.type === STEP_TYPES.MULTITEXT && (
        <MultiTextInput question={question} value={(value as string[]) ?? ['']} onChange={onChange as (v: string[]) => void} />
      )}
      {question.type === STEP_TYPES.SELECT && (
        <SelectInput question={question} value={(value as string) ?? ''} onChange={onChange as (v: string) => void} />
      )}
      {question.type === STEP_TYPES.PILLS && (
        <PillsInput question={question} value={value} onChange={onChange} />
      )}

      {error ? (
        <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  hint: { fontSize: FontSize.sm, color: Colors.textTertiary, marginBottom: Spacing.xs },
  textarea: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: FontSize.md, color: Colors.textPrimary,
    backgroundColor: Colors.surface, minHeight: 100,
  },
  textInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: FontSize.md, color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  otherInput: { marginTop: Spacing.sm },
  multitextRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  removeBtn: { padding: Spacing.sm },
  removeBtnText: { fontSize: FontSize.md, color: Colors.textTertiary },
  addBtn: { paddingVertical: Spacing.sm },
  addBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  optionsList: { gap: Spacing.sm },
  optionChip: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, backgroundColor: Colors.surface,
  },
  optionChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + '15' },
  optionText: { fontSize: FontSize.md, color: Colors.textPrimary },
  optionTextSelected: { color: Colors.primary, fontWeight: FontWeight.semibold },
  // Pills
  pillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  pillActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  pillDisabled: { opacity: 0.4 },
  pillCheck: { fontSize: FontSize.xs, color: Colors.primary, marginRight: 2 },
  pillText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  pillTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  pillTextDisabled: { color: Colors.textTertiary },
  errorText: { fontSize: FontSize.sm, color: Colors.error, marginTop: Spacing.xs },
});

export default OnboardingQuestion;
