-- Importação de NF-e de compra (XML): grava fornecedor, produtos, pedido de compra já recebido,
-- entrada no estoque e as parcelas (duplicatas) no Financeiro, tudo numa transação só.
-- O XML é lido no navegador; o banco recebe apenas os dados já conferidos pelo usuário e
-- revalida tudo (permissão por módulo, valores, chave única).

alter table public.pedidos_compra add column chave_acesso text;
alter table public.pedidos_compra add column numero_nota text;
create unique index pedidos_compra_chave_uniq on public.pedidos_compra (chave_acesso) where chave_acesso is not null;

-- Custo unitário de nota pode ter mais de 2 casas (ex.: 0,0345 por unidade).
alter table public.pedidos_compra_itens alter column preco_unitario type numeric(14,4);

-- p_nota: {
--   chave, numero_nf, serie, data_emissao, atualizar_custo,
--   fornecedor: {documento, nome, telefone, endereco: {...}},
--   itens: [{produto_id | novo_produto: {nome, unidade, categoria, preco, codigo_barras, sku},
--            nome, quantidade, preco_unitario}],
--   parcelas: [{vencimento, valor}]
-- }
create or replace function public.importar_nota_compra(p_nota jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_chave text := regexp_replace(coalesce(p_nota ->> 'chave', ''), '\D', '', 'g');
  v_nf text := coalesce(nullif(btrim(p_nota ->> 'numero_nf'), ''), 's/n');
  v_serie text := coalesce(nullif(btrim(p_nota ->> 'serie'), ''), '');
  v_emissao date := nullif(p_nota ->> 'data_emissao', '')::date;
  v_forn jsonb := p_nota -> 'fornecedor';
  v_doc text;
  v_forn_id bigint; v_forn_nome text;
  v_pedido public.pedidos_compra;
  v_item jsonb; v_np jsonb; v_prod_id bigint; v_qtd numeric; v_custo numeric;
  v_total numeric := 0;
  v_parc jsonb; v_n int; v_i int := 0;
  v_atualizar boolean := coalesce((p_nota ->> 'atualizar_custo')::boolean, false);
  v_cod text; v_sku text; v_existente integer;
begin
  perform public.exigir_editar('compras');
  perform set_config('app.mov_interna', 'on', true);

  if p_nota is null or jsonb_typeof(p_nota) <> 'object' then raise exception 'Dados da nota inválidos.'; end if;
  if length(v_chave) <> 44 then raise exception 'Chave de acesso da NF-e inválida.'; end if;
  select numero into v_existente from public.pedidos_compra where chave_acesso = v_chave;
  if found then raise exception 'Esta nota já foi importada (pedido nº %).', v_existente; end if;
  if p_nota -> 'itens' is null or jsonb_typeof(p_nota -> 'itens') <> 'array' or jsonb_array_length(p_nota -> 'itens') = 0 then
    raise exception 'A nota não tem itens.';
  end if;

  -- fornecedor: achado pelo CNPJ/CPF (só dígitos); se não existir, cadastra
  v_doc := regexp_replace(coalesce(v_forn ->> 'documento', ''), '\D', '', 'g');
  if length(v_doc) not in (11, 14) then raise exception 'CNPJ/CPF do fornecedor inválido.'; end if;
  select id, nome into v_forn_id, v_forn_nome from public.fornecedores where regexp_replace(documento, '\D', '', 'g') = v_doc;
  if not found then
    perform public.exigir_editar('fornecedores');
    if coalesce(btrim(v_forn ->> 'nome'), '') = '' then raise exception 'Fornecedor sem nome na nota.'; end if;
    insert into public.fornecedores (tipo, nome, documento, telefone, email, endereco)
    values (case when length(v_doc) = 14 then 'PJ' else 'PF' end,
            btrim(v_forn ->> 'nome'),
            case when length(v_doc) = 14
                 then substr(v_doc, 1, 2) || '.' || substr(v_doc, 3, 3) || '.' || substr(v_doc, 6, 3) || '/' || substr(v_doc, 9, 4) || '-' || substr(v_doc, 13, 2)
                 else substr(v_doc, 1, 3) || '.' || substr(v_doc, 4, 3) || '.' || substr(v_doc, 7, 3) || '-' || substr(v_doc, 10, 2) end,
            coalesce(v_forn ->> 'telefone', ''), coalesce(v_forn ->> 'email', ''),
            case when jsonb_typeof(v_forn -> 'endereco') = 'object' then v_forn -> 'endereco' else '{}'::jsonb end)
    returning id, nome into v_forn_id, v_forn_nome;
  end if;

  insert into public.pedidos_compra (fornecedor_id, data_prevista, status, data_recebimento, observacao, chave_acesso, numero_nota)
  values (v_forn_id, public.hoje(), 'recebido', public.hoje(),
          'Importado da NF-e nº ' || v_nf || case when v_serie <> '' then ', série ' || v_serie else '' end
            || coalesce(', emitida em ' || to_char(v_emissao, 'DD/MM/YYYY'), '') || '. Chave: ' || v_chave,
          v_chave, v_nf)
  returning * into v_pedido;

  for v_item in select value from jsonb_array_elements(p_nota -> 'itens') loop
    v_qtd := (v_item ->> 'quantidade')::numeric;
    v_custo := (v_item ->> 'preco_unitario')::numeric;
    if v_qtd is null or v_qtd <= 0 or v_custo is null or v_custo < 0 then raise exception 'Item da nota inválido.'; end if;

    v_prod_id := nullif(v_item ->> 'produto_id', '')::bigint;
    if v_prod_id is not null then
      perform 1 from public.produtos where id = v_prod_id for update;
      if not found then raise exception 'Produto não encontrado.'; end if;
    else
      v_np := v_item -> 'novo_produto';
      if v_np is null or jsonb_typeof(v_np) <> 'object' then raise exception 'Item sem produto associado.'; end if;
      v_cod := nullif(btrim(coalesce(v_np ->> 'codigo_barras', '')), '');
      v_sku := nullif(btrim(coalesce(v_np ->> 'sku', '')), '');
      if v_cod is null and v_sku is null then raise exception 'Produto novo precisa de código de barras ou SKU.'; end if;
      -- o mesmo produto novo pode aparecer em mais de uma linha da nota: cadastra uma vez só
      select id into v_prod_id from public.produtos
       where (v_cod is not null and upper(btrim(codigo_barras)) = upper(v_cod))
          or (v_sku is not null and upper(btrim(sku)) = upper(v_sku))
       limit 1;
      if v_prod_id is null then
        perform public.exigir_editar('produtos');
        if coalesce((v_np ->> 'preco')::numeric, 0) <= 0 then
          raise exception 'Informe o preço de venda de "%".', coalesce(v_np ->> 'nome', v_item ->> 'nome');
        end if;
        insert into public.produtos (nome, categoria, unidade, preco, codigo_barras, sku, fornecedor_id, custo)
        values (btrim(coalesce(nullif(v_np ->> 'nome', ''), v_item ->> 'nome')), coalesce(v_np ->> 'categoria', ''),
                coalesce(nullif(btrim(v_np ->> 'unidade'), ''), 'un'), round((v_np ->> 'preco')::numeric, 2),
                v_cod, v_sku, v_forn_id, round(v_custo, 2))
        returning id into v_prod_id;
      end if;
    end if;

    insert into public.pedidos_compra_itens (pedido_id, produto_id, nome, quantidade, preco_unitario)
    values (v_pedido.id, v_prod_id, coalesce(nullif(v_item ->> 'nome', ''), 'Item'), v_qtd, v_custo);
    update public.produtos set estoque = estoque + v_qtd where id = v_prod_id;
    insert into public.movimentacoes (produto_id, tipo, quantidade, motivo, observacao)
    values (v_prod_id, 'entrada', v_qtd, 'compra', 'NF-e nº ' || v_nf || ' (pedido nº ' || v_pedido.numero || ')');
    if v_atualizar then update public.produtos set custo = round(v_custo, 2) where id = v_prod_id; end if;
    v_total := v_total + v_qtd * v_custo;
  end loop;

  -- financeiro: uma despesa por parcela da nota (ou uma só, à vista de hoje, se a nota não trouxer duplicatas)
  if p_nota -> 'parcelas' is null or jsonb_typeof(p_nota -> 'parcelas') <> 'array' or jsonb_array_length(p_nota -> 'parcelas') = 0 then
    insert into public.lancamentos (tipo, descricao, valor, vencimento, pago, fornecedor_id, contraparte, forma_pagamento)
    values ('despesa', 'NF-e nº ' || v_nf, round(v_total, 2), public.hoje(), false, v_forn_id, v_forn_nome, 'boleto');
  else
    v_n := jsonb_array_length(p_nota -> 'parcelas');
    for v_parc in select value from jsonb_array_elements(p_nota -> 'parcelas') loop
      v_i := v_i + 1;
      if (v_parc ->> 'valor')::numeric is null or (v_parc ->> 'valor')::numeric < 0 or nullif(v_parc ->> 'vencimento', '') is null then
        raise exception 'Parcela da nota inválida.';
      end if;
      insert into public.lancamentos (tipo, descricao, valor, vencimento, pago, fornecedor_id, contraparte, forma_pagamento)
      values ('despesa', 'NF-e nº ' || v_nf || case when v_n > 1 then ' - parcela ' || v_i || '/' || v_n else '' end,
              round((v_parc ->> 'valor')::numeric, 2), (v_parc ->> 'vencimento')::date, false, v_forn_id, v_forn_nome, 'boleto');
    end loop;
  end if;

  return v_pedido.id;
end $$;

revoke all on function public.importar_nota_compra(jsonb) from public, anon;
grant execute on function public.importar_nota_compra(jsonb) to authenticated;
