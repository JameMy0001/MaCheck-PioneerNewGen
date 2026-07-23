begin;

-- A caregiver must explicitly accept an invitation before any health data is
-- shared. The private username mapping is resolved only inside definer
-- functions and is never exposed as a searchable user directory.
create table public.caregiver_invitations (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  caregiver_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz,
  check (patient_user_id <> caregiver_user_id)
);

create unique index caregiver_invitations_one_pending_pair_idx
on public.caregiver_invitations(patient_user_id, caregiver_user_id)
where status = 'pending';

create index caregiver_invitations_caregiver_pending_idx
on public.caregiver_invitations(caregiver_user_id, created_at desc)
where status = 'pending';

alter table public.caregiver_invitations enable row level security;
revoke all on table public.caregiver_invitations from public, anon, authenticated;
grant all on table public.caregiver_invitations to service_role;

-- Remove the old direct-write path. All relationship mutations now pass
-- through the consent-aware functions below.
drop policy if exists "links patient creates" on public.caregiver_links;
drop policy if exists "links patient updates" on public.caregiver_links;
revoke insert, update, delete on table public.caregiver_links from authenticated;

-- Do not allow a modified client to send arbitrary medical instructions.
-- Caregiver nudges are generated from a small server-side allowlist.
drop policy if exists "caregiver sends linked nudge" on public.caregiver_nudges;
drop policy if exists "patient marks nudge read" on public.caregiver_nudges;
revoke insert, update, delete on table public.caregiver_nudges from authenticated;

create or replace function public.caregiver_invite_by_handle(p_caregiver_handle text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_handle text := lower(btrim(coalesce(p_caregiver_handle, '')));
  target_user_id uuid;
  existing_invitation_id uuid;
  invitation_id uuid;
begin
  if current_user_id is null then
    raise exception 'กรุณาเข้าสู่ระบบอีกครั้ง';
  end if;
  if normalized_handle !~ '^[a-z][a-z0-9_]{5,23}$' then
    raise exception 'Username ไม่ถูกต้อง';
  end if;

  select account.user_id
  into target_user_id
  from private.account_handles as account
  where account.handle = normalized_handle;

  if target_user_id is null then
    raise exception 'ไม่พบบัญชี Username นี้';
  end if;
  if target_user_id = current_user_id then
    raise exception 'ไม่สามารถเชิญบัญชีของตัวเองได้';
  end if;
  if exists (
    select 1 from public.caregiver_links as link
    where link.patient_user_id = current_user_id
      and link.caregiver_user_id = target_user_id
      and link.status = 'active'
  ) then
    raise exception 'บัญชีนี้เป็นผู้ดูแลของคุณอยู่แล้ว';
  end if;
  if (
    select count(*)
    from public.caregiver_invitations as invitation
    where invitation.patient_user_id = current_user_id
      and invitation.created_at >= now() - interval '1 hour'
  ) >= 10 then
    raise exception 'ส่งคำเชิญบ่อยเกินไป กรุณารอแล้วลองใหม่';
  end if;

  update public.caregiver_invitations as invitation
  set status = 'expired', responded_at = now()
  where invitation.status = 'pending'
    and invitation.expires_at <= now();

  select invitation.id
  into existing_invitation_id
  from public.caregiver_invitations as invitation
  where invitation.patient_user_id = current_user_id
    and invitation.caregiver_user_id = target_user_id
    and invitation.status = 'pending'
  limit 1;

  if existing_invitation_id is not null then
    return existing_invitation_id;
  end if;

  insert into public.caregiver_invitations(patient_user_id, caregiver_user_id)
  values (current_user_id, target_user_id)
  returning id into invitation_id;
  return invitation_id;
end;
$$;

create or replace function public.caregiver_respond_to_invitation(p_invitation_id uuid, p_accept boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  invitation_record public.caregiver_invitations%rowtype;
begin
  if current_user_id is null then
    raise exception 'กรุณาเข้าสู่ระบบอีกครั้ง';
  end if;

  select invitation.*
  into invitation_record
  from public.caregiver_invitations as invitation
  where invitation.id = p_invitation_id
    and invitation.caregiver_user_id = current_user_id
  for update;

  if not found then
    raise exception 'ไม่พบคำเชิญนี้หรือคุณไม่มีสิทธิ์';
  end if;
  if invitation_record.status <> 'pending' then
    raise exception 'คำเชิญนี้ถูกดำเนินการไปแล้ว';
  end if;
  if invitation_record.expires_at <= now() then
    update public.caregiver_invitations
    set status = 'expired', responded_at = now()
    where id = invitation_record.id;
    raise exception 'คำเชิญหมดอายุแล้ว กรุณาให้ผู้ป่วยส่งใหม่';
  end if;

  update public.caregiver_invitations
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = invitation_record.id;

  if p_accept then
    insert into public.caregiver_links(patient_user_id, caregiver_user_id, status, revoked_at)
    values (invitation_record.patient_user_id, current_user_id, 'active', null)
    on conflict (patient_user_id, caregiver_user_id) do update
      set status = 'active', revoked_at = null, created_at = now();
  end if;
  return p_accept;
end;
$$;

create or replace function public.caregiver_cancel_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.caregiver_invitations as invitation
  set status = 'cancelled', responded_at = now()
  where invitation.id = p_invitation_id
    and invitation.patient_user_id = auth.uid()
    and invitation.status = 'pending';
  if not found then
    raise exception 'ไม่พบคำเชิญที่ยกเลิกได้';
  end if;
end;
$$;

create or replace function public.caregiver_revoke_access(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.caregiver_links as link
  set status = 'revoked', revoked_at = now()
  where link.id = p_link_id
    and link.status = 'active'
    and (link.patient_user_id = auth.uid() or link.caregiver_user_id = auth.uid());
  if not found then
    raise exception 'ไม่พบสิทธิ์ที่ยกเลิกได้';
  end if;
end;
$$;

create or replace function public.caregiver_relationships()
returns table (
  relationship_id uuid,
  relation_kind text,
  other_user_id uuid,
  other_username text,
  relationship_status text,
  relationship_created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'กรุณาเข้าสู่ระบบอีกครั้ง';
  end if;

  update public.caregiver_invitations as invitation
  set status = 'expired', responded_at = now()
  where invitation.status = 'pending'
    and invitation.expires_at <= now()
    and (invitation.patient_user_id = auth.uid() or invitation.caregiver_user_id = auth.uid());

  return query
  select link.id, 'active_caregiver'::text, link.caregiver_user_id, account.handle,
         link.status::text, link.created_at, null::timestamptz
  from public.caregiver_links as link
  join private.account_handles as account on account.user_id = link.caregiver_user_id
  where link.patient_user_id = auth.uid() and link.status = 'active'
  union all
  select link.id, 'active_patient'::text, link.patient_user_id, account.handle,
         link.status::text, link.created_at, null::timestamptz
  from public.caregiver_links as link
  join private.account_handles as account on account.user_id = link.patient_user_id
  where link.caregiver_user_id = auth.uid() and link.status = 'active'
  union all
  select invitation.id, 'outgoing_invitation'::text, invitation.caregiver_user_id, account.handle,
         invitation.status, invitation.created_at, invitation.expires_at
  from public.caregiver_invitations as invitation
  join private.account_handles as account on account.user_id = invitation.caregiver_user_id
  where invitation.patient_user_id = auth.uid() and invitation.status = 'pending'
  union all
  select invitation.id, 'incoming_invitation'::text, invitation.patient_user_id, account.handle,
         invitation.status, invitation.created_at, invitation.expires_at
  from public.caregiver_invitations as invitation
  join private.account_handles as account on account.user_id = invitation.patient_user_id
  where invitation.caregiver_user_id = auth.uid() and invitation.status = 'pending'
  order by 6 desc;
end;
$$;

create or replace function public.caregiver_send_nudge(p_patient_user_id uuid, p_kind text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  safe_text text;
  nudge_id uuid;
begin
  if p_kind = 'check_schedule' then
    safe_text := 'ผู้ดูแลส่งข้อความเตือนให้เปิดตรวจสอบตารางยาของวันนี้';
  elsif p_kind = 'contact_caregiver' then
    safe_text := 'ผู้ดูแลต้องการให้ติดต่อกลับเมื่อสะดวก';
  else
    raise exception 'ประเภทข้อความเตือนไม่ถูกต้อง';
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
    select count(*) from public.caregiver_nudges as nudge
    where nudge.patient_user_id = p_patient_user_id
      and nudge.caregiver_user_id = current_user_id
      and nudge.created_at >= now() - interval '1 day'
  ) >= 10 then
    raise exception 'ส่งข้อความเตือนครบจำนวนที่อนุญาตต่อวันแล้ว';
  end if;

  insert into public.caregiver_nudges(patient_user_id, caregiver_user_id, kind, text)
  values (p_patient_user_id, current_user_id, p_kind, safe_text)
  returning id into nudge_id;
  return nudge_id;
end;
$$;

create or replace function public.caregiver_mark_nudge_read(p_nudge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.caregiver_nudges as nudge
  set read_at = coalesce(nudge.read_at, now())
  where nudge.id = p_nudge_id
    and nudge.patient_user_id = auth.uid();
  if not found then
    raise exception 'ไม่พบข้อความเตือนนี้';
  end if;
end;
$$;

revoke all on function public.caregiver_invite_by_handle(text) from public, anon;
revoke all on function public.caregiver_respond_to_invitation(uuid, boolean) from public, anon;
revoke all on function public.caregiver_cancel_invitation(uuid) from public, anon;
revoke all on function public.caregiver_revoke_access(uuid) from public, anon;
revoke all on function public.caregiver_relationships() from public, anon;
revoke all on function public.caregiver_send_nudge(uuid, text) from public, anon;
revoke all on function public.caregiver_mark_nudge_read(uuid) from public, anon;

grant execute on function public.caregiver_invite_by_handle(text) to authenticated;
grant execute on function public.caregiver_respond_to_invitation(uuid, boolean) to authenticated;
grant execute on function public.caregiver_cancel_invitation(uuid) to authenticated;
grant execute on function public.caregiver_revoke_access(uuid) to authenticated;
grant execute on function public.caregiver_relationships() to authenticated;
grant execute on function public.caregiver_send_nudge(uuid, text) to authenticated;
grant execute on function public.caregiver_mark_nudge_read(uuid) to authenticated;

comment on table public.caregiver_invitations is
  'Consent-gated, expiring invitations; clients access them only through authenticated RPCs.';
comment on function public.caregiver_send_nudge(uuid, text) is
  'Sends one of the fixed non-clinical reminder messages; arbitrary dosage or medicine instructions are not accepted.';

commit;
