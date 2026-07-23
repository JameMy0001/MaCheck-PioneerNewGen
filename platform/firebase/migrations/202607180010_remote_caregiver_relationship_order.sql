begin;

-- Repair the ORDER BY used by the initially deployed relationship RPC.
-- PostgreSQL requires a UNION result column (or ordinal) here.
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

revoke all on function public.caregiver_relationships() from public, anon;
grant execute on function public.caregiver_relationships() to authenticated;

commit;
