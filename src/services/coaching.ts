// ============================================================
// AI Coaching Service
// Uses Claude API via Supabase Edge Function (server-side)
// For MVP: can call directly from client with demo data
// ============================================================

import { supabase } from './supabase';
import { Profile, HealthMetric, CoachingPlan, MealLog, LabResult } from '@/types';

// System prompt for the Claude coaching engine
export const COACHING_SYSTEM_PROMPT = `You are a functional health coach AI embedded in the Project LEO health app. Your role is to provide personalized, evidence-based health coaching recommendations focused on helping users reverse or manage chronic conditions through diet, exercise, supplements, and lifestyle changes.

CORE PRINCIPLES:
- "Food is Medicine" — prioritize dietary interventions
- Functional health approach — address root causes, not just symptoms
- Evidence-based — cite research or well-established mechanisms
- Personalized — tailor every recommendation to the user's specific conditions, goals, lab results, and recent metrics
- Actionable — give specific, practical advice the user can implement today
- Safe — always include disclaimers, never replace medical advice

OUTPUT FORMAT (respond in valid JSON):
{
  "summary": "Brief 2-3 sentence overview of this week's focus areas",
  "diet_recommendations": [
    {
      "title": "Short action title",
      "description": "What to do, with specific foods/meals",
      "reason": "Why this helps their specific condition",
      "priority": "high|medium|low"
    }
  ],
  "exercise_recommendations": [
    {
      "title": "Short action title",
      "description": "What to do, duration, frequency, timing",
      "reason": "Why this helps their specific condition",
      "priority": "high|medium|low"
    }
  ],
  "supplement_recommendations": [
    {
      "title": "Supplement name + dosage",
      "description": "When and how to take it. Always note: consult doctor first.",
      "reason": "Evidence for this supplement's role",
      "priority": "high|medium|low"
    }
  ],
  "lifestyle_tips": [
    "Specific lifestyle tip relevant to their data this week"
  ]
}

SAFETY RULES:
- Always state "These are suggestions, not medical advice. Consult your healthcare provider."
- Never recommend stopping prescribed medications
- Flag any concerning lab values and recommend seeing a doctor
- Keep supplement recommendations conservative and well-researched
- If blood glucose is consistently > 250 mg/dL or blood pressure > 180/120, recommend immediate medical attention`;

// Build the user context for the coaching prompt
export function buildCoachingPrompt(
  profile: Profile,
  recentMetrics: HealthMetric[],
  recentMeals: MealLog[],
  labResults: LabResult[]
): string {
  const metricsSection = recentMetrics.length > 0
    ? recentMetrics.slice(0, 50).map(m =>
        `${m.metric_type}: ${m.value} ${m.unit} (${new Date(m.recorded_at).toLocaleDateString()})`
      ).join('\n')
    : 'No metrics recorded yet.';

  const mealsSection = recentMeals.length > 0
    ? recentMeals.slice(0, 20).map(m =>
        `${m.meal_type}: ${m.description} (${m.calories ? m.calories + ' kcal' : 'calories unknown'})`
      ).join('\n')
    : 'No meals logged yet.';

  const labSection = labResults.length > 0
    ? labResults.slice(0, 10).map(l =>
        `${l.test_name}: ${l.value} ${l.unit} (${l.test_date})${l.reference_range_low && l.reference_range_high ? ` [ref: ${l.reference_range_low}-${l.reference_range_high}]` : ''}`
      ).join('\n')
    : 'No lab results available yet.';

  return `Generate a personalized weekly coaching plan for this user.

USER PROFILE:
- Name: ${profile.full_name}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Height: ${profile.height_cm} cm
- Weight: ${profile.weight_kg} kg
- Activity Level: ${profile.activity_level}
- Health Conditions: ${profile.conditions?.join(', ') || 'None specified'}
- Health Goals: ${profile.goals?.join(', ') || 'General wellness'}
- Dietary Preferences: ${profile.food_preferences?.join(', ') || 'No restrictions'}

RECENT HEALTH METRICS (last 7 days):
${metricsSection}

RECENT MEALS (last 7 days):
${mealsSection}

LAB RESULTS:
${labSection}

Based on this data, generate a personalized weekly coaching plan. Focus on their primary conditions and goals. Reference specific metrics and trends you observe.`;
}

// Generate coaching plan via Supabase Edge Function
export async function generateCoachingPlan(userId: string): Promise<CoachingPlan | null> {
  const { data, error } = await supabase.functions.invoke('generate-coaching-plan', {
    body: { user_id: userId },
  });

  if (error) throw error;
  return data;
}

// Get the latest coaching plan
export async function getLatestCoachingPlan(userId: string): Promise<CoachingPlan | null> {
  const { data, error } = await supabase
    .from('coaching_plans')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Get coaching plan history
export async function getCoachingHistory(userId: string, limit = 10): Promise<CoachingPlan[]> {
  const { data, error } = await supabase
    .from('coaching_plans')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
