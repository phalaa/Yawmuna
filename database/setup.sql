-- Run once in Supabase SQL Editor. Safe to rerun; does not delete existing boards.
begin;
create table if not exists public.yawmuna_boards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  last_mutation uuid not null,
  updated_at timestamptz not null default now(),
  constraint yawmuna_board_shape check (
    jsonb_typeof(data) = 'object' and
    data @> '{"version":1}'::jsonb and
    jsonb_typeof(data->'children') = 'array' and
    jsonb_typeof(data->'tasks') = 'array' and
    jsonb_typeof(data->'rewards') = 'array' and
    jsonb_typeof(data->'logs') = 'object' and
    jsonb_typeof(data->'redemptions') = 'array' and
    data ?& array['version','children','tasks','rewards','logs','redemptions'] and
    octet_length(data::text) <= 5000000
  )
);
alter table public.yawmuna_boards enable row level security;
revoke all on public.yawmuna_boards from anon, authenticated;
grant select, insert, update on public.yawmuna_boards to authenticated;
drop policy if exists yawmuna_read on public.yawmuna_boards;
create policy yawmuna_read on public.yawmuna_boards for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists yawmuna_insert on public.yawmuna_boards;
create policy yawmuna_insert on public.yawmuna_boards for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists yawmuna_update on public.yawmuna_boards;
create policy yawmuna_update on public.yawmuna_boards for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.yawmuna_save(p_data jsonb, p_expected_revision bigint, p_mutation uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_row public.yawmuna_boards%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  if p_mutation is null or p_expected_revision is null or p_expected_revision < 0 then raise exception 'INVALID_REQUEST'; end if;
  if p_expected_revision = 0 then
    insert into public.yawmuna_boards(user_id,data,revision,last_mutation)
    values(v_uid,p_data,1,p_mutation) on conflict(user_id) do nothing;
  end if;
  select * into v_row from public.yawmuna_boards where user_id=v_uid for update;
  if not found then raise exception 'REVISION_CONFLICT' using errcode='P0001'; end if;
  -- Retry after a lost response must never apply the same change twice.
  if v_row.last_mutation = p_mutation then return to_jsonb(v_row); end if;
  if v_row.revision <> p_expected_revision then raise exception 'REVISION_CONFLICT' using errcode='P0001'; end if;
  update public.yawmuna_boards set data=p_data, revision=revision+1,
    last_mutation=p_mutation,updated_at=now() where user_id=v_uid returning * into v_row;
  return to_jsonb(v_row);
end $$;
revoke all on function public.yawmuna_save(jsonb,bigint,uuid) from public, anon;
grant execute on function public.yawmuna_save(jsonb,bigint,uuid) to authenticated;
commit;
