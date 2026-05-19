-- ============================================================
-- Project LEO — Initial Schema
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ixivleneeiuxtocqytew/sql
-- ============================================================

-- ── Profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name     text NOT NULL DEFAULT '',
  age           integer,
  gender        text CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  height_cm     numeric,
  weight_kg     numeric,
  activity_level text CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
  goals         text[] DEFAULT '{}',
  conditions    text[] DEFAULT '{}',
  food_preferences text[] DEFAULT '{}',
  avatar_url    text,
  onboarding_completed boolean DEFAULT false NOT NULL,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id)
);

-- ── Row-Level Security ────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Health Metrics ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.health_metrics (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_type   text NOT NULL,
  value         numeric NOT NULL,
  unit          text NOT NULL,
  recorded_at   timestamptz NOT NULL,
  source        text DEFAULT 'manual',
  created_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_metrics" ON public.health_metrics
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
