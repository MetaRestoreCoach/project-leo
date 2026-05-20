// ============================================================
// onboardingService — validation + service factory tests (25)
// ============================================================

import {
  validateResponse,
  mergeConfig,
  buildUserPreferences,
  createOnboardingService,
} from '@/services/onboardingService';
import type { OnboardingStorage, UserPreferences } from '@/services/onboardingService';
import { DEFAULT_ONBOARDING_CONFIG } from '@/config/onboardingConfig';
import type { OnboardingConfig, QuestionStep } from '@/config/onboardingConfig';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTextarea(overrides: Partial<QuestionStep> = {}): QuestionStep {
  return {
    id: 'sleep',
    type: 'textarea',
    question: 'How is your sleep?',
    required: true,
    hint: null,
    maxLength: 300,
    ...overrides,
  };
}

function makeMultitext(overrides: Partial<QuestionStep> = {}): QuestionStep {
  return {
    id: 'goals',
    type: 'multitext',
    question: 'What are your goals?',
    required: true,
    hint: null,
    minItems: 1,
    maxItems: 3,
    ...overrides,
  };
}

function makeSelect(overrides: Partial<QuestionStep> = {}): QuestionStep {
  return {
    id: 'balance',
    type: 'select',
    question: 'Rate your balance',
    required: true,
    hint: null,
    options: [
      { value: 'yes', label: 'Good' },
      { value: 'no', label: 'Struggling' },
    ],
    ...overrides,
  };
}

function makeMockStorage(overrides: Partial<OnboardingStorage> = {}): OnboardingStorage {
  return {
    getRemoteConfig: jest.fn(async () => null),
    saveUserPreferences: jest.fn(async () => undefined),
    loadUserPreferences: jest.fn(async () => null),
    markOnboardingComplete: jest.fn(async () => undefined),
    isOnboardingComplete: jest.fn(async () => false),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
describe('validateResponse — textarea', () => {
  test('valid non-empty text passes', () => {
    const result = validateResponse(makeTextarea(), 'I sleep 7 hours');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  test('empty string fails when required', () => {
    const result = validateResponse(makeTextarea(), '');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('whitespace-only string fails when required', () => {
    const result = validateResponse(makeTextarea(), '   ');
    expect(result.valid).toBe(false);
  });

  test('exceeding maxLength fails', () => {
    const longText = 'a'.repeat(301);
    const result = validateResponse(makeTextarea({ maxLength: 300 }), longText);
    expect(result.valid).toBe(false);
  });

  test('optional textarea with empty value passes', () => {
    const result = validateResponse(makeTextarea({ required: false }), '');
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('validateResponse — multitext', () => {
  test('single filled item passes when minItems=1', () => {
    const result = validateResponse(makeMultitext(), ['Lose weight']);
    expect(result.valid).toBe(true);
  });

  test('empty array fails when required', () => {
    const result = validateResponse(makeMultitext(), []);
    expect(result.valid).toBe(false);
  });

  test('array of empty strings fails (not counted as filled)', () => {
    const result = validateResponse(makeMultitext(), ['', '']);
    expect(result.valid).toBe(false);
  });

  test('requires minItems filled items', () => {
    const result = validateResponse(makeMultitext({ minItems: 2 }), ['Only one']);
    expect(result.valid).toBe(false);
  });

  test('optional multitext with empty array passes', () => {
    const result = validateResponse(makeMultitext({ required: false }), []);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('validateResponse — select', () => {
  test('selected value passes', () => {
    const result = validateResponse(makeSelect(), 'yes');
    expect(result.valid).toBe(true);
  });

  test('empty string fails when required', () => {
    const result = validateResponse(makeSelect(), '');
    expect(result.valid).toBe(false);
  });

  test('undefined fails when required', () => {
    const result = validateResponse(makeSelect(), undefined);
    expect(result.valid).toBe(false);
  });

  test('optional select with empty value passes', () => {
    const result = validateResponse(makeSelect({ required: false }), '');
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('mergeConfig', () => {
  test('returns defaultConfig when remoteConfig is null', () => {
    const merged = mergeConfig(DEFAULT_ONBOARDING_CONFIG, null);
    expect(merged).toEqual(DEFAULT_ONBOARDING_CONFIG);
  });

  test('remote steps fully replace default steps', () => {
    const remote: Partial<OnboardingConfig> = {
      steps: [makeTextarea({ id: 'custom_q' })],
    };
    const merged = mergeConfig(DEFAULT_ONBOARDING_CONFIG, remote);
    expect(merged.steps).toHaveLength(1);
    expect(merged.steps[0].id).toBe('custom_q');
  });

  test('remote schemaVersion overrides default', () => {
    const remote: Partial<OnboardingConfig> = { schemaVersion: '2.0.0' };
    const merged = mergeConfig(DEFAULT_ONBOARDING_CONFIG, remote);
    expect(merged.schemaVersion).toBe('2.0.0');
  });

  test('wellnessWheel partial override merges correctly', () => {
    const remote: Partial<OnboardingConfig> = {
      wellnessWheel: { ...DEFAULT_ONBOARDING_CONFIG.wellnessWheel, focusAreaCount: 5 },
    };
    const merged = mergeConfig(DEFAULT_ONBOARDING_CONFIG, remote);
    expect(merged.wellnessWheel.focusAreaCount).toBe(5);
    expect(merged.wellnessWheel.segments).toEqual(DEFAULT_ONBOARDING_CONFIG.wellnessWheel.segments);
  });
});

// ---------------------------------------------------------------------------
describe('buildUserPreferences', () => {
  const uid = 'test_uid';
  const responses = { goals: ['Lose weight'], sleep: 'OK' };
  const scores = { nutrition: 3, sleep: 7 };

  test('includes uid', () => {
    const prefs = buildUserPreferences(uid, responses, scores, DEFAULT_ONBOARDING_CONFIG);
    expect(prefs.uid).toBe(uid);
  });

  test('includes responses', () => {
    const prefs = buildUserPreferences(uid, responses, scores, DEFAULT_ONBOARDING_CONFIG);
    expect(prefs.responses).toEqual(responses);
  });

  test('wellnessScores contains provided scores', () => {
    const prefs = buildUserPreferences(uid, responses, scores, DEFAULT_ONBOARDING_CONFIG);
    expect(prefs.wellnessScores.scores).toEqual(scores);
  });

  test('focusAreas has correct count', () => {
    const allScores = Object.fromEntries(
      DEFAULT_ONBOARDING_CONFIG.wellnessWheel.segments.map((s, i) => [s.id, i]),
    );
    const prefs = buildUserPreferences(uid, responses, allScores, DEFAULT_ONBOARDING_CONFIG);
    expect(prefs.focusAreas).toHaveLength(DEFAULT_ONBOARDING_CONFIG.wellnessWheel.focusAreaCount);
  });

  test('nextAssessmentDue is reassessmentDays after assessedAt', () => {
    const prefs = buildUserPreferences(uid, responses, scores, DEFAULT_ONBOARDING_CONFIG);
    const assessed = new Date(prefs.wellnessScores.assessedAt);
    const due = new Date(prefs.wellnessScores.nextAssessmentDue);
    const diffDays = Math.round((due.getTime() - assessed.getTime()) / 86_400_000);
    expect(diffDays).toBe(DEFAULT_ONBOARDING_CONFIG.wellnessWheel.reassessmentDays);
  });
});

// ---------------------------------------------------------------------------
describe('createOnboardingService', () => {
  test('getConfig returns merged config when remote available', async () => {
    const remote: OnboardingConfig = { ...DEFAULT_ONBOARDING_CONFIG, schemaVersion: '9.9.9' };
    const storage = makeMockStorage({ getRemoteConfig: jest.fn(async () => remote) });
    const service = createOnboardingService(storage);
    const config = await service.getConfig();
    expect(config.schemaVersion).toBe('9.9.9');
  });

  test('getConfig returns default when remote throws', async () => {
    const storage = makeMockStorage({
      getRemoteConfig: jest.fn(async () => { throw new Error('network'); }),
    });
    const service = createOnboardingService(storage);
    const config = await service.getConfig();
    expect(config.schemaVersion).toBe(DEFAULT_ONBOARDING_CONFIG.schemaVersion);
  });

  test('savePreferences calls storage.saveUserPreferences with correct uid', async () => {
    const storage = makeMockStorage();
    const service = createOnboardingService(storage);
    await service.savePreferences('u1', { goals: ['test'] }, {}, DEFAULT_ONBOARDING_CONFIG);
    expect(storage.saveUserPreferences).toHaveBeenCalledWith('u1', expect.any(Object));
  });

  test('savePreferences calls markOnboardingComplete', async () => {
    const storage = makeMockStorage();
    const service = createOnboardingService(storage);
    await service.savePreferences('u2', {}, {}, DEFAULT_ONBOARDING_CONFIG);
    expect(storage.markOnboardingComplete).toHaveBeenCalledWith('u2');
  });

  test('isComplete delegates to storage.isOnboardingComplete', async () => {
    const storage = makeMockStorage({ isOnboardingComplete: jest.fn(async () => true) });
    const service = createOnboardingService(storage);
    const result = await service.isComplete('u3');
    expect(result).toBe(true);
  });

  test('getMIPrompt returns filled prompt string', async () => {
    const storage = makeMockStorage();
    const service = createOnboardingService(storage);
    const allScores = Object.fromEntries(
      DEFAULT_ONBOARDING_CONFIG.wellnessWheel.segments.map((s, i) => [s.id, i]),
    );
    const prefs: UserPreferences = buildUserPreferences('u4', {}, allScores, DEFAULT_ONBOARDING_CONFIG);
    const prompt = service.getMIPrompt(prefs, DEFAULT_ONBOARDING_CONFIG);
    expect(prompt).not.toContain('{area1}');
    expect(prompt).not.toContain('{area2}');
  });
});
