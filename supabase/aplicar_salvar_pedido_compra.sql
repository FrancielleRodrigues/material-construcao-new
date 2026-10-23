-- Só para o projeto Supabase "material_construcao" (xuzazjuhbrwonsiieguq).
-- Ao aplicar a migração inicial por partes, esta função não passou (a ferramenta travou
-- por causa do `delete from` no corpo). Cole e rode no SQL Editor do Supabase.
-- Em instalações novas isto NÃO é necessário: a migração inicial já cria a função.

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

-- Funções novas nascem executáveis por todos: só usuários logados podem chamar.
revoke all on function public.salvar_pedido_compra(bigint, bigint, date, text, jsonb) from public, anon;
grant execute on function public.salvar_pedido_compra(bigint, bigint, date, text, jsonb) to authenticated;
