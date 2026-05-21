-- 013 — enable RLS on push_subscriptions.
-- This table is accessed exclusively via the service_role key (server-side),
-- which bypasses RLS. Enabling RLS with no permissive policies blocks any
-- direct anon/authenticated access through PostgREST.

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
