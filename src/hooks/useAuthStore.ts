// ============================================================
// Auth Store - Global auth state with Zustand
// ============================================================

import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '@/types';
import { supabase } from '@/services/supabase';
import { getProfile } from '@/services/profile';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const profile = await getProfile(session.user.id);
        set({
          session,
          user: session.user,
          profile,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({ isLoading: false, isInitialized: true });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          set({ session, user: session.user, profile });
        } else {
          set({ session: null, user: null, profile: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  setSession: (session) => {
    set({ session, user: session?.user || null });
  },

  setProfile: (profile) => {
    set({ profile });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (user) {
      const profile = await getProfile(user.id);
      set({ profile });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },
}));
