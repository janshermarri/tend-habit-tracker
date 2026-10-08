-- 004 — per-habit and per-goal "Looking back" notes. Run once in the Supabase SQL Editor.
-- subject: '' = everything, 'habit:<id>' or 'objective:<id>' = one thing, for that month.
alter table reflections add column if not exists subject text not null default '';
alter table reflections drop constraint if exists reflections_kind_period_start_key;
alter table reflections add constraint reflections_kind_subject_period_start_key unique (kind, subject, period_start);
