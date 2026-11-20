begin;
create table public.user_information_cards (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game_key text not null check(length(game_key) between 1 and 250),
  game_id text not null check(length(game_id) between 1 and 100),
  game_title text not null check(length(game_title) between 1 and 500),
  card jsonb not null check(jsonb_typeof(card)='object' and jsonb_typeof(card->'title')='string' and length(card::text)<30000),
  created_at timestamptz not null default now()
);
create index user_information_cards_game on public.user_information_cards(user_id,game_key,created_at);
alter table public.user_information_cards enable row level security;
revoke all on public.user_information_cards from anon, authenticated;
grant select,insert on public.user_information_cards to authenticated;
grant all on public.user_information_cards to service_role;
create policy "Read own information cards" on public.user_information_cards for select to authenticated using ((select auth.uid())=user_id);
create policy "Save own information cards" on public.user_information_cards for insert to authenticated with check ((select auth.uid())=user_id);
commit;
