// ============================================================
// Profile Service - CRUD for user profiles
// ============================================================

import { supabase } from './supabase';
import { Profile, HealthGoal, HealthCondition, FoodPreference, ActivityLevel } from '@/types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

export async function createProfile(userId: string, profile: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      full_name: profile.full_name || '',
      age: profile.age || null,
      gender: profile.gender || null,
      height_cm: profile.height_cm || null,
      weight_kg: profile.weight_kg || null,
      activity_level: profile.activity_level || null,
      goals: profile.goals || [],
      conditions: profile.conditions || [],
      food_preferences: profile.food_preferences || [],
      onboarding_completed: profile.onboarding_completed || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeOnboarding(
  userId: string,
  profileData: {
    full_name: string;
    age: number;
    gender: Profile['gender'];
    height_cm: number;
    weight_kg: number;
    activity_level: ActivityLevel;
    goals: HealthGoal[];
    conditions: HealthCondition[];
    food_preferences: FoodPreference[];
  }
): Promise<Profile> {
  // Upsert: create if not exists, update if exists
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      ...profileData,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
