import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/hooks/useAuthStore';

export default function Index() {
  const router = useRouter();
  const { session, isInitialized } = useAuthStore();

  // Route once auth is ready.
  // On web, Supabase detectSessionInUrl=true handles ?code= exchange automatically
  // and fires onAuthStateChange → useAuthStore picks up the session.
  useEffect(() => {
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
    }, 100);
    return () => clearTimeout(timer);
  }, [isInitialized, session]);

  // Safety net — force login after 10s if auth never initializes
  useEffect(() => {
    const fallback = setTimeout(() => {
      if (!useAuthStore.getState().isInitialized) {
        try { router.replace('/(auth)/login'); } catch {}
      }
    }, 10000);
    return () => clearTimeout(fallback);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  },
});
