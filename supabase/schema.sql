-- Supabase schema for Pomodoro cloud sync.
-- Run this in the Supabase SQL editor. Enable GitHub auth in Authentication > Providers first.

create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  start bigint not null,
  "end" bigint not null,
  duration_ms bigint not null,
  task text not null,
  tag text not null,
  notes text
);

create table if not exists public.todos (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  tag text not null,
  done boolean not null default false,
  pomodoros integer not null default 0,
  created_at bigint not null,
  completed_at bigint,
  updated_at bigint not null
);

create index if not exists sessions_user_start_idx on public.sessions (user_id, start);
create index if not exists todos_user_idx on public.todos (user_id);

alter table public.sessions enable row level security;
alter table public.todos enable row level security;

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