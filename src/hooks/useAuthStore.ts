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
  profileFetched: boolean; // true once profile fetch has completed or failed

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
  profileFetched: false,

  initialize: async () => {
    try {
      // Register onAuthStateChange FIRST.
      // Supabase waits for its internal initializePromise (which includes
      // URL hash / OAuth-callback token processing) before firing any event.
      // The first event is always INITIAL_SESSION — guaranteed to carry the
      // correct session even on OAuth redirects. This avoids the race where
      // getSession() was called before hash tokens were stored, causing the
      // app to land on the login page instead of the dashboard.
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        try {
          if (newSession?.user) {
            const { user: currentUser } = get();
            set({
              session: newSession,
              user: newSession.user,
              isLoading: false,
              isInitialized: true,
              profileFetched: false, // reset while we fetch for this user
            });
            // Fetch profile — set profileFetched: true when done so index.tsx
            // knows it's safe to make a routing decision
            if (currentUser?.id !== newSession.user.id || !get().profile) {
              try {
                const profile = await getProfile(newSession.user.id);
                set({ profile, profileFetched: true });
              } catch (e) {
                console.warn('Profile fetch failed:', e);
                set({ profileFetched: true }); // mark done even on error
              }
            } else {
              set({ profileFetched: true }); // profile already in store
            }
          } else {
            set({ session: null, user: null, profile: null, isLoading: false, isInitialized: true, profileFetched: true });
          }
        } catch (e) {
          console.warn('Auth state change error:', e);
          set({ isLoading: false, isInitialized: true, profileFetched: true });
        }
      });
    } catch (error) {
      console.warn('Auth initialization error:', error);
      set({ isLoading: false, isInitialized: true, profileFetched: true });
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
