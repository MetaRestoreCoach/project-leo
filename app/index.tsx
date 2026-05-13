import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { supabase } from '@/services/supabase';

export default function Index() {
  const router = useRouter();
  const { session, isInitialized } = useAuthStore();
  // Flag: we are mid-PKCE exchange — don't let the isInitialized effect navigate away.
  const handlingOAuth = useRef(false);

  // ── PKCE OAuth callback ──────────────────────────────────────────────────
  // After Google/Apple sign-in, Supabase redirects to the app root with
  // ?code=<auth_code>. We exchange it here for a real session.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) return;

    handlingOAuth.current = true;

    // Remove the code from the URL so a refresh doesn't re-try the exchange.
    const clean = new URL(window.location.href);
    clean.searchParams.delete('code');
    window.history.replaceState({}, '', clean.toString());

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (error) {
          console.warn('OAuth code exchange failed:', error.message);
          router.replace('/(auth)/login');
        } else if (data.session) {
          router.replace('/(tabs)/dashboard');
        } else {
          router.replace('/(auth)/login');
        }
      })
      .catch((e) => {
        console.warn('OAuth exchange error:', e);
        router.replace('/(auth)/login');
      });
  }, []); // run once on mount

  // ── Normal session-based routing ─────────────────────────────────────────
  useEffect(() => {
    // If we're handling an OAuth exchange, don't interfere.
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
      <ActivityIndicator size="large" color={Colors.primary} />
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
  },
});
