import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';

type LogTab = 'meal' | 'metric' | 'lab';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
const QUICK_METRICS = [
  { type: 'weight', label: 'Weight', unit: 'kg', icon: 'scale-outline' },
  { type: 'blood_glucose', label: 'Blood Glucose', unit: 'mg/dL', icon: 'water-outline' },
  { type: 'blood_pressure_systolic', label: 'Blood Pressure', unit: 'mmHg', icon: 'pulse-outline' },
  { type: 'steps', label: 'Steps', unit: 'steps', icon: 'walk-outline' },
  { type: 'sleep_hours', label: 'Sleep', unit: 'hours', icon: 'moon-outline' },
  { type: 'water_ml', label: 'Water', unit: 'ml', icon: 'water-outline' },
] as const;

export default function LogScreen() {
  const { width } = useWindowDimensions();
  const isWide = width > 768;
  const [tab, setTab] = useState<LogTab>('meal');
  const [mealType, setMealType] = useState<string>('Breakfast');
  const [mealDesc, setMealDesc] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('weight');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        <Text style={styles.heading}>Log Entry</Text>

        {/* Tab Switcher */}
        <View style={styles.tabs}>
          {(['meal', 'metric', 'lab'] as LogTab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t === 'meal' ? 'Meal' : t === 'metric' ? 'Health Metric' : 'Lab Result'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Meal Log */}
        {tab === 'meal' && (
          <Card style={styles.card}>
            <Text style={styles.subLabel}>Meal Type</Text>
            <View style={styles.chipRow}>
              {MEAL_TYPES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, mealType === m && styles.chipActive]}
                  onPress={() => setMealType(m)}
                >
                  <Text style={[styles.chipText, mealType === m && styles.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input
              label="What did you eat?"
              placeholder="e.g. Grilled chicken with brown rice and veggies"
              value={mealDesc}
              onChangeText={setMealDesc}
              multiline
              numberOfLines={3}
            />
            <Button title="Log Meal" onPress={() => { setMealDesc(''); }} size="lg" />
          </Card>
        )}

        {/* Metric Log */}
        {tab === 'metric' && (
          <Card style={styles.card}>
            <Text style={styles.subLabel}>Select Metric</Text>
            <View style={styles.chipRow}>
              {QUICK_METRICS.map((m) => (
                <TouchableOpacity
                  key={m.type}
                  style={[styles.chip, selectedMetric === m.type && styles.chipActive]}
                  onPress={() => setSelectedMetric(m.type)}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={14}
                    color={selectedMetric === m.type ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[styles.chipText, selectedMetric === m.type && styles.chipTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input
              label={`Value (${QUICK_METRICS.find((m) => m.type === selectedMetric)?.unit})`}
              placeholder="Enter value"
              value={metricValue}
              onChangeText={setMetricValue}
              keyboardType="numeric"
            />
            <Button title="Log Metric" onPress={() => { setMetricValue(''); }} size="lg" />
          </Card>
        )}

        {/* Lab Result */}
        {tab === 'lab' && (
          <Card style={styles.card}>
            <Input label="Test Name" placeholder="e.g. HbA1c, LDL Cholesterol, TSH" />
            <Input label="Result Value" placeholder="e.g. 6.2" keyboardType="numeric" />
            <Input label="Unit" placeholder="e.g. %, mg/dL" />
            <Input label="Test Date" placeholder="YYYY-MM-DD" />
            <Input label="Notes (optional)" placeholder="Fasting, lab name, etc." multiline />
            <Button title="Log Lab Result" onPress={() => {}} size="lg" />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  contentWide: { maxWidth: 600, alignSelf: 'center', width: '100%' },
  heading: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  tabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceSecondary, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  tabLabelActive: { color: Colors.white },
  card: { padding: Spacing.md },
  subLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
});
