import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform, Text, TouchableOpacity } from 'react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { supabase } from '@/services/supabase';

export default function Index() {
  const router = useRouter();
  const { session, isInitialized } = useAuthStore();
  const handlingOAuth = useRef(false);
  const [debugMsg, setDebugMsg] = useState('');

  // ── PKCE OAuth callback ──────────────────────────────────────────────────
  // After Google/Apple sign-in, Supabase redirects here with ?code=
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');
    const errorDesc = params.get('error_description');

    // Supabase returned an OAuth error (e.g. redirect URL not allowed)
    if (errorParam) {
      setDebugMsg(`OAuth error: ${errorParam} — ${errorDesc}`);
      return;
    }

    if (!code) return;

    handlingOAuth.current = true;
    setDebugMsg('Exchanging code for session…');

    // Remove ?code= from address bar so a refresh doesn't re-try
    const clean = new URL(window.location.href);
    clean.searchParams.delete('code');
    window.history.replaceState({}, '', clean.toString());

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (error) {
          setDebugMsg(`Exchange failed: ${error.message}`);
          setTimeout(() => router.replace('/(auth)/login'), 3000);
        } else if (data.session) {
          router.replace('/(tabs)/dashboard');
        } else {
          setDebugMsg('Exchange succeeded but no session returned');
          setTimeout(() => router.replace('/(auth)/login'), 3000);
        }
      })
      .catch((e) => {
        setDebugMsg(`Exchange error: ${e?.message}`);
        setTimeout(() => router.replace('/(auth)/login'), 3000);
      });
  }, []);

  // ── Normal session-based routing ─────────────────────────────────────────
  useEffect(() => {
    if (handlingOAuth.current) return;
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
