create type public.admin_role as enum ('owner', 'clinical_editor', 'clinical_reviewer', 'auditor');
create type public.clinical_record_status as enum ('draft', 'in_review', 'published', 'archived');

create table public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.clinical_change_log (
  id bigint generated always as identity primary key,
  table_name text not null check (table_name in ('medications', 'drug_interactions', 'food_interactions')),
  record_key text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

alter table public.medications
  add column status public.clinical_record_status not null default 'published',
  add column source_references text[] not null default '{}',
  add column review_notes text not null default '',
  add column reviewed_by uuid references auth.users(id),
  add column published_at timestamptz;

alter table public.drug_interactions
  add column status public.clinical_record_status not null default 'published',
  add column source_references text[] not null default '{}',
  add column review_notes text not null default '',
  add column reviewed_by uuid references auth.users(id),
  add column published_at timestamptz,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

alter table public.food_interactions
  add column status public.clinical_record_status not null default 'published',
  add column source_references text[] not null default '{}',
  add column review_notes text not null default '',
  add column reviewed_by uuid references auth.users(id),
  add column published_at timestamptz,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

update public.medications set published_at = coalesce(updated_at, created_at, now()) where status = 'published';
update public.drug_interactions set published_at = now() where status = 'published';
update public.food_interactions set published_at = now() where status = 'published';

create index medications_status_review_idx on public.medications(status, reviewed_at);
create index drug_interactions_status_review_idx on public.drug_interactions(status, reviewed_at);
create index food_interactions_status_review_idx on public.food_interactions(status, reviewed_at);
create index clinical_change_log_time_idx on public.clinical_change_log(changed_at desc);
create index clinical_change_log_record_idx on public.clinical_change_log(table_name, record_key, changed_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_members
    where user_id = auth.uid() and active
  );
$$;

create or replace function public.has_admin_role(allowed_roles public.admin_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_members
    where user_id = auth.uid() and active and role = any(allowed_roles)
  );
$$;

create or replace function public.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.admin_members
  where user_id = auth.uid() and active;
$$;

create or replace function public.prepare_clinical_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.dataset_version = old.dataset_version + 1;
    if to_jsonb(new) ? 'updated_at' then
      new.updated_at = now();
    end if;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.reviewed_at = coalesce(new.reviewed_at, current_date);
    new.reviewed_by = coalesce(new.reviewed_by, auth.uid());
    new.published_at = now();
  elsif new.status is distinct from 'published' then
    new.published_at = null;
  end if;

  return new;
end;
$$;

create or replace function public.audit_clinical_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb;
  new_row jsonb;
  row_key text;
begin
  old_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_row := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  row_key := coalesce(new_row->>'code', old_row->>'code', new_row->>'id', old_row->>'id', 'unknown');

  insert into public.clinical_change_log(table_name, record_key, action, old_data, new_data, changed_by)
  values (tg_table_name, row_key, tg_op, old_row, new_row, auth.uid());

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger medications_prepare before insert or update on public.medications
for each row execute function public.prepare_clinical_record();
create trigger drug_interactions_prepare before insert or update on public.drug_interactions
for each row execute function public.prepare_clinical_record();
create trigger food_interactions_prepare before insert or update on public.food_interactions
for each row execute function public.prepare_clinical_record();

create trigger medications_audit after insert or update or delete on public.medications
for each row execute function public.audit_clinical_record();
create trigger drug_interactions_audit after insert or update or delete on public.drug_interactions
for each row execute function public.audit_clinical_record();
create trigger food_interactions_audit after insert or update or delete on public.food_interactions
for each row execute function public.audit_clinical_record();

alter table public.admin_members enable row level security;
alter table public.clinical_change_log enable row level security;

drop policy "clinical medications are authenticated read only" on public.medications;
drop policy "clinical drug interactions are authenticated read only" on public.drug_interactions;
drop policy "clinical food interactions are authenticated read only" on public.food_interactions;

create policy "published medications are authenticated read only" on public.medications
for select to authenticated using ((active and status = 'published') or public.is_admin());
create policy "published drug interactions are authenticated read only" on public.drug_interactions
for select to authenticated using (status = 'published' or public.is_admin());
create policy "published food interactions are authenticated read only" on public.food_interactions
for select to authenticated using (status = 'published' or public.is_admin());

create policy "clinical editors insert medications" on public.medications
for insert to authenticated with check (
  public.has_admin_role(array['owner', 'clinical_reviewer']::public.admin_role[])
  or (public.has_admin_role(array['clinical_editor']::public.admin_role[]) and status in ('draft', 'in_review'))
);
create policy "clinical editors update medications" on public.medications
for update to authenticated using (
  public.has_admin_role(array['owner', 'clinical_reviewer']::public.admin_role[])
  or (public.has_admin_role(array['clinical_editor']::public.admin_role[]) and status in ('draft', 'in_review'))
) with check (
  public.has_admin_role(array['owner', 'clinical_reviewer']::public.admin_role[])
  or (public.has_admin_role(array['clinical_editor']::public.admin_role[]) and status in ('draft', 'in_review'))
);
create policy "owners delete medications" on public.medications
for delete to authenticated using (public.has_admin_role(array['owner']::public.admin_role[]));

create policy "clinical editors insert drug interactions" on public.drug_interactions
for insert to authenticated with check (
  public.has_admin_role(array['owner', 'clinical_reviewer']::public.admin_role[])
  or (public.has_admin_role(array['clinical_editor']::public.admin_role[]) and status in ('draft', 'in_review'))
);
create policy "clinical editors update drug interactions" on public.drug_interactions
for update to authenticated using (
  public.has_admin_role(array['owner', 'clinical_reviewer']::public.admin_role[])
  or (public.has_admin_role(array['clinical_editor']::public.admin_role[]) and status in ('draft', 'in_review'))
) with check (
  public.has_admin_role(array['owner', 'clinical_reviewer']::public.admin_role[])
  or (public.has_admin_role(array['clinical_editor']::public.admin_role[]) and status in ('draft', 'in_review'))
);
create policy "owners delete drug interactions" on public.drug_interactions
for delete to authenticated using (public.has_admin_role(array['owner']::public.admin_role[]));

create policy "clinical editors insert food interactions" on public.food_interactions
for insert to authenticated with check (
  public.has_admin_role(array['owner', 'clinical_reviewer']::public.admin_role[])
  or (public.has_admin_role(array['clinical_editor']::public.admin_role[]) and status in ('draft', 'in_review'))
);
create policy "clinical editors update food interactions" on public.food_interactions
for update to authenticated using (
  public.has_admin_role(array['owner', 'clinical_reviewer']::public.admin_role[])
  or (public.has_admin_role(array['clinical_editor']::public.admin_role[]) and status in ('draft', 'in_review'))
) with check (
  public.has_admin_role(array['owner', 'clinical_reviewer']::public.admin_role[])
  or (public.has_admin_role(array['clinical_editor']::public.admin_role[]) and status in ('draft', 'in_review'))
);
create policy "owners delete food interactions" on public.food_interactions
for delete to authenticated using (public.has_admin_role(array['owner']::public.admin_role[]));

create policy "admins read membership" on public.admin_members
for select to authenticated using (public.is_admin());
create policy "admins read clinical audit" on public.clinical_change_log
for select to authenticated using (public.is_admin());

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'medications', (select count(*) from public.medications),
    'drug_interactions', (select count(*) from public.drug_interactions),
    'food_interactions', (select count(*) from public.food_interactions),
    'awaiting_review', (
      (select count(*) from public.medications where status = 'in_review') +
      (select count(*) from public.drug_interactions where status = 'in_review') +
      (select count(*) from public.food_interactions where status = 'in_review')
    ),
    'needs_review', (
      (select count(*) from public.medications where reviewed_at is null or reviewed_at < current_date - 365) +
      (select count(*) from public.drug_interactions where reviewed_at is null or reviewed_at < current_date - 365) +
      (select count(*) from public.food_interactions where reviewed_at is null or reviewed_at < current_date - 365)
    ),
    'accounts', (select count(*) from private.account_handles),
    'patient_medications', (select count(*) from public.patient_medications where deleted_at is null),
    'dose_events_30d', (select count(*) from public.dose_events where event_date >= current_date - 30),
    'active_admins', (select count(*) from public.admin_members where active)
  );
end;
$$;

create or replace function public.admin_list_accounts(search_text text default '', row_limit integer default 100, row_offset integer default 0)
returns table(handle text, profile_role text, source_app public.app_kind, created_at timestamptz, last_login_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query
  select h.handle, p.role, p.source_app, h.created_at, h.last_login_at
  from private.account_handles h
  left join public.app_profiles p on p.user_id = h.user_id
  where search_text = '' or h.handle ilike '%' || search_text || '%'
  order by h.created_at desc
  limit least(greatest(row_limit, 1), 200) offset greatest(row_offset, 0);
end;
$$;

create or replace function public.admin_list_members()
returns table(user_id uuid, handle text, role public.admin_role, active boolean, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query
  select m.user_id, h.handle, m.role, m.active, m.created_at
  from public.admin_members m
  join private.account_handles h on h.user_id = m.user_id
  order by m.active desc, m.created_at;
end;
$$;

create or replace function public.admin_set_member(member_handle text, member_role public.admin_role, member_active boolean default true)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  owner_count integer;
begin
  if not public.has_admin_role(array['owner']::public.admin_role[]) then
    raise exception 'Owner access required';
  end if;

  select user_id into target_user_id from private.account_handles where handle = lower(trim(member_handle));
  if target_user_id is null then raise exception 'Username not found'; end if;

  if exists (select 1 from public.admin_members where user_id = target_user_id and role = 'owner' and active)
     and (member_role <> 'owner' or not member_active) then
    select count(*) into owner_count from public.admin_members where role = 'owner' and active;
    if owner_count <= 1 then raise exception 'Cannot disable or demote the last active owner'; end if;
  end if;

  insert into public.admin_members(user_id, role, active, created_by)
  values (target_user_id, member_role, member_active, auth.uid())
  on conflict (user_id) do update set role = excluded.role, active = excluded.active, updated_at = now();
  return target_user_id;
end;
$$;

create or replace function private.bootstrap_admin(member_handle text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare target_user_id uuid;
begin
  select user_id into target_user_id from private.account_handles where handle = lower(trim(member_handle));
  if target_user_id is null then raise exception 'Username not found'; end if;
  insert into public.admin_members(user_id, role, active)
  values (target_user_id, 'owner', true)
  on conflict (user_id) do update set role = 'owner', active = true, updated_at = now();
  return target_user_id;
end;
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.has_admin_role(public.admin_role[]) from public, anon;
revoke all on function public.current_admin_role() from public, anon;
revoke all on function public.admin_dashboard_stats() from public, anon;
revoke all on function public.admin_list_accounts(text, integer, integer) from public, anon;
revoke all on function public.admin_list_members() from public, anon;
revoke all on function public.admin_set_member(text, public.admin_role, boolean) from public, anon;

grant select, insert, update, delete on public.medications, public.drug_interactions, public.food_interactions to authenticated;
grant select on public.admin_members, public.clinical_change_log to authenticated;
grant usage, select on sequence public.drug_interactions_id_seq to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_admin_role(public.admin_role[]) to authenticated;
grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_list_accounts(text, integer, integer) to authenticated;
grant execute on function public.admin_list_members() to authenticated;
grant execute on function public.admin_set_member(text, public.admin_role, boolean) to authenticated;

revoke all on function public.prepare_clinical_record() from public, anon, authenticated;
revoke all on function public.audit_clinical_record() from public, anon, authenticated;
revoke all on function private.bootstrap_admin(text) from public, anon, authenticated;
grant execute on function private.bootstrap_admin(text) to service_role;
