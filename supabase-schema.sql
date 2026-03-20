-- ─────────────────────────────────────────────────────────────────────────────
-- Somehow I Managed — Supabase contacts table
-- ─────────────────────────────────────────────────────────────────────────────
-- HOW TO RUN:
--   1. Go to app.supabase.com → your project → SQL Editor → New query
--   2. Paste this entire file and click Run
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists contacts (
  id                  uuid        default gen_random_uuid() primary key,
  name                text        not null,
  email               text        not null,
  created_at          timestamptz default now() not null,
  welcome_email_sent  boolean     default false not null,
  source              text,         -- referring URL or 'direct'
  country             text          -- auto-filled by Netlify geo header
);

-- Unique email constraint (prevents duplicate rows)
alter table contacts
  add constraint contacts_email_key unique (email);

-- Fast lookup by email (used for deduplication check)
create index if not exists contacts_email_idx      on contacts (email);

-- Fast queries sorted by signup date (used for insights)
create index if not exists contacts_created_at_idx on contacts (created_at);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Locks down direct client access.
-- Your Netlify function uses SUPABASE_SERVICE_KEY which bypasses RLS,
-- so it can always read and write. No one else can.
alter table contacts enable row level security;

-- ── Useful queries for insights ───────────────────────────────────────────────
-- Total signups:
--   select count(*) from contacts;
--
-- Signups per day (last 30 days):
--   select date_trunc('day', created_at) as day, count(*)
--   from contacts
--   where created_at > now() - interval '30 days'
--   group by day order by day;
--
-- Signups by country:
--   select country, count(*) from contacts group by country order by count desc;
--
-- Signups by source:
--   select source, count(*) from contacts group by source order by count desc;
