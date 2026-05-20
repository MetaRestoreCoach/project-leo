import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/hooks/useAuthStore';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { createOnboardingService } from '@/services/onboardingService';
import { supabaseOnboardingStorage } from '@/services/supabaseOnboardingStorage';
import type { OnboardingConfig } from '@/config/onboardingConfig';
import type { UserPreferences } from '@/services/onboardingService';

export default function FlowScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const service = useMemo(() => createOnboardingService(supabaseOnboardingStorage), []);

  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    service.getConfig()
      .then(setConfig)
      .catch((e) => setError(e?.message ?? 'Failed to load config'))
      .finally(() => setLoading(false));
  }, [service]);

  function handleComplete(_prefs: UserPreferences) {
    router.replace('/(tabs)/dashboard');
  }

  return (
    <OnboardingFlow
      config={config}
      loading={loading}
      error={error}
      service={service}
      uid={user?.id ?? ''}
      onComplete={handleComplete}
    />
  );
}
