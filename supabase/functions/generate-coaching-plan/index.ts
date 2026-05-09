// ============================================================
// Supabase Edge Function: Generate Coaching Plan via Claude
// Deploy with: supabase functions deploy generate-coaching-plan
// ============================================================

// NOTE: This file is the Supabase Edge Function (runs on Deno).
// It calls the Claude API server-side so the API key is never exposed to clients.
// Set CLAUDE_API_KEY in your Supabase project secrets:
//   supabase secrets set CLAUDE_API_KEY=sk-ant-your-key-here

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const SYSTEM_PROMPT = `You are a functional health coach AI embedded in the Project LEO health app. Your role is to provide personalized, evidence-based health coaching recommendations focused on helping users reverse or manage chronic conditions through diet, exercise, supplements, and lifestyle changes.

CORE PRINCIPLES:
- "Food is Medicine" — prioritize dietary interventions
- Functional health approach — address root causes, not just symptoms
- Evidence-based — cite research or well-established mechanisms
- Personalized — tailor every recommendation to the user's specific conditions, goals, lab results, and recent metrics
- Actionable — give specific, practical advice the user can implement today

OUTPUT FORMAT (respond ONLY with valid JSON, no markdown):
{
  "summary": "Brief 2-3 sentence overview of this week's focus areas",
  "diet_recommendations": [
    { "title": "Short action title", "description": "What to do", "reason": "Why it helps", "priority": "high|medium|low" }
  ],
  "exercise_recommendations": [
    { "title": "Short action title", "description": "What to do", "reason": "Why it helps", "priority": "high|medium|low" }
  ],
  "supplement_recommendations": [
    { "title": "Supplement + dosage", "description": "How to take. Note: consult doctor.", "reason": "Evidence", "priority": "high|medium|low" }
  ],
  "lifestyle_tips": ["Specific tip 1", "Specific tip 2"]
}

SAFETY: Never recommend stopping medications. Flag concerning values. Always note supplements require doctor consultation.`;

Deno.serve(async (req) => {
  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch user data
    const [profileRes, metricsRes, mealsRes, labsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user_id).single(),
      supabase.from('health_metrics').select('*').eq('user_id', user_id)
        .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false }).limit(50),
      supabase.from('meal_logs').select('*').eq('user_id', user_id)
        .gte('logged_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('logged_at', { ascending: false }).limit(20),
      supabase.from('lab_results').select('*').eq('user_id', user_id)
        .order('test_date', { ascending: false }).limit(10),
    ]);

    const profile = profileRes.data;
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
    }

    // Build prompt
    const userPrompt = `Generate a weekly coaching plan for:
Profile: ${profile.full_name}, age ${profile.age}, ${profile.gender}, ${profile.height_cm}cm, ${profile.weight_kg}kg, ${profile.activity_level}
Conditions: ${(profile.conditions || []).join(', ') || 'None'}
Goals: ${(profile.goals || []).join(', ') || 'General wellness'}
Diet: ${(profile.food_preferences || []).join(', ') || 'No restrictions'}

Recent Metrics: ${(metricsRes.data || []).map((m: any) => `${m.metric_type}: ${m.value} ${m.unit}`).join('; ') || 'None yet'}
Recent Meals: ${(mealsRes.data || []).map((m: any) => `${m.meal_type}: ${m.description}`).join('; ') || 'None logged'}
Lab Results: ${(labsRes.data || []).map((l: any) => `${l.test_name}: ${l.value} ${l.unit}`).join('; ') || 'None available'}`;

    // Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    const content = claudeData.content?.[0]?.text || '{}';

    // Parse the JSON response
    let plan;
    try {
      plan = JSON.parse(content);
    } catch {
      plan = { summary: content, diet_recommendations: [], exercise_recommendations: [], supplement_recommendations: [], lifestyle_tips: [] };
    }

    // Store the plan
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    const { data: savedPlan, error: saveError } = await supabase
      .from('coaching_plans')
      .insert({
        user_id,
        plan_type: 'weekly',
        summary: plan.summary,
        diet_recommendations: plan.diet_recommendations,
        exercise_recommendations: plan.exercise_recommendations,
        supplement_recommendations: plan.supplement_recommendations,
        lifestyle_tips: plan.lifestyle_tips,
        valid_until: validUntil.toISOString(),
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify(savedPlan), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
