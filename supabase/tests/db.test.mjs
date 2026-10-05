// Testa o esquema do Supabase (RLS por papel + funções atômicas) num Postgres local (PGlite).
// Rodar: npm run test:db
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const dir = path.dirname(fileURLToPath(import.meta.url));
const migracao = fs.readFileSync(path.join(dir, "../migrations/20261005000000_schema_inicial.sql"), "utf8");

// Imita o que o Supabase já fornece: papéis anon/authenticated e auth.jwt().
const STUB = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.jwt() to anon, authenticated;
`;

const db = new PGlite();

async function como(email, fn, role = "authenticated") {
  await db.exec(`reset role; select set_config('request.jwt.claims', '${JSON.stringify({ email })}', false); set role ${role};`);
  try { return await fn(); } finally { await db.exec("reset role;"); }
}
const q = async (sql, params) => (await db.query(sql, params)).rows;
const erro = async (promessa, trecho) => {
  await assert.rejects(promessa, (e) => (trecho ? new RegExp(trecho, "i").test(e.message) : true), `esperava erro${trecho ? ` /${trecho}/` : ""}`);
};

before(async () => {
  await db.exec(STUB);
  await db.exec(migracao);
  await db.exec(`
    insert into papeis (id, nome, permissoes) values
      ('leitor', 'Leitor', '{"clientes":"visualizar","fornecedores":"visualizar","compras":"visualizar","produtos":"visualizar","venda":"visualizar","estoque":"visualizar","financeiro":"visualizar","fiscal":"visualizar","entregas":"visualizar","usuarios":"nenhum"}');
    insert into usuarios (nome, email, papel_id, ativo) values
      ('Admin', 'admin@x.com', 'admin', true),
      ('Vendedor', 'vend@x.com', 'vendedor', true),
      ('Caixa', 'caixa@x.com', 'caixa', true),
      ('Leitor', 'leitor@x.com', 'leitor', true),
      ('Inativo', 'inativo@x.com', 'admin', false);
  `);
  await como("admin@x.com", async () => {
    await q(`insert into fornecedores (tipo, nome, documento) values ('PJ', 'Votoran', '45.678.912/0001-33')`);
    await q(`insert into clientes (tipo, nome, documento) values ('PF', 'Marcos', '123.456.789-00')`);
    await q(`insert into produtos (nome, preco, estoque, estoque_min, codigo_barras, fornecedor_id) values
      ('Cimento', 34.90, 120, 30, '789001', 1), ('Torneira', 89.90, 25, 5, '789002', null)`);
  });
});

test("papéis padrão e empresa_fiscal foram criados", async () => {
  assert.equal((await q("select count(*)::int n from papeis where id in ('admin','gerente','vendedor','caixa')"))[0].n, 4);
  assert.equal((await q("select count(*)::int n from empresa_fiscal"))[0].n, 1);
});

test("anon e usuário desconhecido/inativo não enxergam nada", async () => {
  await erro(como("x@x.com", () => q("select * from clientes"), "anon"), "permission denied");
  assert.equal((await como("ninguem@x.com", () => q("select * from clientes"))).length, 0);
  assert.equal((await como("inativo@x.com", () => q("select * from clientes"))).length, 0);
  await erro(como("ninguem@x.com", () => q(`insert into clientes (tipo, nome, documento) values ('PF','Hack','111.111.111-11')`)), "row-level security");
});

test("e-mail do JWT é comparado sem diferenciar maiúsculas", async () => {
  assert.equal((await como("ADMIN@X.com", () => q("select * from clientes"))).length, 1);
});

test("vendedor: lê clientes/produtos, não lê financeiro, não cria produto", async () => {
  await como("vend@x.com", async () => {
    assert.equal((await q("select * from clientes")).length, 1);
    assert.equal((await q("select * from produtos")).length, 2);
    assert.equal((await q("select * from lancamentos")).length, 0);
    assert.equal((await q("select * from pedidos_compra")).length, 0, "sem acesso a compras");
    assert.equal((await q("select * from fornecedores")).length, 1, "lê fornecedor só porque vê produtos (mostra o fornecedor do produto)");
    await erro(q(`insert into produtos (nome, preco) values ('X', 1)`), "row-level security");
    assert.equal((await q("select * from usuarios")).length, 1, "só a própria linha");
  });
});

test("vendedor pode cadastrar cliente (ele edita clientes)", async () => {
  await como("vend@x.com", async () => {
    await q(`insert into clientes (tipo, nome, documento) values ('PJ','Obra Z','12.345.678/0001-90')`);
  });
  await q("delete from clientes where nome = 'Obra Z'");
});

test("CPF/CNPJ duplicado (mesmos dígitos, outra máscara) é recusado", async () => {
  await como("admin@x.com", async () => {
    await erro(q(`insert into clientes (tipo, nome, documento) values ('PF','Dup','12345678900')`), "clientes_documento_uniq");
  });
});

test("tabelas protegidas não aceitam escrita direta", async () => {
  await como("admin@x.com", async () => {
    await erro(q(`insert into movimentacoes (produto_id, tipo, quantidade, motivo) values (1,'entrada',5,'compra')`), "permission denied");
    await erro(q(`insert into vendas (forma_pagamento) values ('pix')`), "permission denied");
    await erro(q(`insert into notas_fiscais (venda_id, numero, serie) values (1,1,'1')`), "permission denied");
  });
});

test("estoque inicial vira movimento e edição de estoque no cadastro vira ajuste", async () => {
  await como("admin@x.com", async () => {
    const ini = await q("select tipo, quantidade::float q, motivo, observacao from movimentacoes where produto_id = 2");
    assert.deepEqual(ini, [{ tipo: "entrada", q: 25, motivo: "ajuste", observacao: "Estoque inicial" }]);
    await q("update produtos set estoque = 20 where id = 2");
    const aj = await q("select tipo, quantidade::float q from movimentacoes where produto_id = 2 order by id desc limit 1");
    assert.deepEqual(aj, [{ tipo: "saida", q: 5 }]);
    await q("update produtos set estoque = 25 where id = 2");
  });
});

test("registrar_movimentacao: entrada, saída e bloqueio de saldo negativo", async () => {
  await como("admin@x.com", async () => {
    await q("select registrar_movimentacao(2, 'saida', 5, 'perda', 'quebrou')");
    assert.equal((await q("select estoque::float e from produtos where id = 2"))[0].e, 20);
    // movimento da função não é duplicado pelo trigger de ajuste
    assert.equal((await q("select count(*)::int n from movimentacoes where produto_id = 2 and motivo = 'perda'"))[0].n, 1);
    await erro(q("select registrar_movimentacao(2, 'saida', 999, 'perda')"), "Estoque insuficiente");
    await erro(q("select registrar_movimentacao(2, 'saida', 0, 'perda')"), "maior que zero");
    await q("select registrar_movimentacao(2, 'entrada', 5, 'ajuste', '', '2026-01-15')");
    assert.equal((await q("select data::text d from movimentacoes where produto_id = 2 order by id desc limit 1"))[0].d, "2026-01-15");
  });
  await como("vend@x.com", async () => {
    await erro(q("select registrar_movimentacao(2, 'entrada', 1, 'ajuste')"), "permiss");
  });
});

test("compra: pedido → recebimento dá entrada, cria despesa e não repete", async () => {
  await como("admin@x.com", async () => {
    const itens = JSON.stringify([{ produto_id: 1, nome: "Cimento", quantidade: 100, preco_unitario: 32.5 }]);
    const [{ salvar_pedido_compra: id }] = await q("select salvar_pedido_compra(null, 1, current_date + 2, '', $1::jsonb)", [itens]);
    assert.equal((await q("select numero from pedidos_compra where id = $1", [id]))[0].numero, 5001);
    // escrita direta nas tabelas de pedido é negada: só pelas funções
    await erro(q("update pedidos_compra set status = 'recebido' where id = $1", [id]), "permission denied");
    await erro(q("insert into pedidos_compra (fornecedor_id) values (1)"), "permission denied");
    await erro(q("insert into pedidos_compra_itens (pedido_id, nome, quantidade, preco_unitario) values ($1,'x',1,1)", [id]), "permission denied");
    // editar troca os itens por completo
    await q("select salvar_pedido_compra($1, 1, current_date + 3, 'urgente', $2::jsonb)", [id, JSON.stringify([
      { produto_id: 1, nome: "Cimento", quantidade: 100, preco_unitario: 32.5 },
      { produto_id: "", nome: "Item avulso", quantidade: 1, preco_unitario: 0 }])]);
    assert.equal((await q("select count(*)::int n from pedidos_compra_itens where pedido_id = $1", [id]))[0].n, 2);
    await q("select salvar_pedido_compra($1, 1, current_date + 3, 'urgente', $2::jsonb)", [id, itens]);
    assert.equal((await q("select count(*)::int n from pedidos_compra_itens where pedido_id = $1", [id]))[0].n, 1);
    await erro(q("select salvar_pedido_compra(null, 1, null, '', '[]'::jsonb)"), "ao menos um item");

    await q("select registrar_recebimento($1)", [id]);
    assert.equal((await q("select estoque::float e from produtos where id = 1"))[0].e, 220);
    const [l] = await q("select tipo, valor::float v, pago, contraparte, fornecedor_id from lancamentos where descricao = 'Compra - Pedido nº 5001'");
    assert.deepEqual(l, { tipo: "despesa", v: 3250, pago: false, contraparte: "Votoran", fornecedor_id: 1 });
    assert.equal((await q("select status from pedidos_compra where id = $1", [id]))[0].status, "recebido");
    await erro(q("select registrar_recebimento($1)", [id]), "já foi recebido");
    await erro(q("select salvar_pedido_compra($1, 1, null, '', $2::jsonb)", [id, itens]), "já recebido");
    await q("select registrar_movimentacao(1, 'saida', 100, 'ajuste', 'volta ao saldo do teste')");
  });
  await como("vend@x.com", async () => {
    await erro(q("select salvar_pedido_compra(null, 1, null, '', '[{\"nome\":\"x\",\"quantidade\":1,\"preco_unitario\":1}]'::jsonb)"), "permiss");
  });
});

test("venda: baixa estoque, movimenta, gera receita, entrega e rascunho de nota", async () => {
  const id = await como("vend@x.com", async () => {
    const [{ finalizar_venda }] = await q(
      `select finalizar_venda(1, 'pix', '[{"produto_id":1,"quantidade":5},{"produto_id":2,"quantidade":2}]'::jsonb,
         'percentual', 10, 'entrega', 'Rua das Palmeiras, 45', current_date + 1, true)`);
    return finalizar_venda;
  });
  await como("admin@x.com", async () => {
    const [v] = await q("select numero, subtotal::float s, desconto_calculado::float d, total::float t, nota_gerada from vendas where id = $1", [id]);
    // 5×34,90 + 2×89,90 = 354,30 ; 10% = 35,43 ; total 318,87
    assert.deepEqual(v, { numero: 1001, s: 354.3, d: 35.43, t: 318.87, nota_gerada: true });
    assert.equal((await q("select count(*)::int n from vendas_itens where venda_id = $1", [id]))[0].n, 2);
    assert.equal((await q("select estoque::float e from produtos where id = 1"))[0].e, 120 - 5);
    assert.equal((await q("select estoque::float e from produtos where id = 2"))[0].e, 25 - 2);
    assert.equal((await q("select count(*)::int n from movimentacoes where motivo='venda'"))[0].n, 2);
    const [l] = await q("select tipo, valor::float v, pago, cliente_id from lancamentos where descricao = 'Venda PDV nº 1001'");
    assert.deepEqual(l, { tipo: "receita", v: 318.87, pago: true, cliente_id: 1 });
    const [e] = await q("select status, itens_descricao from entregas where venda_id = $1", [id]);
    assert.deepEqual(e, { status: "pendente", itens_descricao: "5x Cimento, 2x Torneira" });
    const [n] = await q("select numero, serie, status from notas_fiscais where venda_id = $1", [id]);
    assert.deepEqual(n, { numero: 1, serie: "1", status: "rascunho" });
    assert.equal((await q("select proximo_numero from empresa_fiscal"))[0].proximo_numero, 2);
  });
});

test("venda: boleto fica em aberto; desconto em valor limitado ao subtotal; retirada não cria entrega", async () => {
  await como("vend@x.com", async () => {
    const [{ finalizar_venda: id }] = await q(
      `select finalizar_venda(null, 'boleto', '[{"produto_id":2,"quantidade":1}]'::jsonb, 'valor', 500, 'retirada', '', null, false)`);
    const [v] = await q("select total::float t, desconto_calculado::float d from vendas where id = $1", [id]);
    assert.deepEqual(v, { t: 0, d: 89.9 });
    assert.equal((await q("select count(*)::int n from entregas where venda_id = $1", [id]))[0].n, 0);
  });
  await como("admin@x.com", async () => {
    const [l] = await q("select pago, data_pagamento from lancamentos where descricao = 'Venda PDV nº 1002'");
    assert.deepEqual(l, { pago: false, data_pagamento: null });
    await q("select registrar_movimentacao(2, 'entrada', 1, 'ajuste')");
  });
});

test("venda é atômica: estoque insuficiente não deixa rastro", async () => {
  const antes = await como("admin@x.com", async () => ({
    vendas: (await q("select count(*)::int n from vendas"))[0].n,
    mov: (await q("select count(*)::int n from movimentacoes"))[0].n,
    lanc: (await q("select count(*)::int n from lancamentos"))[0].n,
    estoque: (await q("select estoque::float e from produtos where id = 2"))[0].e,
  }));
  await como("vend@x.com", async () => {
    await erro(q(`select finalizar_venda(1, 'pix', '[{"produto_id":2,"quantidade":1},{"produto_id":1,"quantidade":99999}]'::jsonb)`), "Estoque insuficiente");
    await erro(q(`select finalizar_venda(1, 'pix', '[{"produto_id":2,"quantidade":12},{"produto_id":2,"quantidade":12}]'::jsonb)`), "Estoque insuficiente"); // item repetido soma
    await erro(q(`select finalizar_venda(1, 'pix', '[]'::jsonb)`), "não tem itens");
    await erro(q(`select finalizar_venda(1, 'pix', '[{"produto_id":2,"quantidade":-1}]'::jsonb)`), "inválido");
    await erro(q(`select finalizar_venda(1, 'pix', '[{"produto_id":2,"quantidade":1}]'::jsonb, 'percentual', 0, 'entrega', '  ')`), "endereço");
  });
  const depois = await como("admin@x.com", async () => ({
    vendas: (await q("select count(*)::int n from vendas"))[0].n,
    mov: (await q("select count(*)::int n from movimentacoes"))[0].n,
    lanc: (await q("select count(*)::int n from lancamentos"))[0].n,
    estoque: (await q("select estoque::float e from produtos where id = 2"))[0].e,
  }));
  assert.deepEqual(depois, antes);
});

test("quem só visualiza não finaliza venda, nem recebe compra, nem gera nota", async () => {
  await como("leitor@x.com", async () => {
    await erro(q(`select finalizar_venda(1, 'pix', '[{"produto_id":2,"quantidade":1}]'::jsonb)`), "permiss");
    await erro(q(`select registrar_recebimento(1)`), "permiss");
    await erro(q(`select gerar_rascunho_nota(1)`), "permiss");
    assert.ok((await q("select * from lancamentos")).length > 0, "leitor enxerga o financeiro");
    await erro(q(`insert into lancamentos (tipo, descricao, valor, vencimento) values ('receita','x',1,current_date)`), "row-level security");
  });
});

test("rascunho de nota para venda sem nota; não duplica", async () => {
  await como("admin@x.com", async () => {
    await q("select gerar_rascunho_nota(2)");
    assert.equal((await q("select proximo_numero from empresa_fiscal"))[0].proximo_numero, 3);
    await erro(q("select gerar_rascunho_nota(2)"), "já tem nota");
  });
  await como("vend@x.com", async () => {
    await erro(q("select gerar_rascunho_nota(1)"), "permiss");
  });
});

test("financeiro: caixa edita lançamentos; vendedor não vê", async () => {
  await como("caixa@x.com", async () => {
    await q(`insert into lancamentos (tipo, descricao, valor, vencimento, contraparte) values ('despesa','Energia',640,current_date,'Enel')`);
    assert.ok((await q("select * from lancamentos")).length >= 3);
  });
  await como("vend@x.com", async () => {
    assert.equal((await q("select * from lancamentos")).length, 0);
  });
});

test("usuários: papel fixo é protegido e sempre sobra um admin ativo", async () => {
  await erro(q("update papeis set nome = 'X' where id = 'admin'"), "fixo");
  await erro(q("delete from papeis where id = 'admin'"), "fixo");
  await erro(q("delete from usuarios where email = 'admin@x.com'"), "ao menos um administrador");
  await erro(q("update usuarios set ativo = false where email = 'admin@x.com'"), "ao menos um administrador");
  await q("insert into usuarios (nome, email, papel_id) values ('Admin 2','admin2@x.com','admin')");
  await q("update usuarios set ativo = false where email = 'admin@x.com'");
  await q("update usuarios set ativo = true where email = 'admin@x.com'");
  await q("delete from usuarios where email = 'admin2@x.com'");
});

test("usuários: só quem edita 'usuarios' mexe em papéis e usuários", async () => {
  await como("vend@x.com", async () => {
    // update filtrado pelo RLS não dá erro: afeta 0 linhas
    assert.equal((await q("update usuarios set papel_id = 'admin' where email = 'vend@x.com' returning id")).length, 0);
    assert.equal((await q("select papel_id from usuarios where email = 'vend@x.com'"))[0].papel_id, "vendedor");
    await erro(q("insert into papeis (id, nome) values ('x','x')"), "row-level security");
  });
  await como("admin@x.com", async () => {
    await q(`insert into papeis (id, nome, permissoes) values ('novo','Novo','{"clientes":"editar"}')`);
    await erro(q(`insert into papeis (id, nome, permissoes) values ('ruim','Ruim','{"clientes":"deus"}')`), "papeis_permissoes_validas");
    await q("delete from papeis where id = 'novo'");
  });
});

test("papéis: qualquer usuário ativo lê (precisa do próprio papel)", async () => {
  await como("vend@x.com", async () => {
    assert.ok((await q("select * from papeis")).length >= 1);
    assert.ok((await q("select permissoes from papeis where id = 'vendedor'")).length === 1);
  });
});

test("excluir cliente/fornecedor mantém o histórico (vira nulo); produto com movimento não exclui", async () => {
  await como("admin@x.com", async () => {
    await erro(q("delete from produtos where id = 1"), "movimentacoes");
    await q("delete from clientes where id = 1");
    assert.equal((await q("select cliente_id from vendas where numero = 1001"))[0].cliente_id, null);
    await q("delete from fornecedores where id = 1");
    assert.equal((await q("select fornecedor_id from produtos where id = 1"))[0].fornecedor_id, null);
  });
});

test("empresa_fiscal: só quem edita fiscal altera", async () => {
  await como("vend@x.com", async () => {
    assert.equal((await q("update empresa_fiscal set cnpj = '1' returning id")).length, 0);
  });
  await como("admin@x.com", async () => {
    await q("update empresa_fiscal set cnpj = '12.345.678/0001-90', razao_social = 'Loja' where id = 1");
    assert.equal((await q("select cnpj from empresa_fiscal"))[0].cnpj, "12.345.678/0001-90");
  });
});
