import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Button } from '@/components/common/Button';
import { requestHealthPermissions, isHealthKitAvailable } from '@/services/appleHealth';
import { signInWithGoogleFitScopes } from '@/services/auth';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';

const ONBOARDING_GFIT_KEY = 'onboarding_gfit_pending';

export default function WelcomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there';

  const [healthConnected, setHealthConnected] = useState(
    Platform.OS === 'ios' && isHealthKitAvailable(),
  );
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleConnectAppleHealth = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const granted = await requestHealthPermissions();
      setHealthConnected(granted);
    } catch {
      setConnectError('Could not connect Apple Health. You can connect it later from Profile.');
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectGoogleFit = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Mark that we're in an onboarding Google Fit connect so index.tsx
        // routes back to welcome (not dashboard) after the OAuth redirect.
        window.localStorage.setItem(ONBOARDING_GFIT_KEY, '1');
      }
      await signInWithGoogleFitScopes();
      // Web: browser redirects away — will return via index.tsx
    } catch (e: any) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.removeItem(ONBOARDING_GFIT_KEY);
      }
      setConnectError(e?.message ?? 'Could not connect Google Fit. You can connect it later from Profile.');
      setConnecting(false);
    }
  };

  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Ionicons name="fitness-outline" size={40} color={Colors.white} />
        </View>
        <Text style={styles.greeting}>Welcome, {firstName}!</Text>
        <Text style={styles.subtitle}>
          Let's get you set up so we can personalise your health journey.
        </Text>
      </View>

      {/* Step 1 — Connect Data (optional) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Optional</Text>
          </View>
          <Text style={styles.cardTitle}>Connect Health Data</Text>
          <Text style={styles.cardDesc}>
            Sync your wearable or phone health data for richer insights.
          </Text>
        </View>

        {/* Apple Health (iOS) */}
        {isIOS && (
          <View style={styles.sourceRow}>
            <Ionicons name="heart-circle-outline" size={32} color="#FF2D55" />
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceName}>Apple Health</Text>
              <Text style={styles.sourceTypes}>Steps · Heart Rate · Sleep · Workouts</Text>
            </View>
            {healthConnected ? (
              <View style={styles.connectedBadge}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.connectedText}>Connected</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.connectBtn}
                onPress={handleConnectAppleHealth}
                disabled={connecting}
              >
                {connecting
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Text style={styles.connectBtnText}>Connect</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Google Fit (web / Android) */}
        {!isIOS && (
          <View style={styles.sourceRow}>
            <Ionicons name="pulse-outline" size={32} color="#4285F4" />
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceName}>Google Fit</Text>
              <Text style={styles.sourceTypes}>Steps · Heart Rate · Sleep · Calories</Text>
            </View>
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={handleConnectGoogleFit}
              disabled={connecting}
            >
              {connecting
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={styles.connectBtnText}>Connect</Text>}
            </TouchableOpacity>
          </View>
        )}

        {connectError ? (
          <Text style={styles.errorText}>{connectError}</Text>
        ) : null}

        <TouchableOpacity
          style={styles.skipLink}
          onPress={() => router.push('/onboarding/step1')}
        >
          <Text style={styles.skipLinkText}>Skip for now →</Text>
        </TouchableOpacity>
      </View>

      {/* Step 2 — Profile Setup (mandatory) */}
      <View style={[styles.card, styles.cardMandatory]}>
        <View style={styles.cardHeader}>
          <View style={[styles.stepBadge, styles.stepBadgeMandatory]}>
            <Text style={[styles.stepBadgeText, styles.stepBadgeTextMandatory]}>Required</Text>
          </View>
          <Text style={styles.cardTitle}>Set Up Your Profile</Text>
          <Text style={styles.cardDesc}>
            Tell us about your health goals, conditions, and preferences so your coach knows you.
          </Text>
        </View>

        <View style={styles.checkList}>
          {[
            { icon: 'person-outline', text: 'Basic info & biometrics' },
            { icon: 'medical-outline', text: 'Health conditions' },
            { icon: 'trophy-outline', text: 'Goals & focus areas' },
            { icon: 'leaf-outline', text: 'Diet & activity preferences' },
          ].map((item) => (
            <View key={item.text} style={styles.checkRow}>
              <Ionicons name={item.icon as any} size={16} color={Colors.primary} />
              <Text style={styles.checkText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <Button
          title="Start Profile Setup"
          onPress={() => router.push('/onboarding/step1')}
          size="lg"
          style={styles.cta}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  greeting: {
    fontSize: FontSize.xxl, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardMandatory: {
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.primary + '05',
  },
  cardHeader: { marginBottom: Spacing.md },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.full,
    paddingVertical: 2, paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  stepBadgeMandatory: { backgroundColor: Colors.primary + '15' },
  stepBadgeText: {
    fontSize: FontSize.xs, fontWeight: FontWeight.semibold,
    color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  stepBadgeTextMandatory: { color: Colors.primary },
  cardTitle: {
    fontSize: FontSize.lg, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, marginBottom: Spacing.xs,
  },
  cardDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  sourceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sourceInfo: { flex: 1 },
  sourceName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  sourceTypes: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  connectBtn: {
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.primary,
    minWidth: 80, alignItems: 'center',
  },
  connectBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  connectedText: { fontSize: FontSize.sm, color: Colors.success, fontWeight: FontWeight.medium },
  errorText: {
    fontSize: FontSize.xs, color: Colors.error,
    marginTop: Spacing.sm, lineHeight: 18,
  },
  skipLink: { marginTop: Spacing.md, alignSelf: 'flex-end' },
  skipLinkText: { fontSize: FontSize.sm, color: Colors.textTertiary },
  checkList: { gap: Spacing.sm, marginBottom: Spacing.lg },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  cta: { marginTop: Spacing.xs },
});
