create table public.games (
  id         text primary key,
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover      text not null,
  color      text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  best       integer not null,
  plays      text not null,
  sort_order integer not null unique
);

alter table public.games enable row level security;
create policy games_select_public on public.games
  for select to anon, authenticated using (true);
revoke insert, update, delete on public.games from anon, authenticated;

insert into public.games (id, title, short, long, cat, cover, color, best, plays, sort_order) values
  (
    'bloque-buster',
    'BLOQUE BUSTER',
    'Rebota la pelota y destruye muros de neón.',
    'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?',
    'ARCADE', 'cover-bricks', 'cyan', 28450, '12.4K', 1
  ),
  (
    'caida',
    'CAÍDA',
    'Encaja las piezas antes de que el techo te aplaste.',
    'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
    'PUZZLE', 'cover-tetro', 'magenta', 184220, '31.8K', 2
  ),
  (
    'serpentina',
    'SERPENTINA',
    'Crece sin morder tu propia cola.',
    'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.',
    'ARCADE', 'cover-snake', 'green', 7820, '9.1K', 3
  ),
  (
    'gloton',
    'GLOTÓN',
    'Devora puntos y escapa de los fantasmas.',
    'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.',
    'ARCADE', 'cover-glot', 'yellow', 96400, '27.2K', 4
  ),
  (
    'invasores',
    'INVASORES',
    'Defiende el planeta de filas alienígenas.',
    'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.',
    'SHOOTER', 'cover-invaders', 'green', 54190, '18.0K', 5
  ),
  (
    'asteroids',
    'ASTEROIDS',
    'Pulveriza asteroides en gravedad cero.',
    'Tu nave triangular flota en el vacío absoluto. Rota, propúlsate y dispara para partir cada roca en fragmentos más pequeños. Atrapa el power-up 3x para disparar en abanico durante 5 segundos.',
    'SHOOTER', 'cover-asteroids', 'yellow', 41200, '15.6K', 6
  ),
  (
    'ranaria',
    'RANARIA',
    'Cruza la autopista de pixeles.',
    'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo.',
    'ARCADE', 'cover-rana', 'green', 18900, '6.4K', 7
  ),
  (
    'duelo-pixel',
    'DUELO PIXEL',
    'Dos paletas. Una pelota. Reflejos máximos.',
    'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.',
    'VERSUS', 'cover-duelo', 'cyan', 24, '4.2K', 8
  );
