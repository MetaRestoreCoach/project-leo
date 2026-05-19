import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/hooks/useAuthStore';

export default function Index() {
  const router = useRouter();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const profileFetched = useAuthStore((s) => s.profileFetched);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  // Route only after BOTH auth AND profile fetch are complete.
  // profileFetched prevents routing before the network call for the profile
  // returns, which would cause returning users to land on onboarding/step1.
  useEffect(() => {
    if (!isInitialized || !profileFetched) return;
    try {
      if (session) {
        if (profile?.onboarding_completed) {
          router.replace('/(tabs)/dashboard');
        } else {
          router.replace('/onboarding/step1');
        }
      } else {
        router.replace('/(auth)/login');
      }
    } catch (e) {
      console.warn('Navigation failed:', e);
    }
  }, [isInitialized, profileFetched, session, profile]);

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
