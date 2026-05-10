import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { ChipSelector } from '@/components/onboarding/ChipSelector';
import { useOnboardingStore } from '@/hooks/useOnboardingStore';
import { useAuthStore } from '@/hooks/useAuthStore';
import { completeOnboarding } from '@/services/profile';
import { FOOD_PREF_LABELS, ACTIVITY_LABELS } from '@/constants/labels';
import { FoodPreference, ActivityLevel } from '@/types';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

const FOOD_OPTIONS = Object.entries(FOOD_PREF_LABELS).map(([value, label]) => ({
  value: value as FoodPreference,
  label,
}));

const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_LABELS).map(([value, label]) => ({
  value: value as ActivityLevel,
  label,
}));

export default function Step4() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, refreshProfile } = useAuthStore();
  const store = useOnboardingStore();

  const canFinish = store.activity_level && store.food_preferences.length > 0;

  const handleFinish = async () => {
    if (!user || !canFinish) return;
    setLoading(true);
    setError('');
    try {
      await completeOnboarding(user.id, {
        full_name: store.full_name,
        age: parseInt(store.age, 10),
        gender: store.gender,
        height_cm: parseFloat(store.height_cm) || 0,
        weight_kg: parseFloat(store.weight_kg) || 0,
        activity_level: store.activity_level!,
        goals: store.goals,
        conditions: store.conditions,
        food_preferences: store.food_preferences,
      });
      await refreshProfile();
      store.reset();
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell
      step={4}
      totalSteps={4}
      title="Preferences"
      subtitle="Almost done! Tell us about your diet preferences and how active you are."
      onNext={handleFinish}
      onBack={() => router.back()}
      nextLabel="Start My Journey"
      nextDisabled={!canFinish}
      loading={loading}
    >
      <Text style={styles.sectionLabel}>Dietary Preferences</Text>
      <ChipSelector
        options={FOOD_OPTIONS}
        selected={store.food_preferences}
        onToggle={store.toggleFoodPref}
      />

      <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>Activity Level</Text>
      <View style={styles.activityList}>
        {ACTIVITY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.activityRow,
              store.activity_level === opt.value && styles.activityRowActive,
            ]}
            onPress={() => store.setField('activity_level', opt.value)}
          >
            <View style={[styles.radio, store.activity_level === opt.value && styles.radioActive]}>
              {store.activity_level === opt.value && <View style={styles.radioDot} />}
            </View>
            <Text style={[
              styles.activityLabel,
              store.activity_level === opt.value && styles.activityLabelActive,
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: FontSize.md, fontWeight: FontWeight.semibold,
    color: Colors.textPrimary, marginBottom: Spacing.sm,
  },
  activityList: { gap: Spacing.sm },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  activityRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: Colors.border, marginRight: Spacing.md,
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  activityLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  activityLabelActive: { color: Colors.textPrimary, fontWeight: FontWeight.medium },
  error: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.md },
});
