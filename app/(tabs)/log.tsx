import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { useAuthStore } from '@/hooks/useAuthStore';
import { logMeal, logMetric, logLabResult } from '@/services/log';
import { MealLog } from '@/types';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';

type LogTab = 'meal' | 'metric' | 'lab';

const MEAL_TYPES: { value: MealLog['meal_type']; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const QUICK_METRICS = [
  { type: 'weight', label: 'Weight', unit: 'kg', icon: 'scale-outline' },
  { type: 'blood_glucose', label: 'Blood Glucose', unit: 'mg/dL', icon: 'water-outline' },
  { type: 'blood_pressure_systolic', label: 'Blood Pressure', unit: 'mmHg', icon: 'pulse-outline' },
  { type: 'steps', label: 'Steps', unit: 'steps', icon: 'walk-outline' },
  { type: 'sleep_hours', label: 'Sleep', unit: 'hours', icon: 'moon-outline' },
  { type: 'water_ml', label: 'Water', unit: 'ml', icon: 'water-outline' },
] as const;

function SuccessBanner({ message }: { message: string }) {
  return (
    <View style={styles.success}>
      <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

export default function LogScreen() {
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isWide = width > 768;
  const [tab, setTab] = useState<LogTab>('meal');

  // ── Meal state ────────────────────────────────────────────
  const [mealType, setMealType] = useState<MealLog['meal_type']>('breakfast');
  const [mealDesc, setMealDesc] = useState('');
  const [mealLoading, setMealLoading] = useState(false);
  const [mealError, setMealError] = useState('');
  const [mealSaved, setMealSaved] = useState(false);

  // ── Metric state ──────────────────────────────────────────
  const [selectedMetric, setSelectedMetric] = useState(QUICK_METRICS[0].type);
  const [metricValue, setMetricValue] = useState('');
  const [metricLoading, setMetricLoading] = useState(false);
  const [metricError, setMetricError] = useState('');
  const [metricSaved, setMetricSaved] = useState(false);

  // ── Lab state ─────────────────────────────────────────────
  const [labName, setLabName] = useState('');
  const [labValue, setLabValue] = useState('');
  const [labUnit, setLabUnit] = useState('');
  const [labDate, setLabDate] = useState(new Date().toISOString().split('T')[0]);
  const [labNotes, setLabNotes] = useState('');
  const [labLoading, setLabLoading] = useState(false);
  const [labError, setLabError] = useState('');
  const [labSaved, setLabSaved] = useState(false);

  const flashSaved = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 2500);
  };

  const handleLogMeal = async () => {
    if (!user) return;
    if (!mealDesc.trim()) { setMealError('Please describe what you ate.'); return; }
    setMealLoading(true);
    setMealError('');
    try {
      await logMeal(user.id, { meal_type: mealType, description: mealDesc.trim() });
      setMealDesc('');
      flashSaved(setMealSaved);
    } catch (err: any) {
      setMealError(err.message || 'Failed to save. Please try again.');
    } finally {
      setMealLoading(false);
    }
  };

  const handleLogMetric = async () => {
    if (!user) return;
    const num = parseFloat(metricValue);
    if (!metricValue || isNaN(num)) { setMetricError('Please enter a valid number.'); return; }
    const metric = QUICK_METRICS.find((m) => m.type === selectedMetric)!;
    setMetricLoading(true);
    setMetricError('');
    try {
      await logMetric(user.id, { metric_type: metric.type, value: num, unit: metric.unit });
      setMetricValue('');
      flashSaved(setMetricSaved);
    } catch (err: any) {
      setMetricError(err.message || 'Failed to save. Please try again.');
    } finally {
      setMetricLoading(false);
    }
  };

  const handleLogLab = async () => {
    if (!user) return;
    if (!labName.trim()) { setLabError('Please enter the test name.'); return; }
    const num = parseFloat(labValue);
    if (!labValue || isNaN(num)) { setLabError('Please enter a valid result value.'); return; }
    if (!labUnit.trim()) { setLabError('Please enter the unit.'); return; }
    if (!labDate.match(/^\d{4}-\d{2}-\d{2}$/)) { setLabError('Date must be YYYY-MM-DD.'); return; }
    setLabLoading(true);
    setLabError('');
    try {
      await logLabResult(user.id, {
        test_name: labName.trim(),
        value: num,
        unit: labUnit.trim(),
        test_date: labDate,
        notes: labNotes.trim() || undefined,
      });
      setLabName('');
      setLabValue('');
      setLabUnit('');
      setLabNotes('');
      setLabDate(new Date().toISOString().split('T')[0]);
      flashSaved(setLabSaved);
    } catch (err: any) {
      setLabError(err.message || 'Failed to save. Please try again.');
    } finally {
      setLabLoading(false);
    }
  };

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

        {/* ── Meal Log ──────────────────────────────────────── */}
        {tab === 'meal' && (
          <Card style={styles.card}>
            <Text style={styles.subLabel}>Meal Type</Text>
            <View style={styles.chipRow}>
              {MEAL_TYPES.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.chip, mealType === m.value && styles.chipActive]}
                  onPress={() => setMealType(m.value)}
                >
                  <Text style={[styles.chipText, mealType === m.value && styles.chipTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input
              label="What did you eat?"
              placeholder="e.g. Grilled chicken with brown rice and veggies"
              value={mealDesc}
              onChangeText={(v) => { setMealDesc(v); setMealError(''); }}
              multiline
              numberOfLines={3}
            />
            {mealError ? <Text style={styles.error}>{mealError}</Text> : null}
            {mealSaved ? <SuccessBanner message="Meal logged!" /> : null}
            <Button
              title="Log Meal"
              onPress={handleLogMeal}
              loading={mealLoading}
              disabled={!mealDesc.trim()}
              size="lg"
            />
          </Card>
        )}

        {/* ── Metric Log ────────────────────────────────────── */}
        {tab === 'metric' && (
          <Card style={styles.card}>
            <Text style={styles.subLabel}>Select Metric</Text>
            <View style={styles.chipRow}>
              {QUICK_METRICS.map((m) => (
                <TouchableOpacity
                  key={m.type}
                  style={[styles.chip, selectedMetric === m.type && styles.chipActive]}
                  onPress={() => { setSelectedMetric(m.type); setMetricValue(''); setMetricError(''); }}
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
              onChangeText={(v) => { setMetricValue(v); setMetricError(''); }}
              keyboardType="numeric"
            />
            {metricError ? <Text style={styles.error}>{metricError}</Text> : null}
            {metricSaved ? <SuccessBanner message="Metric logged!" /> : null}
            <Button
              title="Log Metric"
              onPress={handleLogMetric}
              loading={metricLoading}
              disabled={!metricValue.trim()}
              size="lg"
            />
          </Card>
        )}

        {/* ── Lab Result ────────────────────────────────────── */}
        {tab === 'lab' && (
          <Card style={styles.card}>
            <Input
              label="Test Name"
              placeholder="e.g. HbA1c, LDL Cholesterol, TSH"
              value={labName}
              onChangeText={(v) => { setLabName(v); setLabError(''); }}
            />
            <Input
              label="Result Value"
              placeholder="e.g. 6.2"
              value={labValue}
              onChangeText={(v) => { setLabValue(v); setLabError(''); }}
              keyboardType="numeric"
            />
            <Input
              label="Unit"
              placeholder="e.g. %, mg/dL, mmol/L"
              value={labUnit}
              onChangeText={(v) => { setLabUnit(v); setLabError(''); }}
            />
            <Input
              label="Test Date"
              placeholder="YYYY-MM-DD"
              value={labDate}
              onChangeText={(v) => { setLabDate(v); setLabError(''); }}
            />
            <Input
              label="Notes (optional)"
              placeholder="Fasting, lab name, etc."
              value={labNotes}
              onChangeText={setLabNotes}
              multiline
              numberOfLines={2}
            />
            {labError ? <Text style={styles.error}>{labError}</Text> : null}
            {labSaved ? <SuccessBanner message="Lab result saved!" /> : null}
            <Button
              title="Log Lab Result"
              onPress={handleLogLab}
              loading={labLoading}
              disabled={!labName.trim() || !labValue.trim() || !labUnit.trim()}
              size="lg"
            />
          </Card>
        )}

        <View style={{ height: Spacing.xxl }} />
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
  error: { color: Colors.error, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  success: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  successText: { fontSize: FontSize.sm, color: Colors.accent, fontWeight: FontWeight.medium },
});
