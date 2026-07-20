-- Data API privileges are explicit because "Automatically expose new tables"
-- is disabled on the hosted project. Row-level security remains the final gate.

grant select, insert, update, delete on table public.app_profiles to authenticated;

grant select on table public.medications to authenticated;
grant select on table public.drug_interactions to authenticated;
grant select on table public.food_interactions to authenticated;

grant select, insert, update, delete on table public.patient_medications to authenticated;
grant select, insert, update, delete on table public.dose_events to authenticated;
grant select, insert, update, delete on table public.activity_logs to authenticated;

grant select, insert, update on table public.caregiver_links to authenticated;
grant select, insert, update on table public.caregiver_nudges to authenticated;
