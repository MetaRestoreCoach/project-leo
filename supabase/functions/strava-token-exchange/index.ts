// ============================================================
// Supabase Edge Function: Strava Token Exchange
// Deploy with: supabase functions deploy strava-token-exchange
//
// Set secrets before deploying:
//   supabase secrets set STRAVA_CLIENT_ID=<id>
//   supabase secrets set STRAVA_CLIENT_SECRET=<secret>
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID') || '';
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

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

    // 2. Extract Strava authorization code from request body
    const body = await req.json();
    const { code } = body;
    if (!code) {
      return new Response(JSON.stringify({ error: 'code is required' }), { status: 400 });
    }

    // 3. Exchange code for Strava access + refresh tokens
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[strava-token-exchange] Strava rejected code:', tokenRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Strava token exchange failed: ${errText}` }),
        { status: 400 },
      );
    }

    const tokens = await tokenRes.json();
    // tokens shape: { token_type, expires_at (unix seconds), expires_in,
    //                 refresh_token, access_token, athlete: { id, firstname, lastname, ... } }

    if (!tokens.access_token || !tokens.refresh_token) {
      return new Response(JSON.stringify({ error: 'Strava returned incomplete token data' }), { status: 400 });
    }

    // 4. Upsert tokens into user_integrations (handles reconnects cleanly)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const expiresAt = new Date(tokens.expires_at * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert(
        {
          user_id: user.id,
          provider: 'strava',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          provider_user_id: String(tokens.athlete?.id ?? ''),
          scopes: tokens.scope ?? 'read,activity:read_all',
          metadata: {
            athlete_firstname: tokens.athlete?.firstname ?? '',
            athlete_lastname: tokens.athlete?.lastname ?? '',
            athlete_profile: tokens.athlete?.profile_medium ?? '',
            athlete_city: tokens.athlete?.city ?? '',
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' },
      );

    if (upsertError) {
      console.error('[strava-token-exchange] DB upsert error:', upsertError);
      throw upsertError;
    }

    console.log(`[strava-token-exchange] Connected Strava athlete ${tokens.athlete?.id} for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        athlete_id: tokens.athlete?.id,
        athlete_name: `${tokens.athlete?.firstname ?? ''} ${tokens.athlete?.lastname ?? ''}`.trim(),
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );

  } catch (error: any) {
    console.error('[strava-token-exchange] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error.message ?? 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
