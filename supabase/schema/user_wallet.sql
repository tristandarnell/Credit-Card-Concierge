create extension if not exists pgcrypto;

create table if not exists public.user_wallet_cards (
  wallet_entry_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  card_name text not null,
  issuer text not null,
  card_segment text not null check (card_segment in ('personal', 'business')),
  network text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create index if not exists idx_user_wallet_cards_user_id on public.user_wallet_cards (user_id);
create index if not exists idx_user_wallet_cards_card_id on public.user_wallet_cards (card_id);

create or replace function public.set_updated_at_user_wallet_cards()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_updated_at_user_wallet_cards on public.user_wallet_cards;
create trigger trg_set_updated_at_user_wallet_cards
before update on public.user_wallet_cards
for each row execute function public.set_updated_at_user_wallet_cards();

alter table public.user_wallet_cards enable row level security;

drop policy if exists user_wallet_cards_select_own on public.user_wallet_cards;
create policy user_wallet_cards_select_own
on public.user_wallet_cards
for select
using (auth.uid() = user_id);

drop policy if exists user_wallet_cards_insert_own on public.user_wallet_cards;
create policy user_wallet_cards_insert_own
on public.user_wallet_cards
for insert
with check (auth.uid() = user_id);

drop policy if exists user_wallet_cards_update_own on public.user_wallet_cards;
create policy user_wallet_cards_update_own
on public.user_wallet_cards
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_wallet_cards_delete_own on public.user_wallet_cards;
create policy user_wallet_cards_delete_own
on public.user_wallet_cards
for delete
using (auth.uid() = user_id);
