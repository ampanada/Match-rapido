create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  whatsapp text,
  wins int not null default 0,
  losses int not null default 0,
  total_matches int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  start_at timestamptz not null,
  court_no int check (court_no between 1 and 6),
  format text not null check (format in ('single', 'double', 'mixed_double', 'men_double', 'women_double', 'rally')),
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  needed int not null check (needed >= 1 and needed <= 8),
  note text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.joins (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  player_a uuid not null references public.profiles(id),
  player_b uuid not null references public.profiles(id),
  winner_id uuid not null references public.profiles(id),
  score text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  submitted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (post_id),
  check (winner_id = player_a or winner_id = player_b),
  check (score ~ '^(6-[0-4]|7-[5-6])$')
);

create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('new_post', 'match_result', 'cancel_join', 'streak')),
  user_id uuid not null references public.profiles(id),
  related_post_id uuid references public.posts(id) on delete set null,
  related_match_id uuid references public.match_results(id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'date_time'
  ) then
    execute 'alter table public.posts add column if not exists start_at timestamptz';
    execute 'update public.posts set start_at = date_time where start_at is null';
    execute 'alter table public.posts alter column start_at set not null';
    execute 'alter table public.posts drop column if exists date_time';
  end if;
end $$;

alter table public.posts add column if not exists court_no int;
alter table public.posts drop constraint if exists posts_format_check;
alter table public.posts
  add constraint posts_format_check
  check (format in ('single', 'double', 'mixed_double', 'men_double', 'women_double', 'rally'));
alter table public.posts drop constraint if exists posts_court_no_check;
alter table public.posts add constraint posts_court_no_check check (court_no is null or (court_no between 1 and 6));
alter table public.joins add column if not exists status text not null default 'pending';
update public.joins set status = 'approved' where status is null;
alter table public.joins drop constraint if exists joins_status_check;
alter table public.joins add constraint joins_status_check check (status in ('pending', 'approved'));
alter table public.profiles add column if not exists wins int not null default 0;
alter table public.profiles add column if not exists losses int not null default 0;
alter table public.profiles add column if not exists total_matches int not null default 0;
alter table public.profiles add column if not exists current_streak int not null default 0;
alter table public.profiles add column if not exists best_streak int not null default 0;
alter table public.match_results add column if not exists submitted_by uuid references public.profiles(id);
update public.match_results set submitted_by = player_a where submitted_by is null;
alter table public.match_results alter column submitted_by set not null;
alter table public.match_results drop constraint if exists match_results_score_check;
alter table public.match_results add constraint match_results_score_check check (score ~ '^(6-[0-4]|7-[5-6])$');
alter table public.match_results drop constraint if exists match_results_winner_check;
alter table public.match_results add constraint match_results_winner_check check (winner_id = player_a or winner_id = player_b);

create or replace function public.is_valid_slot_start(ts timestamptz)
returns boolean
language sql
stable
as $$
  select to_char(ts at time zone 'America/Argentina/Cordoba', 'HH24:MI') in
    ('09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00');
$$;

alter table public.posts drop constraint if exists posts_slot_start_check;
alter table public.posts
  add constraint posts_slot_start_check check (public.is_valid_slot_start(start_at));

create unique index if not exists uq_posts_host_start_at on public.posts(host_id, start_at);
create index if not exists idx_posts_start_at on public.posts(start_at);
create index if not exists idx_posts_status_start_at on public.posts(status, start_at);
create index if not exists idx_posts_host_id on public.posts(host_id);
create index if not exists idx_joins_post_id on public.joins(post_id);
create index if not exists idx_joins_user_id on public.joins(user_id);
create index if not exists idx_match_results_status_created_at on public.match_results(status, created_at desc);
create index if not exists idx_match_results_player_a on public.match_results(player_a);
create index if not exists idx_match_results_player_b on public.match_results(player_b);
create index if not exists idx_activity_feed_created_at on public.activity_feed(created_at desc);
create index if not exists idx_activity_feed_type on public.activity_feed(type);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.joins enable row level security;
alter table public.match_results enable row level security;
alter table public.activity_feed enable row level security;

drop policy if exists "profiles are readable by anyone" on public.profiles;
create policy "profiles are readable by anyone"
on public.profiles for select
using (true);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "posts readable by anyone" on public.posts;
create policy "posts readable by anyone"
on public.posts for select
using (true);

drop policy if exists "authenticated can create post" on public.posts;
create policy "authenticated can create post"
on public.posts for insert
to authenticated
with check (auth.uid() = host_id);

drop policy if exists "host can update own post" on public.posts;
create policy "host can update own post"
on public.posts for update
to authenticated
using (auth.uid() = host_id)
with check (auth.uid() = host_id);

drop policy if exists "joins readable by anyone" on public.joins;
create policy "joins readable by anyone"
on public.joins for select
using (true);

drop policy if exists "authenticated can join as self" on public.joins;
create policy "authenticated can join as self"
on public.joins for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "host can approve joins on own post" on public.joins;
create policy "host can approve joins on own post"
on public.joins for update
to authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = joins.post_id and p.host_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.posts p
    where p.id = joins.post_id and p.host_id = auth.uid()
  )
);

drop policy if exists "joined user can cancel own join" on public.joins;
create policy "joined user can cancel own join"
on public.joins for delete
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists "confirmed results are public" on public.match_results;
create policy "confirmed results are public"
on public.match_results for select
using (
  status = 'confirmed'
  or auth.uid() in (player_a, player_b)
);

drop policy if exists "players can insert pending result" on public.match_results;
create policy "players can insert pending result"
on public.match_results for insert
to authenticated
with check (
  auth.uid() = submitted_by
  and auth.uid() in (player_a, player_b)
  and status = 'pending'
);

drop policy if exists "players can update pending result" on public.match_results;
create policy "players can update pending result"
on public.match_results for update
to authenticated
using (
  auth.uid() in (player_a, player_b)
  and status = 'pending'
)
with check (
  (
    status = 'cancelled'
    and auth.uid() in (player_a, player_b)
  )
  or
  (
    status = 'confirmed'
    and auth.uid() in (player_a, player_b)
    and auth.uid() <> submitted_by
  )
);

drop policy if exists "activity feed is readable by anyone" on public.activity_feed;
create policy "activity feed is readable by anyone"
on public.activity_feed for select
using (true);

drop policy if exists "authenticated can insert activity feed" on public.activity_feed;
create policy "authenticated can insert activity feed"
on public.activity_feed for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.validate_match_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_format text;
  approved_join_count int;
  host_user uuid;
  approved_user uuid;
begin
  select p.format, p.host_id into post_format, host_user
  from public.posts p
  where p.id = new.post_id;

  if post_format is distinct from 'single' then
    raise exception 'match_results only allowed for single format';
  end if;

  select count(*)
  into approved_join_count
  from public.joins j
  where j.post_id = new.post_id
    and j.status = 'approved';

  if approved_join_count <> 1 then
    raise exception 'single result requires exactly 1 approved join';
  end if;

  select j.user_id into approved_user
  from public.joins j
  where j.post_id = new.post_id and j.status = 'approved'
  limit 1;

  if not (
    (new.player_a = host_user and new.player_b = approved_user)
    or
    (new.player_a = approved_user and new.player_b = host_user)
  ) then
    raise exception 'players must match host and approved participant';
  end if;

  if new.submitted_by not in (new.player_a, new.player_b) then
    raise exception 'submitted_by must be one of players';
  end if;

  if tg_op = 'UPDATE' and old.status <> 'pending' then
    raise exception 'result can only transition from pending';
  end if;

  if tg_op = 'UPDATE' and old.status = 'pending' and new.status not in ('confirmed', 'cancelled', 'pending') then
    raise exception 'invalid status transition';
  end if;

  if tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'confirmed' and new.confirmed_at is null then
    new.confirmed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_match_result on public.match_results;
create trigger trg_validate_match_result
before insert or update on public.match_results
for each row execute procedure public.validate_match_result();

create or replace function public.apply_match_result_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  loser_id uuid;
begin
  if old.status = 'confirmed' or new.status <> 'confirmed' then
    return new;
  end if;

  if new.winner_id = new.player_a then
    loser_id := new.player_b;
  else
    loser_id := new.player_a;
  end if;

  update public.profiles p
  set
    wins = p.wins + 1,
    total_matches = p.total_matches + 1,
    current_streak = p.current_streak + 1,
    best_streak = greatest(p.best_streak, p.current_streak + 1)
  where p.id = new.winner_id;

  update public.profiles p
  set
    losses = p.losses + 1,
    total_matches = p.total_matches + 1,
    current_streak = 0
  where p.id = loser_id;

  return new;
end;
$$;

drop trigger if exists trg_apply_match_result_stats on public.match_results;
create trigger trg_apply_match_result_stats
after update on public.match_results
for each row execute procedure public.apply_match_result_stats();

create or replace function public.log_feed_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  begin
    select coalesce(p.display_name, 'Jugador')
      into actor_name
    from public.profiles p
    where p.id = new.host_id;

    insert into public.activity_feed(type, user_id, related_post_id, message)
    values (
      'new_post',
      new.host_id,
      new.id,
      actor_name || ' publico un partido'
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_log_feed_new_post on public.posts;
create trigger trg_log_feed_new_post
after insert on public.posts
for each row execute procedure public.log_feed_new_post();

create or replace function public.log_feed_cancel_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  begin
    select coalesce(p.display_name, 'Jugador')
      into actor_name
    from public.profiles p
    where p.id = old.user_id;

    insert into public.activity_feed(type, user_id, related_post_id, message)
    values (
      'cancel_join',
      old.user_id,
      old.post_id,
      actor_name || ' cancelo participacion'
    );
  exception when others then
    null;
  end;

  return old;
end;
$$;

drop trigger if exists trg_log_feed_cancel_join on public.joins;
create trigger trg_log_feed_cancel_join
after delete on public.joins
for each row execute procedure public.log_feed_cancel_join();

create or replace function public.log_feed_match_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  winner_name text;
begin
  if old.status = 'confirmed' or new.status <> 'confirmed' then
    return new;
  end if;

  begin
    select coalesce(p.display_name, 'Jugador')
      into winner_name
    from public.profiles p
    where p.id = new.winner_id;

    insert into public.activity_feed(type, user_id, related_post_id, related_match_id, message)
    values (
      'match_result',
      new.winner_id,
      new.post_id,
      new.id,
      winner_name || ' gano ' || new.score
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_log_feed_match_result on public.match_results;
create trigger trg_log_feed_match_result
after update on public.match_results
for each row execute procedure public.log_feed_match_result();

create or replace function public.log_feed_streak()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if new.current_streak < 3 then
    return new;
  end if;

  if old.current_streak >= 3 then
    return new;
  end if;

  begin
    actor_name := coalesce(new.display_name, 'Jugador');

    insert into public.activity_feed(type, user_id, message)
    values (
      'streak',
      new.id,
      actor_name || ' tiene racha de ' || new.current_streak
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_log_feed_streak on public.profiles;
create trigger trg_log_feed_streak
after update of current_streak on public.profiles
for each row execute procedure public.log_feed_streak();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
