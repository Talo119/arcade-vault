create table public.scores (
  id         bigint generated always as identity primary key,
  game_id    text not null references public.games (id),
  name       text not null check (name ~ '^[A-Z0-9_ ]{1,10}$' and name = btrim(name)),
  score      integer not null check (score between 0 and 9999999),
  created_at timestamptz not null default now()
);

create index scores_game_rank_idx on public.scores (game_id, score desc, created_at asc);

alter table public.scores enable row level security;
create policy scores_select_public on public.scores
  for select to anon, authenticated using (true);
revoke insert, update, delete on public.scores from anon, authenticated;

-- The only write path for the API roles: validates every argument, then inserts.
create function public.submit_score(p_game_id text, p_name text, p_score integer)
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

revoke execute on function public.submit_score(text, text, integer) from public;
grant execute on function public.submit_score(text, text, integer) to anon, authenticated;
