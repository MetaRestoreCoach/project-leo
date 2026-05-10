import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { resetPassword } from '@/services/auth';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width > 768;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!email) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isWide && styles.containerWide]}>
      <View style={[styles.card, isWide && styles.cardWide]}>
        <Button title="Back" onPress={() => router.back()} variant="ghost" size="sm" style={styles.back} />

        <Ionicons name="key-outline" size={48} color={Colors.primary} style={styles.icon} />
        <Text style={styles.title}>{sent ? 'Email Sent' : 'Reset Password'}</Text>
        <Text style={styles.subtitle}>
          {sent
            ? `We sent a reset link to ${email}. Check your inbox.`
            : 'Enter your email and we\'ll send you a reset link.'}
        </Text>

        {!sent && (
          <>
            <Input
              placeholder="you@example.com"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Send Reset Link" onPress={handleReset} loading={loading} size="lg" />
          </>
        )}

        {sent && (
          <Button
            title="Back to Login"
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: Spacing.lg }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: Spacing.lg },
  containerWide: { alignItems: 'center' },
  card: { width: '100%' },
  cardWide: {
    maxWidth: 440, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 24,
  },
  back: { alignSelf: 'flex-start', marginBottom: Spacing.md },
  icon: { alignSelf: 'center', marginBottom: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginVertical: Spacing.md, maxWidth: 320, alignSelf: 'center' },
  error: { color: Colors.error, fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.md },
});
