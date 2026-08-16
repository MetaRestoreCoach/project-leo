import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, useWindowDimensions, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/hooks/useAuthStore';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { CONDITION_LABELS, GOAL_LABELS, FOOD_PREF_LABELS, ACTIVITY_LABELS } from '@/constants/labels';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '@/constants/theme';
import { getConnectedServices } from '@/services/appleHealth';
import { isStravaConnected } from '@/services/strava';

function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon as any} size={16} color={Colors.textTertiary} />
      </View>
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

  const [connectedIds, setConnectedIds] = useState<string[]>([]);

  // Load real connection state from DB
  useEffect(() => {
    const ids: string[] = [];
    // Apple Health: connected if iOS
    if (Platform.OS === 'ios') ids.push('apple_health');

    // Strava: check DB
    isStravaConnected().then((connected) => {
      if (connected) {
        setConnectedIds((prev) => prev.includes('strava') ? prev : [...prev, 'strava']);
      }
    });

    setConnectedIds(ids);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const handleEditProfile = () => {
    router.push('/onboarding/step1');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || profile?.avatar_url || null;

  const services = getConnectedServices(connectedIds);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>

        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <UserAvatar
              name={displayName}
              avatarUrl={avatarUrl}
              size={88}
              borderColor={Colors.primary}
            />
            <TouchableOpacity style={styles.editAvatarBtn} onPress={handleEditProfile}>
              <Ionicons name="pencil" size={12} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{displayEmail}</Text>
          {profile?.onboarding_completed && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.completedText}>Profile complete</Text>
            </View>
          )}
        </View>

        {/* Incomplete profile CTA */}
        {!profile && (
          <View style={styles.ctaBanner}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Complete your profile</Text>
              <Text style={styles.ctaDesc}>Get personalised coaching by telling us about your health goals.</Text>
            </View>
            <TouchableOpacity style={styles.ctaBtn} onPress={handleEditProfile}>
              <Text style={styles.ctaBtnText}>Set Up</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Personal Info */}
        {profile && (
          <Card style={styles.section}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Personal Information</Text>
              <TouchableOpacity onPress={handleEditProfile} style={styles.editLink}>
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.editLinkText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <InfoRow label="Age" value={profile.age ? `${profile.age} years` : 'Not set'} icon="calendar-outline" />
            <InfoRow label="Gender" value={profile.gender ? (profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).replace(/_/g, ' ')) : 'Not set'} icon="person-outline" />
            <InfoRow label="Height" value={profile.height_cm ? `${profile.height_cm} cm` : 'Not set'} icon="resize-outline" />
            <InfoRow label="Weight" value={profile.weight_kg ? `${profile.weight_kg} kg` : 'Not set'} icon="scale-outline" />
            <InfoRow label="Activity Level" value={profile.activity_level ? ACTIVITY_LABELS[profile.activity_level] : 'Not set'} icon="walk-outline" />
          </Card>
        )}

        {/* Health Conditions */}
        {profile?.conditions && profile.conditions.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.cardTitle}>Health Conditions</Text>
            <ChipList items={profile.conditions.map((c) => CONDITION_LABELS[c] || c)} />
          </Card>
        )}

        {/* Goals */}
        {profile?.goals && profile.goals.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.cardTitle}>Health Goals</Text>
            <ChipList items={profile.goals.map((g) => GOAL_LABELS[g] || g)} />
          </Card>
        )}

        {/* Food Preferences */}
        {profile?.food_preferences && profile.food_preferences.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.cardTitle}>Dietary Preferences</Text>
            <ChipList items={profile.food_preferences.map((f) => FOOD_PREF_LABELS[f] || f)} />
          </Card>
        )}

        {/* Connected Services */}
        <Card style={styles.section}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Connected Services</Text>
          </View>
          {services.map((service, idx) => (
            <View
              key={service.id}
              style={[styles.serviceRow, idx === services.length - 1 && styles.serviceRowLast]}
            >
              <View style={[styles.serviceIcon, { backgroundColor: service.connected ? Colors.accent + '15' : Colors.surfaceSecondary }]}>
                <Ionicons
                  name={service.icon as any}
                  size={20}
                  color={service.connected ? Colors.accent : Colors.textTertiary}
                />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceStatus} numberOfLines={1}>
                  {service.connected
                    ? `Connected · ${service.dataTypes.slice(0, 3).join(', ')}`
                    : 'Not connected'}
                </Text>
              </View>
              <View style={[styles.statusPill, service.connected ? styles.statusPillOn : styles.statusPillOff]}>
                <Text style={[styles.statusPillText, service.connected ? styles.statusPillTextOn : styles.statusPillTextOff]}>
                  {service.connected ? 'On' : 'Off'}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button title="Edit Profile" onPress={handleEditProfile} variant="outline" size="lg" />
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="ghost"
            size="lg"
            textStyle={{ color: Colors.error }}
          />
        </View>

        <Text style={styles.version}>Project LEO · v1.0.0</Text>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  contentWide: { maxWidth: 600, alignSelf: 'center', width: '100%' },

  header: { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.lg, gap: Spacing.sm },
  avatarWrap: { position: 'relative', marginBottom: Spacing.xs },
  editAvatarBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  name: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary },
  completedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success + '12',
  },
  completedText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.medium },

  ctaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.warning + '10',
    borderWidth: 1, borderColor: Colors.warning + '30',
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  ctaTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  ctaDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  ctaBtn: {
    paddingVertical: 6, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md, backgroundColor: Colors.primary,
  },
  ctaBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.white },

  section: { marginBottom: Spacing.md, padding: Spacing.md, ...Shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editLinkText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  infoIconWrap: {
    width: 30, height: 30, borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: 2 },
  infoValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },

  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingVertical: 5, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full, backgroundColor: Colors.primary + '10',
    borderWidth: 1, borderColor: Colors.primary + '20',
  },
  chipText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.medium },

  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  serviceRowLast: { borderBottomWidth: 0 },
  serviceIcon: {
    width: 38, height: 38, borderRadius: BorderRadius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  serviceStatus: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  statusPill: {
    paddingVertical: 3, paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
  },
  statusPillOn: { backgroundColor: Colors.success + '15' },
  statusPillOff: { backgroundColor: Colors.border },
  statusPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  statusPillTextOn: { color: Colors.success },
  statusPillTextOff: { color: Colors.textTertiary },

  actions: { gap: Spacing.sm, marginTop: Spacing.xs },
  version: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.lg },
});
