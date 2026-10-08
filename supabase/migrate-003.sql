-- 003 — AI reflections ("Looking back" notes). Run once in the Supabase SQL Editor.
create table if not exists reflections (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('week','month')),
  period_start  date not null,
  text          text not null,
  model         text not null,
  created_at    timestamptz not null default now(),
  unique (kind, period_start)
);
alter table reflections enable row level security;
