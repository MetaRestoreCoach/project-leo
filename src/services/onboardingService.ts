// ============================================================
// Project LEO — Onboarding Service
// Pure business logic: validation, config merge, preferences builder.
// Accepts an abstract storage adapter — use supabaseOnboardingStorage
// in production, or an in-memory mock for tests.
// ============================================================

import {
  OnboardingConfig,
  DEFAULT_ONBOARDING_CONFIG,
  QuestionStep,
  STEP_TYPES,
} from '@/config/onboardingConfig';
import { getTopFocusAreas, buildMIPrompt } from '@/utils/wheelCalculations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export interface WellnessScores {
  scores: Record<string, number>;
  assessedAt: string;
  nextAssessmentDue: string;
}

export interface UserPreferences {
  uid: string;
  onboardingVersion: string;
  completedAt: string;
  responses: Record<string, string | string[]>;
  wellnessScores: WellnessScores;
  focusAreas: string[];
}

// ---------------------------------------------------------------------------
// Storage interface — any backend must implement this
// ---------------------------------------------------------------------------

export interface OnboardingStorage {
  getRemoteConfig(): Promise<OnboardingConfig | null>;
  saveUserPreferences(uid: string, prefs: UserPreferences): Promise<void>;
  loadUserPreferences(uid: string): Promise<UserPreferences | null>;
  markOnboardingComplete(uid: string): Promise<void>;
  isOnboardingComplete(uid: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateResponse(
  question: QuestionStep,
  value: string | string[] | undefined,
): ValidationResult {
  if (!question.required) return { valid: true, error: null };

  if (question.type === STEP_TYPES.TEXTAREA) {
    const text = (value as string | undefined) ?? '';
    if (!text.trim()) return { valid: false, error: 'Please enter a response.' };
    if (question.maxLength && text.length > question.maxLength) {
      return { valid: false, error: `Keep it under ${question.maxLength} characters.` };
    }
    return { valid: true, error: null };
  }

  if (question.type === STEP_TYPES.MULTITEXT) {
    const items = (value as string[] | undefined) ?? [];
    const filled = items.filter((s) => s.trim().length > 0);
    const min = question.minItems ?? 1;
    if (filled.length < min) {
      return { valid: false, error: `Please enter at least ${min} item${min > 1 ? 's' : ''}.` };
    }
    return { valid: true, error: null };
  }

  if (question.type === STEP_TYPES.SELECT) {
    const selected = (value as string | undefined) ?? '';
    if (!selected) return { valid: false, error: 'Please select an option.' };
    return { valid: true, error: null };
  }

  return { valid: true, error: null };
}

// ---------------------------------------------------------------------------
// Config merge — remote steps/segments fully replace defaults when present
// ---------------------------------------------------------------------------

export function mergeConfig(
  defaultConfig: OnboardingConfig,
  remoteConfig: Partial<OnboardingConfig> | null,
): OnboardingConfig {
  if (!remoteConfig) return defaultConfig;
  return {
    ...defaultConfig,
    ...remoteConfig,
    wellnessWheel: remoteConfig.wellnessWheel
      ? { ...defaultConfig.wellnessWheel, ...remoteConfig.wellnessWheel }
      : defaultConfig.wellnessWheel,
  };
}

// ---------------------------------------------------------------------------
// Preferences builder
// ---------------------------------------------------------------------------

export function buildUserPreferences(
  uid: string,
  responses: Record<string, string | string[]>,
  wheelScores: Record<string, number>,
  config: OnboardingConfig,
): UserPreferences {
  const now = new Date();
  const nextDue = new Date(now);
  nextDue.setDate(now.getDate() + config.wellnessWheel.reassessmentDays);

  const focusSegments = getTopFocusAreas(
    config.wellnessWheel.segments,
    wheelScores,
    config.wellnessWheel.focusAreaCount,
  );

  return {
    uid,
    onboardingVersion: config.schemaVersion,
    completedAt: now.toISOString(),
    responses,
    wellnessScores: {
      scores: wheelScores,
      assessedAt: now.toISOString(),
      nextAssessmentDue: nextDue.toISOString(),
    },
    focusAreas: focusSegments.map((s) => s.id),
  };
}

// ---------------------------------------------------------------------------
// Service factory
// ---------------------------------------------------------------------------

export interface OnboardingService {
  getConfig(): Promise<OnboardingConfig>;
  savePreferences(
    uid: string,
    responses: Record<string, string | string[]>,
    wheelScores: Record<string, number>,
    config: OnboardingConfig,
  ): Promise<UserPreferences>;
  loadPreferences(uid: string): Promise<UserPreferences | null>;
  isComplete(uid: string): Promise<boolean>;
  getMIPrompt(prefs: UserPreferences, config: OnboardingConfig): string;
}

export function createOnboardingService(storage: OnboardingStorage): OnboardingService {
  return {
    async getConfig() {
      try {
        const remote = await storage.getRemoteConfig();
        return mergeConfig(DEFAULT_ONBOARDING_CONFIG, remote);
      } catch {
        return DEFAULT_ONBOARDING_CONFIG;
      }
    },

    async savePreferences(uid, responses, wheelScores, config) {
      const prefs = buildUserPreferences(uid, responses, wheelScores, config);
      await storage.saveUserPreferences(uid, prefs);
      await storage.markOnboardingComplete(uid);
      return prefs;
    },

    async loadPreferences(uid) {
      return storage.loadUserPreferences(uid);
    },

    async isComplete(uid) {
      return storage.isOnboardingComplete(uid);
    },

    getMIPrompt(prefs, config) {
      const focusSegments = config.wellnessWheel.segments.filter((s) =>
        prefs.focusAreas.includes(s.id),
      );
      return buildMIPrompt(config.wellnessWheel.miPromptTemplate, focusSegments);
    },
  };
}
