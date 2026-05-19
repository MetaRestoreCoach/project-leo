-- ============================================================
-- Project LEO — Log tables (meal_logs, lab_results)
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ixivleneeiuxtocqytew/sql/new
-- ============================================================

-- ── Meal Logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_type   text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description text NOT NULL,
  calories    numeric,
  protein_g   numeric,
  carbs_g     numeric,
  fat_g       numeric,
  logged_at   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_meals" ON public.meal_logs
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Lab Results ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_results (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  test_name             text NOT NULL,
  value                 numeric NOT NULL,
  unit                  text NOT NULL,
  reference_range_low   numeric,
  reference_range_high  numeric,
  test_date             date NOT NULL,
  notes                 text,
  created_at            timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_lab_results" ON public.lab_results
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
