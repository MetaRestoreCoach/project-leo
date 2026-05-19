// ============================================================
// Project LEO — Onboarding Feature Config
// Remote config is fetched from Supabase and merged over these defaults.
// To update questions without a code deploy, edit the remote config.
// ============================================================

export const SCHEMA_VERSION = '1.0.0';

export const STEP_TYPES = {
  TEXTAREA: 'textarea',
  MULTITEXT: 'multitext',
  SELECT: 'select',
} as const;

export type StepType = typeof STEP_TYPES[keyof typeof STEP_TYPES];

export interface SelectOption {
  value: string;
  label: string;
}

export interface QuestionStep {
  id: string;
  type: StepType;
  question: string;
  required: boolean;
  hint: string | null;
  // textarea
  placeholder?: string;
  maxLength?: number;
  // multitext
  minItems?: number;
  maxItems?: number;
  // select
  options?: SelectOption[];
}

export interface WheelSegment {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
}

export interface WellnessWheelConfig {
  title: string;
  instruction: string;
  scale: { min: number; max: number };
  defaultScore: number;
  reassessmentDays: number;
  focusAreaCount: number;
  miPromptTemplate: string;
  segments: WheelSegment[];
}

export interface OnboardingConfig {
  schemaVersion: string;
  lastUpdated: string;
  steps: QuestionStep[];
  wellnessWheel: WellnessWheelConfig;
}

// ---------------------------------------------------------------------------
// Default config — used as fallback when remote fetch fails
// ---------------------------------------------------------------------------

export const DEFAULT_ONBOARDING_CONFIG: OnboardingConfig = {
  schemaVersion: SCHEMA_VERSION,
  lastUpdated: '2026-05-19',

  steps: [
    {
      id: 'goals',
      type: STEP_TYPES.MULTITEXT,
      question: 'What health goals are most important to you right now?',
      hint: 'You can add up to 3 goals.',
      placeholder: 'e.g. Sleep better, manage stress…',
      minItems: 1,
      maxItems: 3,
      required: true,
    },
    {
      id: 'physical_activity',
      type: STEP_TYPES.TEXTAREA,
      question: 'How would you describe your current level of physical activity?',
      hint: 'Think about a typical week — what does movement look like for you?',
      placeholder: 'e.g. I walk 20 minutes most days…',
      maxLength: 400,
      required: true,
    },
    {
      id: 'sleep',
      type: STEP_TYPES.TEXTAREA,
      question: 'How has your sleep been lately?',
      hint: 'Include anything that feels relevant — quality, duration, disruptions.',
      placeholder: 'e.g. I get about 6 hours but wake up several times…',
      maxLength: 400,
      required: true,
    },
    {
      id: 'stressors',
      type: STEP_TYPES.TEXTAREA,
      question: 'What are the main sources of stress in your life at the moment?',
      hint: 'No detail is too small — this helps us tailor your coaching.',
      placeholder: 'e.g. Work deadlines, family responsibilities…',
      maxLength: 400,
      required: false,
    },
    {
      id: 'barriers',
      type: STEP_TYPES.TEXTAREA,
      question: 'What has made it difficult to reach your health goals in the past?',
      hint: 'Be as honest as you like — this is just between you and your coach.',
      placeholder: 'e.g. Lack of time, motivation dips…',
      maxLength: 400,
      required: true,
    },
    {
      id: 'work_life_balance',
      type: STEP_TYPES.SELECT,
      question: 'How would you rate your current work–life balance?',
      hint: null,
      required: true,
      options: [
        { value: 'yes', label: 'Good — I feel balanced most of the time' },
        { value: 'mostly', label: 'Mostly — some areas need attention' },
        { value: 'no', label: 'Struggling — it needs significant work' },
      ],
    },
  ],

  wellnessWheel: {
    title: 'Your Wellness Wheel',
    instruction:
      'For each area of life, score your current level of satisfaction from 0 (not at all) to 9 (completely satisfied). There are no right or wrong answers.',
    scale: { min: 0, max: 9 },
    defaultScore: 5,
    reassessmentDays: 30,
    focusAreaCount: 3,
    miPromptTemplate:
      "It looks like {area1} and {area2} are areas you'd like to explore more. What feels like the right first step for you?",
    segments: [
      { id: 'nutrition',      label: 'Food & Nutrition',       shortLabel: 'Nutrition',    color: '#4CAF50' },
      { id: 'sleep',          label: 'Sleep & Rest',           shortLabel: 'Sleep',        color: '#3F51B5' },
      { id: 'physical',       label: 'Physical Fitness',       shortLabel: 'Fitness',      color: '#FF5722' },
      { id: 'emotional',      label: 'Psych & Emotional',      shortLabel: 'Emotional',    color: '#9C27B0' },
      { id: 'career',         label: 'Career & Professional',  shortLabel: 'Career',       color: '#FF9800' },
      { id: 'spirituality',   label: 'Spirituality',           shortLabel: 'Spiritual',    color: '#00BCD4' },
      { id: 'environment',    label: 'Environmental',          shortLabel: 'Environment',  color: '#8BC34A' },
      { id: 'social',         label: 'Social & Cultural',      shortLabel: 'Social',       color: '#E91E63' },
      { id: 'intellectual',   label: 'Intellectual',           shortLabel: 'Intellect',    color: '#009688' },
      { id: 'relationships',  label: 'Relationships & Family', shortLabel: 'Relationships',color: '#F44336' },
      { id: 'leisure',        label: 'Leisure',                shortLabel: 'Leisure',      color: '#795548' },
    ],
  },
};
