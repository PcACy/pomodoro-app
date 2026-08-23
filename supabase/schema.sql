-- Supabase schema for Pomodoro cloud sync (Hardened & Audited).
-- Run this in the Supabase SQL editor. Enable GitHub auth in Authentication > Providers first.

-- 1. SESSIONS TABLE
create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  start bigint not null check (start > 0),
  "end" bigint not null check ("end" >= start),
  duration_ms bigint not null check (duration_ms > 0),
  task text not null check (char_length(task) <= 500),
  tag text not null check (char_length(tag) <= 100),
  notes text check (notes is null or char_length(notes) <= 2000),
  mode text check (mode is null or mode in ('pomodoro', 'flow')),
  updated_at bigint not null default 0
);

-- Upgrades for already-deployed databases
alter table public.sessions add column if not exists updated_at bigint not null default 0;
alter table public.sessions add column if not exists mode text check (mode is null or mode in ('pomodoro', 'flow'));

-- 2. TODOS TABLE
create table if not exists public.todos (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) <= 500),
  tag text not null check (char_length(tag) <= 100),
  done boolean not null default false,
  pomodoros integer not null default 0 check (pomodoros >= 0),
  created_at bigint not null check (created_at > 0),
  completed_at bigint,
  updated_at bigint not null default 0
);

-- Upgrades for already-deployed databases
alter table public.todos add column if not exists updated_at bigint not null default 0;

-- 3. TAGS TABLE (Optional Cloud Sync)
create table if not exists public.tags (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) <= 100),
  color text check (color is null or char_length(color) <= 30),
  updated_at bigint not null default 0
);

-- 4. USER SETTINGS TABLE (Optional Cloud Sync)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0
);

-- Performance Indexes
create index if not exists sessions_user_start_idx on public.sessions (user_id, start);
create index if not exists todos_user_idx on public.todos (user_id);
create index if not exists tags_user_idx on public.tags (user_id);

-- Enforce Row Level Security (RLS) on ALL tables
alter table public.sessions enable row level security;
alter table public.todos enable row level security;
alter table public.tags enable row level security;
alter table public.user_settings enable row level security;

-- Force RLS even for table owners (Defense in depth)
alter table public.sessions force row level security;
alter table public.todos force row level security;
alter table public.tags force row level security;
alter table public.user_settings force row level security;

-- Strict Isolation Policies: Users can ONLY access & mutate their own data
drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own todos" on public.todos;
create policy "own todos" on public.todos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own tags" on public.tags;
create policy "own tags" on public.tags
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);