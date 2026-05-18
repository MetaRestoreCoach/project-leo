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
  },
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    icon: 'restaurant-outline',
    color: '#00B0FF',
    description: 'Nutrition & food logging',
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: 'bicycle-outline',
    color: '#FC4C02',
    description: 'Running, cycling & workouts',
  },
];

interface Props {
  connectedIds?: string[];
  onConnect: (id: string) => void;
}

export function ConnectDataSourceCard({ connectedIds = [], onConnect }: Props) {
  const visible = INTEGRATIONS.filter(
    (i) => !i.iosOnly || Platform.OS === 'ios',
  );

  const handleConnect = (integration: Integration) => {
    if (connectedIds.includes(integration.id)) return;
    Alert.alert(
      `Connect ${integration.name}`,
      `Linking ${integration.name} will import your real health data and replace the sample metrics on your dashboard.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: () => onConnect(integration.id),
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="link-outline" size={18} color={Colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Connect Your Health Data</Text>
          <Text style={styles.subtitle}>Replace sample metrics with real data from your apps.</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {visible.map((integration) => {
          const connected = connectedIds.includes(integration.id);
          return (
            <TouchableOpacity
              key={integration.id}
              style={[styles.item, connected && styles.itemConnected]}
              onPress={() => handleConnect(integration)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconWrap, { backgroundColor: integration.color + '18' }]}>
                <Ionicons name={integration.icon} size={22} color={integration.color} />
              </View>
              <Text style={styles.itemName}>{integration.name}</Text>
              <Text style={styles.itemDesc} numberOfLines={2}>{integration.description}</Text>
              <View style={[styles.pill, connected && styles.pillConnected]}>
                <Text style={[styles.pillText, connected && styles.pillTextConnected]}>
                  {connected ? '✓ Connected' : 'Connect'}
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
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
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
    borderColor: Colors.success + '60',
    backgroundColor: Colors.success + '08',
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
  pillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  pillTextConnected: {
    color: Colors.white,
  },
});
