create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  whatsapp text,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  start_at timestamptz not null,
  court_no int check (court_no between 1 and 6),
  format text not null check (format in ('single', 'double', 'rally')),
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
alter table public.posts drop constraint if exists posts_court_no_check;
alter table public.posts add constraint posts_court_no_check check (court_no is null or (court_no between 1 and 6));
alter table public.joins add column if not exists status text not null default 'pending';
update public.joins set status = 'approved' where status is null;
alter table public.joins drop constraint if exists joins_status_check;
alter table public.joins add constraint joins_status_check check (status in ('pending', 'approved'));

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

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.joins enable row level security;

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
