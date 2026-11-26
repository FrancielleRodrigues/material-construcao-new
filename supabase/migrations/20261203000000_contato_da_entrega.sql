-- Entrega pelo PDV: nome e telefone de quem recebe (obrigatórios para cliente sem cadastro) e ponto de referência.

alter table public.entregas add column contato_nome text not null default '';
alter table public.entregas add column contato_telefone text not null default '';
alter table public.entregas add column ponto_referencia text not null default '';
alter table public.entregas add constraint entregas_contato_tamanho
  check (length(contato_nome) <= 120 and length(contato_telefone) <= 11 and length(ponto_referencia) <= 200);

drop function public.finalizar_venda(bigint, text, jsonb, text, numeric, text, text, date, boolean);

create or replace function public.finalizar_venda(
  p_cliente_id bigint,
  p_forma_pagamento text,
  p_itens jsonb,
  p_desconto_tipo text default 'percentual',
  p_desconto_valor numeric default 0,
  p_tipo_entrega text default 'retirada',
  p_endereco_entrega text default '',
  p_data_entrega date default null,
  p_gerar_nota boolean default false,
  p_contato_nome text default '',
  p_contato_telefone text default '',
  p_ponto_referencia text default ''
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb; v_row record; v_prod public.produtos;
  v_linhas jsonb := '[]'::jsonb;
  v_subtotal numeric := 0; v_desc numeric; v_total numeric;
  v_venda public.vendas; v_emp public.empresa_fiscal; v_descricao text := '';
  v_pago boolean;
  v_nome text := btrim(coalesce(p_contato_nome, ''));
  v_tel text := regexp_replace(coalesce(p_contato_telefone, ''), '\D', '', 'g');
  v_ref text := btrim(coalesce(p_ponto_referencia, ''));
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
  if p_tipo_entrega = 'entrega' then
    if length(v_nome) > 120 or length(v_ref) > 200 or length(v_tel) > 11 then raise exception 'Dados de contato da entrega muito longos.'; end if;
    -- cliente sem cadastro: a entrega precisa de quem receber e de um telefone para o motorista ligar
    if p_cliente_id is null then
      if v_nome = '' then raise exception 'Informe o nome de quem vai receber a entrega.'; end if;
      if length(v_tel) not in (10, 11) then raise exception 'Informe o telefone (com DDD) de quem vai receber a entrega.'; end if;
    end if;
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
    insert into public.entregas (venda_id, cliente_id, endereco, itens_descricao, data_prevista, observacao,
                                 contato_nome, contato_telefone, ponto_referencia)
    values (v_venda.id, p_cliente_id, p_endereco_entrega, v_descricao, coalesce(p_data_entrega, public.hoje()),
            'Gerada a partir da venda PDV nº ' || v_venda.numero, v_nome, v_tel, v_ref);
  end if;

  if coalesce(p_gerar_nota, false) then
    select * into v_emp from public.empresa_fiscal where id = 1 for update;
    insert into public.notas_fiscais (venda_id, numero, serie) values (v_venda.id, v_emp.proximo_numero, v_emp.serie_nfe);
    update public.empresa_fiscal set proximo_numero = proximo_numero + 1 where id = 1;
  end if;

  return v_venda.id;
end $$;

revoke all on function public.finalizar_venda(bigint, text, jsonb, text, numeric, text, text, date, boolean, text, text, text) from public, anon;
grant execute on function public.finalizar_venda(bigint, text, jsonb, text, numeric, text, text, date, boolean, text, text, text) to authenticated;
