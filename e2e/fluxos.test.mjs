// Testes ponta a ponta: o app real no Chromium + Postgres real (PGlite) com a migração do Supabase.
// Rodar: npm run test:e2e   (precisa do Chromium; CHROMIUM_PATH aponta para ele)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { iniciar, entrar, sql } from "./ajuda.mjs";

let app;
before(async () => { app = await iniciar(); });
after(async () => {
  await app.encerrar();
  assert.deepEqual(app.erros, [], "erros no console/página durante os testes");
});

async function logar(email = "admin@teste.com", largura) {
  const p = await app.novaPagina(largura);
  await entrar(p, email);
  await p.getByText("Clientes cadastrados").or(p.getByText("Sem acesso")).waitFor({ timeout: 40000 });
  return p;
}
const aba = (p, nome) => p.getByRole("button", { name: nome, exact: true }).first().click();
const num = async (p, consulta, params) => (await sql(p, consulta, params))[0];

test("login: senha errada mostra erro; e-mail sem cadastro cai em 'Sem acesso'; sair volta ao login", async () => {
  const p = await app.novaPagina();
  await entrar(p, "admin@teste.com", "errada");
  await p.getByText("E-mail ou senha incorretos.").waitFor({ timeout: 40000 });
  await p.getByPlaceholder("voce@empresa.com.br").fill("estranho@teste.com");
  await p.locator('input[type="password"]').fill("senha123");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.getByText("Sem acesso").waitFor();
  assert.match(await p.locator("body").innerText(), /estranho@teste\.com/);
  await p.getByRole("button", { name: "Sair" }).click();
  await p.getByRole("button", { name: "Entrar" }).waitFor();
});

test("admin vê todos os módulos carregados do banco", async () => {
  const p = await logar();
  const esperado = {
    Clientes: "Construtora Horizonte", Fornecedores: "Votoran", Compras: "5001", Produtos: "Torneira de parede",
    Estoque: "Cimento CP-II", Financeiro: "Aluguel do depósito", Entregas: "Rua das Palmeiras", Usuários: "Marcos Vendas",
  };
  for (const [nome, texto] of Object.entries(esperado)) {
    await aba(p, nome);
    await p.locator("main").getByText(texto).first().waitFor({ timeout: 10000 });
  }
});

test("PDV: venda com desconto baixa estoque, gera receita, movimentos, nota e cupom", async () => {
  const p = await logar();
  await aba(p, "Venda (PDV)");
  await p.getByRole("button", { name: /Iniciar venda/i }).click();
  await p.getByPlaceholder(/Digite o CPF/i).fill("123.456.789-00");
  await p.getByRole("button", { name: "Continuar", exact: true }).click();
  await p.getByPlaceholder(/Bipe ou digite o código/i).fill("7891000100016");
  await p.keyboard.press("Enter");
  await p.getByRole("button", { name: "Aumentar" }).click();            // 2 × 34,90 = 69,80
  await p.getByRole("button", { name: "%", exact: true }).click();
  await p.locator('main input[placeholder="0"]').fill("10");             // 10% → 62,82
  await p.locator("main select").selectOption("dinheiro");
  await p.getByRole("button", { name: "Finalizar venda" }).click();
  await p.getByText(/Venda PDV nº 1002|nº 1002|1002/).first().waitFor({ timeout: 15000 });

  const v = await num(p, "select numero, total::float t, desconto_calculado::float d, forma_pagamento f, cliente_id, nota_gerada from vendas where numero = 1002");
  assert.deepEqual(v, { numero: 1002, t: 62.82, d: 6.98, f: "dinheiro", cliente_id: 2, nota_gerada: true });
  assert.equal((await num(p, "select estoque::float e from produtos where id = 1")).e, 118);
  assert.deepEqual(await num(p, "select tipo, quantidade::float q, motivo from movimentacoes where observacao = 'Venda PDV nº 1002'"), { tipo: "saida", q: 2, motivo: "venda" });
  assert.deepEqual(await num(p, "select tipo, valor::float v, pago from lancamentos where descricao = 'Venda PDV nº 1002'"), { tipo: "receita", v: 62.82, pago: true });
  assert.deepEqual(await num(p, "select status, numero from notas_fiscais where venda_id = 2"), { status: "rascunho", numero: 1 });

  // a tela já reflete o novo estoque (recarregou do banco)
  await p.keyboard.press("Escape");
  await aba(p, "Produtos");
  await p.locator("main").getByText("118").first().waitFor();
});

test("PDV: estoque insuficiente no servidor mostra o erro e mantém o carrinho", async () => {
  const p = await logar();
  await aba(p, "Venda (PDV)");
  await p.getByRole("button", { name: /Iniciar venda/i }).click();
  await p.getByRole("button", { name: /Continuar sem identificar/i }).click();
  await p.getByPlaceholder(/Bipe ou digite o código/i).fill("7891000100054"); // torneira, estoque 25
  await p.keyboard.press("Enter");
  await p.getByText("Torneira de parede cromada").first().waitFor();
  await sql(p, "update produtos set estoque = 0 where id = 5"); // alguém vendeu tudo enquanto isso
  await p.getByRole("button", { name: "Finalizar venda" }).click();
  await p.getByRole("alert").getByText(/Estoque insuficiente/).waitFor({ timeout: 15000 });
  assert.equal((await num(p, "select count(*)::int n from vendas")).n, 1, "nenhuma venda nova");
  await p.getByText("Torneira de parede cromada").first().waitFor(); // carrinho continua
});

test("Compras: registrar recebimento dá entrada no estoque e cria a despesa", async () => {
  const p = await logar();
  await aba(p, "Compras");
  await p.getByRole("button", { name: /Registrar recebimento/ }).click();
  await p.getByText("Recebido").first().waitFor({ timeout: 15000 });
  assert.equal((await num(p, "select estoque::float e from produtos where id = 1")).e, 220);
  assert.equal((await num(p, "select estoque::float e from produtos where id = 3")).e, 100);
  assert.deepEqual(await num(p, "select tipo, valor::float v, pago, fornecedor_id from lancamentos where descricao = 'Compra - Pedido nº 5001'"),
    { tipo: "despesa", v: 4846, pago: false, fornecedor_id: 1 });
  assert.equal((await num(p, "select count(*)::int n from movimentacoes where motivo = 'compra'")).n, 2);
});

test("Produtos: cadastrar, código de barras duplicado dá aviso, editar estoque gera ajuste", async () => {
  const p = await logar();
  await aba(p, "Produtos");
  await p.getByRole("button", { name: /Novo|Nova/ }).first().click();
  await p.getByPlaceholder("Ex: Cimento CP-II 50kg").fill("Areia média m³");
  await p.getByPlaceholder("Bipe ou digite o código").fill("7891000100016"); // já existe
  await p.getByPlaceholder("0,00").fill("120");
  await p.locator('label:has-text("Estoque atual") + input').fill("30");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.getByRole("alert").getByText("Já existe um produto com este código de barras.").waitFor({ timeout: 15000 });

  await p.getByPlaceholder("Bipe ou digite o código").fill("7891000199999");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.locator("main").getByText("Areia média m³").first().waitFor({ timeout: 15000 });
  assert.deepEqual(await num(p, "select preco::float p, estoque::float e from produtos where nome = 'Areia média m³'"), { p: 120, e: 30 });
  const idAreia = "(select id from produtos where nome = 'Areia média m³')";
  assert.equal((await num(p, `select observacao from movimentacoes where produto_id = ${idAreia}`)).observacao, "Estoque inicial");

  // editar o estoque pelo cadastro vira movimento de ajuste (saldo continua batendo com o histórico)
  await p.locator("main tr").filter({ hasText: "Areia média m³" }).locator("button").first().click();
  await p.locator('label:has-text("Estoque atual") + input').fill("22");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.waitForFunction(async () => (await (await window.__db).query("select estoque::float e from produtos where nome = 'Areia média m³'")).rows[0].e === 22);
  assert.deepEqual(await num(p, `select tipo, quantidade::float q, motivo from movimentacoes where produto_id = ${idAreia} order by id desc limit 1`), { tipo: "saida", q: 8, motivo: "ajuste" });
  assert.equal((await num(p, `select (sum(case when tipo = 'entrada' then quantidade else -quantidade end))::float s from movimentacoes where produto_id = ${idAreia}`)).s, 22);
});

test("Financeiro: marcar como pago grava a data e atualiza a tela", async () => {
  const p = await logar();
  await aba(p, "Financeiro");
  const linha = p.locator("main tr").filter({ hasText: "Aluguel do depósito" });
  await linha.getByRole("button", { name: "Marcar como pago" }).click();
  await p.waitForFunction(async () => (await (await window.__db).query("select pago from lancamentos where descricao = 'Aluguel do depósito'")).rows[0].pago === true);
  assert.ok((await num(p, "select data_pagamento is not null as ok from lancamentos where descricao = 'Aluguel do depósito'")).ok);
});

test("Entregas: avançar status até entregue", async () => {
  const p = await logar();
  await aba(p, "Entregas");
  await p.getByRole("button", { name: /Sair para entrega/ }).click();
  await p.getByRole("button", { name: /Confirmar entrega/ }).waitFor({ timeout: 15000 });
  await p.getByRole("button", { name: /Confirmar entrega/ }).click();
  await p.waitForFunction(async () => (await (await window.__db).query("select status from entregas")).rows[0].status === "entregue");
});

test("vendedor: menu sem Financeiro/Compras/Fiscal/Usuários e consegue vender", async () => {
  const p = await logar("vendedor@teste.com");
  const menu = await p.locator("nav").innerText();
  for (const oculto of ["Financeiro", "Compras", "Fiscal", "Usuários", "Fornecedores"]) assert.ok(!menu.includes(oculto), `menu não deveria ter ${oculto}`);
  for (const visivel of ["Clientes", "Produtos", "Venda (PDV)", "Estoque", "Entregas"]) assert.ok(menu.includes(visivel), `menu deveria ter ${visivel}`);
  await aba(p, "Venda (PDV)");
  await p.getByRole("button", { name: /Iniciar venda/i }).click();
  await p.getByRole("button", { name: /Continuar sem identificar/i }).click();
  await p.getByPlaceholder(/Bipe ou digite o código/i).fill("7891000100030");
  await p.keyboard.press("Enter");
  await p.locator("main select").selectOption("pix");
  await p.getByRole("button", { name: "Finalizar venda" }).click();
  await p.getByText("1002").first().waitFor({ timeout: 15000 });
  assert.equal((await num(p, "select count(*)::int n from vendas")).n, 2);
  // O financeiro existe no banco (a receita foi criada pela função), mas o vendedor não o enxerga.
  assert.equal((await num(p, "select count(*)::int n from lancamentos where descricao = 'Venda PDV nº 1002'")).n, 1);
});

test("caixa: vê Financeiro mas não Usuários", async () => {
  const p = await logar("caixa@teste.com");
  const menu = await p.locator("nav").innerText();
  assert.match(menu, /Financeiro/);
  assert.doesNotMatch(menu, /Usuários/);
});

test("Clientes: cadastro em 3 etapas grava o endereço; CPF repetido é recusado", async () => {
  const p = await logar();
  await aba(p, "Clientes");
  async function cadastrar() {
    await p.getByRole("button", { name: /Novo|Nova/ }).first().click();
    await p.getByPlaceholder("Ex: Construtora Horizonte Ltda").fill("Maria Souza");
    await p.getByPlaceholder("000.000.000-00").fill("987.654.321-00");
    await p.getByRole("button", { name: "Continuar" }).click();
    await p.getByRole("button", { name: "Continuar" }).click();
    await p.getByPlaceholder("00000-000").fill("28890-000");
    await p.getByPlaceholder("Preenchido automaticamente pelo CEP").first().fill("Rua Teste");
    await p.getByPlaceholder("Ex: 1200").fill("77");
    await p.getByRole("button", { name: "Salvar cliente" }).click();
  }
  await cadastrar();
  await p.locator("main").getByText("Maria Souza").first().waitFor({ timeout: 15000 });
  const c = await num(p, "select tipo, documento, endereco->>'numero' as numero, endereco->>'logradouro' as rua from clientes where nome = 'Maria Souza'");
  assert.deepEqual(c, { tipo: "PF", documento: "987.654.321-00", numero: "77", rua: "Rua Teste" });
  await cadastrar();
  await p.getByRole("alert").getByText("Já existe um cliente com este CPF/CNPJ.").waitFor({ timeout: 15000 });
});

test("Compras: novo pedido grava cabeçalho e itens (função atômica)", async () => {
  const p = await logar();
  await aba(p, "Compras");
  await p.getByRole("button", { name: /Novo|Nova/ }).first().click();
  await p.getByPlaceholder("Buscar fornecedor pelo nome...").fill("Ferragens");
  await p.getByRole("button", { name: /Ferragens Litoral/ }).click();
  await p.getByPlaceholder("Qtd").fill("10");
  await p.getByRole("button", { name: "Adicionar" }).click();
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.waitForFunction(async () => (await (await window.__db).query("select count(*)::int n from pedidos_compra")).rows[0].n === 2);
  assert.deepEqual(await num(p, "select numero, fornecedor_id, status from pedidos_compra where id = 2"), { numero: 5002, fornecedor_id: 2, status: "pendente" });
  const item = await num(p, "select produto_id, quantidade::float q, preco_unitario::float pu from pedidos_compra_itens where pedido_id = 2");
  assert.equal(item.q, 10);
  assert.ok(item.produto_id && item.pu > 0);
  await p.locator("main").getByText("5002").first().waitFor();
});

test("Estoque: movimentação manual atualiza saldo e histórico", async () => {
  const p = await logar();
  await aba(p, "Estoque");
  await p.getByRole("button", { name: /Novo|Nova/ }).first().click();
  await p.locator('label:has-text("Quantidade") ~ input, label:has-text("Quantidade") + input').first().fill("5");
  await p.locator('label:has-text("Motivo") + select').selectOption({ index: 1 });
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.waitForFunction(async () => (await (await window.__db).query("select estoque::float e from produtos where id = 1")).rows[0].e === 125);
  assert.equal((await num(p, "select count(*)::int n from movimentacoes where produto_id = 1 and tipo = 'entrada' and quantidade = 5")).n, 1);
});

test("Fiscal: salvar configurações grava empresa_fiscal", async () => {
  const p = await logar();
  await aba(p, "Fiscal");
  await p.getByRole("button", { name: /Configurações/ }).click();
  await p.getByPlaceholder("Ex: Construgestão Materiais Ltda").fill("Loja Teste Ltda");
  await p.getByPlaceholder("00.000.000/0000-00").fill("11.222.333/0001-81");
  await p.getByRole("button", { name: "Salvar configurações" }).click();
  await p.waitForFunction(async () => (await (await window.__db).query("select razao_social from empresa_fiscal")).rows[0].razao_social === "Loja Teste Ltda");
  assert.equal((await num(p, "select cnpj from empresa_fiscal")).cnpj, "11.222.333/0001-81");
});

test("Usuários: criar usuário e papel; e-mail repetido é recusado", async () => {
  const p = await logar();
  await aba(p, "Usuários");
  await p.getByRole("button", { name: /Novo usuário/ }).click();
  await p.getByPlaceholder("Nome completo").fill("Paula Estoque");
  await p.getByPlaceholder("usuario@empresa.com").fill("paula@teste.com");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.locator("main").getByText("Paula Estoque").first().waitFor({ timeout: 15000 });
  assert.equal((await num(p, "select papel_id from usuarios where email = 'paula@teste.com'")).papel_id.length > 0, true);

  await p.getByRole("button", { name: /Papéis/ }).click();
  await p.getByRole("button", { name: /Novo papel/ }).click();
  await p.getByPlaceholder("Ex: Estoquista, Supervisor...").fill("Estoquista");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.locator("main").getByText("Estoquista").first().waitFor({ timeout: 15000 });
  assert.equal((await num(p, "select count(*)::int n from papeis where nome = 'Estoquista'")).n, 1);

  // e-mail repetido
  await p.locator("main").getByRole("button", { name: /^Usuários/ }).click();
  await p.getByRole("button", { name: /Novo usuário/ }).click();
  await p.getByPlaceholder("Nome completo").fill("Outra Paula");
  await p.getByPlaceholder("usuario@empresa.com").fill("PAULA@teste.com");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.getByRole("alert").getByText("Já existe um usuário com este e-mail.").waitFor({ timeout: 15000 });
});

test("Exclusão: pede confirmação, mantém o histórico e explica quando o banco recusa", async () => {
  const p = await logar();
  await aba(p, "Clientes");
  const linha = p.locator("main tr").filter({ hasText: "Marcos Vinícius Rocha" });
  await linha.locator("button").nth(1).click();
  await p.getByRole("button", { name: "Excluir", exact: true }).click();
  await p.waitForFunction(async () => (await (await window.__db).query("select count(*)::int n from clientes where id = 2")).rows[0].n === 0);
  // vendas e lançamentos continuam, só perdem o vínculo com o cliente
  assert.equal((await num(p, "select cliente_id from vendas where id = 1")).cliente_id, null);
  assert.equal((await num(p, "select count(*)::int n from lancamentos")).n, 3);

  await aba(p, "Produtos");
  const produto = p.locator("main tr").filter({ hasText: "Cimento CP-II" });
  await produto.locator("button").nth(1).click();
  await p.getByRole("button", { name: "Excluir", exact: true }).click();
  await p.getByRole("alert").getByText("Este produto tem movimentações de estoque e não pode ser excluído.").waitFor({ timeout: 15000 });
  assert.equal((await num(p, "select count(*)::int n from produtos where id = 1")).n, 1);
});

test("layout de celular: login e dashboard sem erro", async () => {
  const p = await logar("admin@teste.com", 390);
  await p.getByText("Clientes cadastrados").waitFor();
});
