export const SCHEMA_VERSION = '1.1.0';

export const STEP_TYPES = {
  TEXTAREA: 'textarea',
  MULTITEXT: 'multitext',
  SELECT: 'select',
  PILLS: 'pills',
  GROUP: 'group',
} as const;

export type StepType = typeof STEP_TYPES[keyof typeof STEP_TYPES];

export interface SelectOption {
  value: string;
  label: string;
}

export interface QuestionStep {
  id: string;
  type: Exclude<StepType, 'group'>;
  question: string;
  required: boolean;
  hint: string | null;
  // textarea
  placeholder?: string;
  maxLength?: number;
  // multitext
  minItems?: number;
  maxItems?: number;
  // select / pills
  options?: SelectOption[];
  // pills
  multiSelect?: boolean;
  hasOther?: boolean;
  maxSelections?: number;
}

export interface GroupStep {
  id: string;
  type: 'group';
  title: string;
  hint: string | null;
  required: boolean;
  subSteps: QuestionStep[];
}

export type AnyStep = QuestionStep | GroupStep;

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
  steps: AnyStep[];
  wellnessWheel: WellnessWheelConfig;
}

export const DEFAULT_ONBOARDING_CONFIG: OnboardingConfig = {
  schemaVersion: SCHEMA_VERSION,
  lastUpdated: '2026-05-19',

  steps: [
    // ── Screen 1: Goals ──────────────────────────────────────────────────────
    {
      id: 'goals',
      type: STEP_TYPES.PILLS,
      question: 'What health goals matter most to you right now?',
      hint: 'Pick up to 3.',
      required: true,
      multiSelect: true,
      maxSelections: 3,
      hasOther: true,
      options: [
        { value: 'lose_weight',    label: 'Lose weight' },
        { value: 'sleep_better',   label: 'Sleep better' },
        { value: 'reduce_stress',  label: 'Reduce stress' },
        { value: 'eat_healthier',  label: 'Eat healthier' },
        { value: 'more_active',    label: 'Get more active' },
        { value: 'more_energy',    label: 'Boost energy' },
        { value: 'mental_health',  label: 'Mental wellbeing' },
        { value: 'build_strength', label: 'Build strength' },
      ],
    },

    // ── Screen 2: Lifestyle (group) ──────────────────────────────────────────
    {
      id: 'lifestyle',
      type: STEP_TYPES.GROUP,
      title: 'Your Lifestyle',
      hint: null,
      required: true,
      subSteps: [
        {
          id: 'physical_activity',
          type: STEP_TYPES.PILLS,
          question: 'Current activity level',
          hint: null,
          required: true,
          multiSelect: false,
          hasOther: false,
          options: [
            { value: 'sedentary', label: 'Mostly sitting' },
            { value: 'light',     label: 'Light activity' },
            { value: 'moderate',  label: 'Moderately active' },
            { value: 'active',    label: 'Very active' },
            { value: 'athlete',   label: 'Athlete / intense' },
          ],
        },
        {
          id: 'sleep',
          type: STEP_TYPES.PILLS,
          question: 'How has your sleep been?',
          hint: null,
          required: true,
          multiSelect: false,
          hasOther: false,
          options: [
            { value: 'great',    label: 'Great — 7–9 hrs' },
            { value: 'ok',       label: 'OK — 6–7 hrs' },
            { value: 'poor',     label: 'Poor — under 6 hrs' },
            { value: 'broken',   label: 'Broken / disrupted' },
            { value: 'insomnia', label: 'Insomnia' },
          ],
        },
        {
          id: 'work_life_balance',
          type: STEP_TYPES.PILLS,
          question: 'Work–life balance',
          hint: null,
          required: true,
          multiSelect: false,
          hasOther: false,
          options: [
            { value: 'yes',    label: 'Good — I feel balanced' },
            { value: 'mostly', label: 'Mostly balanced' },
            { value: 'no',     label: 'Struggling' },
          ],
        },
      ],
    },

    // ── Screen 3: Challenges (group) ─────────────────────────────────────────
    {
      id: 'challenges',
      type: STEP_TYPES.GROUP,
      title: 'Your Challenges',
      hint: null,
      required: true,
      subSteps: [
        {
          id: 'stressors',
          type: STEP_TYPES.PILLS,
          question: 'Main sources of stress',
          hint: 'Select all that apply.',
          required: false,
          multiSelect: true,
          hasOther: true,
          options: [
            { value: 'work',          label: 'Work pressure' },
            { value: 'finances',      label: 'Finances' },
            { value: 'family',        label: 'Family' },
            { value: 'health',        label: 'Health concerns' },
            { value: 'social',        label: 'Social life' },
            { value: 'relationships', label: 'Relationships' },
          ],
        },
        {
          id: 'barriers',
          type: STEP_TYPES.PILLS,
          question: 'What has held you back before?',
          hint: 'Select all that apply.',
          required: true,
          multiSelect: true,
          hasOther: true,
          options: [
            { value: 'time',       label: 'Lack of time' },
            { value: 'motivation', label: 'Low motivation' },
            { value: 'knowledge',  label: 'Not knowing how' },
            { value: 'cost',       label: 'Cost' },
            { value: 'injuries',   label: 'Injuries / health' },
            { value: 'stress',     label: 'Too stressed' },
          ],
        },
      ],
    },
  ],

  wellnessWheel: {
    title: 'Your Wellness Wheel',
    instruction:
      'Score each area of life from 1 (not at all satisfied) to 10 (completely satisfied).',
    scale: { min: 1, max: 10 },
    defaultScore: 5,
    reassessmentDays: 30,
    focusAreaCount: 3,
    miPromptTemplate:
      "It looks like {area1} and {area2} are areas you'd like to explore. What feels like the right first step?",
    segments: [
      { id: 'nutrition',     label: 'Food & Nutrition',       shortLabel: 'Nutrition',     color: '#4CAF50' },
      { id: 'sleep',         label: 'Sleep & Rest',           shortLabel: 'Sleep',         color: '#3F51B5' },
      { id: 'physical',      label: 'Physical Fitness',       shortLabel: 'Fitness',       color: '#FF5722' },
      { id: 'emotional',     label: 'Psych & Emotional',      shortLabel: 'Emotional',     color: '#9C27B0' },
      { id: 'career',        label: 'Career & Professional',  shortLabel: 'Career',        color: '#FF9800' },
      { id: 'spirituality',  label: 'Spirituality',           shortLabel: 'Spiritual',     color: '#00BCD4' },
      { id: 'environment',   label: 'Environmental',          shortLabel: 'Environment',   color: '#8BC34A' },
      { id: 'social',        label: 'Social & Cultural',      shortLabel: 'Social',        color: '#E91E63' },
      { id: 'intellectual',  label: 'Intellectual',           shortLabel: 'Intellect',     color: '#009688' },
      { id: 'relationships', label: 'Relationships & Family', shortLabel: 'Relationships', color: '#F44336' },
      { id: 'leisure',       label: 'Leisure',                shortLabel: 'Leisure',       color: '#795548' },
    ],
  },
};
