// ============================================================
// Human-readable labels for enum values
// ============================================================

import { ActivityLevel, HealthGoal, HealthCondition, FoodPreference } from '@/types';

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (little or no exercise)',
  lightly_active: 'Lightly Active (1-3 days/week)',
  moderately_active: 'Moderately Active (3-5 days/week)',
  very_active: 'Very Active (6-7 days/week)',
  extremely_active: 'Extremely Active (athlete/physical job)',
};

export const GOAL_LABELS: Record<HealthGoal, string> = {
  reverse_diabetes: 'Reverse Diabetes',
  lower_blood_pressure: 'Lower Blood Pressure',
  lower_cholesterol: 'Lower Cholesterol',
  lose_weight: 'Lose Weight',
  improve_energy: 'Improve Energy',
  better_sleep: 'Better Sleep',
  eat_healthier: 'Eat Healthier',
  build_strength: 'Build Strength',
};

export const CONDITION_LABELS: Record<HealthCondition, string> = {
  type2_diabetes: 'Type 2 Diabetes',
  type1_diabetes: 'Type 1 Diabetes',
  prediabetes: 'Prediabetes',
  hypertension: 'Hypertension (High BP)',
  high_cholesterol: 'High Cholesterol',
  obesity: 'Obesity',
  heart_disease: 'Heart Disease',
  none: 'None of the above',
};

export const FOOD_PREF_LABELS: Record<FoodPreference, string> = {
  no_restrictions: 'No Restrictions',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  keto: 'Keto',
  paleo: 'Paleo',
  gluten_free: 'Gluten-Free',
  dairy_free: 'Dairy-Free',
  halal: 'Halal',
  kosher: 'Kosher',
};

export const METRIC_UNITS: Record<string, string> = {
  steps: 'steps',
  heart_rate: 'bpm',
  blood_glucose: 'mg/dL',
  blood_pressure_systolic: 'mmHg',
  blood_pressure_diastolic: 'mmHg',
  weight: 'kg',
  sleep_hours: 'hours',
  calories_consumed: 'kcal',
  calories_burned: 'kcal',
  water_ml: 'ml',
};
