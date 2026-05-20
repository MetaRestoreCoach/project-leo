// ============================================================
// onboardingConfig — schema integrity tests
// ============================================================

import {
  DEFAULT_ONBOARDING_CONFIG,
  SCHEMA_VERSION,
  STEP_TYPES,
  type QuestionStep,
  type GroupStep,
} from '@/config/onboardingConfig';

describe('DEFAULT_ONBOARDING_CONFIG — schema integrity', () => {
  test('has correct schemaVersion', () => {
    expect(DEFAULT_ONBOARDING_CONFIG.schemaVersion).toBe(SCHEMA_VERSION);
  });

  test('has at least 1 step', () => {
    expect(DEFAULT_ONBOARDING_CONFIG.steps.length).toBeGreaterThanOrEqual(1);
  });

  test('every step has id, type, and required', () => {
    DEFAULT_ONBOARDING_CONFIG.steps.forEach((step) => {
      expect(step.id).toBeTruthy();
      expect(step.type).toBeTruthy();
      expect(typeof step.required).toBe('boolean');
    });
  });

  test('question steps have a question field; group steps have a title and subSteps', () => {
    DEFAULT_ONBOARDING_CONFIG.steps.forEach((step) => {
      if (step.type === STEP_TYPES.GROUP) {
        const g = step as GroupStep;
        expect(g.title).toBeTruthy();
        expect(Array.isArray(g.subSteps)).toBe(true);
        expect(g.subSteps.length).toBeGreaterThan(0);
      } else {
        expect((step as QuestionStep).question).toBeTruthy();
      }
    });
  });

  test('step ids are unique', () => {
    const ids = DEFAULT_ONBOARDING_CONFIG.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('step types are all valid STEP_TYPES values', () => {
    const validTypes = Object.values(STEP_TYPES);
    DEFAULT_ONBOARDING_CONFIG.steps.forEach((step) => {
      expect(validTypes).toContain(step.type);
    });
  });

  test('select and pills steps have non-empty options array', () => {
    DEFAULT_ONBOARDING_CONFIG.steps
      .filter((s) => s.type === STEP_TYPES.SELECT || s.type === STEP_TYPES.PILLS)
      .forEach((step) => {
        const q = step as QuestionStep;
        expect(q.options).toBeDefined();
        expect(q.options!.length).toBeGreaterThan(0);
      });
  });

  test('select/pills options have value and label', () => {
    DEFAULT_ONBOARDING_CONFIG.steps
      .filter((s) => s.type === STEP_TYPES.SELECT || s.type === STEP_TYPES.PILLS)
      .forEach((step) => {
        (step as QuestionStep).options!.forEach((opt) => {
          expect(opt.value).toBeTruthy();
          expect(opt.label).toBeTruthy();
        });
      });
  });

  test('wellnessWheel has required top-level fields', () => {
    const ww = DEFAULT_ONBOARDING_CONFIG.wellnessWheel;
    expect(ww.title).toBeTruthy();
    expect(ww.instruction).toBeTruthy();
    expect(ww.scale).toBeDefined();
    expect(ww.segments).toBeDefined();
    expect(ww.miPromptTemplate).toBeTruthy();
  });

  test('wellnessWheel scale is { min: 1, max: 10 }', () => {
    const { scale } = DEFAULT_ONBOARDING_CONFIG.wellnessWheel;
    expect(scale.min).toBe(1);
    expect(scale.max).toBe(10);
  });

  test('wellnessWheel has exactly 11 segments', () => {
    expect(DEFAULT_ONBOARDING_CONFIG.wellnessWheel.segments).toHaveLength(11);
  });

  test('segment ids are unique', () => {
    const ids = DEFAULT_ONBOARDING_CONFIG.wellnessWheel.segments.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every segment has id, label, shortLabel, color', () => {
    DEFAULT_ONBOARDING_CONFIG.wellnessWheel.segments.forEach((seg) => {
      expect(seg.id).toBeTruthy();
      expect(seg.label).toBeTruthy();
      expect(seg.shortLabel).toBeTruthy();
      expect(seg.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  test('miPromptTemplate contains {area1} and {area2}', () => {
    const { miPromptTemplate } = DEFAULT_ONBOARDING_CONFIG.wellnessWheel;
    expect(miPromptTemplate).toContain('{area1}');
    expect(miPromptTemplate).toContain('{area2}');
  });
});
