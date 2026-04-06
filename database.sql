-- 1. Create table for Rooms
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create table for Players
create table public.players (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  name text not null,
  is_host boolean default false not null,
  role text, -- 'impostor' or 'crewmate'
  is_alive boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS and setup permissive policies for easy access
alter table public.rooms enable row level security;
alter table public.players enable row level security;

create policy "Enable all access for anonymous on rooms"
on public.rooms for all to anon using (true) with check (true);

create policy "Enable all access for anonymous on players"
on public.players for all to anon using (true) with check (true);

-- 4. Enable Realtime on tables
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
