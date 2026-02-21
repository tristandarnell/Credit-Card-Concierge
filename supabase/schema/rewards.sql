create table if not exists public.credit_card_rewards (
  id text primary key,
  issuer text not null,
  card_name text not null,
  network text,
  card_segment text not null check (card_segment in ('personal', 'business')),
  popularity_rank integer,
  country text not null,
  card_url text not null,
  last_fetched_at timestamptz,
  annual_fee_text text,
  intro_offer_text text,
  rotating_category_program boolean not null default false,
  rotating_categories jsonb not null default '[]'::jsonb,
  reward_rules jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  confidence_score numeric,
  fetch_status text not null,
  fetch_error text,
  source_generated_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_credit_card_rewards_segment_rank on public.credit_card_rewards (card_segment, popularity_rank);
create index if not exists idx_credit_card_rewards_fetch_status on public.credit_card_rewards (fetch_status);

create or replace function public.set_updated_at_credit_card_rewards()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_updated_at_credit_card_rewards on public.credit_card_rewards;
create trigger trg_set_updated_at_credit_card_rewards
before update on public.credit_card_rewards
for each row execute function public.set_updated_at_credit_card_rewards();
