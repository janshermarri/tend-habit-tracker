-- Durable PIN attempt limiter.
-- Replaces the in-memory counter, which reset on every cold start and so handed
-- out a fresh allowance each time a serverless instance recycled.

create table if not exists pin_attempts (
  key          text primary key,
  count        int not null default 0,
  window_start timestamptz not null default now()
);

alter table pin_attempts enable row level security;

/**
 * Atomically record an attempt and report whether it is allowed.
 *
 * Counting happens inside one statement so two concurrent unlock requests
 * cannot both read the same pre-increment value and both be let through.
 * Returns the attempt count in the current window and seconds until it resets.
 */
create or replace function register_pin_attempt(
  p_key text,
  p_max int,
  p_window_sec int
)
returns table (allowed boolean, retry_after_sec int)
language plpgsql
as $$
declare
  v_count int;
  v_start timestamptz;
begin
  insert into pin_attempts (key, count, window_start)
    values (p_key, 1, now())
  on conflict (key) do update
    set
      -- Expired window: start a new one. Otherwise increment in place.
      count = case
        when pin_attempts.window_start < now() - make_interval(secs => p_window_sec) then 1
        else pin_attempts.count + 1
      end,
      window_start = case
        when pin_attempts.window_start < now() - make_interval(secs => p_window_sec) then now()
        else pin_attempts.window_start
      end
  returning pin_attempts.count, pin_attempts.window_start into v_count, v_start;

  return query select
    v_count <= p_max,
    greatest(0, ceil(extract(epoch from (v_start + make_interval(secs => p_window_sec)) - now()))::int);
end;
$$;

/** Clear the counter after a successful unlock. */
create or replace function clear_pin_attempts(p_key text)
returns void
language sql
as $$
  delete from pin_attempts where key = p_key;
$$;
