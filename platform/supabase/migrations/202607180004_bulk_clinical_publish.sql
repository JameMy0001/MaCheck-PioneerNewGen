begin;

create or replace function public.admin_bulk_update_medications(
  p_medication_codes text[],
  p_target_status public.clinical_record_status,
  p_reviewed_at date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_count integer;
  matched_count integer;
  updated_count integer;
  blocked_records text;
begin
  if p_target_status not in ('in_review', 'published') then
    raise exception 'รองรับเฉพาะการส่งตรวจหรือเผยแพร่เท่านั้น';
  end if;

  if p_target_status = 'published' then
    if not public.has_admin_role(array['owner', 'clinical_reviewer']::public.admin_role[]) then
      raise exception 'เฉพาะ Owner หรือ Clinical reviewer เท่านั้นที่เผยแพร่หลายรายการได้';
    end if;
    if p_reviewed_at is null or p_reviewed_at > current_date then
      raise exception 'วันที่ตรวจทานต้องไม่เป็นวันในอนาคต';
    end if;
  elsif not public.has_admin_role(array['owner', 'clinical_editor', 'clinical_reviewer']::public.admin_role[]) then
    raise exception 'ไม่มีสิทธิ์ส่งข้อมูลให้ตรวจทาน';
  end if;

  select count(distinct lower(btrim(code)))
  into requested_count
  from unnest(coalesce(p_medication_codes, '{}'::text[])) as selected(code)
  where nullif(btrim(code), '') is not null;

  if requested_count = 0 then
    raise exception 'กรุณาเลือกรายการยาอย่างน้อย 1 รายการ';
  end if;
  if requested_count > 500 then
    raise exception 'เลือกได้ไม่เกิน 500 รายการต่อครั้ง';
  end if;

  perform medication.code
  from public.medications as medication
  where medication.code in (
    select distinct lower(btrim(code))
    from unnest(p_medication_codes) as selected(code)
    where nullif(btrim(code), '') is not null
  )
  for update;

  select count(*)
  into matched_count
  from public.medications as medication
  where medication.code in (
    select distinct lower(btrim(code))
    from unnest(p_medication_codes) as selected(code)
    where nullif(btrim(code), '') is not null
  );

  if matched_count <> requested_count then
    raise exception 'ไม่พบรายการยาบางรายการ กรุณาโหลดหน้าใหม่แล้วเลือกอีกครั้ง';
  end if;

  select string_agg(medication.code, ', ' order by medication.code)
  into blocked_records
  from public.medications as medication
  where medication.code in (
    select distinct lower(btrim(code))
    from unnest(p_medication_codes) as selected(code)
    where nullif(btrim(code), '') is not null
  )
  and medication.status not in ('draft', 'in_review');

  if blocked_records is not null then
    raise exception 'รายการเหล่านี้ไม่อยู่ในสถานะฉบับร่างหรือรอตรวจทาน: %', blocked_records;
  end if;

  if p_target_status = 'published' then
    select string_agg(medication.code, ', ' order by medication.code)
    into blocked_records
    from public.medications as medication
    where medication.code in (
      select distinct lower(btrim(code))
      from unnest(p_medication_codes) as selected(code)
      where nullif(btrim(code), '') is not null
    )
    and coalesce(cardinality(medication.source_references), 0) = 0;

    if blocked_records is not null then
      raise exception 'ยังเผยแพร่ไม่ได้ เพราะไม่มีแหล่งอ้างอิง: %', blocked_records;
    end if;

    select string_agg(medication.code, ', ' order by medication.code)
    into blocked_records
    from public.medications as medication
    where medication.code in (
      select distinct lower(btrim(code))
      from unnest(p_medication_codes) as selected(code)
      where nullif(btrim(code), '') is not null
    )
    and (
      nullif(btrim(medication.name_en), '') is null
      or nullif(btrim(medication.name_th), '') is null
      or nullif(btrim(medication.category), '') is null
      or nullif(btrim(medication.description_th), '') is null
      or medication.name_th ilike '%รอตรวจสอบ%'
      or medication.category ilike '%รอตรวจสอบ%'
      or medication.description_th ilike '%รอตรวจทาน%'
    );

    if blocked_records is not null then
      raise exception 'ยังเผยแพร่ไม่ได้ เพราะมีข้อมูลที่ระบุว่ารอตรวจสอบ: %', blocked_records;
    end if;

    update public.medications as medication
    set
      status = 'published',
      active = true,
      reviewed_at = p_reviewed_at,
      reviewed_by = auth.uid()
    where medication.code in (
      select distinct lower(btrim(code))
      from unnest(p_medication_codes) as selected(code)
      where nullif(btrim(code), '') is not null
    );
  else
    update public.medications as medication
    set
      status = 'in_review',
      active = false
    where medication.code in (
      select distinct lower(btrim(code))
      from unnest(p_medication_codes) as selected(code)
      where nullif(btrim(code), '') is not null
    );
  end if;

  get diagnostics updated_count = row_count;
  return jsonb_build_object(
    'updated', updated_count,
    'status', p_target_status,
    'active', p_target_status = 'published'
  );
end;
$$;

create or replace function public.admin_bulk_update_drug_interactions(
  p_interaction_ids bigint[],
  p_target_status public.clinical_record_status,
  p_reviewed_at date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_count integer;
  matched_count integer;
  updated_count integer;
  blocked_records text;
begin
  if p_target_status not in ('in_review', 'published') then
    raise exception 'รองรับเฉพาะการส่งตรวจหรือเผยแพร่เท่านั้น';
  end if;

  if p_target_status = 'published' then
    if not public.has_admin_role(array['owner', 'clinical_reviewer']::public.admin_role[]) then
      raise exception 'เฉพาะ Owner หรือ Clinical reviewer เท่านั้นที่เผยแพร่หลายรายการได้';
    end if;
    if p_reviewed_at is null or p_reviewed_at > current_date then
      raise exception 'วันที่ตรวจทานต้องไม่เป็นวันในอนาคต';
    end if;
  elsif not public.has_admin_role(array['owner', 'clinical_editor', 'clinical_reviewer']::public.admin_role[]) then
    raise exception 'ไม่มีสิทธิ์ส่งข้อมูลให้ตรวจทาน';
  end if;

  select count(distinct id)
  into requested_count
  from unnest(coalesce(p_interaction_ids, '{}'::bigint[])) as selected(id)
  where id is not null;

  if requested_count = 0 then
    raise exception 'กรุณาเลือกคู่ยาอย่างน้อย 1 คู่';
  end if;
  if requested_count > 500 then
    raise exception 'เลือกได้ไม่เกิน 500 คู่ต่อครั้ง';
  end if;

  perform interaction.id
  from public.drug_interactions as interaction
  where interaction.id in (
    select distinct id from unnest(p_interaction_ids) as selected(id) where id is not null
  )
  for update;

  select count(*)
  into matched_count
  from public.drug_interactions as interaction
  where interaction.id in (
    select distinct id from unnest(p_interaction_ids) as selected(id) where id is not null
  );

  if matched_count <> requested_count then
    raise exception 'ไม่พบคู่ยาบางรายการ กรุณาโหลดหน้าใหม่แล้วเลือกอีกครั้ง';
  end if;

  select string_agg(interaction.drug_1 || ' ↔ ' || interaction.drug_2, ', ' order by interaction.id)
  into blocked_records
  from public.drug_interactions as interaction
  where interaction.id in (
    select distinct id from unnest(p_interaction_ids) as selected(id) where id is not null
  )
  and interaction.status not in ('draft', 'in_review');

  if blocked_records is not null then
    raise exception 'คู่ยาเหล่านี้ไม่อยู่ในสถานะฉบับร่างหรือรอตรวจทาน: %', blocked_records;
  end if;

  if p_target_status = 'published' then
    select string_agg(interaction.drug_1 || ' ↔ ' || interaction.drug_2, ', ' order by interaction.id)
    into blocked_records
    from public.drug_interactions as interaction
    where interaction.id in (
      select distinct id from unnest(p_interaction_ids) as selected(id) where id is not null
    )
    and coalesce(cardinality(interaction.source_references), 0) = 0;

    if blocked_records is not null then
      raise exception 'ยังเผยแพร่ไม่ได้ เพราะคู่ยาไม่มีแหล่งอ้างอิง: %', blocked_records;
    end if;

    select string_agg(interaction.drug_1 || ' ↔ ' || interaction.drug_2, ', ' order by interaction.id)
    into blocked_records
    from public.drug_interactions as interaction
    left join public.medications as drug_1 on drug_1.code = interaction.drug_1
    left join public.medications as drug_2 on drug_2.code = interaction.drug_2
    where interaction.id in (
      select distinct id from unnest(p_interaction_ids) as selected(id) where id is not null
    )
    and (
      drug_1.code is null
      or drug_2.code is null
      or drug_1.status <> 'published'
      or not drug_1.active
      or drug_2.status <> 'published'
      or not drug_2.active
    );

    if blocked_records is not null then
      raise exception 'ต้องเผยแพร่และเปิดใช้งานยาทั้งสองตัวก่อนเผยแพร่คู่ยา: %', blocked_records;
    end if;

    update public.drug_interactions as interaction
    set
      status = 'published',
      reviewed_at = p_reviewed_at,
      reviewed_by = auth.uid()
    where interaction.id in (
      select distinct id from unnest(p_interaction_ids) as selected(id) where id is not null
    );
  else
    update public.drug_interactions as interaction
    set status = 'in_review'
    where interaction.id in (
      select distinct id from unnest(p_interaction_ids) as selected(id) where id is not null
    );
  end if;

  get diagnostics updated_count = row_count;
  return jsonb_build_object(
    'updated', updated_count,
    'status', p_target_status
  );
end;
$$;

revoke all on function public.admin_bulk_update_medications(text[], public.clinical_record_status, date) from public, anon;
revoke all on function public.admin_bulk_update_drug_interactions(bigint[], public.clinical_record_status, date) from public, anon;
grant execute on function public.admin_bulk_update_medications(text[], public.clinical_record_status, date) to authenticated;
grant execute on function public.admin_bulk_update_drug_interactions(bigint[], public.clinical_record_status, date) to authenticated;

comment on function public.admin_bulk_update_medications(text[], public.clinical_record_status, date) is
  'Atomically sends selected medications to review or publishes and activates them after safety validation.';
comment on function public.admin_bulk_update_drug_interactions(bigint[], public.clinical_record_status, date) is
  'Atomically sends selected interaction pairs to review or publishes them after safety validation.';

commit;
