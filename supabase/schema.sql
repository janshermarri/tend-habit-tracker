-- Tend — single-tenant schema.
-- No user_id / RLS: all access goes through Server Actions using the secret key,
-- and the browser never talks to Supabase directly. Deployment Protection is the
-- outer gate; the PIN is the inner one.

create extension if not exists "pgcrypto";

create table if not exists habits (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  target      int  not null check (target > 0),
  period      text not null check (period in ('week','month')),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists activities (
  id        uuid primary key default gen_random_uuid(),
  habit_id  uuid not null references habits(id) on delete cascade,
  name      text not null
);

create table if not exists logs (
  id           uuid primary key default gen_random_uuid(),
  habit_id     uuid not null references habits(id) on delete cascade,
  -- Keep the log if its activity is renamed away; the note still matters.
  activity_id  uuid references activities(id) on delete set null,
  note         text,
  logged_at    timestamptz not null default now()
);

create table if not exists objectives (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  timeframe_months int  not null check (timeframe_months in (1,3,6)),
  start_date       date not null,
  end_date         date not null,
  created_at       timestamptz not null default now()
);

create table if not exists key_results (
  id             uuid primary key default gen_random_uuid(),
  objective_id   uuid not null references objectives(id) on delete cascade,
  type           text not null check (type in ('milestone','number','habit')),
  title          text not null,
  sort_order     int  not null default 0,
  done           boolean,
  current_value  numeric,
  target_value   numeric,
  unit           text,
  habit_id       uuid references habits(id) on delete set null,
  target_periods int,
  -- Each KR type owns a disjoint set of columns; keep the rows honest.
  constraint key_results_shape check (
    case type
      when 'milestone' then done is not null
      when 'number'    then current_value is not null and target_value is not null
      when 'habit'     then target_periods is not null
    end
  )
);

-- Indexes cover the access patterns in lib/progress.ts: logs are always read by
-- habit and date range; children are always read by parent.
create index if not exists logs_habit_id_logged_at_idx on logs (habit_id, logged_at desc);
create index if not exists logs_logged_at_idx          on logs (logged_at desc);
create index if not exists activities_habit_id_idx     on activities (habit_id);
create index if not exists key_results_objective_id_idx on key_results (objective_id);
create index if not exists key_results_habit_id_idx    on key_results (habit_id);
create index if not exists habits_sort_order_idx       on habits (sort_order);

-- Defence in depth: RLS on with no policies means even a leaked publishable key
-- reads nothing. The secret key bypasses RLS, so Server Actions are unaffected.
alter table habits      enable row level security;
alter table activities  enable row level security;
alter table logs        enable row level security;
alter table objectives  enable row level security;
alter table key_results enable row level security;
