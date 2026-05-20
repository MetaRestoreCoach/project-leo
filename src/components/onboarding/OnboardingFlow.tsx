import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { OnboardingQuestion } from '@/components/onboarding/OnboardingQuestion';
import { WellnessWheel } from '@/components/onboarding/WellnessWheel';
import { validateResponse, buildUserPreferences } from '@/services/onboardingService';
import type { OnboardingService, UserPreferences } from '@/services/onboardingService';
import type { OnboardingConfig, AnyStep, GroupStep, QuestionStep } from '@/config/onboardingConfig';
import { STEP_TYPES } from '@/config/onboardingConfig';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/theme';

export interface OnboardingFlowProps {
  config: OnboardingConfig | null;
  loading: boolean;
  error: string | null;
  service: OnboardingService;
  uid: string;
  onComplete: (prefs: UserPreferences) => void;
}

export function OnboardingFlow({
  config, loading, error, service, uid, onComplete,
}: OnboardingFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [wheelScores, setWheelScores] = useState<Record<string, number>>({});
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // All hooks before any early return
  useEffect(() => {
    if (!config) return;
    const initial: Record<string, number> = {};
    config.wellnessWheel.segments.forEach((seg) => {
      initial[seg.id] = config.wellnessWheel.defaultScore;
    });
    setWheelScores(initial);
  }, [config]);

  const steps = config?.steps ?? [];
  const totalSteps = steps.length + 1; // steps + wheel
  const isWheelStep = stepIndex === steps.length;
  const currentStep: AnyStep | null = isWheelStep ? null : steps[stepIndex] ?? null;
  const isGroup = currentStep?.type === STEP_TYPES.GROUP;

  const handleNext = useCallback(() => {
    if (!currentStep) return;
    if (isGroup) {
      const group = currentStep as GroupStep;
      for (const sub of group.subSteps) {
        const result = validateResponse(sub, responses[sub.id]);
        if (!result.valid) { setFieldError(`${sub.question}: ${result.error}`); return; }
      }
    } else {
      const q = currentStep as QuestionStep;
      const result = validateResponse(q, responses[q.id]);
      if (!result.valid) { setFieldError(result.error); return; }
    }
    setFieldError(null);
    setStepIndex((i) => i + 1);
  }, [currentStep, isGroup, responses]);

  const handleBack = useCallback(() => {
    setFieldError(null);
    setSubmitError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleScoreChange = useCallback((id: string, score: number) => {
    setWheelScores((prev) => ({ ...prev, [id]: score }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!config) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Skip DB save when not authenticated — useful for testing
      if (!uid) {
        onComplete(buildUserPreferences('anonymous', responses, wheelScores, config));
        return;
      }
      const prefs = await service.savePreferences(uid, responses, wheelScores, config);
      onComplete(prefs);
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Could not save your answers. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [service, uid, responses, wheelScores, config, onComplete]);

  // ── Guards ────────────────────────────────────────────────────────────────

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
        <Text style={styles.errorText}>Could not load onboarding. Please try again.</Text>
        {error ? <Text style={styles.errorDetail}>{error}</Text> : null}
      </View>
    );
  }

  // ── Wellness Wheel step ───────────────────────────────────────────────────

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
          {submitError ? (
            <Text style={styles.submitError} accessibilityRole="alert">{submitError}</Text>
          ) : null}
        </OnboardingShell>
      </View>
    );
  }

  // ── Group step ────────────────────────────────────────────────────────────

  if (isGroup && currentStep) {
    const group = currentStep as GroupStep;
    return (
      <View testID="onboarding-flow" style={{ flex: 1 }}>
        <OnboardingShell
          step={stepIndex + 1}
          totalSteps={totalSteps}
          title={group.title}
          subtitle={group.hint ?? ''}
          onNext={handleNext}
          onBack={stepIndex > 0 ? handleBack : undefined}
          testIDNext="btn-next"
          testIDBack="btn-back"
        >
          {group.subSteps.map((sub) => (
            <View key={sub.id} style={styles.subQuestion}>
              <Text style={styles.subQuestionTitle}>{sub.question}</Text>
              {sub.hint ? <Text style={styles.subHint}>{sub.hint}</Text> : null}
              <OnboardingQuestion
                question={sub}
                value={responses[sub.id]}
                onChange={(val) => {
                  setFieldError(null);
                  setResponses((prev) => ({ ...prev, [sub.id]: val }));
                }}
              />
            </View>
          ))}
          {fieldError ? (
            <Text style={styles.errorText} accessibilityRole="alert">{fieldError}</Text>
          ) : null}
        </OnboardingShell>
      </View>
    );
  }

  // ── Single question step ──────────────────────────────────────────────────

  const q = currentStep as QuestionStep;

  return (
    <View testID="onboarding-flow" style={{ flex: 1 }}>
      <OnboardingShell
        step={stepIndex + 1}
        totalSteps={totalSteps}
        title={q.question}
        subtitle={q.hint ?? ''}
        onNext={handleNext}
        onBack={stepIndex > 0 ? handleBack : undefined}
        testIDNext="btn-next"
        testIDBack="btn-back"
      >
        <OnboardingQuestion
          question={q}
          value={responses[q.id]}
          onChange={(val) => {
            setFieldError(null);
            setResponses((prev) => ({ ...prev, [q.id]: val }));
          }}
          error={fieldError}
        />
      </OnboardingShell>
    </View>
  );
}

const styles = StyleSheet.create({
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  subQuestion: { marginBottom: Spacing.xl },
  subQuestionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subHint: { fontSize: FontSize.sm, color: Colors.textTertiary, marginBottom: Spacing.sm },
  errorText: { fontSize: FontSize.sm, color: Colors.error, textAlign: 'center', marginTop: Spacing.xs },
  errorDetail: { fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center' },
  submitError: {
    fontSize: FontSize.sm, color: Colors.error, textAlign: 'center',
    marginTop: Spacing.md, paddingHorizontal: Spacing.md,
  },
});

export default OnboardingFlow;
