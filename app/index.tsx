import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/hooks/useAuthStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export default function Index() {
  const router = useRouter();
  const { session, profile, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    if (!session) {
      // Not logged in -> auth
      router.replace('/(auth)/login');
    } else if (!profile?.onboarding_completed) {
      // Logged in but no profile -> onboarding
      router.replace('/onboarding/step1');
    } else {
      // Fully set up -> dashboard
      router.replace('/(tabs)/dashboard');
    }
  }, [session, profile, isInitialized]);

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
