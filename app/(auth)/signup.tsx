import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { signUpWithEmail, signInWithGoogle, signInWithApple } from '@/services/auth';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '@/constants/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width > 768;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await signUpWithEmail(email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="mail-outline" size={64} color={Colors.primary} />
        <Text style={styles.successTitle}>Check Your Email</Text>
        <Text style={styles.successText}>
          We sent a verification link to {email}. Click it to activate your account.
        </Text>
        <Button
          title="Back to Login"
          onPress={() => router.replace('/(auth)/login')}
          style={{ marginTop: Spacing.lg }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, isWide && styles.cardWide]}>
          <View style={styles.header}>
            <View style={styles.logoMark}>
              <Ionicons name="fitness" size={28} color={Colors.white} />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your health coaching journey</Text>
          </View>

          {/* Social Sign-Up */}
          <View style={styles.socialButtons}>
            <Button
              title="Sign up with Google"
              onPress={async () => {
                setLoading(true);
                setError('');
                try {
                  await signInWithGoogle();
                  // Web: browser redirects away; index.tsx handles routing on return.
                  // Native: route through index.tsx so onboarding/dashboard check runs.
                  if (Platform.OS !== 'web') router.replace('/');
                } catch (err: any) {
                  setError(err.message || 'Google sign-up failed.');
                } finally {
                  setLoading(false);
                }
              }}
              variant="outline"
              loading={loading}
              icon={<Ionicons name="logo-google" size={20} color={Colors.primary} />}
            />
            {Platform.OS === 'ios' && (
              <Button
                title="Sign up with Apple"
                onPress={async () => {
                  setLoading(true);
                  setError('');
                  try {
                    await signInWithApple();
                    if (Platform.OS !== 'web') router.replace('/');
                  } catch (err: any) {
                    setError(err.message || 'Apple sign-up failed.');
                  } finally {
                    setLoading(false);
                  }
                }}
                variant="secondary"
                icon={<Ionicons name="logo-apple" size={20} color={Colors.textPrimary} />}
              />
            )}
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or use email</Text>
            <View style={styles.dividerLine} />
          </View>

          <Input
            label="Full Name"
            placeholder="Your name"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />

          <Input
            label="Email"
            placeholder="you@example.com"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label="Password"
            placeholder="At least 8 characters"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          <Input
            label="Confirm Password"
            placeholder="Re-enter password"
            icon="lock-closed-outline"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            size="lg"
            style={{ marginTop: Spacing.sm }}
          />

          <Text style={styles.terms}>
            By signing up, you agree to our Terms of Service and Privacy Policy
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login">
              <Text style={styles.footerLink}>Sign In</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  scrollWide: { alignItems: 'center' },
  card: { width: '100%' },
  cardWide: {
    maxWidth: 440, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, ...Shadow.lg,
  },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoMark: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md, ...Shadow.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 4 },
  socialButtons: { gap: Spacing.sm, marginBottom: Spacing.lg },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: Spacing.md, fontSize: FontSize.sm, color: Colors.textTertiary },
  error: {
    color: Colors.error, fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
    backgroundColor: Colors.error + '10', borderRadius: BorderRadius.sm,
  },
  terms: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  footerLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  successTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: Spacing.lg },
  successText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, maxWidth: 320 },
});
