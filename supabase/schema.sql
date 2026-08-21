-- Supabase schema for Pomodoro cloud sync.
-- Run this in the Supabase SQL editor. Enable GitHub auth in Authentication > Providers first.

create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  start bigint not null check (start > 0),
  "end" bigint not null check ("end" >= start),
  duration_ms bigint not null check (duration_ms > 0),
  task text not null check (char_length(task) <= 500),
  tag text not null check (char_length(tag) <= 100),
  notes text,
  updated_at bigint not null default 0
);

-- Upgrades for an already-deployed schema (previous version had no updated_at):
alter table public.sessions add column if not exists updated_at bigint not null default 0;
alter table public.todos add column if not exists updated_at bigint not null default 0;

create table if not exists public.todos (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) <= 500),
  tag text not null check (char_length(tag) <= 100),
  done boolean not null default false,
  pomodoros integer not null default 0 check (pomodoros >= 0),
  created_at bigint not null check (created_at > 0),
  completed_at bigint,
  updated_at bigint not null
);

create index if not exists sessions_user_start_idx on public.sessions (user_id, start);
create index if not exists todos_user_idx on public.todos (user_id);

alter table public.sessions enable row level security;
alter table public.todos enable row level security;

-- Row Level Security policies: strict isolation by authenticated user ID
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