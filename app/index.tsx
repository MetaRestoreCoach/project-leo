import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { supabase } from '@/services/supabase';

export default function Index() {
  const router = useRouter();
  const { session, isInitialized } = useAuthStore();
  const [debugMsg, setDebugMsg] = useState('');

  // ── Capture URL params SYNCHRONOUSLY during first render ─────────────────
  // Must be read before Expo Router calls history.replaceState and cleans the URL.
  // useState lazy initializer runs synchronously on mount, before any effects.
  const [oauthCode] = useState<string | null>(() => {
    if (Platform.OS !== 'web') return null;
    try { return new URLSearchParams(window.location.search).get('code'); } catch { return null; }
  });
  const [oauthErrorParam] = useState<string | null>(() => {
    if (Platform.OS !== 'web') return null;
    try {
      const p = new URLSearchParams(window.location.search);
      const err = p.get('error');
      return err ? `${err} — ${p.get('error_description') ?? ''}` : null;
    } catch { return null; }
  });

  // True whenever this mount is handling an OAuth redirect
  const isOAuthFlow = !!(oauthCode || oauthErrorParam);

  // ── PKCE OAuth callback ──────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (oauthErrorParam) {
      setDebugMsg(`OAuth error: ${oauthErrorParam}`);
      return;
    }

    if (!oauthCode) return;

    supabase.auth
      .exchangeCodeForSession(oauthCode)
      .then(async ({ data, error }) => {
        if (!error && data.session) {
          // Success — navigate to dashboard via full reload so Expo Router picks up the session
          window.location.replace('/dashboard');
          return;
        }
        // Code already used (e.g. page refresh) — check for an existing session
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) {
          window.location.replace('/dashboard');
        } else {
          setDebugMsg(error ? `Sign-in failed: ${error.message}` : 'Sign-in failed — please try again.');
          setTimeout(() => router.replace('/(auth)/login'), 3000);
        }
      })
      .catch(async (e) => {
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) {
          window.location.replace('/dashboard');
        } else {
          setDebugMsg(`Sign-in error: ${e?.message}`);
          setTimeout(() => router.replace('/(auth)/login'), 3000);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // oauthCode is captured once on mount — stable reference

  // ── Normal session-based routing ──────────────────────────────────────────
  useEffect(() => {
    if (isOAuthFlow) return; // OAuth effect manages navigation
    if (!isInitialized) return;

    const timer = setTimeout(() => {
      try {
        if (session) {
          router.replace('/(tabs)/dashboard');
        } else {
          router.replace('/(auth)/login');
        }
      } catch (e) {
        console.warn('Navigation failed:', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isInitialized, session, isOAuthFlow]);

  // ── Safety net: force login if auth never initializes after 8 s ───────────
  useEffect(() => {
    if (isOAuthFlow) return; // OAuth manages its own timing
    const fallback = setTimeout(() => {
      if (!useAuthStore.getState().isInitialized) {
        console.warn('Auth init timeout — forcing navigation to login');
        try { router.replace('/(auth)/login'); } catch {}
      }
    }, 8000);
    return () => clearTimeout(fallback);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // isOAuthFlow is stable (captured from state)

  return (
    <View style={styles.container}>
      {debugMsg ? (
        <>
          <Text style={styles.debug}>{debugMsg}</Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.link}>Back to Login</Text>
          </TouchableOpacity>
        </>
      ) : (
        <ActivityIndicator size="large" color={Colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    minHeight: '100vh' as any,
    padding: Spacing.lg,
  },
  debug: {
    fontSize: FontSize.md,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  link: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
