-- Run this in Supabase SQL Editor once
create table if not exists messages_public (
  id bigserial primary key,
  created_at timestamp with time zone default now(),
  wallet text,
  nickname text,
  text text not null
);

create table if not exists messages_private (
  id bigserial primary key,
  created_at timestamp with time zone default now(),
  from_wallet text not null,
  to_wallet text not null,
  text text not null
);

create table if not exists profiles (
  wallet text primary key,
  nickname text
);

alter publication supabase_realtime add table messages_public, messages_private;

alter table messages_public enable row level security;
alter table messages_private enable row level security;
alter table profiles enable row level security;

create policy "read public" on messages_public for select using (true);
create policy "write public" on messages_public for insert with check (true);

create policy "pm read" on messages_private for select using (true);
create policy "pm write" on messages_private for insert with check (true);

create policy "profiles read" on profiles for select using (true);
create policy "profiles upsert" on profiles for insert with check (true);
create policy "profiles update" on profiles for update using (true);
