// Testa o esquema do Supabase (RLS por papel + funções atômicas) num Postgres local (PGlite).
// Rodar: npm run test:db
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const dir = path.dirname(fileURLToPath(import.meta.url));
// aplica todas as migrações, em ordem de nome
const pastaMigracoes = path.join(dir, "../migrations");
const migracao = fs.readdirSync(pastaMigracoes).filter((f) => f.endsWith(".sql")).sort()
  .map((f) => fs.readFileSync(path.join(pastaMigracoes, f), "utf8")).join("\n");

// Imita o que o Supabase já fornece: papéis anon/authenticated e auth.jwt().
const STUB = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz);
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', ''), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
`;

const db = new PGlite();

// Simula um JWT do Supabase: o login é reconhecido pelo `sub` (auth.uid()), não pelo e-mail.
async function comJwt(claims, fn, role = "authenticated") {
  await db.exec(`reset role; select set_config('request.jwt.claims', '${JSON.stringify(claims).replace(/'/g, "''")}', false); set role ${role};`);
  try { return await fn(); } finally { await db.exec("reset role;"); }
}
async function como(email, fn, role = "authenticated") {
  const r = await db.query("select id from auth.users where lower(email) = lower($1)", [email]);
  // e-mail sem login cadastrado: usa um uid qualquer (que não está ligado a nenhum usuário)
  const sub = r.rows[0]?.id ?? "00000000-0000-0000-0000-00000000dead";
  return comJwt({ email, sub, role: "authenticated" }, fn, role);
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
    insert into auth.users (email, email_confirmed_at) values
      ('admin@x.com', now()), ('vend@x.com', now()), ('caixa@x.com', now()),
      ('leitor@x.com', now()), ('inativo@x.com', now());
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

test("acesso é pelo auth.uid(): o e-mail dentro do JWT não vale nada sozinho", async () => {
  const uidAdmin = (await q("select id from auth.users where email = 'admin@x.com'"))[0].id;
  assert.equal((await q("select count(*)::int n from usuarios where auth_id = $1 and email = 'admin@x.com'", [uidAdmin]))[0].n, 1, "gatilho ligou o login ao usuário");
  // com o uid certo o e-mail escrito no JWT é irrelevante
  assert.equal((await comJwt({ email: "qualquer@coisa.com", sub: uidAdmin }, () => q("select * from clientes"))).length, 1);
  // JWT com o e-mail do administrador, mas outro uid: não enxerga nada
  const falso = { email: "admin@x.com", sub: "11111111-1111-1111-1111-111111111111" };
  assert.equal((await comJwt(falso, () => q("select * from clientes"))).length, 0);
  assert.equal((await comJwt(falso, () => q("select * from usuarios"))).length, 0);
  await erro(comJwt(falso, () => q(`insert into clientes (tipo, nome, documento) values ('PF','Hack','222.222.222-22')`)), "row-level security");
  await erro(comJwt(falso, () => q("select finalizar_venda(null, 'pix', '[{\"produto_id\":2,\"quantidade\":1}]'::jsonb)")), "permiss");
});

test("vínculo do login: só e-mail confirmado liga, nos dois sentidos, e trocar o e-mail do login não muda o acesso", async () => {
  // usuário cadastrado antes do login
  await q("insert into usuarios (nome, email, papel_id) values ('Novo', 'novo@x.com', 'vendedor')");
  assert.equal((await q("select auth_id from usuarios where email = 'novo@x.com'"))[0].auth_id, null);
  const [{ id: uid }] = await q("insert into auth.users (email) values ('novo@x.com') returning id"); // sem confirmar
  assert.equal((await q("select auth_id from usuarios where email = 'novo@x.com'"))[0].auth_id, null, "login não confirmado não liga");
  assert.equal((await comJwt({ email: "novo@x.com", sub: uid }, () => q("select * from clientes"))).length, 0);
  await q("update auth.users set email_confirmed_at = now() where id = $1", [uid]);
  assert.equal((await q("select auth_id from usuarios where email = 'novo@x.com'"))[0].auth_id, uid, "confirmar liga");
  assert.equal((await comJwt({ email: "novo@x.com", sub: uid }, () => q("select * from clientes"))).length, 1);
  // trocar o e-mail do login não tira nem dá acesso: vale o uid
  await q("update auth.users set email = 'trocado@x.com' where id = $1", [uid]);
  assert.equal((await comJwt({ email: "trocado@x.com", sub: uid }, () => q("select * from clientes"))).length, 1);

  // login confirmado antes do cadastro do usuário (feito por um administrador, pela API)
  const [{ id: uid2 }] = await q("insert into auth.users (email, email_confirmed_at) values ('outro@x.com', now()) returning id");
  await como("admin@x.com", () => q("insert into usuarios (nome, email, papel_id) values ('Outro', 'outro@x.com', 'caixa')"));
  assert.equal((await q("select auth_id from usuarios where email = 'outro@x.com'"))[0].auth_id, uid2);
  await q("delete from usuarios where email in ('novo@x.com', 'outro@x.com')");
  await q("delete from auth.users where id in ($1, $2)", [uid, uid2]);
});

test("auth_id não pode ser escrito pela API (nem por administrador)", async () => {
  await como("admin@x.com", async () => {
    await erro(q("update usuarios set auth_id = gen_random_uuid() where email = 'vend@x.com'"), "permission denied");
    await erro(q("insert into usuarios (nome, email, papel_id, auth_id) values ('X','x@x.com','caixa', gen_random_uuid())"), "permission denied");
  });
});

test("só as funções de negócio ficam expostas na API; as de permissão ficam no schema privado", async () => {
  assert.equal((await q("select to_regprocedure('public.nivel(text)') as f"))[0].f, null);
  assert.equal((await q("select to_regprocedure('public.pode_editar(text)') as f"))[0].f, null);
  assert.equal((await q("select has_schema_privilege('anon', 'private', 'usage') as u"))[0].u, false);
  const expostas = await q(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef and has_function_privilege('authenticated', p.oid, 'execute')
    order by 1`);
  assert.deepEqual(expostas.map((r) => r.proname), ["finalizar_venda", "gerar_rascunho_nota", "registrar_movimentacao", "registrar_recebimento", "salvar_pedido_compra"]);
  assert.equal((await q(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute')`))[0].n, 0);
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

test("auditoria: registra quem mudou o quê (só colunas alteradas), ignora estoque e só administrador lê", async () => {
  const total = async (filtro) => (await q(`select count(*)::int n from auditoria where ${filtro}`))[0].n;
  await como("admin@x.com", async () => {
    await q("update produtos set preco = 40 where id = 2");
  });
  const [a] = await q("select quem, tabela, operacao, registro_id, antes, depois from auditoria where tabela = 'produtos' and operacao = 'UPDATE' order by id desc limit 1");
  assert.equal(a.quem, "Admin");
  assert.equal(a.registro_id, "2");
  assert.deepEqual(a.antes, { preco: 89.9 });
  assert.deepEqual(a.depois, { preco: 40 });

  // mudança só de estoque (venda, movimentação, ajuste) não polui a auditoria
  const antes = await total("tabela = 'produtos'");
  await como("admin@x.com", () => q("select registrar_movimentacao(2, 'entrada', 3, 'ajuste')"));
  await como("vend@x.com", () => q(`select finalizar_venda(null, 'pix', '[{"produto_id":2,"quantidade":1}]'::jsonb)`));
  await como("admin@x.com", () => q("update produtos set estoque = estoque + 1 where id = 2"));
  assert.equal(await total("tabela = 'produtos'"), antes);

  // inclusão e exclusão
  await como("vend@x.com", () => q(`insert into clientes (tipo, nome, documento) values ('PF','Auditado','555.555.555-55')`));
  const [c] = await q("select quem, operacao, depois->>'nome' as nome from auditoria where tabela = 'clientes' order by id desc limit 1");
  assert.deepEqual(c, { quem: "Vendedor", operacao: "INSERT", nome: "Auditado" });
  await como("admin@x.com", () => q("delete from clientes where nome = 'Auditado'"));
  const [d] = await q("select operacao, antes->>'nome' as nome from auditoria where tabela = 'clientes' order by id desc limit 1");
  assert.deepEqual(d, { operacao: "DELETE", nome: "Auditado" });

  // leitura: só quem edita Usuários; ninguém grava
  assert.ok((await como("admin@x.com", () => q("select * from auditoria"))).length > 0);
  assert.equal((await como("vend@x.com", () => q("select * from auditoria"))).length, 0);
  assert.equal((await como("caixa@x.com", () => q("select * from auditoria"))).length, 0);
  await erro(como("admin@x.com", () => q("insert into auditoria (quem, tabela, operacao) values ('x','x','INSERT')")), "permission denied");
  await erro(como("admin@x.com", () => q("update auditoria set quem = 'apagado'")), "permission denied");
  await erro(como("admin@x.com", () => q("delete from auditoria")), "permission denied");
});
