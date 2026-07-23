create or replace function public.prepare_clinical_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and coalesce(cardinality(new.source_references), 0) = 0 then
    raise exception 'Published clinical data requires at least one source reference';
  end if;

  if tg_op = 'UPDATE' then
    new.dataset_version = old.dataset_version + 1;
    new.updated_at = now();
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
    'missing_sources', (
      (select count(*) from public.medications where coalesce(cardinality(source_references), 0) = 0) +
      (select count(*) from public.drug_interactions where coalesce(cardinality(source_references), 0) = 0) +
      (select count(*) from public.food_interactions where coalesce(cardinality(source_references), 0) = 0)
    ),
    'accounts', (select count(*) from private.account_handles),
    'patient_medications', (select count(*) from public.patient_medications where deleted_at is null),
    'dose_events_30d', (select count(*) from public.dose_events where event_date >= current_date - 30),
    'active_admins', (select count(*) from public.admin_members where active)
  );
end;
$$;

create or replace function public.admin_list_audit(row_limit integer default 200)
returns table(
  id bigint,
  table_name text,
  record_key text,
  action text,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_by_handle text,
  changed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  return query
  select l.id, l.table_name, l.record_key, l.action, l.old_data, l.new_data,
    l.changed_by, h.handle, l.changed_at
  from public.clinical_change_log l
  left join private.account_handles h on h.user_id = l.changed_by
  order by l.changed_at desc
  limit least(greatest(row_limit, 1), 500);
end;
$$;

revoke all on function public.admin_list_audit(integer) from public, anon;
grant execute on function public.admin_list_audit(integer) to authenticated;
