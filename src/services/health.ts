// ============================================================
// Health Metrics Service
// ============================================================

import { supabase } from './supabase';
import { HealthMetric, MetricType, MetricSource, MealLog, LabResult } from '@/types';

// -- Health Metrics --

export async function logMetric(
  userId: string,
  metricType: MetricType,
  value: number,
  unit: string,
  source: MetricSource = 'manual',
  recordedAt?: string
): Promise<HealthMetric> {
  const { data, error } = await supabase
    .from('health_metrics')
    .insert({
      user_id: userId,
      metric_type: metricType,
      value,
      unit,
      source,
      recorded_at: recordedAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMetrics(
  userId: string,
  metricType?: MetricType,
  days: number = 30
): Promise<HealthMetric[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  let query = supabase
    .from('health_metrics')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_at', since.toISOString())
    .order('recorded_at', { ascending: false });

  if (metricType) {
    query = query.eq('metric_type', metricType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getLatestMetric(
  userId: string,
  metricType: MetricType
): Promise<HealthMetric | null> {
  const { data, error } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('metric_type', metricType)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getDailyAggregates(
  userId: string,
  metricType: MetricType,
  days: number = 7
): Promise<{ date: string; avg: number; min: number; max: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase.rpc('daily_metric_aggregates', {
    p_user_id: userId,
    p_metric_type: metricType,
    p_since: since.toISOString(),
  });

  if (error) throw error;
  return data || [];
}

// -- Meal Logging --

export async function logMeal(
  userId: string,
  meal: Omit<MealLog, 'id' | 'user_id'>
): Promise<MealLog> {
  const { data, error } = await supabase
    .from('meal_logs')
    .insert({ user_id: userId, ...meal })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTodaysMeals(userId: string): Promise<MealLog[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', today.toISOString())
    .order('logged_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// -- Lab Results --

export async function addLabResult(
  userId: string,
  result: Omit<LabResult, 'id' | 'user_id' | 'created_at'>
): Promise<LabResult> {
  const { data, error } = await supabase
    .from('lab_results')
    .insert({ user_id: userId, ...result })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLabResults(userId: string): Promise<LabResult[]> {
  const { data, error } = await supabase
    .from('lab_results')
    .select('*')
    .eq('user_id', userId)
    .order('test_date', { ascending: false });

  if (error) throw error;
  return data || [];
}
