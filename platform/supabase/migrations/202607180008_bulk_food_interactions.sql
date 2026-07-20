begin;

create or replace function public.admin_bulk_update_food_interactions(
  p_food_interaction_codes text[],
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
  from unnest(coalesce(p_food_interaction_codes, '{}'::text[])) as selected(code)
  where nullif(btrim(code), '') is not null;

  if requested_count = 0 then
    raise exception 'กรุณาเลือกข้อมูลอาหารอย่างน้อย 1 รายการ';
  end if;
  if requested_count > 500 then
    raise exception 'เลือกได้ไม่เกิน 500 รายการต่อครั้ง';
  end if;

  perform interaction.code
  from public.food_interactions as interaction
  where interaction.code in (
    select distinct lower(btrim(code))
    from unnest(p_food_interaction_codes) as selected(code)
    where nullif(btrim(code), '') is not null
  )
  for update;

  select count(*)
  into matched_count
  from public.food_interactions as interaction
  where interaction.code in (
    select distinct lower(btrim(code))
    from unnest(p_food_interaction_codes) as selected(code)
    where nullif(btrim(code), '') is not null
  );

  if matched_count <> requested_count then
    raise exception 'ไม่พบข้อมูลอาหารบางรายการ กรุณาโหลดหน้าใหม่แล้วเลือกอีกครั้ง';
  end if;

  select string_agg(interaction.code, ', ' order by interaction.code)
  into blocked_records
  from public.food_interactions as interaction
  where interaction.code in (
    select distinct lower(btrim(code))
    from unnest(p_food_interaction_codes) as selected(code)
    where nullif(btrim(code), '') is not null
  )
  and interaction.status not in ('draft', 'in_review');

  if blocked_records is not null then
    raise exception 'รายการเหล่านี้ไม่อยู่ในสถานะฉบับร่างหรือรอตรวจทาน: %', blocked_records;
  end if;

  if p_target_status = 'published' then
    select string_agg(interaction.code, ', ' order by interaction.code)
    into blocked_records
    from public.food_interactions as interaction
    where interaction.code in (
      select distinct lower(btrim(code))
      from unnest(p_food_interaction_codes) as selected(code)
      where nullif(btrim(code), '') is not null
    )
    and (
      nullif(btrim(interaction.food_th), '') is null
      or nullif(btrim(interaction.description_th), '') is null
      or coalesce(cardinality(interaction.keywords), 0) = 0
      or (
        coalesce(cardinality(interaction.medicine_codes), 0) = 0
        and coalesce(cardinality(interaction.disease_codes), 0) = 0
      )
      or coalesce(cardinality(interaction.source_references), 0) = 0
    );

    if blocked_records is not null then
      raise exception 'ยังเผยแพร่ไม่ได้ เพราะชื่อ คำอธิบาย keyword รายการที่เกี่ยวข้อง หรือแหล่งอ้างอิงไม่ครบ: %', blocked_records;
    end if;

    select string_agg(interaction.code || ' → ' || medicine_code.code, ', ' order by interaction.code, medicine_code.code)
    into blocked_records
    from public.food_interactions as interaction
    cross join lateral unnest(interaction.medicine_codes) as medicine_code(code)
    left join public.medications as medication on medication.code = medicine_code.code
    where interaction.code in (
      select distinct lower(btrim(code))
      from unnest(p_food_interaction_codes) as selected(code)
      where nullif(btrim(code), '') is not null
    )
    and (
      medication.code is null
      or medication.status <> 'published'
      or not medication.active
    );

    if blocked_records is not null then
      raise exception 'ต้องเผยแพร่และเปิดใช้งานยาที่อ้างถึงก่อนเผยแพร่ข้อมูลอาหาร: %', blocked_records;
    end if;

    update public.food_interactions as interaction
    set
      status = 'published',
      reviewed_at = p_reviewed_at,
      reviewed_by = auth.uid()
    where interaction.code in (
      select distinct lower(btrim(code))
      from unnest(p_food_interaction_codes) as selected(code)
      where nullif(btrim(code), '') is not null
    );
  else
    update public.food_interactions as interaction
    set status = 'in_review'
    where interaction.code in (
      select distinct lower(btrim(code))
      from unnest(p_food_interaction_codes) as selected(code)
      where nullif(btrim(code), '') is not null
    );
  end if;

  get diagnostics updated_count = row_count;
  return jsonb_build_object(
    'updated', updated_count,
    'status', p_target_status
  );
end;
$$;

revoke all on function public.admin_bulk_update_food_interactions(text[], public.clinical_record_status, date) from public, anon;
grant execute on function public.admin_bulk_update_food_interactions(text[], public.clinical_record_status, date) to authenticated;

comment on function public.admin_bulk_update_food_interactions(text[], public.clinical_record_status, date) is
  'Atomically sends selected food interactions to review or publishes them after evidence and medication validation.';

commit;
