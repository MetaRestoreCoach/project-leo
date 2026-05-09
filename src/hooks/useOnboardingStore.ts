// ============================================================
// Onboarding Store - Temporary state across wizard steps
// ============================================================

import { create } from 'zustand';
import { ActivityLevel, HealthGoal, HealthCondition, FoodPreference, Profile } from '@/types';

interface OnboardingState {
  full_name: string;
  age: string;
  gender: Profile['gender'];
  height_cm: string;
  weight_kg: string;
  activity_level: ActivityLevel | null;
  goals: HealthGoal[];
  conditions: HealthCondition[];
  food_preferences: FoodPreference[];

  setField: (field: string, value: any) => void;
  toggleGoal: (goal: HealthGoal) => void;
  toggleCondition: (condition: HealthCondition) => void;
  toggleFoodPref: (pref: FoodPreference) => void;
  reset: () => void;
}

const initialState = {
  full_name: '',
  age: '',
  gender: null as Profile['gender'],
  height_cm: '',
  weight_kg: '',
  activity_level: null as ActivityLevel | null,
  goals: [] as HealthGoal[],
  conditions: [] as HealthCondition[],
  food_preferences: [] as FoodPreference[],
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,

  setField: (field, value) => set({ [field]: value }),

  toggleGoal: (goal) => set((s) => ({
    goals: s.goals.includes(goal) ? s.goals.filter((g) => g !== goal) : [...s.goals, goal],
  })),

  toggleCondition: (condition) => set((s) => {
    if (condition === 'none') return { conditions: ['none'] };
    const without = s.conditions.filter((c) => c !== 'none');
    return {
      conditions: without.includes(condition)
        ? without.filter((c) => c !== condition)
        : [...without, condition],
    };
  }),

  toggleFoodPref: (pref) => set((s) => {
    if (pref === 'no_restrictions') return { food_preferences: ['no_restrictions'] };
    const without = s.food_preferences.filter((p) => p !== 'no_restrictions');
    return {
      food_preferences: without.includes(pref)
        ? without.filter((p) => p !== pref)
        : [...without, pref],
    };
  }),

  reset: () => set(initialState),
}));
