-- Newer Supabase projects don't auto-grant table privileges to the API roles.
-- RLS policies (0001) still decide which rows each user can touch.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
-- Server-only tables: no direct access for signed-in users even if a policy is added by mistake.
revoke all on connected_account_secrets, audit_logs from anon, authenticated;
