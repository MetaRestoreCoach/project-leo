import { supabase } from './supabase';
import { MealLog, HealthMetric, LabResult } from '@/types';

export async function logMeal(
  userId: string,
  data: { meal_type: MealLog['meal_type']; description: string },
): Promise<MealLog> {
  const { data: result, error } = await supabase
    .from('meal_logs')
    .insert({ user_id: userId, ...data, logged_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function logMetric(
  userId: string,
  data: { metric_type: string; value: number; unit: string },
): Promise<HealthMetric> {
  const { data: result, error } = await supabase
    .from('health_metrics')
    .insert({ user_id: userId, ...data, recorded_at: new Date().toISOString(), source: 'manual' })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function logLabResult(
  userId: string,
  data: { test_name: string; value: number; unit: string; test_date: string; notes?: string },
): Promise<LabResult> {
  const { data: result, error } = await supabase
    .from('lab_results')
    .insert({ user_id: userId, ...data, notes: data.notes || null })
    .select()
    .single();
  if (error) throw error;
  return result;
}
