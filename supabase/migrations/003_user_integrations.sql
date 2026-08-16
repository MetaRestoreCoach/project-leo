-- ============================================================
-- Project LEO — User Integrations (Third-party OAuth tokens)
-- Run in Supabase SQL Editor or via: supabase db push
-- ============================================================

-- ── User Integrations ─────────────────────────────────────────
-- Stores OAuth tokens for third-party providers (Strava, Garmin, etc.)
-- client_secret is NEVER stored here — only the resulting access/refresh tokens.
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider         text NOT NULL,          -- 'strava', 'garmin', etc.
  access_token     text NOT NULL,
  refresh_token    text NOT NULL,
  expires_at       timestamptz NOT NULL,
  provider_user_id text,                   -- e.g. Strava athlete_id
  scopes           text,                   -- granted scopes string
  metadata         jsonb DEFAULT '{}',     -- provider-specific extra data
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, provider)               -- one row per provider per user
);

-- ── Row-Level Security ────────────────────────────────────────
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_integrations" ON public.user_integrations
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE TRIGGER set_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Unique index on health_metrics for Strava upsert ─────────
-- Prevents duplicate rows when fetch-strava-data Edge Function
-- writes the same day's metrics more than once.
ALTER TABLE public.health_metrics
  ADD CONSTRAINT IF NOT EXISTS health_metrics_upsert_key
  UNIQUE NULLS NOT DISTINCT (user_id, metric_type, recorded_at, source);
