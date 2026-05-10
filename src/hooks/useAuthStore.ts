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
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        let profile = null;
        try {
          profile = await getProfile(session.user.id);
        } catch (e) {
          console.warn('Profile fetch failed (may not exist yet):', e);
        }
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

      // Listen for auth changes — errors MUST be caught here
      supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (session?.user) {
            let profile = null;
            try {
              profile = await getProfile(session.user.id);
            } catch (e) {
              console.warn('Profile fetch in listener failed:', e);
            }
            set({ session, user: session.user, profile });
          } else {
            set({ session: null, user: null, profile: null });
          }
        } catch (e) {
          console.warn('Auth state change error:', e);
        }
      });
    } catch (error) {
      console.warn('Auth initialization error:', error);
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
      try {
        const profile = await getProfile(user.id);
        set({ profile });
      } catch (e) {
        console.warn('Profile refresh failed:', e);
      }
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    set({ session: null, user: null, profile: null });
  },
}));
