-- Run this in Supabase SQL editor.
-- Enables per-user data access via RLS.

create extension if not exists "uuid-ossp";

-- Favorites (stores full recipe JSON for simplicity)
create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null,
  recipe_title text not null,
  recipe jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists favorites_user_id_idx on public.favorites(user_id);

-- Pantry
create table if not exists public.pantry_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity text not null default '',
  category text not null default 'other',
  expiry_date date null,
  created_at timestamptz not null default now()
);

create index if not exists pantry_items_user_id_idx on public.pantry_items(user_id);

-- Shopping list
create table if not exists public.shopping_list_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount text not null default '',
  is_bought boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists shopping_list_user_id_idx on public.shopping_list_items(user_id);

-- Meal plan
create table if not exists public.meal_plan_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null,
  recipe_title text not null,
  date date not null,
  meal_type text not null,
  calories integer null,
  macros jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists meal_plan_user_id_idx on public.meal_plan_entries(user_id);
create index if not exists meal_plan_date_idx on public.meal_plan_entries(date);

-- RLS
alter table public.favorites enable row level security;
alter table public.pantry_items enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.meal_plan_entries enable row level security;

-- Policies: only owner can CRUD their rows
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);
drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);
drop policy if exists "favorites_update_own" on public.favorites;
create policy "favorites_update_own" on public.favorites
  for update using (auth.uid() = user_id);
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);

drop policy if exists "pantry_select_own" on public.pantry_items;
create policy "pantry_select_own" on public.pantry_items
  for select using (auth.uid() = user_id);
drop policy if exists "pantry_insert_own" on public.pantry_items;
create policy "pantry_insert_own" on public.pantry_items
  for insert with check (auth.uid() = user_id);
drop policy if exists "pantry_update_own" on public.pantry_items;
create policy "pantry_update_own" on public.pantry_items
  for update using (auth.uid() = user_id);
drop policy if exists "pantry_delete_own" on public.pantry_items;
create policy "pantry_delete_own" on public.pantry_items
  for delete using (auth.uid() = user_id);

drop policy if exists "shopping_select_own" on public.shopping_list_items;
create policy "shopping_select_own" on public.shopping_list_items
  for select using (auth.uid() = user_id);
drop policy if exists "shopping_insert_own" on public.shopping_list_items;
create policy "shopping_insert_own" on public.shopping_list_items
  for insert with check (auth.uid() = user_id);
drop policy if exists "shopping_update_own" on public.shopping_list_items;
create policy "shopping_update_own" on public.shopping_list_items
  for update using (auth.uid() = user_id);
drop policy if exists "shopping_delete_own" on public.shopping_list_items;
create policy "shopping_delete_own" on public.shopping_list_items
  for delete using (auth.uid() = user_id);

drop policy if exists "meal_select_own" on public.meal_plan_entries;
create policy "meal_select_own" on public.meal_plan_entries
  for select using (auth.uid() = user_id);
drop policy if exists "meal_insert_own" on public.meal_plan_entries;
create policy "meal_insert_own" on public.meal_plan_entries
  for insert with check (auth.uid() = user_id);
drop policy if exists "meal_update_own" on public.meal_plan_entries;
create policy "meal_update_own" on public.meal_plan_entries
  for update using (auth.uid() = user_id);
drop policy if exists "meal_delete_own" on public.meal_plan_entries;
create policy "meal_delete_own" on public.meal_plan_entries
  for delete using (auth.uid() = user_id);

