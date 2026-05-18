// ============================================================
// Supabase Client Configuration
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Storage adapter: localStorage for web, expo-secure-store for native (lazy-loaded)
let SecureStore: any = null;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    if (!SecureStore) {
      SecureStore = require('expo-secure-store');
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // localStorage not available
      }
      return;
    }
    if (!SecureStore) {
      SecureStore = require('expo-secure-store');
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // localStorage not available
      }
      return;
    }
    if (!SecureStore) {
      SecureStore = require('expo-secure-store');
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// On web use native localStorage (synchronous) so the PKCE code verifier is
// written before the OAuth redirect fires. Async adapters cause bad_code_verifier.
const authStorage = Platform.OS === 'web'
  ? (typeof window !== 'undefined' ? window.localStorage : undefined)
  : ExpoSecureStoreAdapter;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});
