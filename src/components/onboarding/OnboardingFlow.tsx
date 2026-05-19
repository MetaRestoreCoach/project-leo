// ============================================================
// Project LEO — OnboardingFlow
// Orchestrator: manages step state, validation, and submission.
// Uses OnboardingShell for layout and progress display.
// ============================================================

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { OnboardingQuestion } from '@/components/onboarding/OnboardingQuestion';
import { WellnessWheel } from '@/components/onboarding/WellnessWheel';
import { validateResponse } from '@/services/onboardingService';
import type { OnboardingService, UserPreferences } from '@/services/onboardingService';
import type { OnboardingConfig } from '@/config/onboardingConfig';
import { Colors, Spacing, FontSize } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingFlowProps {
  config: OnboardingConfig | null;
  loading: boolean;
  error: string | null;
  service: OnboardingService;
  uid: string;
  onComplete: (prefs: UserPreferences) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingFlow({
  config,
  loading,
  error,
  service,
  uid,
  onComplete,
}: OnboardingFlowProps) {
  const [stepIndex, setStepIndex] = useState(0); // 0..n-1 = questions, n = wheel
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [wheelScores, setWheelScores] = useState<Record<string, number>>({});
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Loading / error guards ────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centred} testID="onboarding-loading">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !config) {
    return (
      <View style={styles.centred} testID="onboarding-error">
        <Text style={styles.errorText}>
          Could not load onboarding. Please try again.
        </Text>
        {error ? <Text style={styles.errorDetail}>{error}</Text> : null}
      </View>
    );
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const steps = config.steps;
  const totalSteps = steps.length + 1; // questions + wheel
  const isWheelStep = stepIndex === steps.length;
  const currentQuestion = isWheelStep ? null : steps[stepIndex];

  // Initialise wheel scores on first render
  if (
    !isWheelStep &&
    Object.keys(wheelScores).length === 0 &&
    config.wellnessWheel.segments.length > 0
  ) {
    const initial: Record<string, number> = {};
    config.wellnessWheel.segments.forEach((seg) => {
      initial[seg.id] = config.wellnessWheel.defaultScore;
    });
    setWheelScores(initial);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (currentQuestion) {
      const val = responses[currentQuestion.id];
      const result = validateResponse(currentQuestion, val);
      if (!result.valid) {
        setFieldError(result.error);
        return;
      }
    }
    setFieldError(null);
    setStepIndex((i) => i + 1);
  }, [currentQuestion, responses]);

  const handleBack = useCallback(() => {
    setFieldError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleScoreChange = useCallback((id: string, score: number) => {
    setWheelScores((prev) => ({ ...prev, [id]: score }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const prefs = await service.savePreferences(uid, responses, wheelScores, config);
      onComplete(prefs);
    } finally {
      setSubmitting(false);
    }
  }, [service, uid, responses, wheelScores, config, onComplete]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isWheelStep) {
    return (
      <View testID="onboarding-flow" style={{ flex: 1 }}>
        <OnboardingShell
          step={totalSteps}
          totalSteps={totalSteps}
          title={config.wellnessWheel.title}
          subtitle={config.wellnessWheel.instruction}
          onNext={handleSubmit}
          onBack={handleBack}
          nextLabel="Finish"
          loading={submitting}
          testIDNext="btn-submit"
          testIDBack="btn-back"
        >
          <WellnessWheel
            segments={config.wellnessWheel.segments}
            scores={wheelScores}
            scale={config.wellnessWheel.scale}
            onScoreChange={handleScoreChange}
            miPromptTemplate={config.wellnessWheel.miPromptTemplate}
            focusAreaCount={config.wellnessWheel.focusAreaCount}
          />
        </OnboardingShell>
      </View>
    );
  }

  return (
    <View testID="onboarding-flow" style={{ flex: 1 }}>
      <OnboardingShell
        step={stepIndex + 1}
        totalSteps={totalSteps}
        title={currentQuestion!.question}
        subtitle=""
        onNext={handleNext}
        onBack={stepIndex > 0 ? handleBack : undefined}
        testIDNext="btn-next"
        testIDBack="btn-back"
      >
        <OnboardingQuestion
          question={currentQuestion!}
          value={responses[currentQuestion!.id]}
          onChange={(val) => {
            setFieldError(null);
            setResponses((prev) => ({ ...prev, [currentQuestion!.id]: val }));
          }}
          error={fieldError}
        />
      </OnboardingShell>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  errorDetail: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});

export default OnboardingFlow;
