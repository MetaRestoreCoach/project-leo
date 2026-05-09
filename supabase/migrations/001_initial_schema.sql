-- ============================================================
-- Project LEO - Initial Database Schema
-- Run this in your Supabase SQL Editor after creating a project
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text not null default '',
  age integer,
  gender text check (gender in ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  height_cm numeric(5,1),
  weight_kg numeric(5,1),
  activity_level text check (activity_level in (
    'sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'
  )),
  goals jsonb default '[]'::jsonb,
  conditions jsonb default '[]'::jsonb,
  food_preferences jsonb default '[]'::jsonb,
  avatar_url text,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- HEALTH METRICS
-- ============================================================
create table public.health_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  metric_type text not null check (metric_type in (
    'steps', 'heart_rate', 'blood_glucose',
    'blood_pressure_systolic', 'blood_pressure_diastolic',
    'weight', 'sleep_hours', 'calories_consumed',
    'calories_burned', 'water_ml'
  )),
  value numeric not null,
  unit text not null,
  recorded_at timestamptz not null default now(),
  source text default 'manual' check (source in (
    'manual', 'apple_health', 'garmin', 'fitbit', 'google_fit'
  )),
  created_at timestamptz default now()
);

-- Index for common queries
create index idx_health_metrics_user_type on public.health_metrics (user_id, metric_type, recorded_at desc);
create index idx_health_metrics_recorded on public.health_metrics (recorded_at desc);

-- RLS
alter table public.health_metrics enable row level security;

create policy "Users can view own metrics"
  on public.health_metrics for select
  using (auth.uid() = user_id);

create policy "Users can insert own metrics"
  on public.health_metrics for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own metrics"
  on public.health_metrics for delete
  using (auth.uid() = user_id);

-- ============================================================
-- MEAL LOGS
-- ============================================================
create table public.meal_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  logged_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index idx_meal_logs_user on public.meal_logs (user_id, logged_at desc);

alter table public.meal_logs enable row level security;

create policy "Users can manage own meals"
  on public.meal_logs for all
  using (auth.uid() = user_id);

-- ============================================================
-- LAB RESULTS
-- ============================================================
create table public.lab_results (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  test_name text not null,
  value numeric not null,
  unit text not null,
  reference_range_low numeric,
  reference_range_high numeric,
  test_date date not null,
  notes text,
  created_at timestamptz default now()
);

create index idx_lab_results_user on public.lab_results (user_id, test_date desc);

alter table public.lab_results enable row level security;

create policy "Users can manage own lab results"
  on public.lab_results for all
  using (auth.uid() = user_id);

-- ============================================================
-- COACHING PLANS
-- ============================================================
create table public.coaching_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_type text default 'weekly' check (plan_type in ('weekly', 'daily')),
  summary text,
  diet_recommendations jsonb default '[]'::jsonb,
  exercise_recommendations jsonb default '[]'::jsonb,
  supplement_recommendations jsonb default '[]'::jsonb,
  lifestyle_tips jsonb default '[]'::jsonb,
  generated_at timestamptz default now(),
  valid_until timestamptz,
  created_at timestamptz default now()
);

create index idx_coaching_plans_user on public.coaching_plans (user_id, generated_at desc);

alter table public.coaching_plans enable row level security;

create policy "Users can view own coaching plans"
  on public.coaching_plans for select
  using (auth.uid() = user_id);

-- ============================================================
-- GOALS
-- ============================================================
create table public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_type text not null,
  title text not null,
  target_value numeric,
  current_value numeric,
  unit text,
  deadline date,
  status text default 'active' check (status in ('active', 'achieved', 'paused')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_goals_user on public.goals (user_id, status);

alter table public.goals enable row level security;

create policy "Users can manage own goals"
  on public.goals for all
  using (auth.uid() = user_id);

-- ============================================================
-- CONSENT RECORDS (audit trail)
-- ============================================================
create table public.consent_records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  consent_type text not null,
  granted_at timestamptz default now(),
  revoked_at timestamptz,
  policy_version text default '1.0',
  created_at timestamptz default now()
);

alter table public.consent_records enable row level security;

create policy "Users can view own consent"
  on public.consent_records for select
  using (auth.uid() = user_id);

create policy "Users can insert own consent"
  on public.consent_records for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- HELPER FUNCTION: Daily metric aggregates
-- ============================================================
create or replace function public.daily_metric_aggregates(
  p_user_id uuid,
  p_metric_type text,
  p_since timestamptz
)
returns table (
  date date,
  avg numeric,
  min numeric,
  max numeric
)
language sql
stable
security definer
as $$
  select
    (recorded_at at time zone 'UTC')::date as date,
    round(avg(value), 1) as avg,
    min(value) as min,
    max(value) as max
  from public.health_metrics
  where user_id = p_user_id
    and metric_type = p_metric_type
    and recorded_at >= p_since
  group by (recorded_at at time zone 'UTC')::date
  order by date asc;
$$;
