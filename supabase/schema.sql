-- LifeOS Supabase Schema
-- Run this ONCE in the Supabase SQL Editor: https://supabase.com/dashboard/project/xzybqypebvolpoesscya/sql

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── tasks ─────────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  text         text not null,
  workspace    text not null,
  urgency      text not null default 'normal',
  due_date     date,
  completed    boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  type         text not null default 'task'
);
alter table tasks enable row level security;
drop policy if exists "allow all" on tasks;
create policy "allow all" on tasks for all to anon using (true) with check (true);

-- ── routine_items ─────────────────────────────────────────────────────────────
create table if not exists routine_items (
  id             uuid primary key default gen_random_uuid(),
  label          text not null,
  time_estimate  text,
  position       integer not null default 0,
  has_timer      boolean not null default false,
  timer_duration integer,
  created_at     timestamptz not null default now()
);
alter table routine_items enable row level security;
drop policy if exists "allow all" on routine_items;
create policy "allow all" on routine_items for all to anon using (true) with check (true);

-- ── routine_completions ───────────────────────────────────────────────────────
create table if not exists routine_completions (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid references routine_items(id) on delete cascade,
  completed_date date not null,
  completed_at   timestamptz not null default now(),
  unique(item_id, completed_date)
);
alter table routine_completions enable row level security;
drop policy if exists "allow all" on routine_completions;
create policy "allow all" on routine_completions for all to anon using (true) with check (true);

-- ── gym_sessions ──────────────────────────────────────────────────────────────
create table if not exists gym_sessions (
  id           uuid primary key default gen_random_uuid(),
  session_type text not null,
  started_at   timestamptz,
  ended_at     timestamptz,
  notes        text,
  created_at   timestamptz not null default now()
);
alter table gym_sessions enable row level security;
drop policy if exists "allow all" on gym_sessions;
create policy "allow all" on gym_sessions for all to anon using (true) with check (true);

-- ── gym_exercises ─────────────────────────────────────────────────────────────
create table if not exists gym_exercises (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references gym_sessions(id) on delete cascade,
  name       text not null,
  position   integer not null default 0
);
alter table gym_exercises enable row level security;
drop policy if exists "allow all" on gym_exercises;
create policy "allow all" on gym_exercises for all to anon using (true) with check (true);

-- ── gym_sets ──────────────────────────────────────────────────────────────────
create table if not exists gym_sets (
  id          uuid primary key default gen_random_uuid(),
  exercise_id uuid references gym_exercises(id) on delete cascade,
  weight      numeric,
  reps        integer,
  done        boolean not null default false
);
alter table gym_sets enable row level security;
drop policy if exists "allow all" on gym_sets;
create policy "allow all" on gym_sets for all to anon using (true) with check (true);

-- ── habit_completions ─────────────────────────────────────────────────────────
create table if not exists habit_completions (
  id             uuid primary key default gen_random_uuid(),
  habit_name     text not null,
  completed_date date not null,
  completed_at   timestamptz not null default now(),
  unique(habit_name, completed_date)
);
alter table habit_completions enable row level security;
drop policy if exists "allow all" on habit_completions;
create policy "allow all" on habit_completions for all to anon using (true) with check (true);

-- ── ai_messages ───────────────────────────────────────────────────────────────
create table if not exists ai_messages (
  id         uuid primary key default gen_random_uuid(),
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);
alter table ai_messages enable row level security;
drop policy if exists "allow all" on ai_messages;
create policy "allow all" on ai_messages for all to anon using (true) with check (true);

-- ── user_settings ─────────────────────────────────────────────────────────────
create table if not exists user_settings (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,
  value      jsonb,
  updated_at timestamptz not null default now()
);
alter table user_settings enable row level security;
drop policy if exists "allow all" on user_settings;
create policy "allow all" on user_settings for all to anon using (true) with check (true);

-- ── indexes ───────────────────────────────────────────────────────────────────
create index if not exists tasks_workspace_idx    on tasks(workspace);
create index if not exists tasks_due_date_idx     on tasks(due_date);
create index if not exists tasks_completed_idx    on tasks(completed);
create index if not exists habit_comp_date_idx    on habit_completions(completed_date);
create index if not exists ai_messages_created_idx on ai_messages(created_at);
