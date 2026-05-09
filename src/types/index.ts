// ============================================================
// Project LEO - Core Type Definitions
// ============================================================

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  age: number | null;
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goals: HealthGoal[];
  conditions: HealthCondition[];
  food_preferences: FoodPreference[];
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';

export type HealthGoal =
  | 'reverse_diabetes'
  | 'lower_blood_pressure'
  | 'lower_cholesterol'
  | 'lose_weight'
  | 'improve_energy'
  | 'better_sleep'
  | 'eat_healthier'
  | 'build_strength';

export type HealthCondition =
  | 'type2_diabetes'
  | 'type1_diabetes'
  | 'prediabetes'
  | 'hypertension'
  | 'high_cholesterol'
  | 'obesity'
  | 'heart_disease'
  | 'none';

export type FoodPreference =
  | 'no_restrictions'
  | 'vegetarian'
  | 'vegan'
  | 'keto'
  | 'paleo'
  | 'gluten_free'
  | 'dairy_free'
  | 'halal'
  | 'kosher';

export type MetricType =
  | 'steps'
  | 'heart_rate'
  | 'blood_glucose'
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic'
  | 'weight'
  | 'sleep_hours'
  | 'calories_consumed'
  | 'calories_burned'
  | 'water_ml';

export type MetricSource = 'manual' | 'apple_health' | 'garmin' | 'fitbit' | 'google_fit';

export interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: MetricType;
  value: number;
  unit: string;
  recorded_at: string;
  source: MetricSource;
  created_at: string;
}

export interface CoachingPlan {
  id: string;
  user_id: string;
  plan_type: 'weekly' | 'daily';
  diet_recommendations: Recommendation[];
  exercise_recommendations: Recommendation[];
  supplement_recommendations: Recommendation[];
  lifestyle_tips: string[];
  summary: string;
  generated_at: string;
  valid_until: string;
}

export interface Recommendation {
  title: string;
  description: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Goal {
  id: string;
  user_id: string;
  goal_type: HealthGoal;
  title: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  deadline: string | null;
  status: 'active' | 'achieved' | 'paused';
  created_at: string;
}

export interface LabResult {
  id: string;
  user_id: string;
  test_name: string;
  value: number;
  unit: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
  test_date: string;
  notes: string | null;
  created_at: string;
}

export interface MealLog {
  id: string;
  user_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  logged_at: string;
}
