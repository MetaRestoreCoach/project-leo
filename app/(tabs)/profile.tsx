import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, useWindowDimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { CONDITION_LABELS, GOAL_LABELS, FOOD_PREF_LABELS, ACTIVITY_LABELS } from '@/constants/labels';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';

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

  const handleSignOut = () => {
    // Simple confirmation — works on web too
    signOut();
  };

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Basic Info */}
        <Card title="Personal Information" style={styles.section}>
          <InfoRow label="Age" value={`${profile.age} years`} icon="calendar-outline" />
          <InfoRow label="Gender" value={profile.gender || 'Not set'} icon="person-outline" />
          <InfoRow label="Height" value={`${profile.height_cm} cm`} icon="resize-outline" />
          <InfoRow label="Weight" value={`${profile.weight_kg} kg`} icon="scale-outline" />
          <InfoRow label="Activity" value={profile.activity_level ? ACTIVITY_LABELS[profile.activity_level] : 'Not set'} icon="walk-outline" />
        </Card>

        {/* Health Conditions */}
        <Card title="Health Conditions" style={styles.section}>
          <ChipList items={profile.conditions?.map((c) => CONDITION_LABELS[c] || c) || []} />
        </Card>

        {/* Goals */}
        <Card title="Health Goals" style={styles.section}>
          <ChipList items={profile.goals?.map((g) => GOAL_LABELS[g] || g) || []} />
        </Card>

        {/* Food Preferences */}
        <Card title="Dietary Preferences" style={styles.section}>
          <ChipList items={profile.food_preferences?.map((f) => FOOD_PREF_LABELS[f] || f) || []} />
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
  actions: { gap: Spacing.sm, marginTop: Spacing.md },
  version: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.lg },
});
