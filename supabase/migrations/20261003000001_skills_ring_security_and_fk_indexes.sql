-- Keep the seeded raw snapshot private until Supabase Auth ownership mapping
-- exists, while making the private-by-default intent explicit to advisors.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'categories', 'users', 'skills', 'skill_values', 'time_slots', 'offers', 'needs',
    'offer_availability', 'need_availability', 'exchange_preferences', 'system_config',
    'reliability_history', 'matches', 'recommendation_rankings', 'recommendation_events',
    'exchanges', 'exchange_matches', 'exchange_participants', 'commitments', 'sessions',
    'contributions', 'evaluations', 'disputes', 'withdrawals'
  ] loop
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (false) with check (false)',
      'deny_' || table_name || '_until_auth_mapping', table_name
    );
  end loop;
end
$$;

-- Cover each foreign-key access path used by lifecycle, matching, and trust
-- queries. Existing primary-key and composite indexes are retained.
create index if not exists idx_exchange_preferences_skill on public.exchange_preferences(skill_id);
create index if not exists idx_matches_user_b on public.matches(user_b);
create index if not exists idx_matches_user_c on public.matches(user_c);
create index if not exists idx_matches_offer_a on public.matches(offer_id_a);
create index if not exists idx_matches_offer_b on public.matches(offer_id_b);
create index if not exists idx_matches_offer_c on public.matches(offer_id_c);
create index if not exists idx_matches_need_a on public.matches(need_id_a);
create index if not exists idx_matches_need_b on public.matches(need_id_b);
create index if not exists idx_matches_need_c on public.matches(need_id_c);
create index if not exists idx_recommendation_events_match on public.recommendation_events(match_id);
create index if not exists idx_recommendation_events_user on public.recommendation_events(user_id);
create index if not exists idx_exchange_matches_match on public.exchange_matches(match_id);
create index if not exists idx_commitments_exchange on public.commitments(exchange_id);
create index if not exists idx_commitments_source_match on public.commitments(source_match_id);
create index if not exists idx_commitments_skill on public.commitments(skill_id);
create index if not exists idx_sessions_commitment on public.sessions(commitment_id);
create index if not exists idx_sessions_provider on public.sessions(provider_id);
create index if not exists idx_sessions_receiver on public.sessions(receiver_id);
create index if not exists idx_contributions_session on public.contributions(session_id);
create index if not exists idx_contributions_commitment on public.contributions(commitment_id);
create index if not exists idx_contributions_exchange on public.contributions(exchange_id);
create index if not exists idx_contributions_receiver on public.contributions(receiver_id);
create index if not exists idx_contributions_skill on public.contributions(skill_id);
create index if not exists idx_evaluations_session on public.evaluations(session_id);
create index if not exists idx_evaluations_evaluator on public.evaluations(evaluator_id);
create index if not exists idx_evaluations_evaluatee on public.evaluations(evaluatee_id);
create index if not exists idx_disputes_exchange on public.disputes(exchange_id);
create index if not exists idx_disputes_session on public.disputes(session_id);
create index if not exists idx_disputes_reporter on public.disputes(reporter_id);
create index if not exists idx_disputes_respondent on public.disputes(respondent_id);
create index if not exists idx_withdrawals_exchange on public.withdrawals(exchange_id);
create index if not exists idx_withdrawals_user on public.withdrawals(user_id);
