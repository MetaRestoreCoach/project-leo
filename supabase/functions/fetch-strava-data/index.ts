// ============================================================
// Supabase Edge Function: Fetch Strava Activity Data
// Deploy with: supabase functions deploy fetch-strava-data
//
// Reads stored Strava tokens, auto-refreshes if expired,
// fetches today's (or a given date's) activities, and returns
// a DailyHealthSummary plus persists metrics to health_metrics.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID') || '';
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

// Refresh access token using stored refresh token
async function refreshStravaToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
}> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Strava token refresh failed (${res.status}): ${err}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // 1. Authenticate the calling user via their Supabase JWT
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
    }
    const jwt = authHeader.replace('Bearer ', '');

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 2. Parse request body — date defaults to today
    const body = await req.json().catch(() => ({}));
    const targetDate: string = body.date || new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 3. Load stored Strava tokens for this user
    const { data: integration, error: intError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .single();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Strava not connected. Connect via the dashboard first.' }),
        { status: 404 },
      );
    }

    // 4. Refresh access token if expired (refresh 5 min before actual expiry)
    let accessToken: string = integration.access_token;
    const expiresAtMs = new Date(integration.expires_at).getTime();
    const bufferMs = 5 * 60 * 1000;

    if (Date.now() + bufferMs >= expiresAtMs) {
      console.log(`[fetch-strava-data] Token expiring soon for user ${user.id}, refreshing…`);
      const refreshed = await refreshStravaToken(integration.refresh_token);
      accessToken = refreshed.access_token;

      await supabase
        .from('user_integrations')
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('provider', 'strava');

      console.log(`[fetch-strava-data] Token refreshed for user ${user.id}`);
    }

    // 5. Fetch activities for the target date from Strava API
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const afterUnix = Math.floor(startOfDay.getTime() / 1000);
    const beforeUnix = Math.floor(endOfDay.getTime() / 1000);

    const activitiesRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${afterUnix}&before=${beforeUnix}&per_page=30`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!activitiesRes.ok) {
      const errText = await activitiesRes.text();
      throw new Error(`Strava activities fetch failed (${activitiesRes.status}): ${errText}`);
    }

    const activities: any[] = await activitiesRes.json();
    console.log(`[fetch-strava-data] ${activities.length} activities found for ${targetDate}`);

    // 6. Aggregate activities into a DailyHealthSummary
    let totalDistanceMeters = 0;
    let totalCalories = 0;
    let totalMovingTimeSec = 0;
    let hrWeightedSum = 0;
    let hrWeightedCount = 0;   // weighted by duration
    let hrMax = 0;
    let estimatedSteps = 0;

    for (const activity of activities) {
      totalDistanceMeters += activity.distance ?? 0;
      // Strava provides 'calories' directly; fall back to kilojoules → kcal conversion
      totalCalories += activity.calories
        ?? (activity.kilojoules ? Math.round(activity.kilojoules * 0.239) : 0);
      totalMovingTimeSec += activity.moving_time ?? 0;

      // Weighted heart rate (by duration) — gives a more accurate daily average
      if (activity.average_heartrate && activity.moving_time) {
        hrWeightedSum += activity.average_heartrate * activity.moving_time;
        hrWeightedCount += activity.moving_time;
      }
      if (activity.max_heartrate) {
        hrMax = Math.max(hrMax, activity.max_heartrate);
      }

      // Estimate steps only for pedestrian activity types
      const sportType = (activity.sport_type ?? activity.type ?? '').toLowerCase();
      if (['run', 'walk', 'hike', 'trailrun', 'virtualrun'].includes(sportType)) {
        // 1 km ≈ 1300 steps (average stride length)
        estimatedSteps += Math.round((activity.distance / 1000) * 1300);
      }
    }

    const hrAvg = hrWeightedCount > 0 ? Math.round(hrWeightedSum / hrWeightedCount) : 0;
    const distanceKm = Math.round(totalDistanceMeters / 100) / 10;
    const workoutDurationMin = Math.round(totalMovingTimeSec / 60);

    const summary = {
      date: targetDate,
      steps: estimatedSteps,
      heartRateAvg: hrAvg,
      heartRateMin: hrAvg > 0 ? Math.round(hrAvg * 0.85) : 0,  // Strava doesn't expose per-session min
      heartRateMax: hrMax,
      sleepHours: 0,            // Strava does not track sleep
      activeCalories: totalCalories,
      restingCalories: 0,       // Strava does not provide resting calories
      distanceKm,
      flightsClimbed: 0,
      bloodOxygen: null,
      respiratoryRate: null,
      workoutCount: activities.length,
      workoutDurationMin,
      source: 'strava',
    };

    // 7. Persist metrics to health_metrics so coaching plan AI can use them
    if (activities.length > 0) {
      type MetricRow = {
        user_id: string;
        metric_type: string;
        value: number;
        unit: string;
        recorded_at: string;
        source: string;
      };
      const metricsToSave: MetricRow[] = [];
      const recordedAt = startOfDay.toISOString();

      if (totalCalories > 0) {
        metricsToSave.push({ user_id: user.id, metric_type: 'calories_burned', value: totalCalories, unit: 'kcal', recorded_at: recordedAt, source: 'strava' });
      }
      if (distanceKm > 0) {
        metricsToSave.push({ user_id: user.id, metric_type: 'distance_km', value: distanceKm, unit: 'km', recorded_at: recordedAt, source: 'strava' });
      }
      if (hrAvg > 0) {
        metricsToSave.push({ user_id: user.id, metric_type: 'heart_rate', value: hrAvg, unit: 'bpm', recorded_at: recordedAt, source: 'strava' });
      }
      if (estimatedSteps > 0) {
        metricsToSave.push({ user_id: user.id, metric_type: 'steps', value: estimatedSteps, unit: 'steps', recorded_at: recordedAt, source: 'strava' });
      }
      if (workoutDurationMin > 0) {
        metricsToSave.push({ user_id: user.id, metric_type: 'workout_duration_min', value: workoutDurationMin, unit: 'min', recorded_at: recordedAt, source: 'strava' });
      }

      if (metricsToSave.length > 0) {
        const { error: insertError } = await supabase
          .from('health_metrics')
          .upsert(metricsToSave, { onConflict: 'user_id,metric_type,recorded_at,source' });

        if (insertError) {
          // Non-fatal — log and continue; returning summary to client is more important
          console.warn('[fetch-strava-data] health_metrics upsert warning:', insertError.message);
        }
      }
    }

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[fetch-strava-data] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error.message ?? 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
