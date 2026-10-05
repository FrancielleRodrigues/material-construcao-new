-- ConstruGestão — esquema inicial (Supabase / Postgres)
--
-- Como aplicar: Supabase → SQL Editor → colar este arquivo inteiro → Run.
-- Depois rode supabase/seed_admin.sql (troque o e-mail pelo seu).
--
-- Segurança: toda tabela tem RLS ligado. O acesso é decidido no BANCO pelo papel do
-- usuário logado (tabela papeis.permissoes), não pelo front-end:
--   nenhum | visualizar (select) | editar (select + insert/update/delete).
-- O usuário logado é identificado pelo e-mail do JWT (auth.jwt()->>'email') ligado a
-- usuarios.email. Quem não está em `usuarios` (ou está inativo) não enxerga nada.
-- Operações que mexem em várias tabelas (venda, recebimento de compra, movimentação
-- de estoque) são funções SECURITY DEFINER que conferem a permissão e rodam numa
-- transação só.

-- =====================================================================
-- Helpers
-- =====================================================================

-- "Hoje" no fuso do Brasil (o servidor roda em UTC).
create or replace function public.hoje() returns date
language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- =====================================================================
-- Papéis e usuários
-- =====================================================================

-- Cada valor de permissão precisa ser nenhum | visualizar | editar.
create or replace function public.permissoes_validas(p jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(p) = 'object'
     and not exists (select 1 from jsonb_each_text(p) e where e.value not in ('nenhum', 'visualizar', 'editar'))
$$;

create table public.papeis (
  id          text primary key,
  nome        text not null,
  fixo        boolean not null default false,
  permissoes  jsonb not null default '{}'::jsonb,
  constraint papeis_permissoes_validas check (public.permissoes_validas(permissoes))
);

create table public.usuarios (
  id        bigint generated always as identity primary key,
  nome      text not null,
  email     text not null,
  papel_id  text not null references public.papeis(id) on delete restrict,
  ativo     boolean not null default true
);
create unique index usuarios_email_uniq on public.usuarios (lower(email));

-- Referência interna para a policy de papeis (linha do usuário logado, sem passar por RLS).
create or replace function public.app_usuario_ref() returns table (papel_id text)
language sql stable security definer set search_path = public as $$
  select u.papel_id from public.usuarios u
   where u.ativo and lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
   limit 1
$$;

-- Nível de acesso do usuário logado a um módulo.
create or replace function public.nivel(p_modulo text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.permissoes ->> p_modulo
       from public.usuarios u
       join public.papeis p on p.id = u.papel_id
      where u.ativo
        and lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      limit 1),
    'nenhum')
$$;

-- Pode ver se tem visualizar/editar em QUALQUER um dos módulos informados.
create or replace function public.pode_ver(variadic p_modulos text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from unnest(p_modulos) m where public.nivel(m) in ('visualizar', 'editar'))
$$;

create or replace function public.pode_editar(p_modulo text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.nivel(p_modulo) = 'editar'
$$;

-- O papel fixo (Administrador) não pode ser alterado nem apagado.
create or replace function public.trg_papel_fixo() returns trigger
language plpgsql as $$
begin
  if old.fixo then
    raise exception 'O papel "%" é fixo e não pode ser alterado ou excluído.', old.nome using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger papeis_fixo before update or delete on public.papeis
  for each row execute function public.trg_papel_fixo();

-- Sempre sobra pelo menos um administrador ativo (evita trancar todo mundo para fora).
create or replace function public.trg_ultimo_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.papel_id = 'admin' and old.ativo
     and (tg_op = 'DELETE' or new.papel_id <> 'admin' or not new.ativo)
     and not exists (select 1 from public.usuarios u where u.papel_id = 'admin' and u.ativo and u.id <> old.id)
  then
    raise exception 'Precisa existir ao menos um administrador ativo.' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger usuarios_ultimo_admin before update or delete on public.usuarios
  for each row execute function public.trg_ultimo_admin();

-- =====================================================================
-- Cadastros
-- =====================================================================

create table public.clientes (
  id                  bigint generated always as identity primary key,
  tipo                text not null check (tipo in ('PF', 'PJ')),
  nome                text not null,
  documento           text not null,
  telefone            text not null default '',
  email               text not null default '',
  inscricao_estadual  text not null default '',
  indicador_ie        text not null default 'nao_contribuinte',
  endereco            jsonb not null default '{}'::jsonb
);
create unique index clientes_documento_uniq on public.clientes (regexp_replace(documento, '\D', '', 'g'));

create table public.fornecedores (
  id                  bigint generated always as identity primary key,
  tipo                text not null check (tipo in ('PF', 'PJ')),
  nome                text not null,
  documento           text not null,
  telefone            text not null default '',
  email               text not null default '',
  categoria           text not null default '',
  condicao_pagamento  text not null default '',
  endereco            jsonb not null default '{}'::jsonb,
  observacao          text not null default ''
);
create unique index fornecedores_documento_uniq on public.fornecedores (regexp_replace(documento, '\D', '', 'g'));

create table public.produtos (
  id             bigint generated always as identity primary key,
  nome           text not null,
  categoria      text not null default '',
  unidade        text not null default 'un',
  preco          numeric(12,2) not null check (preco >= 0),
  estoque        numeric(14,3) not null default 0 check (estoque >= 0),
  estoque_min    numeric(14,3) not null default 0 check (estoque_min >= 0),
  codigo_barras  text,
  fornecedor_id  bigint references public.fornecedores(id) on delete set null
);
create unique index produtos_codigo_barras_uniq on public.produtos (codigo_barras) where codigo_barras is not null and codigo_barras <> '';

-- =====================================================================
-- Estoque
-- =====================================================================

create table public.movimentacoes (
  id          bigint generated always as identity primary key,
  produto_id  bigint not null references public.produtos(id) on delete restrict,
  tipo        text not null check (tipo in ('entrada', 'saida')),
  quantidade  numeric(14,3) not null check (quantidade > 0),
  motivo      text not null,
  observacao  text not null default '',
  data        date not null default public.hoje()
);
create index movimentacoes_produto_idx on public.movimentacoes (produto_id);

-- Toda mudança de estoque deixa rastro em movimentacoes. As funções de venda/compra/
-- movimentação registram o próprio movimento (e sinalizam com app.mov_interna); qualquer
-- outra alteração (ex.: editar o estoque no cadastro do produto) vira um movimento de ajuste.
create or replace function public.trg_produto_estoque() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.mov_interna', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.estoque > 0 then
      insert into public.movimentacoes (produto_id, tipo, quantidade, motivo, observacao)
      values (new.id, 'entrada', new.estoque, 'ajuste', 'Estoque inicial');
    end if;
  elsif new.estoque is distinct from old.estoque then
    insert into public.movimentacoes (produto_id, tipo, quantidade, motivo, observacao)
    values (new.id, case when new.estoque > old.estoque then 'entrada' else 'saida' end,
            abs(new.estoque - old.estoque), 'ajuste', 'Ajuste pelo cadastro do produto');
  end if;
  return new;
end $$;
create trigger produtos_estoque_ins after insert on public.produtos
  for each row execute function public.trg_produto_estoque();
create trigger produtos_estoque_upd after update of estoque on public.produtos
  for each row execute function public.trg_produto_estoque();

-- =====================================================================
-- Compras
-- =====================================================================

create sequence public.seq_pedido_numero start 5001;

create table public.pedidos_compra (
  id                bigint generated always as identity primary key,
  numero            integer not null unique default nextval('public.seq_pedido_numero'),
  fornecedor_id     bigint references public.fornecedores(id) on delete set null,
  data              date not null default public.hoje(),
  data_prevista     date,
  status            text not null default 'pendente' check (status in ('pendente', 'recebido')),
  data_recebimento  date,
  observacao        text not null default ''
);

create table public.pedidos_compra_itens (
  id              bigint generated always as identity primary key,
  pedido_id       bigint not null references public.pedidos_compra(id) on delete cascade,
  produto_id      bigint references public.produtos(id) on delete set null,
  nome            text not null,
  quantidade      numeric(14,3) not null check (quantidade > 0),
  preco_unitario  numeric(12,2) not null check (preco_unitario >= 0)
);
create index pedidos_compra_itens_pedido_idx on public.pedidos_compra_itens (pedido_id);

-- =====================================================================
-- Vendas, entregas, fiscal
-- =====================================================================

create sequence public.seq_venda_numero start 1001;

create table public.vendas (
  id                  bigint generated always as identity primary key,
  numero              integer not null unique default nextval('public.seq_venda_numero'),
  data                date not null default public.hoje(),
  cliente_id          bigint references public.clientes(id) on delete set null,
  forma_pagamento     text not null,
  subtotal            numeric(14,2) not null default 0,
  desconto_tipo       text not null default 'percentual' check (desconto_tipo in ('percentual', 'valor')),
  desconto_valor      numeric(14,2) not null default 0,
  desconto_calculado  numeric(14,2) not null default 0,
  total               numeric(14,2) not null default 0,
  tipo_entrega        text not null default 'retirada' check (tipo_entrega in ('retirada', 'entrega')),
  endereco_entrega    text not null default '',
  nota_gerada         boolean not null default false
);

create table public.vendas_itens (
  id              bigint generated always as identity primary key,
  venda_id        bigint not null references public.vendas(id) on delete cascade,
  produto_id      bigint references public.produtos(id) on delete set null,
  nome            text not null,
  quantidade      numeric(14,3) not null check (quantidade > 0),
  preco_unitario  numeric(12,2) not null check (preco_unitario >= 0)
);
create index vendas_itens_venda_idx on public.vendas_itens (venda_id);

create table public.entregas (
  id               bigint generated always as identity primary key,
  venda_id         bigint references public.vendas(id) on delete set null,
  cliente_id       bigint references public.clientes(id) on delete set null,
  endereco         text not null default '',
  itens_descricao  text not null default '',
  data_prevista    date,
  motorista        text not null default '',
  veiculo          text not null default '',
  status           text not null default 'pendente' check (status in ('pendente', 'em_rota', 'entregue', 'cancelada')),
  observacao       text not null default ''
);

create table public.empresa_fiscal (
  id                     integer primary key default 1 check (id = 1),
  razao_social           text not null default '',
  nome_fantasia          text not null default '',
  cnpj                   text not null default '',
  ie                     text not null default '',
  regime_tributario      text not null default 'simples_nacional',
  ambiente               text not null default 'homologacao',
  provedor               text not null default '',
  -- Só um aviso de que a integração foi configurada. O certificado digital A1 NUNCA
  -- vai para o banco nem para o navegador: fica no provedor/servidor de emissão.
  certificado_instalado  boolean not null default false,
  serie_nfe              text not null default '1',
  proximo_numero         integer not null default 1 check (proximo_numero >= 1)
);
insert into public.empresa_fiscal (id) values (1);

-- ATENÇÃO: notas geradas aqui são RASCUNHOS sem validade fiscal.
create table public.notas_fiscais (
  id            bigint generated always as identity primary key,
  venda_id      bigint not null unique references public.vendas(id) on delete cascade,
  numero        integer not null,
  serie         text not null,
  status        text not null default 'rascunho' check (status in ('rascunho')),
  data_geracao  date not null default public.hoje()
);

-- =====================================================================
-- Financeiro
-- =====================================================================

create table public.lancamentos (
  id               bigint generated always as identity primary key,
  tipo             text not null check (tipo in ('receita', 'despesa')),
  descricao        text not null,
  valor            numeric(14,2) not null check (valor >= 0),
  vencimento       date not null,
  pago             boolean not null default false,
  data_pagamento   date,
  cliente_id       bigint references public.clientes(id) on delete set null,
  fornecedor_id    bigint references public.fornecedores(id) on delete set null,
  contraparte      text not null default '',
  forma_pagamento  text not null default '',
  observacao       text not null default ''
);
create index lancamentos_vencimento_idx on public.lancamentos (vencimento);

-- =====================================================================
-- RLS
-- =====================================================================

alter table public.papeis               enable row level security;
alter table public.usuarios             enable row level security;
alter table public.clientes             enable row level security;
alter table public.fornecedores         enable row level security;
alter table public.produtos             enable row level security;
alter table public.movimentacoes        enable row level security;
alter table public.pedidos_compra       enable row level security;
alter table public.pedidos_compra_itens enable row level security;
alter table public.vendas               enable row level security;
alter table public.vendas_itens         enable row level security;
alter table public.entregas             enable row level security;
alter table public.empresa_fiscal       enable row level security;
alter table public.notas_fiscais        enable row level security;
alter table public.lancamentos          enable row level security;

-- Papéis: qualquer usuário cadastrado e ativo lê (precisa do próprio papel); só quem
-- edita "usuarios" altera.
create policy papeis_select on public.papeis for select to authenticated
  using ((select public.nivel('usuarios') <> 'nenhum') or id = (select papel_id from public.app_usuario_ref()));
create policy papeis_write on public.papeis for all to authenticated
  using ((select public.pode_editar('usuarios'))) with check ((select public.pode_editar('usuarios')));

-- Usuários: cada um lê a própria linha; quem tem acesso ao módulo lê todas.
create policy usuarios_select on public.usuarios for select to authenticated
  using ((select public.pode_ver('usuarios')) or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy usuarios_write on public.usuarios for all to authenticated
  using ((select public.pode_editar('usuarios'))) with check ((select public.pode_editar('usuarios')));

-- Cadastros e demais tabelas. A leitura vale também para módulos que dependem do dado
-- (ex.: o PDV precisa ler produtos e clientes).
create policy clientes_select on public.clientes for select to authenticated
  using ((select public.pode_ver('clientes', 'venda', 'entregas', 'financeiro', 'fiscal')));
create policy clientes_write on public.clientes for all to authenticated
  using ((select public.pode_editar('clientes')) or (select public.pode_editar('venda')))
  with check ((select public.pode_editar('clientes')) or (select public.pode_editar('venda')));

create policy fornecedores_select on public.fornecedores for select to authenticated
  using ((select public.pode_ver('fornecedores', 'compras', 'produtos', 'financeiro')));
create policy fornecedores_write on public.fornecedores for all to authenticated
  using ((select public.pode_editar('fornecedores'))) with check ((select public.pode_editar('fornecedores')));

create policy produtos_select on public.produtos for select to authenticated
  using ((select public.pode_ver('produtos', 'estoque', 'venda', 'compras')));
-- Estoque (quantidade) só muda pelas funções abaixo; mas o cadastro edita o resto.
create policy produtos_write on public.produtos for all to authenticated
  using ((select public.pode_editar('produtos'))) with check ((select public.pode_editar('produtos')));

create policy movimentacoes_select on public.movimentacoes for select to authenticated
  using ((select public.pode_ver('estoque')));
-- Sem policy de escrita: só as funções SECURITY DEFINER inserem movimentações.

create policy pedidos_select on public.pedidos_compra for select to authenticated
  using ((select public.pode_ver('compras')));
-- Criar/editar pedido: salvar_pedido_compra(). Receber: registrar_recebimento().
create policy pedidos_delete on public.pedidos_compra for delete to authenticated
  using ((select public.pode_editar('compras')));
create policy pedidos_itens_select on public.pedidos_compra_itens for select to authenticated
  using ((select public.pode_ver('compras')));

create policy vendas_select on public.vendas for select to authenticated
  using ((select public.pode_ver('venda', 'entregas', 'fiscal')));
create policy vendas_itens_select on public.vendas_itens for select to authenticated
  using ((select public.pode_ver('venda', 'entregas', 'fiscal')));
-- Vendas só são criadas por finalizar_venda().

create policy entregas_select on public.entregas for select to authenticated
  using ((select public.pode_ver('entregas')));
create policy entregas_write on public.entregas for all to authenticated
  using ((select public.pode_editar('entregas'))) with check ((select public.pode_editar('entregas')));

create policy empresa_fiscal_select on public.empresa_fiscal for select to authenticated
  using ((select public.pode_ver('fiscal', 'venda')));
create policy empresa_fiscal_update on public.empresa_fiscal for update to authenticated
  using ((select public.pode_editar('fiscal'))) with check ((select public.pode_editar('fiscal')));

create policy notas_select on public.notas_fiscais for select to authenticated
  using ((select public.pode_ver('fiscal', 'venda')));
-- Notas são criadas por finalizar_venda() e gerar_rascunho_nota().

create policy lancamentos_select on public.lancamentos for select to authenticated
  using ((select public.pode_ver('financeiro')));
create policy lancamentos_write on public.lancamentos for all to authenticated
  using ((select public.pode_editar('financeiro'))) with check ((select public.pode_editar('financeiro')));

-- =====================================================================
-- Operações atômicas (transação única, permissão conferida no servidor)
-- =====================================================================

create or replace function public.exigir_editar(p_modulo text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_editar(p_modulo) then
    raise exception 'Você não tem permissão para esta ação.' using errcode = '42501';
  end if;
end $$;

-- Entrada/saída manual de estoque.
create or replace function public.registrar_movimentacao(
  p_produto_id bigint, p_tipo text, p_quantidade numeric, p_motivo text, p_observacao text default '',
  p_data date default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_prod public.produtos; v_id bigint;
begin
  perform public.exigir_editar('estoque');
  perform set_config('app.mov_interna', 'on', true);
  if p_tipo not in ('entrada', 'saida') then raise exception 'Tipo de movimentação inválido.'; end if;
  if p_quantidade is null or p_quantidade <= 0 then raise exception 'Quantidade deve ser maior que zero.'; end if;

  select * into v_prod from public.produtos where id = p_produto_id for update;
  if not found then raise exception 'Produto não encontrado.'; end if;
  if p_tipo = 'saida' and v_prod.estoque < p_quantidade then
    raise exception 'Estoque insuficiente de "%" (disponível: %).', v_prod.nome, trim_scale(v_prod.estoque);
  end if;

  update public.produtos
     set estoque = estoque + case when p_tipo = 'entrada' then p_quantidade else -p_quantidade end
   where id = p_produto_id;
  insert into public.movimentacoes (produto_id, tipo, quantidade, motivo, observacao, data)
  values (p_produto_id, p_tipo, p_quantidade, p_motivo, coalesce(p_observacao, ''), coalesce(p_data, public.hoje()))
  returning id into v_id;
  return v_id;
end $$;

-- Cria ou edita um pedido de compra PENDENTE junto com os itens, numa transação só.
-- p_itens: [{"produto_id": 1, "nome": "Cimento", "quantidade": 100, "preco_unitario": 32.5}, ...]
create or replace function public.salvar_pedido_compra(
  p_id bigint, p_fornecedor_id bigint, p_data_prevista date, p_observacao text, p_itens jsonb
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_status text; v_item jsonb;
begin
  perform public.exigir_editar('compras');
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'O pedido precisa ter ao menos um item.';
  end if;

  if p_id is null then
    insert into public.pedidos_compra (fornecedor_id, data_prevista, observacao)
    values (p_fornecedor_id, p_data_prevista, coalesce(p_observacao, ''))
    returning id into v_id;
  else
    select status into v_status from public.pedidos_compra where id = p_id for update;
    if not found then raise exception 'Pedido não encontrado.'; end if;
    if v_status <> 'pendente' then raise exception 'Pedido já recebido não pode ser alterado.'; end if;
    update public.pedidos_compra
       set fornecedor_id = p_fornecedor_id, data_prevista = p_data_prevista, observacao = coalesce(p_observacao, '')
     where id = p_id;
    delete from public.pedidos_compra_itens where pedido_id = p_id;
    v_id := p_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_itens) loop
    insert into public.pedidos_compra_itens (pedido_id, produto_id, nome, quantidade, preco_unitario)
    values (v_id, nullif(v_item ->> 'produto_id', '')::bigint, coalesce(v_item ->> 'nome', ''),
            (v_item ->> 'quantidade')::numeric, (v_item ->> 'preco_unitario')::numeric);
  end loop;
  return v_id;
end $$;

-- Pedido de compra → recebimento: entrada no estoque + despesa no financeiro.
create or replace function public.registrar_recebimento(p_pedido_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_ped public.pedidos_compra; v_item record; v_total numeric := 0; v_forn text;
begin
  perform public.exigir_editar('compras');
  perform set_config('app.mov_interna', 'on', true);
  select * into v_ped from public.pedidos_compra where id = p_pedido_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if v_ped.status <> 'pendente' then raise exception 'Este pedido já foi recebido.'; end if;

  for v_item in select * from public.pedidos_compra_itens where pedido_id = p_pedido_id loop
    v_total := v_total + v_item.quantidade * v_item.preco_unitario;
    if v_item.produto_id is not null then
      update public.produtos set estoque = estoque + v_item.quantidade where id = v_item.produto_id;
      insert into public.movimentacoes (produto_id, tipo, quantidade, motivo, observacao)
      values (v_item.produto_id, 'entrada', v_item.quantidade, 'compra', 'Pedido de compra nº ' || v_ped.numero);
    end if;
  end loop;

  select nome into v_forn from public.fornecedores where id = v_ped.fornecedor_id;
  insert into public.lancamentos (tipo, descricao, valor, vencimento, pago, fornecedor_id, contraparte, forma_pagamento)
  values ('despesa', 'Compra - Pedido nº ' || v_ped.numero, round(v_total, 2), public.hoje(), false,
          v_ped.fornecedor_id, coalesce(v_forn, ''), 'boleto');

  update public.pedidos_compra set status = 'recebido', data_recebimento = public.hoje() where id = p_pedido_id;
end $$;

-- Gera um RASCUNHO de nota (sem validade fiscal) para uma venda.
create or replace function public.gerar_rascunho_nota(p_venda_id bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_emp public.empresa_fiscal; v_id bigint;
begin
  perform public.exigir_editar('fiscal');
  if not exists (select 1 from public.vendas where id = p_venda_id) then raise exception 'Venda não encontrada.'; end if;
  if exists (select 1 from public.notas_fiscais where venda_id = p_venda_id) then
    raise exception 'Esta venda já tem nota gerada.';
  end if;
  select * into v_emp from public.empresa_fiscal where id = 1 for update;
  insert into public.notas_fiscais (venda_id, numero, serie) values (p_venda_id, v_emp.proximo_numero, v_emp.serie_nfe)
  returning id into v_id;
  update public.empresa_fiscal set proximo_numero = proximo_numero + 1 where id = 1;
  return v_id;
end $$;

-- Venda do PDV. Os preços vêm do cadastro (o cliente do app não define preço),
-- o estoque é validado e baixado, e tudo é criado numa transação:
-- venda + itens + movimentações + receita no financeiro + (entrega) + (rascunho de nota).
-- p_itens: [{"produto_id": 1, "quantidade": 2}, ...]
create or replace function public.finalizar_venda(
  p_cliente_id bigint,
  p_forma_pagamento text,
  p_itens jsonb,
  p_desconto_tipo text default 'percentual',
  p_desconto_valor numeric default 0,
  p_tipo_entrega text default 'retirada',
  p_endereco_entrega text default '',
  p_data_entrega date default null,
  p_gerar_nota boolean default false
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb; v_row record; v_prod public.produtos;
  v_linhas jsonb := '[]'::jsonb;
  v_subtotal numeric := 0; v_desc numeric; v_total numeric;
  v_venda public.vendas; v_emp public.empresa_fiscal; v_descricao text := '';
  v_pago boolean;
begin
  perform public.exigir_editar('venda');
  perform set_config('app.mov_interna', 'on', true);
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'A venda não tem itens.';
  end if;
  if p_desconto_tipo not in ('percentual', 'valor') then raise exception 'Tipo de desconto inválido.'; end if;
  if p_tipo_entrega not in ('retirada', 'entrega') then raise exception 'Tipo de entrega inválido.'; end if;
  if p_tipo_entrega = 'entrega' and coalesce(trim(p_endereco_entrega), '') = '' then
    raise exception 'Informe o endereço de entrega.';
  end if;

  -- Agrupa itens repetidos, trava os produtos em ordem de id (evita deadlock) e valida estoque.
  for v_row in
    select (value ->> 'produto_id')::bigint as pid, sum((value ->> 'quantidade')::numeric) as qtd
      from jsonb_array_elements(p_itens)
     group by 1 order by 1
  loop
    if v_row.pid is null or v_row.qtd is null or v_row.qtd <= 0 then raise exception 'Item de venda inválido.'; end if;
    select * into v_prod from public.produtos where id = v_row.pid for update;
    if not found then raise exception 'Produto não encontrado.'; end if;
    if v_prod.estoque < v_row.qtd then
      raise exception 'Estoque insuficiente de "%" (disponível: %).', v_prod.nome, trim_scale(v_prod.estoque);
    end if;
    v_subtotal := v_subtotal + v_row.qtd * v_prod.preco;
    v_linhas := v_linhas || jsonb_build_object('produto_id', v_prod.id, 'nome', v_prod.nome, 'quantidade', v_row.qtd, 'preco', v_prod.preco);
    v_descricao := v_descricao || case when v_descricao = '' then '' else ', ' end
                   || trim_scale(v_row.qtd)::text || 'x ' || v_prod.nome;
  end loop;

  v_desc := least(greatest(
    case when p_desconto_tipo = 'percentual' then v_subtotal * (coalesce(p_desconto_valor, 0) / 100)
         else coalesce(p_desconto_valor, 0) end, 0), v_subtotal);
  v_desc := round(v_desc, 2);
  v_subtotal := round(v_subtotal, 2);
  v_total := v_subtotal - v_desc;

  insert into public.vendas (cliente_id, forma_pagamento, subtotal, desconto_tipo, desconto_valor, desconto_calculado,
                             total, tipo_entrega, endereco_entrega, nota_gerada)
  values (p_cliente_id, p_forma_pagamento, v_subtotal, p_desconto_tipo, coalesce(p_desconto_valor, 0), v_desc,
          v_total, p_tipo_entrega, case when p_tipo_entrega = 'entrega' then p_endereco_entrega else '' end,
          coalesce(p_gerar_nota, false))
  returning * into v_venda;

  for v_item in select value from jsonb_array_elements(v_linhas) loop
    insert into public.vendas_itens (venda_id, produto_id, nome, quantidade, preco_unitario)
    values (v_venda.id, (v_item ->> 'produto_id')::bigint, v_item ->> 'nome',
            (v_item ->> 'quantidade')::numeric, (v_item ->> 'preco')::numeric);
    update public.produtos set estoque = estoque - (v_item ->> 'quantidade')::numeric
     where id = (v_item ->> 'produto_id')::bigint;
    insert into public.movimentacoes (produto_id, tipo, quantidade, motivo, observacao)
    values ((v_item ->> 'produto_id')::bigint, 'saida', (v_item ->> 'quantidade')::numeric, 'venda',
            'Venda PDV nº ' || v_venda.numero);
  end loop;

  v_pago := p_forma_pagamento <> 'boleto';
  insert into public.lancamentos (tipo, descricao, valor, vencimento, pago, data_pagamento, cliente_id, forma_pagamento)
  values ('receita', 'Venda PDV nº ' || v_venda.numero, v_total, public.hoje(), v_pago,
          case when v_pago then public.hoje() end, p_cliente_id, p_forma_pagamento);

  if p_tipo_entrega = 'entrega' then
    insert into public.entregas (venda_id, cliente_id, endereco, itens_descricao, data_prevista, observacao)
    values (v_venda.id, p_cliente_id, p_endereco_entrega, v_descricao, coalesce(p_data_entrega, public.hoje()),
            'Gerada a partir da venda PDV nº ' || v_venda.numero);
  end if;

  if coalesce(p_gerar_nota, false) then
    select * into v_emp from public.empresa_fiscal where id = 1 for update;
    insert into public.notas_fiscais (venda_id, numero, serie) values (v_venda.id, v_emp.proximo_numero, v_emp.serie_nfe);
    update public.empresa_fiscal set proximo_numero = proximo_numero + 1 where id = 1;
  end if;

  return v_venda.id;
end $$;

-- =====================================================================
-- Permissões de execução / tabelas
-- =====================================================================

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select, insert, update, delete on
  public.papeis, public.usuarios, public.clientes, public.fornecedores, public.produtos,
  public.entregas, public.lancamentos
  to authenticated;
-- Pedidos: leitura direta e exclusão; criar/editar/receber só pelas funções.
grant select, delete on public.pedidos_compra to authenticated;
grant select on public.pedidos_compra_itens to authenticated;
grant select on public.movimentacoes, public.vendas, public.vendas_itens, public.notas_fiscais to authenticated;
grant select, update on public.empresa_fiscal to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function
  public.hoje(), public.permissoes_validas(jsonb), public.nivel(text), public.pode_ver(text[]), public.pode_editar(text),
  public.app_usuario_ref(),
  public.registrar_movimentacao(bigint, text, numeric, text, text, date),
  public.salvar_pedido_compra(bigint, bigint, date, text, jsonb),
  public.registrar_recebimento(bigint),
  public.gerar_rascunho_nota(bigint),
  public.finalizar_venda(bigint, text, jsonb, text, numeric, text, text, date, boolean)
  to authenticated;

-- =====================================================================
-- Papéis padrão (os mesmos do protótipo)
-- =====================================================================

insert into public.papeis (id, nome, fixo, permissoes) values
  ('admin', 'Administrador', true, '{"clientes":"editar","fornecedores":"editar","compras":"editar","produtos":"editar","venda":"editar","estoque":"editar","financeiro":"editar","fiscal":"editar","entregas":"editar","usuarios":"editar"}'),
  ('gerente', 'Gerente', false, '{"clientes":"editar","fornecedores":"editar","compras":"editar","produtos":"editar","venda":"editar","estoque":"editar","financeiro":"editar","fiscal":"visualizar","entregas":"editar","usuarios":"visualizar"}'),
  ('vendedor', 'Vendedor', false, '{"clientes":"editar","fornecedores":"nenhum","compras":"nenhum","produtos":"visualizar","venda":"editar","estoque":"visualizar","financeiro":"nenhum","fiscal":"nenhum","entregas":"visualizar","usuarios":"nenhum"}'),
  ('caixa', 'Caixa / Financeiro', false, '{"clientes":"visualizar","fornecedores":"visualizar","compras":"visualizar","produtos":"visualizar","venda":"editar","estoque":"visualizar","financeiro":"editar","fiscal":"visualizar","entregas":"visualizar","usuarios":"nenhum"}');
