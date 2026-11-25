-- Módulo Empresa: dados cadastrais da loja (cabeçalho do cupom, emitente da NF-e etc.).
-- Tabela própria (uma linha só) e permissão própria `empresa`; o módulo Fiscal fica só com os
-- parâmetros de emissão (provedor, ambiente, série, número, certificado) em `empresa_fiscal`.
-- As colunas de identidade que existiam em empresa_fiscal (razao_social, nome_fantasia, cnpj, ie,
-- regime_tributario, endereco, telefone) são LEGADO: foram copiadas para cá e o sistema não as lê mais.

create table public.empresa (
  id                 integer primary key default 1 check (id = 1),
  razao_social       text not null default '',
  nome_fantasia      text not null default '',
  cnpj               text not null default '',
  ie                 text not null default '',
  im                 text not null default '',
  regime_tributario  text not null default 'simples_nacional',
  telefone           text not null default '',
  email              text not null default '',
  site               text not null default '',
  endereco           jsonb not null default '{}'::jsonb,
  mensagem_cupom     text not null default ''
);

insert into public.empresa (id, razao_social, nome_fantasia, cnpj, ie, regime_tributario, telefone, endereco)
select 1, razao_social, nome_fantasia, cnpj, ie, regime_tributario, telefone, endereco
  from public.empresa_fiscal where id = 1;
insert into public.empresa (id) values (1) on conflict (id) do nothing;

-- CNPJ vazio (ainda não cadastrado) ou com 14 números. NOT VALID: não reprova o que já foi copiado.
alter table public.empresa
  add constraint empresa_cnpj_tamanho check (cnpj = '' or length(regexp_replace(cnpj, '\D', '', 'g')) = 14) not valid;

alter table public.empresa enable row level security;
-- Lê quem usa o cadastro, a venda (cabeçalho do cupom) ou o fiscal; altera só quem edita Empresa.
create policy empresa_select on public.empresa for select to authenticated
  using ((select private.pode_ver('empresa', 'fiscal', 'venda')));
create policy empresa_update on public.empresa for update to authenticated
  using ((select private.pode_editar('empresa'))) with check ((select private.pode_editar('empresa')));
revoke all on public.empresa from public, anon, authenticated;
grant select, update on public.empresa to authenticated;

create trigger auditar_empresa after insert or update or delete on public.empresa
  for each row execute function private.auditar();

-- Permissão do módulo: administrador edita, gerente visualiza, vendedor e caixa sem acesso
-- (o cabeçalho do cupom eles continuam lendo pela policy acima).
alter table public.papeis disable trigger papeis_fixo;
update public.papeis set permissoes = permissoes || '{"empresa":"editar"}'::jsonb      where id = 'admin';
update public.papeis set permissoes = permissoes || '{"empresa":"visualizar"}'::jsonb  where id = 'gerente';
update public.papeis set permissoes = permissoes || '{"empresa":"nenhum"}'::jsonb      where id in ('vendedor', 'caixa');
alter table public.papeis enable trigger papeis_fixo;
