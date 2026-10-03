create index if not exists idx_exchange_legs_offer on public.exchange_legs(offer_id);
create index if not exists idx_exchange_legs_need on public.exchange_legs(need_id);
create index if not exists idx_exchange_legs_receiver on public.exchange_legs(receiver_id);
create index if not exists idx_exchange_legs_skill on public.exchange_legs(skill_id);
create index if not exists idx_sessions_exchange_leg_only on public.sessions(exchange_leg_id);
