create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.account_handles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z][a-z0-9_]{5,23}$'),
  internal_email text not null unique,
  recovery_code_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table private.auth_rate_limits (
  key_hash text primary key,
  attempts integer not null default 1,
  window_started_at timestamptz not null default now()
);

revoke all on all tables in schema private from public, anon, authenticated;
grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;

create type public.app_kind as enum ('yacheck', 'macheck');
create type public.medication_status as enum ('active', 'stopped');
create type public.link_status as enum ('active', 'revoked');
create type public.interaction_severity as enum ('moderate', 'severe');

create table public.app_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'patient' check (role in ('patient', 'caregiver')),
  diseases text[] not null default '{}',
  allergies jsonb not null default '[]'::jsonb,
  other_diseases text,
  other_allergies text,
  font_scale text not null default 'normal',
  sound_enabled boolean not null default true,
  source_app public.app_kind not null default 'yacheck',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.medications (
  code text primary key,
  name_en text not null,
  name_th text not null,
  category text not null,
  common_dosages_mg numeric[] not null default '{}',
  description_th text not null default '',
  active boolean not null default true,
  dataset_version integer not null default 1,
  reviewed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drug_interactions (
  id bigint generated always as identity primary key,
  drug_1 text not null references public.medications(code),
  drug_2 text not null references public.medications(code),
  severity public.interaction_severity not null,
  title_th text not null,
  description_th text not null,
  advice_th text not null,
  dataset_version integer not null default 1,
  reviewed_at date,
  unique (drug_1, drug_2),
  check (drug_1 < drug_2)
);

create table public.food_interactions (
  code text primary key,
  food_th text not null,
  keywords text[] not null default '{}',
  medicine_codes text[] not null default '{}',
  disease_codes text[] not null default '{}',
  severity public.interaction_severity not null,
  description_th text not null,
  dataset_version integer not null default 1,
  reviewed_at date
);

create table public.patient_medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  medication_code text references public.medications(code),
  custom_name text,
  dosage text,
  schedule jsonb not null default '[]'::jsonb,
  meal_timing text,
  status public.medication_status not null default 'active',
  source_app public.app_kind not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, client_id),
  check (medication_code is not null or nullif(trim(custom_name), '') is not null)
);

create table public.dose_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_event_id text not null,
  patient_medication_client_id text not null,
  slot text not null,
  event_date date not null,
  taken boolean not null,
  occurred_at timestamptz not null default now(),
  source_app public.app_kind not null,
  unique (user_id, client_event_id)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  text text not null check (char_length(text) <= 1000),
  occurred_at timestamptz not null,
  source_app public.app_kind not null,
  unique (user_id, client_id)
);

create table public.caregiver_links (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  caregiver_user_id uuid not null references auth.users(id) on delete cascade,
  status public.link_status not null default 'active',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (patient_user_id, caregiver_user_id),
  check (patient_user_id <> caregiver_user_id)
);

create table public.caregiver_nudges (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  caregiver_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  text text not null check (char_length(text) <= 300),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index patient_medications_user_updated_idx on public.patient_medications(user_id, updated_at desc);
create index dose_events_user_date_idx on public.dose_events(user_id, event_date desc);
create index activity_logs_user_time_idx on public.activity_logs(user_id, occurred_at desc);
create index caregiver_links_caregiver_idx on public.caregiver_links(caregiver_user_id) where status = 'active';

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger app_profiles_updated before update on public.app_profiles
for each row execute function public.set_updated_at();
create trigger patient_medications_updated before update on public.patient_medications
for each row execute function public.set_updated_at();
create trigger medications_updated before update on public.medications
for each row execute function public.set_updated_at();

alter table public.app_profiles enable row level security;
alter table public.medications enable row level security;
alter table public.drug_interactions enable row level security;
alter table public.food_interactions enable row level security;
alter table public.patient_medications enable row level security;
alter table public.dose_events enable row level security;
alter table public.activity_logs enable row level security;
alter table public.caregiver_links enable row level security;
alter table public.caregiver_nudges enable row level security;

create policy "clinical medications are authenticated read only" on public.medications for select to authenticated using (active);
create policy "clinical drug interactions are authenticated read only" on public.drug_interactions for select to authenticated using (true);
create policy "clinical food interactions are authenticated read only" on public.food_interactions for select to authenticated using (true);

create policy "profiles own read" on public.app_profiles for select to authenticated
using (user_id = auth.uid() or exists (select 1 from public.caregiver_links l where l.patient_user_id = app_profiles.user_id and l.caregiver_user_id = auth.uid() and l.status = 'active'));
create policy "profiles own insert" on public.app_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles own update" on public.app_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles own delete" on public.app_profiles for delete to authenticated using (user_id = auth.uid());

create policy "medications owner or caregiver read" on public.patient_medications for select to authenticated
using (user_id = auth.uid() or exists (select 1 from public.caregiver_links l where l.patient_user_id = patient_medications.user_id and l.caregiver_user_id = auth.uid() and l.status = 'active'));
create policy "medications own insert" on public.patient_medications for insert to authenticated with check (user_id = auth.uid());
create policy "medications own update" on public.patient_medications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "medications own delete" on public.patient_medications for delete to authenticated using (user_id = auth.uid());

create policy "dose events owner or caregiver read" on public.dose_events for select to authenticated
using (user_id = auth.uid() or exists (select 1 from public.caregiver_links l where l.patient_user_id = dose_events.user_id and l.caregiver_user_id = auth.uid() and l.status = 'active'));
create policy "dose events own insert" on public.dose_events for insert to authenticated with check (user_id = auth.uid());
create policy "dose events own update" on public.dose_events for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dose events own delete" on public.dose_events for delete to authenticated using (user_id = auth.uid());

create policy "activity owner or caregiver read" on public.activity_logs for select to authenticated
using (user_id = auth.uid() or exists (select 1 from public.caregiver_links l where l.patient_user_id = activity_logs.user_id and l.caregiver_user_id = auth.uid() and l.status = 'active'));
create policy "activity own insert" on public.activity_logs for insert to authenticated with check (user_id = auth.uid());
create policy "activity own update" on public.activity_logs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "activity own delete" on public.activity_logs for delete to authenticated using (user_id = auth.uid());

create policy "links participants read" on public.caregiver_links for select to authenticated
using (patient_user_id = auth.uid() or caregiver_user_id = auth.uid());
create policy "links patient creates" on public.caregiver_links for insert to authenticated with check (patient_user_id = auth.uid());
create policy "links patient updates" on public.caregiver_links for update to authenticated using (patient_user_id = auth.uid()) with check (patient_user_id = auth.uid());

create policy "nudges participants read" on public.caregiver_nudges for select to authenticated
using (patient_user_id = auth.uid() or caregiver_user_id = auth.uid());
create policy "caregiver sends linked nudge" on public.caregiver_nudges for insert to authenticated
with check (caregiver_user_id = auth.uid() and exists (select 1 from public.caregiver_links l where l.patient_user_id = caregiver_nudges.patient_user_id and l.caregiver_user_id = auth.uid() and l.status = 'active'));
create policy "patient marks nudge read" on public.caregiver_nudges for update to authenticated
using (patient_user_id = auth.uid()) with check (patient_user_id = auth.uid());

revoke all on function public.set_updated_at() from public;

