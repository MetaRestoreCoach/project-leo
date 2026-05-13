import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, useWindowDimensions, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { CONDITION_LABELS, GOAL_LABELS, FOOD_PREF_LABELS, ACTIVITY_LABELS } from '@/constants/labels';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { getConnectedServices, ConnectedService } from '@/services/appleHealth';

function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color={Colors.textTertiary} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <View style={styles.chipList}>
      {items.map((item) => (
        <View key={item} style={styles.chip}>
          <Text style={styles.chipText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, user, signOut } = useAuthStore();
  const { width } = useWindowDimensions();
  const isWide = width > 768;

  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  // Show basic info even without full profile (e.g., just signed up via Google)
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{displayEmail}</Text>
        </View>

        {/* Basic Info */}
        {profile && (
          <Card title="Personal Information" style={styles.section}>
            <InfoRow label="Age" value={profile.age ? `${profile.age} years` : 'Not set'} icon="calendar-outline" />
            <InfoRow label="Gender" value={profile.gender || 'Not set'} icon="person-outline" />
            <InfoRow label="Height" value={profile.height_cm ? `${profile.height_cm} cm` : 'Not set'} icon="resize-outline" />
            <InfoRow label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : 'Not set'} icon="scale-outline" />
            <InfoRow label="Activity" value={profile.activity_level ? ACTIVITY_LABELS[profile.activity_level] : 'Not set'} icon="walk-outline" />
          </Card>
        )}

        {!profile && (
          <Card title="Complete Your Profile" style={styles.section}>
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm }}>
              Complete your health profile to get personalized coaching recommendations.
            </Text>
            <Button title="Set Up Profile" onPress={() => {}} variant="primary" size="md" />
          </Card>
        )}

        {/* Health Conditions */}
        {profile?.conditions && profile.conditions.length > 0 && (
          <Card title="Health Conditions" style={styles.section}>
            <ChipList items={profile.conditions.map((c) => CONDITION_LABELS[c] || c)} />
          </Card>
        )}

        {/* Goals */}
        {profile?.goals && profile.goals.length > 0 && (
          <Card title="Health Goals" style={styles.section}>
            <ChipList items={profile.goals.map((g) => GOAL_LABELS[g] || g)} />
          </Card>
        )}

        {/* Food Preferences */}
        {profile?.food_preferences && profile.food_preferences.length > 0 && (
          <Card title="Dietary Preferences" style={styles.section}>
            <ChipList items={profile.food_preferences.map((f) => FOOD_PREF_LABELS[f] || f)} />
          </Card>
        )}

        {/* Connected Services */}
        <Card title="Connected Services" style={styles.section}>
          {getConnectedServices().map((service) => (
            <TouchableOpacity key={service.id} style={styles.serviceRow}>
              <Ionicons name={service.icon as any} size={24} color={service.connected ? Colors.accent : Colors.textTertiary} />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceStatus}>
                  {service.connected ? `Connected • ${service.dataTypes.slice(0, 3).join(', ')}` : 'Tap to connect'}
                </Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: service.connected ? Colors.accent : Colors.border }]} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button title="Edit Profile" onPress={() => {}} variant="outline" size="lg" />
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="ghost"
            size="lg"
            textStyle={{ color: Colors.error }}
          />
        </View>

        {/* App Version */}
        <Text style={styles.version}>Project LEO v1.0.0</Text>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  contentWide: { maxWidth: 600, alignSelf: 'center', width: '100%' },
  header: { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.lg },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white },
  name: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  section: { marginBottom: Spacing.md, padding: Spacing.md },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: FontSize.xs, color: Colors.textTertiary },
  infoValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingVertical: 6, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full, backgroundColor: Colors.primary + '10',
  },
  chipText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  serviceStatus: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  actions: { gap: Spacing.sm, marginTop: Spacing.md },
  version: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.lg },
});
