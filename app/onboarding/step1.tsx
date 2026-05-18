import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { Input } from '@/components/common/Input';
import { useOnboardingStore } from '@/hooks/useOnboardingStore';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-Binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export default function Step1() {
  const router = useRouter();
  const { full_name, age, gender, height_cm, weight_kg, setField } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  // Pre-fill name from Google/Apple metadata if not already set
  React.useEffect(() => {
    if (!full_name && user?.user_metadata?.full_name) {
      setField('full_name', user.user_metadata.full_name);
    }
  }, [user]);

  const canContinue = full_name.trim().length > 0 && age.length > 0;

  return (
    <OnboardingShell
      step={1}
      totalSteps={4}
      title="About You"
      subtitle="Let's start with some basics so we can personalize your health plan."
      onNext={() => router.push('/onboarding/step2')}
      nextDisabled={!canContinue}
    >
      <Input
        label="Full Name"
        placeholder="Your name"
        icon="person-outline"
        value={full_name}
        onChangeText={(v) => setField('full_name', v)}
        autoComplete="name"
      />

      <Input
        label="Age"
        placeholder="e.g. 35"
        icon="calendar-outline"
        value={age}
        onChangeText={(v) => setField('age', v.replace(/[^0-9]/g, ''))}
        keyboardType="numeric"
        maxLength={3}
      />

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g.value}
            style={[styles.genderChip, gender === g.value && styles.genderChipActive]}
            onPress={() => setField('gender', g.value)}
          >
            <Text style={[styles.genderLabel, gender === g.value && styles.genderLabelActive]}>
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Input
            label="Height (cm)"
            placeholder="170"
            value={height_cm}
            onChangeText={(v) => setField('height_cm', v.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.half}>
          <Input
            label="Weight (kg)"
            placeholder="70"
            value={weight_kg}
            onChangeText={(v) => setField('weight_kg', v.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
          />
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: FontSize.sm, color: Colors.textSecondary,
    marginBottom: Spacing.sm, fontWeight: '500',
  },
  genderRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md,
  },
  genderChip: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  genderChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  genderLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  genderLabelActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  row: { flexDirection: 'row', gap: Spacing.md },
  half: { flex: 1 },
});
