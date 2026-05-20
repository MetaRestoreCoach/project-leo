-- ============================================================
-- Project LEO - Onboarding Tables
-- onboarding_config: remote config override (optional row, id='default')
-- user_preferences:  persisted onboarding answers + wellness scores
-- ============================================================

-- Remote config table (one row per config variant; default row id = 'default')
create table if not exists public.onboarding_config (
  id   text primary key,
  config jsonb not null
);

-- User preferences table
create table if not exists public.user_preferences (
  uid  text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- RLS
alter table public.onboarding_config  enable row level security;
alter table public.user_preferences   enable row level security;

-- onboarding_config is public-read (no auth required to fetch questions)
create policy "Public can read onboarding config"
  on public.onboarding_config for select
  using (true);

-- user_preferences: each user can only read/write their own row
create policy "Users can read own preferences"
  on public.user_preferences for select
  using (auth.uid()::text = uid);

create policy "Users can upsert own preferences"
  on public.user_preferences for insert
  with check (auth.uid()::text = uid);

create policy "Users can update own preferences"
  on public.user_preferences for update
  using (auth.uid()::text = uid);
