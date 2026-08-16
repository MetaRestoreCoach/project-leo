// ============================================================
// Auth Store - Global auth state with Zustand
// ============================================================

import { create } from 'zustand';
import { Platform } from 'react-native';
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
      // On web OAuth return: exchange the PKCE ?code= before registering the
      // listener. Supabase's detectSessionInUrl runs lazily, so without this
      // INITIAL_SESSION fires with null before the exchange finishes and the
      // app redirects to login. Only runs when a code is present (no-op otherwise).
      //
      // IMPORTANT: Strava OAuth callbacks also include ?code= but they have
      // state='strava_oauth' and a 'scope' param. We must NOT pass a Strava code
      // to supabase.auth.exchangeCodeForSession — it would fail and could clear
      // the PKCE verifier. Detect Strava callbacks first and stash the code for
      // the dashboard to pick up instead.
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const scope = params.get('scope');   // Strava includes 'scope'; Supabase PKCE does NOT
        const state = params.get('state');

        const oauthError = params.get('error');
        if (state === 'strava_oauth' && oauthError) {
          // Strava denied access or there was an error — stash it for dashboard to display.
          window.localStorage.setItem('strava_error', oauthError === 'access_denied'
            ? 'Strava access was denied. Please try connecting again.'
            : `Strava error: ${oauthError}`);
          window.localStorage.removeItem('strava_pending'); // clear pending flag
          window.history.replaceState({}, '', window.location.pathname);
        } else if (code && state === 'strava_oauth') {
          // Strava callback — stash code in localStorage for dashboard to handle,
          // then clean the URL so it won't be re-processed on refresh.
          window.localStorage.setItem('strava_pending_code', code);
          window.history.replaceState({}, '', window.location.pathname);
        } else if (code && !scope) {
          // Supabase PKCE callback — exchange normally
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch (e) {
            console.warn('OAuth code exchange failed:', e);
          }
        }
      }

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
                const timeout = new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
                );
                const profile = await Promise.race([getProfile(newSession.user.id), timeout]);
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
