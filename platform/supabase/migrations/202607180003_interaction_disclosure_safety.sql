begin;

create or replace function public.enforce_safe_drug_interaction_copy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.severity = 'severe' then
    new.title_th := 'ห้ามรับประทานยาคู่นี้ร่วมกัน';
    new.description_th := 'ตรวจพบว่ายาคู่นี้อยู่ในกลุ่มห้ามใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย';
    new.advice_th := 'อย่าปรับหรือหยุดยาที่ใช้อยู่เอง ให้ติดต่อแพทย์หรือเภสัชกรทันที';
  else
    new.title_th := 'โปรดสอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน';
    new.description_th := 'ตรวจพบว่ายาคู่นี้ต้องได้รับการตรวจสอบก่อนใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย';
    new.advice_th := 'อย่ารับประทานยาคู่นี้ร่วมกันจนกว่าจะได้รับคำแนะนำจากแพทย์หรือเภสัชกร';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_safe_drug_interaction_copy() from public, anon, authenticated;

drop trigger if exists drug_interactions_00_safe_copy on public.drug_interactions;
create trigger drug_interactions_00_safe_copy
before insert or update on public.drug_interactions
for each row execute function public.enforce_safe_drug_interaction_copy();

-- Replace previously stored clinical-effect text without recording it again in the audit log.
alter table public.drug_interactions disable trigger drug_interactions_audit;
alter table public.drug_interactions disable trigger drug_interactions_prepare;

update public.drug_interactions
set
  title_th = case severity
    when 'severe' then 'ห้ามรับประทานยาคู่นี้ร่วมกัน'
    else 'โปรดสอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน'
  end,
  description_th = case severity
    when 'severe' then 'ตรวจพบว่ายาคู่นี้อยู่ในกลุ่มห้ามใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย'
    else 'ตรวจพบว่ายาคู่นี้ต้องได้รับการตรวจสอบก่อนใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย'
  end,
  advice_th = case severity
    when 'severe' then 'อย่าปรับหรือหยุดยาที่ใช้อยู่เอง ให้ติดต่อแพทย์หรือเภสัชกรทันที'
    else 'อย่ารับประทานยาคู่นี้ร่วมกันจนกว่าจะได้รับคำแนะนำจากแพทย์หรือเภสัชกร'
  end;

update public.clinical_change_log
set
  old_data = case when old_data is null then null else old_data - array['title_th', 'description_th', 'advice_th'] end,
  new_data = case when new_data is null then null else new_data - array['title_th', 'description_th', 'advice_th'] end
where table_name = 'drug_interactions';

alter table public.drug_interactions enable trigger drug_interactions_audit;
alter table public.drug_interactions enable trigger drug_interactions_prepare;

alter table public.drug_interactions
  add constraint drug_interactions_safe_title_check check (
    title_th = case severity
      when 'severe' then 'ห้ามรับประทานยาคู่นี้ร่วมกัน'
      else 'โปรดสอบถามแพทย์หรือเภสัชกรก่อนใช้ร่วมกัน'
    end
  ),
  add constraint drug_interactions_safe_description_check check (
    description_th = case severity
      when 'severe' then 'ตรวจพบว่ายาคู่นี้อยู่ในกลุ่มห้ามใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย'
      else 'ตรวจพบว่ายาคู่นี้ต้องได้รับการตรวจสอบก่อนใช้ร่วมกัน ระบบไม่แสดงรายละเอียดผลกระทบเพื่อความปลอดภัย'
    end
  ),
  add constraint drug_interactions_safe_advice_check check (
    advice_th = case severity
      when 'severe' then 'อย่าปรับหรือหยุดยาที่ใช้อยู่เอง ให้ติดต่อแพทย์หรือเภสัชกรทันที'
      else 'อย่ารับประทานยาคู่นี้ร่วมกันจนกว่าจะได้รับคำแนะนำจากแพทย์หรือเภสัชกร'
    end
  );

comment on table public.drug_interactions is
  'Drug-pair classification only. User-facing text is fixed by database policy; mechanisms, outcomes, symptoms, and workaround instructions must not be stored.';

commit;
