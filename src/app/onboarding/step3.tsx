import React from 'react';
import { useRouter } from 'expo-router';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { ChipSelector } from '@/components/onboarding/ChipSelector';
import { useOnboardingStore } from '@/hooks/useOnboardingStore';
import { GOAL_LABELS } from '@/constants/labels';
import { HealthGoal } from '@/types';

const GOAL_OPTIONS = Object.entries(GOAL_LABELS).map(([value, label]) => ({
  value: value as HealthGoal,
  label,
}));

export default function Step3() {
  const router = useRouter();
  const { goals, toggleGoal } = useOnboardingStore();

  return (
    <OnboardingShell
      step={3}
      totalSteps={4}
      title="Your Goals"
      subtitle="What do you want to achieve? Select all that apply. We'll prioritize your coaching plan around these."
      onNext={() => router.push('/onboarding/step4')}
      onBack={() => router.back()}
      nextDisabled={goals.length === 0}
    >
      <ChipSelector
        options={GOAL_OPTIONS}
        selected={goals}
        onToggle={toggleGoal}
      />
    </OnboardingShell>
  );
}
