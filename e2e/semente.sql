-- Dados de exemplo para os testes e2e (rodam como superusuário, sem RLS).
-- Senha de todos os logins de teste: senha123
insert into usuarios (nome, email, papel_id) values
  ('Admin Teste', 'admin@teste.com', 'admin'),
  ('Marcos Vendas', 'vendedor@teste.com', 'vendedor'),
  ('Renata Caixa', 'caixa@teste.com', 'caixa');

insert into clientes (tipo, nome, documento, telefone, email, inscricao_estadual, indicador_ie, endereco) values
  ('PJ', 'Construtora Horizonte Ltda', '12.345.678/0001-90', '(22) 99811-2345', 'contato@horizonte.com.br', '12345678', 'contribuinte',
   '{"cep":"28890-000","logradouro":"Av. Brasil","numero":"1200","complemento":"Sala 3","bairro":"Centro","cidade":"Rio das Ostras","uf":"RJ"}'),
  ('PF', 'Marcos Vinícius Rocha', '123.456.789-00', '(22) 98877-6655', 'marcos@email.com', '', 'nao_contribuinte',
   '{"cep":"28895-000","logradouro":"Rua das Palmeiras","numero":"45","complemento":"","bairro":"Costazul","cidade":"Rio das Ostras","uf":"RJ"}');

insert into fornecedores (tipo, nome, documento, telefone, email, categoria, condicao_pagamento, endereco) values
  ('PJ', 'Votoran Distribuidora de Materiais', '45.678.912/0001-33', '(27) 3333-4455', 'vendas@votoran.com.br', 'cimento', '30 dias',
   '{"cep":"29100-000","logradouro":"Rod. do Sol, km 12","numero":"500","complemento":"","bairro":"Distrito Industrial","cidade":"Vila Velha","uf":"ES"}'),
  ('PJ', 'Ferragens Litoral Ltda', '12.987.654/0001-21', '(22) 99900-1122', 'contato@ferragenslitoral.com.br', 'ferragem', 'à vista',
   '{"cep":"28900-000","logradouro":"Av. das Indústrias","numero":"88","complemento":"","bairro":"Centro","cidade":"Rio das Ostras","uf":"RJ"}');

insert into produtos (nome, categoria, unidade, preco, estoque, estoque_min, codigo_barras, fornecedor_id) values
  ('Cimento CP-II 50kg', 'cimento', 'sc', 34.90, 120, 30, '7891000100016', 1),
  ('Tijolo baiano 9 furos', 'tijolo', 'milheiro', 890, 8, 10, '7891000100023', null),
  ('Vergalhão CA-50 10mm', 'ferragem', 'barra', 42.50, 60, 20, '7891000100030', 2),
  ('Tinta acrílica branca 18L', 'tinta', 'lata', 289, 15, 5, '7891000100047', null),
  ('Torneira de parede cromada', 'hidraulica', 'un', 89.90, 25, 5, '7891000100054', 2);

insert into pedidos_compra (fornecedor_id, data, data_prevista) values (1, current_date - 3, current_date + 2);
insert into pedidos_compra_itens (pedido_id, produto_id, nome, quantidade, preco_unitario) values
  (1, 1, 'Cimento CP-II 50kg', 100, 32.50), (1, 3, 'Vergalhão CA-50 10mm', 40, 39.90);

insert into lancamentos (tipo, descricao, valor, vencimento, pago, data_pagamento, cliente_id, contraparte, forma_pagamento) values
  ('receita', 'Venda de materiais - obra Costazul', 4380, current_date - 6, true, current_date - 6, 1, '', 'pix'),
  ('receita', 'Venda de cimento e ferragens', 1250, current_date + 9, false, null, 2, '', 'boleto'),
  ('despesa', 'Aluguel do depósito', 2100, current_date - 1, false, null, null, 'Imobiliária Rio das Ostras', 'transferencia');

insert into vendas (cliente_id, forma_pagamento, subtotal, total, tipo_entrega, endereco_entrega)
  values (2, 'pix', 359.50, 359.50, 'entrega', 'Rua das Palmeiras, 45 - Costazul, Rio das Ostras/RJ');
insert into vendas_itens (venda_id, produto_id, nome, quantidade, preco_unitario) values
  (1, 5, 'Torneira de parede cromada', 2, 89.90), (1, 1, 'Cimento CP-II 50kg', 5, 34.90);
insert into entregas (venda_id, cliente_id, endereco, itens_descricao, data_prevista) values
  (1, 2, 'Rua das Palmeiras, 45 - Costazul, Rio das Ostras/RJ', '2x Torneira de parede cromada, 5x Cimento CP-II 50kg', current_date + 1);
