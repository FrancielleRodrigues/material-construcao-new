-- Relatórios: permissão própria, custo do produto (margem) e funções que entregam a BASE
-- detalhada de cada período. A tela calcula as análises em cima dessa base e o Excel exporta
-- exatamente as mesmas linhas.
--
-- Segurança: as funções rel_* são SECURITY INVOKER, ou seja, valem as permissões de cada módulo
-- (RLS). "Relatórios" libera a página; quem não vê o Financeiro não recebe lançamentos por aqui,
-- e assim por diante.

-- =====================================================================
-- 1. Módulo de permissão "relatorios"
-- =====================================================================

-- O papel fixo (admin) é protegido por gatilho; só esta migração o altera.
alter table public.papeis disable trigger papeis_fixo;
update public.papeis set permissoes = permissoes || '{"relatorios":"editar"}'::jsonb      where id = 'admin';
update public.papeis set permissoes = permissoes || '{"relatorios":"visualizar"}'::jsonb  where id = 'gerente';
update public.papeis set permissoes = permissoes || '{"relatorios":"nenhum"}'::jsonb      where id in ('vendedor', 'caixa');
alter table public.papeis enable trigger papeis_fixo;

-- =====================================================================
-- 2. Custo (para margem de lucro)
-- =====================================================================

-- Preço de custo atual do produto (opcional: vazio = não informado).
alter table public.produtos add column custo numeric(12,2) check (custo >= 0);
-- Custo do produto NO MOMENTO da venda, para a margem histórica não mudar quando o custo mudar.
alter table public.vendas_itens add column custo_unitario numeric(12,2);

create index vendas_data_idx on public.vendas (data);
create index vendas_itens_produto_idx on public.vendas_itens (produto_id);
create index lancamentos_data_pagamento_idx on public.lancamentos (data_pagamento);
create index pedidos_compra_data_idx on public.pedidos_compra (data);

-- finalizar_venda passa a gravar o custo de cada item.
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
    v_linhas := v_linhas || jsonb_build_object('produto_id', v_prod.id, 'nome', v_prod.nome, 'quantidade', v_row.qtd,
                                               'preco', v_prod.preco, 'custo', v_prod.custo);
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
    insert into public.vendas_itens (venda_id, produto_id, nome, quantidade, preco_unitario, custo_unitario)
    values (v_venda.id, (v_item ->> 'produto_id')::bigint, v_item ->> 'nome',
            (v_item ->> 'quantidade')::numeric, (v_item ->> 'preco')::numeric, (v_item ->> 'custo')::numeric);
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
-- 3. Funções de relatório (base detalhada do período)
-- =====================================================================

create or replace function private.exigir_relatorios() returns void
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
begin
  if not private.pode_ver('relatorios') then
    raise exception 'Você não tem permissão para ver relatórios.' using errcode = '42501';
  end if;
end $$;

-- Uma linha por venda.
create or replace function public.rel_vendas(p_inicio date, p_fim date)
returns table (id bigint, numero integer, data date, cliente_id bigint, cliente text, forma_pagamento text,
               itens numeric, subtotal numeric, desconto numeric, total numeric, tipo_entrega text, nota_gerada boolean)
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
#variable_conflict use_column
begin
  perform private.exigir_relatorios();
  return query
  select v.id, v.numero, v.data, v.cliente_id, c.nome, v.forma_pagamento,
         coalesce((select sum(i.quantidade) from public.vendas_itens i where i.venda_id = v.id), 0),
         v.subtotal, v.desconto_calculado, v.total, v.tipo_entrega, v.nota_gerada
    from public.vendas v
    left join public.clientes c on c.id = v.cliente_id
   where v.data between p_inicio and p_fim
   order by v.data, v.numero;
end $$;

-- Uma linha por item vendido (com o custo da época da venda).
create or replace function public.rel_itens_vendidos(p_inicio date, p_fim date)
returns table (venda_id bigint, numero integer, data date, cliente_id bigint, cliente text, forma_pagamento text,
               produto_id bigint, produto text, categoria text, unidade text, quantidade numeric,
               preco_unitario numeric, total_item numeric, custo_unitario numeric)
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
#variable_conflict use_column
begin
  perform private.exigir_relatorios();
  return query
  select i.venda_id, v.numero, v.data, v.cliente_id, c.nome, v.forma_pagamento,
         i.produto_id, i.nome, p.categoria, p.unidade, i.quantidade, i.preco_unitario,
         round(i.quantidade * i.preco_unitario, 2), i.custo_unitario
    from public.vendas_itens i
    join public.vendas v on v.id = i.venda_id
    left join public.clientes c on c.id = v.cliente_id
    left join public.produtos p on p.id = i.produto_id
   where v.data between p_inicio and p_fim
   order by v.data, v.numero, i.id;
end $$;

-- Lançamentos que vencem OU foram pagos no período.
create or replace function public.rel_lancamentos(p_inicio date, p_fim date)
returns table (id bigint, tipo text, descricao text, valor numeric, vencimento date, pago boolean,
               data_pagamento date, cliente_id bigint, fornecedor_id bigint, parte text,
               forma_pagamento text, observacao text, dias_atraso integer)
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
#variable_conflict use_column
begin
  perform private.exigir_relatorios();
  return query
  select l.id, l.tipo, l.descricao, l.valor, l.vencimento, l.pago, l.data_pagamento, l.cliente_id, l.fornecedor_id,
         coalesce(nullif(c.nome, ''), nullif(f.nome, ''), nullif(l.contraparte, ''), ''),
         l.forma_pagamento, l.observacao,
         case when l.pago then 0 else greatest(public.hoje() - l.vencimento, 0) end
    from public.lancamentos l
    left join public.clientes c on c.id = l.cliente_id
    left join public.fornecedores f on f.id = l.fornecedor_id
   where l.vencimento between p_inicio and p_fim or l.data_pagamento between p_inicio and p_fim
   order by l.vencimento, l.id;
end $$;

-- Tudo que está em aberto hoje, de qualquer data (inadimplência e contas a pagar).
create or replace function public.rel_em_aberto()
returns table (id bigint, tipo text, descricao text, valor numeric, vencimento date, pago boolean,
               data_pagamento date, cliente_id bigint, fornecedor_id bigint, parte text,
               forma_pagamento text, observacao text, dias_atraso integer)
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
#variable_conflict use_column
begin
  perform private.exigir_relatorios();
  return query
  select l.id, l.tipo, l.descricao, l.valor, l.vencimento, l.pago, l.data_pagamento, l.cliente_id, l.fornecedor_id,
         coalesce(nullif(c.nome, ''), nullif(f.nome, ''), nullif(l.contraparte, ''), ''),
         l.forma_pagamento, l.observacao,
         greatest(public.hoje() - l.vencimento, 0)
    from public.lancamentos l
    left join public.clientes c on c.id = l.cliente_id
    left join public.fornecedores f on f.id = l.fornecedor_id
   where not l.pago
   order by l.vencimento, l.id;
end $$;

-- Posição atual do estoque + quanto vendeu no período e quando vendeu pela última vez.
create or replace function public.rel_estoque(p_inicio date, p_fim date)
returns table (id bigint, nome text, categoria text, unidade text, estoque numeric, estoque_min numeric,
               preco numeric, custo numeric, fornecedor text, vendido numeric, ultima_venda date)
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
#variable_conflict use_column
begin
  perform private.exigir_relatorios();
  return query
  select p.id, p.nome, p.categoria, p.unidade, p.estoque, p.estoque_min, p.preco, p.custo, f.nome,
         coalesce((select sum(i.quantidade) from public.vendas_itens i join public.vendas v on v.id = i.venda_id
                    where i.produto_id = p.id and v.data between p_inicio and p_fim), 0),
         (select max(v.data) from public.vendas_itens i join public.vendas v on v.id = i.venda_id where i.produto_id = p.id)
    from public.produtos p
    left join public.fornecedores f on f.id = p.fornecedor_id
   order by p.nome, p.id;
end $$;

-- Pedidos de compra do período, com o total.
create or replace function public.rel_compras(p_inicio date, p_fim date)
returns table (id bigint, numero integer, data date, fornecedor_id bigint, fornecedor text, status text,
               data_prevista date, data_recebimento date, itens numeric, total numeric)
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
#variable_conflict use_column
begin
  perform private.exigir_relatorios();
  return query
  select p.id, p.numero, p.data, p.fornecedor_id, f.nome, p.status, p.data_prevista, p.data_recebimento,
         coalesce((select sum(i.quantidade) from public.pedidos_compra_itens i where i.pedido_id = p.id), 0),
         round(coalesce((select sum(i.quantidade * i.preco_unitario) from public.pedidos_compra_itens i where i.pedido_id = p.id), 0), 2)
    from public.pedidos_compra p
    left join public.fornecedores f on f.id = p.fornecedor_id
   where p.data between p_inicio and p_fim
   order by p.data, p.numero;
end $$;

-- Funções novas nascem executáveis por todos: só usuários logados podem chamar.
revoke all on function private.exigir_relatorios() from public, anon;
grant execute on function private.exigir_relatorios() to authenticated;
revoke all on function
  public.rel_vendas(date, date), public.rel_itens_vendidos(date, date), public.rel_lancamentos(date, date),
  public.rel_em_aberto(), public.rel_estoque(date, date), public.rel_compras(date, date)
  from public, anon;
grant execute on function
  public.rel_vendas(date, date), public.rel_itens_vendidos(date, date), public.rel_lancamentos(date, date),
  public.rel_em_aberto(), public.rel_estoque(date, date), public.rel_compras(date, date)
  to authenticated;
