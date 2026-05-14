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

    // Exchange the PKCE code for a session.
    // NOTE: Do NOT call window.history.replaceState here — it causes Expo Router
    // to detect the URL change and remount this component, resetting the
    // handlingOAuth ref and breaking the async navigation flow.
    // The successful navigation to /dashboard below naturally clears ?code= from the URL.
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (error) {
          handlingOAuth.current = false;
          setDebugMsg(`Sign-in failed: ${error.message}`);
          setTimeout(() => router.replace('/(auth)/login'), 3000);
        } else if (data.session) {
          // Use window.location.replace for reliable navigation — it performs a
          // hard redirect that clears ?code= from the URL and avoids Expo Router
          // race conditions that can occur with router.replace in async callbacks.
          window.location.replace('/dashboard');
        } else {
          handlingOAuth.current = false;
          setDebugMsg('Sign-in succeeded but no session — please try again.');
          setTimeout(() => router.replace('/(auth)/login'), 3000);
        }
      })
      .catch((e) => {
        handlingOAuth.current = false;
        setDebugMsg(`Sign-in error: ${e?.message}`);
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
