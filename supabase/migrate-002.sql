-- 002 — goal areas and hub-filled key results. Run once in the Supabase SQL Editor.
alter table objectives  add column if not exists area text not null default 'self' check (area in ('career','money','self'));
alter table key_results add column if not exists source text;
