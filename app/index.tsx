import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { supabase } from '@/services/supabase';

// Returns true only on web when the URL has a ?code= OAuth callback param.
// Evaluated once per effect mount — safe to call outside render.
function isOAuthCallback(): boolean {
  if (Platform.OS !== 'web') return false;
  return new URLSearchParams(window.location.search).has('code');
}

export default function Index() {
  const router = useRouter();
  const { session, isInitialized } = useAuthStore();
  const [debugMsg, setDebugMsg] = useState('');

  // ── PKCE OAuth callback ──────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');
    const errorDesc = params.get('error_description');

    if (errorParam) {
      setDebugMsg(`OAuth error: ${errorParam} — ${errorDesc}`);
      return;
    }

    if (!code) return;

    supabase.auth
      .exchangeCodeForSession(code)
      .then(async ({ data, error }) => {
        // Happy path — code exchanged successfully
        if (!error && data.session) {
          window.location.replace('/dashboard');
          return;
        }
        // Error or null session (e.g. page refresh with already-used code).
        // Fall back to checking for an existing session before giving up.
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
  }, []);

  // ── Normal session-based routing (skipped when handling OAuth callback) ───
  useEffect(() => {
    // Don't interfere while the OAuth effect above is running
    if (isOAuthCallback()) return;
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
  }, [isInitialized, session]);

  // ── Safety net: if auth never initializes, force to login after 8 s ───────
  useEffect(() => {
    if (isOAuthCallback()) return; // OAuth flow manages its own timing
    const fallback = setTimeout(() => {
      if (!useAuthStore.getState().isInitialized) {
        console.warn('Auth init timeout — forcing navigation to login');
        try { router.replace('/(auth)/login'); } catch {}
      }
    }, 8000);
    return () => clearTimeout(fallback);
  }, []);

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
