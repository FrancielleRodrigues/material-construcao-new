// Relatórios: permissões, filtros de período e conteúdo das bases (números conhecidos).
// Rodar: npm run test:db
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { criarBanco } from "./ajuda.mjs";

let q, como, erro, db;

before(async () => {
  ({ q, como, erro, db } = await criarBanco());
  await db.exec(`
    insert into papeis (id, nome, permissoes) values
      ('so_rel', 'Só relatórios', '{"relatorios":"visualizar"}'),
      ('rel_fin', 'Relatórios + financeiro', '{"relatorios":"visualizar","financeiro":"visualizar"}'),
      ('rel_venda', 'Relatórios + vendas', '{"relatorios":"visualizar","venda":"visualizar","clientes":"visualizar","produtos":"visualizar"}');
    insert into usuarios (nome, email, papel_id) values
      ('Admin', 'admin@x.com', 'admin'), ('Gerente', 'gerente@x.com', 'gerente'),
      ('Vendedor', 'vend@x.com', 'vendedor'), ('Caixa', 'caixa@x.com', 'caixa'),
      ('SoRel', 'sorel@x.com', 'so_rel'), ('RelFin', 'relfin@x.com', 'rel_fin'), ('RelVenda', 'relvenda@x.com', 'rel_venda');
    insert into auth.users (email, email_confirmed_at)
      select email, now() from usuarios;

    insert into clientes (tipo, nome, documento) values ('PF', 'Ana', '111.111.111-11'), ('PJ', 'Bruno Ltda', '22.222.222/0001-22');
    insert into fornecedores (tipo, nome, documento) values ('PJ', 'Forn A', '33.333.333/0001-33');
    insert into produtos (nome, categoria, unidade, preco, custo, estoque, estoque_min, fornecedor_id) values
      ('Cimento', 'cimento', 'sc', 40, 25, 100, 20, 1),
      ('Tijolo', 'tijolo', 'mil', 100, null, 10, 12, null),
      ('Parado', 'outros', 'un', 10, 5, 7, 2, null);

    -- vendas com datas fixas (ids 1..4)
    insert into vendas (data, cliente_id, forma_pagamento, subtotal, desconto_valor, desconto_calculado, total) values
      ('2026-10-05', 1, 'pix',      400, 0,  0,  400),
      ('2026-10-20', 1, 'boleto',   280, 10, 28, 252),
      ('2026-11-02', 2, 'dinheiro', 100, 0,  0,  100),
      ('2026-11-03', null, 'pix',    40, 0,  0,   40);
    insert into vendas_itens (venda_id, produto_id, nome, quantidade, preco_unitario, custo_unitario) values
      (1, 1, 'Cimento', 10, 40, 25),
      (2, 1, 'Cimento',  2, 40, 25),
      (2, 2, 'Tijolo',   2, 100, null),
      (3, 2, 'Tijolo',   1, 100, null),
      (4, 1, 'Cimento',  1, 40, 25);

    insert into lancamentos (tipo, descricao, valor, vencimento, pago, data_pagamento, cliente_id, fornecedor_id, contraparte) values
      ('receita', 'Venda 1',  400,  '2026-10-05', true,  '2026-10-05', 1, null, ''),
      ('receita', 'Venda 2',  252,  '2026-10-20', false, null,         1, null, ''),
      ('despesa', 'Compra',  1000,  '2026-11-10', true,  '2026-11-12', null, 1, ''),
      ('despesa', 'Aluguel',  500,  '2099-01-01', false, null,         null, null, 'Imobiliária');

    insert into pedidos_compra (data, fornecedor_id, status, data_prevista, data_recebimento) values
      ('2026-10-10', 1, 'recebido', '2026-10-15', '2026-10-14'),
      ('2026-11-05', 1, 'pendente', '2026-11-20', null);
    insert into pedidos_compra_itens (pedido_id, produto_id, nome, quantidade, preco_unitario) values
      (1, 1, 'Cimento', 100, 20), (2, 1, 'Cimento', 50, 30);
  `);
});

const OUT = ["2026-10-01", "2026-10-31"];
const NOV = ["2026-11-01", "2026-11-30"];

test("papel de cada perfil para o módulo relatorios veio da migração", async () => {
  const r = await q("select id, permissoes->>'relatorios' as r from papeis where id in ('admin','gerente','vendedor','caixa') order by id");
  assert.deepEqual(r, [
    { id: "admin", r: "editar" }, { id: "caixa", r: "nenhum" }, { id: "gerente", r: "visualizar" }, { id: "vendedor", r: "nenhum" },
  ]);
});

test("quem não tem 'relatorios' é barrado em todas as funções; anônimo nem executa", async () => {
  const chamadas = [
    "select * from rel_vendas($1, $2)", "select * from rel_itens_vendidos($1, $2)", "select * from rel_lancamentos($1, $2)",
    "select * from rel_estoque($1, $2)", "select * from rel_compras($1, $2)",
  ];
  for (const email of ["vend@x.com", "caixa@x.com"]) {
    for (const c of chamadas) await como(email, () => erro(q(c, OUT), "permiss"));
    await como(email, () => erro(q("select * from rel_em_aberto()"), "permiss"));
  }
  for (const c of chamadas) await como("x@x.com", () => erro(q(c, OUT), "permission denied"), "anon");
  await como("x@x.com", () => erro(q("select * from rel_em_aberto()"), "permission denied"), "anon");
});

test("valem as permissões de cada módulo: 'relatorios' sozinho não mostra dado nenhum", async () => {
  await como("sorel@x.com", async () => {
    assert.equal((await q("select * from rel_vendas($1, $2)", OUT)).length, 0);
    assert.equal((await q("select * from rel_itens_vendidos($1, $2)", OUT)).length, 0);
    assert.equal((await q("select * from rel_lancamentos($1, $2)", OUT)).length, 0);
    assert.equal((await q("select * from rel_em_aberto()")).length, 0);
    assert.equal((await q("select * from rel_estoque($1, $2)", OUT)).length, 0);
    assert.equal((await q("select * from rel_compras($1, $2)", OUT)).length, 0);
  });
  await como("relfin@x.com", async () => {
    assert.equal((await q("select * from rel_vendas($1, $2)", OUT)).length, 0, "sem acesso a vendas");
    assert.equal((await q("select * from rel_lancamentos($1, $2)", OUT)).length, 2, "financeiro liberado");
  });
  await como("relvenda@x.com", async () => {
    assert.equal((await q("select * from rel_vendas($1, $2)", OUT)).length, 2);
    assert.equal((await q("select * from rel_lancamentos($1, $2)", OUT)).length, 0, "sem acesso ao financeiro");
    assert.equal((await q("select * from rel_compras($1, $2)", OUT)).length, 0, "sem acesso a compras");
  });
});

test("rel_vendas: período inclusivo, ordenado, com cliente e totais", async () => {
  await como("gerente@x.com", async () => {
    const out = await q("select numero, data::text d, cliente, forma_pagamento f, itens::float i, subtotal::float s, desconto::float des, total::float t from rel_vendas($1, $2)", OUT);
    assert.deepEqual(out, [
      { numero: 1001, d: "2026-10-05", cliente: "Ana", f: "pix", i: 10, s: 400, des: 0, t: 400 },
      { numero: 1002, d: "2026-10-20", cliente: "Ana", f: "boleto", i: 4, s: 280, des: 28, t: 252 },
    ]);
    const nov = await q("select numero, cliente from rel_vendas($1, $2)", NOV);
    assert.deepEqual(nov, [{ numero: 1003, cliente: "Bruno Ltda" }, { numero: 1004, cliente: null }]);
    // um único dia (os dois extremos entram)
    assert.equal((await q("select * from rel_vendas('2026-10-05', '2026-10-05')")).length, 1);
    // intervalo invertido ou sem vendas: vazio, sem erro
    assert.equal((await q("select * from rel_vendas('2026-10-31', '2026-10-01')")).length, 0);
    assert.equal((await q("select * from rel_vendas('2020-01-01', '2020-01-31')")).length, 0);
  });
});

test("rel_itens_vendidos: linha por item, com categoria e o custo da época", async () => {
  await como("gerente@x.com", async () => {
    const r = await q("select numero, produto, categoria, unidade, quantidade::float qtd, preco_unitario::float pu, total_item::float ti, custo_unitario::float cu from rel_itens_vendidos($1, $2)", OUT);
    assert.deepEqual(r, [
      { numero: 1001, produto: "Cimento", categoria: "cimento", unidade: "sc", qtd: 10, pu: 40, ti: 400, cu: 25 },
      { numero: 1002, produto: "Cimento", categoria: "cimento", unidade: "sc", qtd: 2, pu: 40, ti: 80, cu: 25 },
      { numero: 1002, produto: "Tijolo", categoria: "tijolo", unidade: "mil", qtd: 2, pu: 100, ti: 200, cu: null },
    ]);
  });
});

test("finalizar_venda grava o custo do item e ele não muda quando o custo do produto muda", async () => {
  const id = await como("admin@x.com", async () => (await q("select finalizar_venda(null, 'pix', '[{\"produto_id\":1,\"quantidade\":1}]'::jsonb) as id"))[0].id);
  assert.equal((await q("select custo_unitario::float c from vendas_itens where venda_id = $1", [id]))[0].c, 25);
  await como("admin@x.com", () => q("update produtos set custo = 30 where id = 1"));
  assert.equal((await q("select custo_unitario::float c from vendas_itens where venda_id = $1", [id]))[0].c, 25, "custo histórico preservado");
  // produto sem custo informado → item sem custo
  const id2 = await como("admin@x.com", async () => (await q("select finalizar_venda(null, 'pix', '[{\"produto_id\":2,\"quantidade\":1}]'::jsonb) as id"))[0].id);
  assert.equal((await q("select custo_unitario from vendas_itens where venda_id = $1", [id2]))[0].custo_unitario, null);
  await como("admin@x.com", () => q("update produtos set custo = 25 where id = 1"));
  // custo negativo é recusado
  await como("admin@x.com", () => erro(q("update produtos set custo = -1 where id = 1"), "check"));
  // limpa tudo que o teste criou (vendas de hoje, lançamentos, movimentos) e devolve o estoque
  await db.exec(`delete from vendas where id in (${id}, ${id2})`);
  await db.exec("delete from lancamentos where descricao like 'Venda PDV nº%'");
  await db.exec("delete from movimentacoes where produto_id in (1, 2)");
  await db.exec("update produtos set estoque = 100 where id = 1; update produtos set estoque = 10 where id = 2");
});

test("rel_lancamentos: vence OU foi pago no período; mostra a parte envolvida", async () => {
  await como("gerente@x.com", async () => {
    const out = await q("select descricao, tipo, valor::float v, pago, parte, dias_atraso from rel_lancamentos($1, $2)", OUT);
    assert.deepEqual(out.map((l) => [l.descricao, l.parte]), [["Venda 1", "Ana"], ["Venda 2", "Ana"]]);
    const nov = await q("select descricao, parte, data_pagamento::text dp from rel_lancamentos($1, $2)", NOV);
    assert.deepEqual(nov, [{ descricao: "Compra", parte: "Forn A", dp: "2026-11-12" }]);
    // pago em novembro mas vencido em outubro entra nos dois olhares (vencimento OU pagamento)
    await q("update lancamentos set data_pagamento = '2026-11-02', pago = true where descricao = 'Venda 2'").catch(() => {});
  });
  await db.exec("update lancamentos set data_pagamento = '2026-11-02', pago = true where descricao = 'Venda 2'");
  await como("gerente@x.com", async () => {
    const nov = await q("select descricao from rel_lancamentos($1, $2) order by id", NOV);
    assert.deepEqual(nov.map((l) => l.descricao), ["Venda 2", "Compra"]);
    assert.equal((await q("select * from rel_lancamentos($1, $2)", OUT)).length, 2, "continua no mês do vencimento");
  });
  await db.exec("update lancamentos set data_pagamento = null, pago = false where descricao = 'Venda 2'");
});

test("rel_em_aberto: só o que não foi pago, de qualquer data, com dias de atraso", async () => {
  await como("gerente@x.com", async () => {
    const r = await q("select descricao, parte, dias_atraso, (public.hoje() - vencimento) as esperado from rel_em_aberto()");
    assert.deepEqual(r.map((l) => l.descricao), ["Venda 2", "Aluguel"]);
    assert.equal(r[0].dias_atraso, r[0].esperado);
    assert.ok(r[0].dias_atraso > 0, "venda 2 venceu em 2026-10-20");
    assert.equal(r[1].dias_atraso, 0, "ainda não venceu (2099)");
    assert.equal(r[1].parte, "Imobiliária");
  });
});

test("rel_estoque: posição atual + vendido no período + última venda", async () => {
  await como("gerente@x.com", async () => {
    const out = await q("select nome, categoria, estoque::float e, estoque_min::float em, preco::float p, custo::float c, fornecedor, vendido::float v, ultima_venda::text uv from rel_estoque($1, $2)", OUT);
    assert.deepEqual(out, [
      { nome: "Cimento", categoria: "cimento", e: 100, em: 20, p: 40, c: 25, fornecedor: "Forn A", v: 12, uv: "2026-11-03" },
      { nome: "Parado", categoria: "outros", e: 7, em: 2, p: 10, c: 5, fornecedor: null, v: 0, uv: null },
      { nome: "Tijolo", categoria: "tijolo", e: 10, em: 12, p: 100, c: null, fornecedor: null, v: 2, uv: "2026-11-02" },
    ]);
    const nov = await q("select nome, vendido::float v from rel_estoque($1, $2) order by nome", NOV);
    assert.deepEqual(nov, [{ nome: "Cimento", v: 1 }, { nome: "Parado", v: 0 }, { nome: "Tijolo", v: 1 }]);
  });
});

test("rel_compras: pedidos do período com o total", async () => {
  await como("gerente@x.com", async () => {
    const out = await q("select numero, fornecedor, status, itens::float i, total::float t, data_recebimento::text dr from rel_compras($1, $2)", OUT);
    assert.deepEqual(out, [{ numero: 5001, fornecedor: "Forn A", status: "recebido", i: 100, t: 2000, dr: "2026-10-14" }]);
    const nov = await q("select numero, status, total::float t, data_recebimento from rel_compras($1, $2)", NOV);
    assert.deepEqual(nov, [{ numero: 5002, status: "pendente", t: 1500, data_recebimento: null }]);
  });
});

test("as funções de relatório não ficam abertas ao anônimo e não são SECURITY DEFINER", async () => {
  const f = await q(`select p.proname, p.prosecdef as definer, has_function_privilege('anon', p.oid, 'execute') as anon,
                            has_function_privilege('authenticated', p.oid, 'execute') as auth
                       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'public' and p.proname like 'rel\\_%' order by 1`);
  assert.deepEqual(f.map((x) => x.proname), ["rel_compras", "rel_em_aberto", "rel_estoque", "rel_itens_vendidos", "rel_lancamentos", "rel_vendas"]);
  for (const x of f) assert.deepEqual([x.definer, x.anon, x.auth], [false, false, true], x.proname);
});
