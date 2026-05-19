// ============================================================
// Project LEO — Supabase Onboarding Storage Adapter
// Implements OnboardingStorage using Supabase tables.
//
// Required Supabase tables:
//   onboarding_config  (id text PK, config jsonb)
//   user_preferences   (uid text PK, data jsonb)
//   profiles           (user_id text PK, onboarding_completed boolean)
// ============================================================

import { supabase } from './supabase';
import type { OnboardingStorage, UserPreferences } from './onboardingService';
import type { OnboardingConfig } from '@/config/onboardingConfig';

export const supabaseOnboardingStorage: OnboardingStorage = {
  async getRemoteConfig(): Promise<OnboardingConfig | null> {
    const { data, error } = await supabase
      .from('onboarding_config')
      .select('config')
      .eq('id', 'default')
      .single();

    if (error || !data) return null;
    return data.config as OnboardingConfig;
  },

  async saveUserPreferences(uid: string, prefs: UserPreferences): Promise<void> {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ uid, data: prefs }, { onConflict: 'uid' });

    if (error) throw error;
  },

  async loadUserPreferences(uid: string): Promise<UserPreferences | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('data')
      .eq('uid', uid)
      .single();

    if (error || !data) return null;
    return data.data as UserPreferences;
  },

  async markOnboardingComplete(uid: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('user_id', uid);

    if (error) throw error;
  },

  async isOnboardingComplete(uid: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('user_id', uid)
      .single();

    if (error || !data) return false;
    return data.onboarding_completed === true;
  },
};
