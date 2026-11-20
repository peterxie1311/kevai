begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private, vault to service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  openai_model text not null default 'gpt-6.2-astra',
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);

create table private.user_openai_keys (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  secret_id uuid not null unique references vault.secrets(id),
  updated_at timestamptz not null default now()
);
alter table private.user_openai_keys enable row level security;
revoke all on private.user_openai_keys from public, anon, authenticated;
grant all on private.user_openai_keys to service_role;
grant select on vault.decrypted_secrets to service_role;
grant select, delete on vault.secrets to service_role;

create function public.kevai_openai_status(i_user_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object('configured', exists(select 1 from private.user_openai_keys where user_id=i_user_id),
    'model', coalesce((select openai_model from public.profiles where id=i_user_id),'gpt-6.2-astra'));
$$;
create function public.kevai_openai_credentials(i_user_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object('key', s.decrypted_secret, 'model', p.openai_model)
  from private.user_openai_keys k join vault.decrypted_secrets s on s.id=k.secret_id join public.profiles p on p.id=k.user_id where k.user_id=i_user_id;
$$;
create function public.kevai_save_openai_settings(i_user_id uuid, i_model text, i_key text default null, i_remove boolean default false) returns void
language plpgsql security invoker set search_path = '' as $$
declare old_secret uuid; new_secret uuid;
begin
  if i_model !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$' then raise exception 'Invalid model'; end if;
  if i_key is not null and (length(i_key)<20 or length(i_key)>512 or i_key !~ '^sk-[A-Za-z0-9_-]+$') then raise exception 'Invalid key format'; end if;
  insert into public.profiles(id,openai_model) values(i_user_id,i_model) on conflict(id) do nothing;
  perform 1 from public.profiles where id=i_user_id for update;
  update public.profiles set openai_model=i_model,updated_at=now() where id=i_user_id;
  select secret_id into old_secret from private.user_openai_keys where user_id=i_user_id;
  if i_remove then
    delete from private.user_openai_keys where user_id=i_user_id;
  elsif i_key is not null then
    new_secret := vault.create_secret(i_key);
    insert into private.user_openai_keys(user_id,secret_id) values(i_user_id,new_secret)
      on conflict(user_id) do update set secret_id=excluded.secret_id,updated_at=now();
    if old_secret is not null then delete from vault.secrets where id=old_secret; end if;
  end if;
end;
$$;
-- Cleanup also runs when an auth account is deleted and the mapping cascades.
create function private.cleanup_openai_secret() returns trigger
language plpgsql security definer set search_path = '' as $$
begin delete from vault.secrets where id=old.secret_id; return old; end;
$$;
revoke all on function private.cleanup_openai_secret() from public, anon, authenticated;
create trigger cleanup_openai_secret after delete on private.user_openai_keys for each row execute function private.cleanup_openai_secret();
revoke all on function public.kevai_openai_status(uuid), public.kevai_openai_credentials(uuid), public.kevai_save_openai_settings(uuid,text,text,boolean) from public, anon, authenticated;
grant execute on function public.kevai_openai_status(uuid), public.kevai_openai_credentials(uuid), public.kevai_save_openai_settings(uuid,text,text,boolean) to service_role;
commit;
