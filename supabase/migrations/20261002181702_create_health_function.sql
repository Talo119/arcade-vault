create or replace function public.health()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$ select now() $$;

grant execute on function public.health() to anon, authenticated;
