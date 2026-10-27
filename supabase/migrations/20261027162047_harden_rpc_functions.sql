-- Funciones SECURITY DEFINER fuera de la API expuesta (advisor 0028 / 0029).

create schema if not exists private;
revoke all on schema private from public;
-- public.submit_score es SECURITY INVOKER: quien la llama necesita llegar a private.
grant usage on schema private to anon, authenticated;

-- Mismo cuerpo que la public.submit_score del SPEC 06.
create function private.submit_score(p_game_id text, p_name text, p_score integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not exists (select 1 from public.games where id = p_game_id) then
    raise exception 'submit_score: juego desconocido %', p_game_id
      using errcode = '22023';
  end if;

  -- No trimming here: the client sends the name already trimmed.
  if p_name is null
     or p_name !~ '^[A-Z0-9_ ]{1,10}$'
     or p_name <> btrim(p_name) then
    raise exception 'submit_score: nombre no válido'
      using errcode = '22023';
  end if;

  if p_score is null or p_score < 0 or p_score > 9999999 then
    raise exception 'submit_score: puntuación fuera de rango'
      using errcode = '22023';
  end if;

  insert into public.scores (game_id, name, score)
  values (p_game_id, p_name, p_score)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function private.submit_score(text, text, integer) from public;
grant execute on function private.submit_score(text, text, integer) to anon, authenticated;

-- La API sigue llamando a public.submit_score; ahora solo delega.
create or replace function public.submit_score(p_game_id text, p_name text, p_score integer)
returns bigint
language sql
security invoker
set search_path = ''
as $$ select private.submit_score(p_game_id, p_name, p_score) $$;

-- rls_auto_enable() la crea el panel (event trigger ensure_rls), no una migración:
-- solo se revoca si existe. El event trigger no necesita EXECUTE para dispararse.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
