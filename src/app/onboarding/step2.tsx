import React from 'react';
import { useRouter } from 'expo-router';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { ChipSelector } from '@/components/onboarding/ChipSelector';
import { useOnboardingStore } from '@/hooks/useOnboardingStore';
import { CONDITION_LABELS } from '@/constants/labels';
import { HealthCondition } from '@/types';

const CONDITION_OPTIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
  value: value as HealthCondition,
  label,
}));

export default function Step2() {
  const router = useRouter();
  const { conditions, toggleCondition } = useOnboardingStore();

  return (
    <OnboardingShell
      step={2}
      totalSteps={4}
      title="Health Conditions"
      subtitle="Select any conditions you're currently managing. This helps us tailor your diet and lifestyle recommendations."
      onNext={() => router.push('/onboarding/step3')}
      onBack={() => router.back()}
      nextDisabled={conditions.length === 0}
    >
      <ChipSelector
        options={CONDITION_OPTIONS}
        selected={conditions}
        onToggle={toggleCondition}
      />
    </OnboardingShell>
  );
}
