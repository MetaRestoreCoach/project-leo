import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';

interface Integration {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
  iosOnly?: boolean;
  androidOnly?: boolean;
  comingSoon?: boolean;
  note?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    icon: 'heart-circle-outline',
    color: '#FF2D55',
    description: 'Steps, heart rate, sleep & more',
    iosOnly: true,
  },
  {
    id: 'google_fit',
    name: 'Google Fit',
    icon: 'fitness-outline',
    color: '#4285F4',
    description: 'Activity & fitness tracking',
    androidOnly: false, // also available on web
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: 'bicycle-outline',
    color: '#FC4C02',
    description: 'Running, cycling & workouts',
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    icon: 'watch-outline',
    color: '#007CC2',
    description: 'Steps, heart rate, sleep, Body Battery',
    comingSoon: true,
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: 'pulse-outline',
    color: '#00B0B9',
    description: 'Steps, sleep, heart rate & weight',
    comingSoon: true,
  },
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    icon: 'restaurant-outline',
    color: '#00B0FF',
    description: 'Nutrition & food logging',
    note: 'MyFitnessPal retired their public API in 2020. Use the in-app food logging to track nutrition.',
  },
];

interface Props {
  connectedIds?: string[];
  onConnect: (id: string) => void;
}

export function ConnectDataSourceCard({ connectedIds = [], onConnect }: Props) {
  const handleConnect = (integration: Integration) => {
    if (integration.comingSoon) return;

    const isIosOnly = !!(integration.iosOnly && Platform.OS !== 'ios');
    if (isIosOnly || connectedIds.includes(integration.id)) return;

    if (integration.note) {
      if (Platform.OS === 'web') {
        window.alert(`${integration.name}: ${integration.note}`);
      } else {
        Alert.alert(integration.name, integration.note);
      }
      return;
    }

    // On web, call onConnect directly — the OAuth redirect is the confirmation.
    if (Platform.OS === 'web') {
      onConnect(integration.id);
      return;
    }

    Alert.alert(
      `Connect ${integration.name}`,
      `Linking ${integration.name} will import your health data and replace demo metrics on your dashboard.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect', onPress: () => onConnect(integration.id) },
      ],
    );
  };

  // Filter: hide Apple Health on non-iOS, show everything else
  const visibleIntegrations = INTEGRATIONS.filter((i) => {
    if (i.iosOnly && Platform.OS !== 'ios') return false;
    return true;
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="link-outline" size={18} color={Colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Connect Health Data</Text>
          <Text style={styles.subtitle}>Sync real data from your apps and wearables.</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {visibleIntegrations.map((integration) => {
          const connected = connectedIds.includes(integration.id);
          const isUnavailable = !!integration.note;
          const isSoon = !!integration.comingSoon;

          let pillLabel = 'Connect';
          if (connected) pillLabel = '✓ Connected';
          else if (isSoon) pillLabel = 'Soon';
          else if (isUnavailable) pillLabel = 'Info';

          return (
            <TouchableOpacity
              key={integration.id}
              style={[
                styles.item,
                connected && styles.itemConnected,
                isSoon && styles.itemDisabled,
              ]}
              onPress={() => handleConnect(integration)}
              activeOpacity={isSoon ? 1 : 0.75}
              disabled={isSoon}
            >
              <View style={[styles.iconWrap, { backgroundColor: integration.color + (isSoon ? '0C' : '18') }]}>
                <Ionicons
                  name={integration.icon}
                  size={22}
                  color={isSoon ? Colors.textTertiary : integration.color}
                />
              </View>
              <Text style={[styles.itemName, isSoon && styles.textDisabled]}>{integration.name}</Text>
              <Text style={styles.itemDesc} numberOfLines={2}>
                {integration.description}
              </Text>
              <View style={[
                styles.pill,
                connected && styles.pillConnected,
                isSoon && styles.pillSoon,
                (isUnavailable && !connected && !isSoon) && styles.pillGhost,
              ]}>
                <Text style={[
                  styles.pillText,
                  connected && styles.pillTextConnected,
                  isSoon && styles.pillTextSoon,
                  (isUnavailable && !connected && !isSoon) && styles.pillTextGhost,
                ]}>
                  {pillLabel}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  item: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    gap: 4,
  },
  itemConnected: {
    borderColor: Colors.success + '50',
    backgroundColor: Colors.success + '06',
  },
  itemDisabled: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  textDisabled: {
    color: Colors.textTertiary,
  },
  itemDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  pill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  pillConnected: {
    backgroundColor: Colors.success,
  },
  pillSoon: {
    backgroundColor: Colors.textTertiary + '30',
  },
  pillGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  pillTextConnected: { color: Colors.white },
  pillTextSoon: { color: Colors.textTertiary },
  pillTextGhost: { color: Colors.textTertiary },
});
