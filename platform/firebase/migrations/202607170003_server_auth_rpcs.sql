create or replace function public.server_auth_lookup_handle(p_handle text)
returns table(user_id uuid, internal_email text, recovery_code_hash text)
language sql security definer set search_path = '' as $$
  select a.user_id, a.internal_email, a.recovery_code_hash
  from private.account_handles a
  where a.handle = p_handle;
$$;

create or replace function public.server_auth_insert_handle(
  p_user_id uuid, p_handle text, p_internal_email text, p_recovery_code_hash text
) returns void language sql security definer set search_path = '' as $$
  insert into private.account_handles(user_id, handle, internal_email, recovery_code_hash)
  values (p_user_id, p_handle, p_internal_email, p_recovery_code_hash);
$$;

create or replace function public.server_auth_mark_login(p_user_id uuid)
returns void language sql security definer set search_path = '' as $$
  update private.account_handles set last_login_at = now() where user_id = p_user_id;
$$;

create or replace function public.server_auth_rotate_recovery(p_user_id uuid, p_recovery_code_hash text)
returns void language sql security definer set search_path = '' as $$
  update private.account_handles set recovery_code_hash = p_recovery_code_hash where user_id = p_user_id;
$$;

create or replace function public.server_auth_take_rate_limit(p_key_hash text, p_max_attempts integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_attempts integer;
begin
  insert into private.auth_rate_limits(key_hash, attempts, window_started_at)
  values (p_key_hash, 1, now())
  on conflict (key_hash) do update
    set attempts = case
      when private.auth_rate_limits.window_started_at < now() - interval '15 minutes' then 1
      else private.auth_rate_limits.attempts + 1
    end,
    window_started_at = case
      when private.auth_rate_limits.window_started_at < now() - interval '15 minutes' then now()
      else private.auth_rate_limits.window_started_at
    end
  returning attempts into current_attempts;
  return current_attempts <= p_max_attempts;
end;
$$;

create or replace function public.server_auth_clear_rate_limit(p_key_hash text)
returns void language sql security definer set search_path = '' as $$
  delete from private.auth_rate_limits where key_hash = p_key_hash;
$$;

revoke all on function public.server_auth_lookup_handle(text) from public, anon, authenticated;
revoke all on function public.server_auth_insert_handle(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.server_auth_mark_login(uuid) from public, anon, authenticated;
revoke all on function public.server_auth_rotate_recovery(uuid,text) from public, anon, authenticated;
revoke all on function public.server_auth_take_rate_limit(text,integer) from public, anon, authenticated;
revoke all on function public.server_auth_clear_rate_limit(text) from public, anon, authenticated;
grant execute on function public.server_auth_lookup_handle(text) to service_role;
grant execute on function public.server_auth_insert_handle(uuid,text,text,text) to service_role;
grant execute on function public.server_auth_mark_login(uuid) to service_role;
grant execute on function public.server_auth_rotate_recovery(uuid,text) to service_role;
grant execute on function public.server_auth_take_rate_limit(text,integer) to service_role;
grant execute on function public.server_auth_clear_rate_limit(text) to service_role;

