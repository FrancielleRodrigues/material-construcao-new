-- Endurecimento de segurança.
--
--  1. O usuário passa a ser reconhecido pelo identificador do login (auth.uid()), não pelo
--     e-mail. O vínculo é feito por gatilhos e só vale para e-mail CONFIRMADO.
--  2. As funções auxiliares de permissão saem do schema `public` (exposto na API REST) e vão
--     para `private`, que NUNCA deve ser adicionado em Settings → API → Exposed schemas.
--  3. Tabela de auditoria: quem criou/alterou/excluiu o quê, visível só para administradores.

-- =====================================================================
-- 1. Vínculo por auth.uid()
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter table public.usuarios add column auth_id uuid unique;

-- Ao cadastrar/alterar o e-mail de um usuário, liga ao login já existente e confirmado.
create or replace function private.vincular_login_ao_usuario() returns trigger
language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if new.auth_id is null then
    select a.id into new.auth_id
      from auth.users a
     where lower(a.email) = lower(new.email) and a.email_confirmed_at is not null
     limit 1;
  end if;
  return new;
end $$;
create trigger usuarios_vincular_login before insert or update of email on public.usuarios
  for each row execute function private.vincular_login_ao_usuario();

-- Ao criar/confirmar um login, liga ao usuário cadastrado com o mesmo e-mail.
create or replace function private.vincular_usuario_ao_login() returns trigger
language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if new.email is not null and new.email_confirmed_at is not null then
    update public.usuarios set auth_id = new.id
     where auth_id is null and lower(email) = lower(new.email);
  end if;
  return new;
end $$;
create trigger vincular_usuario_ao_login after insert or update of email, email_confirmed_at on auth.users
  for each row execute function private.vincular_usuario_ao_login();

-- Quem já estava cadastrado e tem login confirmado.
update public.usuarios u set auth_id = a.id
  from auth.users a
 where u.auth_id is null and lower(a.email) = lower(u.email) and a.email_confirmed_at is not null;

-- auth_id só é escrito pelos gatilhos acima, nunca pela API.
revoke insert, update on public.usuarios from authenticated;
grant insert (nome, email, papel_id, ativo), update (nome, email, papel_id, ativo) on public.usuarios to authenticated;

-- =====================================================================
-- 2. Funções auxiliares no schema privado
-- =====================================================================

alter function public.nivel(text) set schema private;
alter function public.pode_ver(text[]) set schema private;
alter function public.pode_editar(text) set schema private;
alter function public.app_usuario_ref() set schema private;
-- (as políticas de RLS acompanham: elas guardam a função, não o nome)

create or replace function private.app_usuario_ref() returns table (papel_id text)
language sql stable security definer set search_path = public, pg_catalog as $$
  select u.papel_id from public.usuarios u where u.ativo and u.auth_id = auth.uid() limit 1
$$;

create or replace function private.nivel(p_modulo text) returns text
language sql stable security definer set search_path = public, pg_catalog as $$
  select coalesce(
    (select p.permissoes ->> p_modulo
       from public.usuarios u
       join public.papeis p on p.id = u.papel_id
      where u.ativo and u.auth_id = auth.uid()
      limit 1),
    'nenhum')
$$;

create or replace function private.pode_ver(variadic p_modulos text[]) returns boolean
language sql stable security definer set search_path = public, pg_catalog as $$
  select exists (select 1 from unnest(p_modulos) m where private.nivel(m) in ('visualizar', 'editar'))
$$;

create or replace function private.pode_editar(p_modulo text) returns boolean
language sql stable security definer set search_path = public, pg_catalog as $$
  select private.nivel(p_modulo) = 'editar'
$$;

-- Usada dentro das funções de negócio. Não precisa ser SECURITY DEFINER.
create or replace function public.exigir_editar(p_modulo text) returns void
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
begin
  if not private.pode_editar(p_modulo) then
    raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
  end if;
end $$;

revoke all on function private.nivel(text), private.pode_ver(text[]), private.pode_editar(text),
  private.app_usuario_ref() from public, anon;
grant execute on function private.nivel(text), private.pode_ver(text[]), private.pode_editar(text),
  private.app_usuario_ref() to authenticated;

-- Cada um lê a própria linha pelo auth.uid(); quem tem acesso ao módulo lê todas.
alter policy usuarios_select on public.usuarios
  using ((select private.pode_ver('usuarios')) or auth_id = (select auth.uid()));

-- =====================================================================
-- 3. Auditoria
-- =====================================================================

create table public.auditoria (
  id           bigint generated always as identity primary key,
  quando       timestamptz not null default now(),
  quem_id      uuid,
  quem         text not null,
  tabela       text not null,
  operacao     text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id  text,
  antes        jsonb,
  depois       jsonb
);
create index auditoria_quando_idx on public.auditoria (quando desc);
alter table public.auditoria enable row level security;
create policy auditoria_select on public.auditoria for select to authenticated
  using ((select private.pode_editar('usuarios')));
revoke all on public.auditoria from anon, authenticated;
grant select on public.auditoria to authenticated;
-- Ninguém grava na auditoria pela API: só os gatilhos (SECURITY DEFINER).

-- UPDATE guarda só as colunas que mudaram. Argumentos do gatilho = colunas a ignorar
-- (ex.: estoque, que já tem histórico próprio em movimentacoes).
create or replace function private.auditar() returns trigger
language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_ignorar text[] := coalesce(tg_argv, '{}');
  v_velho jsonb; v_novo jsonb; v_antes jsonb; v_depois jsonb; v_id text; v_nome text;
begin
  if tg_op = 'INSERT' then
    v_novo := to_jsonb(new); v_depois := v_novo; v_id := v_novo ->> 'id';
  elsif tg_op = 'DELETE' then
    v_velho := to_jsonb(old); v_antes := v_velho; v_id := v_velho ->> 'id';
  else
    v_velho := to_jsonb(old); v_novo := to_jsonb(new); v_id := v_novo ->> 'id';
    select coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb),
           coalesce(jsonb_object_agg(n.key, v_velho -> n.key), '{}'::jsonb)
      into v_depois, v_antes
      from jsonb_each(v_novo) n
     where (v_velho -> n.key) is distinct from n.value and n.key <> all (v_ignorar);
    if v_depois = '{}'::jsonb then
      return null;
    end if;
  end if;

  select u.nome into v_nome from public.usuarios u where u.auth_id = auth.uid();
  insert into public.auditoria (quem_id, quem, tabela, operacao, registro_id, antes, depois)
  values (auth.uid(), coalesce(v_nome, case when auth.uid() is null then 'sistema' else 'desconhecido' end),
          tg_table_name, tg_op, v_id, v_antes, v_depois);
  return null;
end $$;

create trigger auditar_produtos after insert or update or delete on public.produtos
  for each row execute function private.auditar('estoque');
create trigger auditar_clientes after insert or update or delete on public.clientes
  for each row execute function private.auditar();
create trigger auditar_fornecedores after insert or update or delete on public.fornecedores
  for each row execute function private.auditar();
create trigger auditar_lancamentos after insert or update or delete on public.lancamentos
  for each row execute function private.auditar();
create trigger auditar_entregas after insert or update or delete on public.entregas
  for each row execute function private.auditar();
create trigger auditar_pedidos_compra after insert or update or delete on public.pedidos_compra
  for each row execute function private.auditar();
create trigger auditar_usuarios after insert or update or delete on public.usuarios
  for each row execute function private.auditar();
create trigger auditar_papeis after insert or update or delete on public.papeis
  for each row execute function private.auditar();
create trigger auditar_empresa_fiscal after insert or update or delete on public.empresa_fiscal
  for each row execute function private.auditar('proximo_numero');
