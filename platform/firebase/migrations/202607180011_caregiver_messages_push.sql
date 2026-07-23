begin;

-- Push tokens are technical device identifiers only. Clients cannot list or
-- read them; registration and removal are limited to the signed-in account.
create table public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz,
  check (expo_push_token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$')
);

create index user_push_tokens_active_user_idx
on public.user_push_tokens(user_id)
where disabled_at is null;

create index caregiver_nudges_patient_created_idx
on public.caregiver_nudges(patient_user_id, created_at desc);

alter table public.user_push_tokens enable row level security;
revoke all on table public.user_push_tokens from public, anon, authenticated;
grant all on table public.user_push_tokens to service_role;

create or replace function public.register_user_push_token(
  p_expo_push_token text,
  p_platform text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_token text := btrim(coalesce(p_expo_push_token, ''));
  token_id uuid;
begin
  if current_user_id is null then
    raise exception 'กรุณาเข้าสู่ระบบอีกครั้ง';
  end if;
  if normalized_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'Push token ไม่ถูกต้อง';
  end if;
  if p_platform not in ('ios', 'android') then
    raise exception 'แพลตฟอร์มไม่ถูกต้อง';
  end if;

  insert into public.user_push_tokens(user_id, expo_push_token, platform, disabled_at)
  values (current_user_id, normalized_token, p_platform, null)
  on conflict (expo_push_token) do update
    set user_id = current_user_id,
        platform = excluded.platform,
        disabled_at = null,
        updated_at = now()
  returning id into token_id;

  return token_id;
end;
$$;

create or replace function public.remove_user_push_token(p_expo_push_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_push_tokens as token
  where token.user_id = auth.uid()
    and token.expo_push_token = btrim(coalesce(p_expo_push_token, ''));
end;
$$;

-- Free-form caregiver communication is allowed for ordinary check-ins, while
-- dosage changes and medicine modification instructions remain blocked on the
-- server. This protects the rule even if a modified client bypasses the UI.
create or replace function public.caregiver_send_message(
  p_patient_user_id uuid,
  p_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  safe_text text := regexp_replace(btrim(coalesce(p_text, '')), '[[:cntrl:]]', ' ', 'g');
  message_id uuid;
begin
  if current_user_id is null then
    raise exception 'กรุณาเข้าสู่ระบบอีกครั้ง';
  end if;
  if char_length(safe_text) < 1 then
    raise exception 'กรุณาพิมพ์ข้อความ';
  end if;
  if char_length(safe_text) > 300 then
    raise exception 'ข้อความยาวเกิน 300 ตัวอักษร';
  end if;
  if safe_text ~* '(เพิ่ม|ลด|หยุด|เปลี่ยน|ปรับ)[^\n]{0,24}(ยา|ขนาด|โดส|เม็ด|มิลลิกรัม|มก\.?|mg)'
     or safe_text ~* '(ยา|ขนาด|โดส|เม็ด|มิลลิกรัม|มก\.?|mg)[^\n]{0,24}(เพิ่ม|ลด|หยุด|เปลี่ยน|ปรับ)'
     or safe_text ~* '(กิน|ทาน|รับประทาน)[^\n]{0,20}[0-9]+([.][0-9]+)?[[:space:]]*(เม็ด|มิลลิกรัม|มก\.?|mg)' then
    raise exception 'ข้อความนี้มีลักษณะเป็นคำสั่งปรับยาหรือระบุขนาดยา กรุณาให้ผู้ใช้ตรวจสอบคำสั่งจากแพทย์หรือเภสัชกรโดยตรง';
  end if;

  if not exists (
    select 1 from public.caregiver_links as link
    where link.patient_user_id = p_patient_user_id
      and link.caregiver_user_id = current_user_id
      and link.status = 'active'
  ) then
    raise exception 'คุณไม่มีสิทธิ์ส่งข้อความถึงผู้ใช้นี้';
  end if;

  if (
    select count(*)
    from public.caregiver_nudges as nudge
    where nudge.patient_user_id = p_patient_user_id
      and nudge.caregiver_user_id = current_user_id
      and nudge.created_at >= now() - interval '1 day'
  ) >= 30 then
    raise exception 'ส่งข้อความครบจำนวนที่อนุญาตต่อวันแล้ว';
  end if;

  insert into public.caregiver_nudges(patient_user_id, caregiver_user_id, kind, text)
  values (p_patient_user_id, current_user_id, 'custom', safe_text)
  returning id into message_id;

  return message_id;
end;
$$;

revoke all on function public.register_user_push_token(text, text) from public, anon;
revoke all on function public.remove_user_push_token(text) from public, anon;
revoke all on function public.caregiver_send_message(uuid, text) from public, anon;
grant execute on function public.register_user_push_token(text, text) to authenticated;
grant execute on function public.remove_user_push_token(text) to authenticated;
grant execute on function public.caregiver_send_message(uuid, text) to authenticated;

-- Realtime INSERT events update the in-app bell immediately. The policy on
-- caregiver_nudges still ensures users only receive rows they may read.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'caregiver_nudges'
  ) then
    alter publication supabase_realtime add table public.caregiver_nudges;
  end if;
end;
$$;

comment on table public.user_push_tokens is
  'Pseudonymous Expo device tokens; inaccessible to mobile clients except through own-token RPCs.';
comment on function public.caregiver_send_message(uuid, text) is
  'Sends a caregiver-authored general message to a consented patient; medicine changes and explicit dosage instructions are rejected.';

commit;
