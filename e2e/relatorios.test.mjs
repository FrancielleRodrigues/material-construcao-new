// Relatórios no navegador: números na tela, gráficos, filtros de período, permissões e o Excel baixado.
// Rodar: npm run test:e2e
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import JSZip from "jszip";
import { iniciar, entrar, sql, exec } from "./ajuda.mjs";

let app;
before(async () => { app = await iniciar({ porta: 5198 }); });
after(async () => {
  await app.encerrar();
  assert.deepEqual(app.erros, [], "erros no console/página durante os testes");
});

// Dados com datas FIXAS (março/abril de 2025) para os números serem sempre os mesmos.
// Março: vendas de 528,80 (custo conhecido) e 153,00 (170 com 10% de desconto, sem custo no vergalhão).
//   faturamento 681,80 · 2 vendas · ticket 340,90 · descontos 17,00 · margem 158,80/528,80 = 30,0%
const SEMENTE = `
  update produtos set custo = 25 where nome like 'Cimento%';
  update produtos set custo = 60 where nome like 'Torneira%';
  insert into vendas (data, cliente_id, forma_pagamento, subtotal, desconto_tipo, desconto_valor, desconto_calculado, total) values
    ('2025-03-10', 1, 'pix',      528.80, 'percentual',  0,  0,     528.80),
    ('2025-03-20', 2, 'boleto',   170.00, 'percentual', 10, 17.00,  153.00),
    ('2025-04-02', 1, 'dinheiro',  89.90, 'percentual',  0,  0,      89.90);
  insert into vendas_itens (venda_id, produto_id, nome, quantidade, preco_unitario, custo_unitario) values
    (2, 1, 'Cimento CP-II 50kg',          10, 34.90, 25),
    (2, 5, 'Torneira de parede cromada',   2, 89.90, 60),
    (3, 3, 'Vergalhão CA-50 10mm',         4, 42.50, null),
    (4, 5, 'Torneira de parede cromada',   1, 89.90, 60);
  insert into lancamentos (tipo, descricao, valor, vencimento, pago, data_pagamento, cliente_id, fornecedor_id, contraparte, forma_pagamento) values
    ('receita', 'Venda 1002',      528.80, '2025-03-10', true,  '2025-03-10', 1, null, '', 'pix'),
    ('receita', 'Venda 1003',      153.00, '2025-03-30', false, null,         2, null, '', 'boleto'),
    ('despesa', 'Compra de cimento', 1000, '2025-03-12', true,  '2025-03-15', null, 1, '', 'boleto');
  insert into pedidos_compra (data, fornecedor_id, status, data_prevista, data_recebimento) values ('2025-03-05', 1, 'recebido', '2025-03-10', '2025-03-12');
  insert into pedidos_compra_itens (pedido_id, produto_id, nome, quantidade, preco_unitario) values (2, 1, 'Cimento CP-II 50kg', 100, 20);
`;

async function abrirRelatorios({ email = "admin@teste.com", antes = "" } = {}) {
  const p = await app.novaPagina();
  if (antes) await exec(p, antes);
  await entrar(p, email);
  await p.getByText("Clientes cadastrados").or(p.getByText("Sem acesso")).waitFor({ timeout: 40000 });
  await exec(p, SEMENTE);
  await p.getByRole("button", { name: "Relatórios", exact: true }).first().click();
  return p;
}
async function definirPeriodo(p, inicio, fim) {
  await p.getByLabel("Data inicial").fill(inicio);
  await p.getByLabel("Data final").fill(fim);
}
const marco = (p) => definirPeriodo(p, "2025-03-01", "2025-03-31");
const aba = (p, nome) => p.locator("nav[aria-label='Relatórios']").getByRole("button", { name: nome }).click();
const kpi = (p, id) => p.getByTestId(`kpi-${id}`);
const textoDe = async (loc) => (await loc.innerText()).replace(/\s+/g, " ");

test("Resumo: os números do período batem com o cálculo feito à mão", async () => {
  const p = await abrirRelatorios();
  await marco(p);
  await kpi(p, "faturamento").getByText("R$ 681,80").waitFor({ timeout: 40000 });
  assert.match(await textoDe(kpi(p, "vendas")), /Vendas 2$/);
  assert.match(await textoDe(kpi(p, "ticket")), /R\$ 340,90$/);
  assert.match(await textoDe(kpi(p, "descontos")), /R\$ 17,00$/);
  assert.match(await textoDe(kpi(p, "margem")), /30,0%$/);
  // tops do resumo
  const topClientes = p.getByTestId("tabela-topClientes");
  await topClientes.getByText("Construtora Horizonte Ltda").waitFor();
  assert.match(await textoDe(p.getByTestId("tabela-topProdutos")), /Cimento CP-II 50kg/);
});

test("Filtro de período: troca os números, aceita período sem dados e recusa período invertido", async () => {
  const p = await abrirRelatorios();
  await definirPeriodo(p, "2025-04-01", "2025-04-30");
  await kpi(p, "faturamento").getByText("R$ 89,90").waitFor({ timeout: 40000 });
  await definirPeriodo(p, "2024-01-01", "2024-01-31");
  await kpi(p, "faturamento").getByText("R$ 0,00").waitFor({ timeout: 40000 });
  assert.match(await textoDe(kpi(p, "margem")), /—$/, "sem vendas não há margem");
  // período invertido: avisa e não quebra
  await p.getByLabel("Data inicial").fill("2025-05-10");
  await p.getByLabel("Data final").fill("2025-05-01");
  await p.getByRole("alert").getByText("A data inicial não pode ser depois da data final.").waitFor();
  // atalhos: conferem com o banco para as mesmas datas que a tela escolheu
  await p.getByRole("button", { name: "Últimos 30 dias" }).click();
  const inicio = await p.getByLabel("Data inicial").inputValue();
  const fim = await p.getByLabel("Data final").inputValue();
  assert.equal(inicio < fim, true);
  const [{ total }] = await sql(p, "select coalesce(sum(total), 0)::float as total from vendas where data between $1 and $2", [inicio, fim]);
  const esperado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total).replace(/\s/g, " ");
  await p.waitForFunction((t) => document.querySelector('[data-testid="kpi-faturamento"]')?.innerText.replace(/\s/g, " ").includes(t), esperado, { timeout: 40000 });
});

test("Gráfico de vendas: uma coluna por dia, dica ao passar o mouse e alternativa em tabela", async () => {
  const p = await abrirRelatorios();
  await marco(p);
  await kpi(p, "faturamento").getByText("R$ 681,80").waitFor({ timeout: 40000 });
  const colunas = p.locator('div[role="img"]');
  assert.equal(await colunas.count(), 31, "março tem 31 dias");
  await colunas.nth(9).hover(); // dia 10
  const dica = p.getByTestId("dica-grafico");
  await dica.waitFor();
  const texto = await textoDe(dica);
  assert.match(texto, /10\/03/);
  assert.match(texto, /R\$ 528,80/);
  assert.match(texto, /1 venda/);
  // todo valor da dica também existe sem passar o mouse: visão em tabela
  await p.getByRole("button", { name: "Ver como tabela" }).first().click();
  const linha = p.locator("tr", { hasText: "10/03" }).first();
  assert.match(await textoDe(linha), /R\$ 528,80/);
});

test("Produtos: curva ABC com margem só onde há custo", async () => {
  const p = await abrirRelatorios();
  await marco(p);
  await aba(p, "Produtos (curva ABC)");
  const abc = p.getByTestId("tabela-abc");
  await abc.getByText("Cimento CP-II 50kg").waitFor({ timeout: 40000 });
  const linhas = abc.locator("tbody tr");
  assert.equal(await linhas.count(), 3);
  const t = async (i) => textoDe(linhas.nth(i));
  assert.match(await t(0), /^A Cimento CP-II 50kg .* R\$ 349,00 /);
  assert.match(await t(1), /^A Torneira de parede cromada .* R\$ 179,80 /);
  assert.match(await t(2), /^A Vergalhão CA-50 10mm .* R\$ 153,00 .* — — —$/, "vergalhão sem custo: custo, lucro e margem vazios");
  assert.match(await textoDe(kpi(p, "semCusto")), /1$/);
  assert.match(await textoDe(kpi(p, "vendidos")), /3$/);
});

test("Clientes: ranking e inadimplência (contas vencidas de qualquer data)", async () => {
  const p = await abrirRelatorios();
  await marco(p);
  await aba(p, "Clientes");
  const ranking = p.getByTestId("tabela-clientes");
  await ranking.getByText("Construtora Horizonte Ltda").waitFor({ timeout: 40000 });
  assert.match(await textoDe(ranking.locator("tbody tr").nth(0)), /^Construtora Horizonte Ltda 1 R\$ 528,80/);
  assert.match(await textoDe(ranking.locator("tbody tr").nth(1)), /^Marcos Vinícius Rocha 1 R\$ 153,00/);
  assert.match(await textoDe(kpi(p, "inadimplencia")), /R\$ 153,00$/);
  assert.match(await textoDe(p.getByTestId("tabela-inadimplentes")), /Marcos Vinícius Rocha 1 R\$ 153,00/);
});

test("Financeiro: recebido, pago, saldo, previsto e vencido", async () => {
  const p = await abrirRelatorios();
  await marco(p);
  await aba(p, "Financeiro");
  await kpi(p, "recebido").getByText("R$ 528,80").waitFor({ timeout: 40000 });
  assert.match(await textoDe(kpi(p, "pago")), /R\$ 1\.000,00$/);
  assert.match(await textoDe(kpi(p, "saldo")), /-R\$ 471,20$/);
  assert.match(await textoDe(kpi(p, "aReceber")), /R\$ 153,00$/);
  assert.match(await textoDe(kpi(p, "vencidoReceber")), /R\$ 153,00$/);
  assert.equal(await p.getByTestId("tabela-lancamentos").locator("tbody tr").count(), 3);
  assert.match(await textoDe(p.getByTestId("tabela-lancamentos")), /Venda 1003 .* Vencido/);
  // gráfico com duas séries tem legenda
  await p.getByRole("heading", { name: "Entradas e saídas por dia" }).waitFor();
});

test("Estoque: abaixo do mínimo e sem giro, valores a preço de venda e a custo", async () => {
  const p = await abrirRelatorios();
  await marco(p);
  await aba(p, "Estoque");
  const tabela = p.getByTestId("tabela-estoque");
  await tabela.getByText("Tijolo baiano 9 furos").waitFor({ timeout: 40000 });
  assert.match(await textoDe(kpi(p, "abaixo")), /1$/);
  assert.match(await textoDe(kpi(p, "semGiro")), /2$/);
  assert.match(await textoDe(kpi(p, "valorVenda")), /R\$ 20\.440,50$/);
  assert.match(await textoDe(kpi(p, "valorCusto")), /R\$ 4\.500,00$/);
  const primeira = await textoDe(tabela.locator("tbody tr").first());
  assert.match(primeira, /^Tijolo baiano 9 furos .* Abaixo do mínimo/);
  assert.equal(await tabela.locator("tbody tr").count(), 5);
});

test("Compras: total, prazo médio e fornecedores", async () => {
  const p = await abrirRelatorios();
  await marco(p);
  await aba(p, "Compras");
  await kpi(p, "total").getByText("R$ 2.000,00").waitFor({ timeout: 40000 });
  assert.match(await textoDe(kpi(p, "prazo")), /7$/);
  assert.match(await textoDe(p.getByTestId("tabela-compras")), /Votoran Distribuidora de Materiais Recebido/);
  assert.match(await textoDe(p.getByTestId("tabela-fornecedores")), /Votoran Distribuidora de Materiais 1 R\$ 2\.000,00 100,0%/);
});

async function baixar(p) {
  const [download] = await Promise.all([p.waitForEvent("download", { timeout: 60000 }), p.getByRole("button", { name: "Exportar para Excel" }).click()]);
  const zip = await JSZip.loadAsync(fs.readFileSync(await download.path()));
  const texto = (c) => zip.file(c).async("string");
  const compartilhadas = zip.file("xl/sharedStrings.xml") ? [...(await texto("xl/sharedStrings.xml")).matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]) : [];
  return { nome: download.suggestedFilename(), zip, texto, compartilhadas, livro: await texto("xl/workbook.xml") };
}

test("Excel do Resumo: arquivo .xlsx com resumo do período e a base completa de vendas e itens", async () => {
  const p = await abrirRelatorios();
  await marco(p);
  await kpi(p, "faturamento").getByText("R$ 681,80").waitFor({ timeout: 40000 });
  const x = await baixar(p);
  assert.equal(x.nome, "relatorio-resumo_2025-03-01_a_2025-03-31.xlsx");
  for (const aba of ["Resumo", "Vendas", "Itens vendidos", "Top produtos", "Top clientes"]) assert.match(x.livro, new RegExp(`name="${aba}"`));
  for (const t of ["01/03/2025 a 31/03/2025", "Construtora Horizonte Ltda", "Marcos Vinícius Rocha", "Torneira de parede cromada", "Faturamento"]) {
    assert.ok(x.compartilhadas.includes(t), `faltou "${t}" no Excel`);
  }
  const iVendas = [...x.livro.matchAll(/<sheet [^>]*name="([^"]+)"/g)].findIndex((m) => m[1] === "Vendas") + 1;
  const vendas = await x.texto(`xl/worksheets/sheet${iVendas}.xml`);
  assert.equal((vendas.match(/<row /g) || []).length, 3, "cabeçalho + 2 vendas de março");
  for (const n of ["528.8", "153", "17"]) assert.match(vendas, new RegExp(`<v>${n}</v>`), `valor ${n} como número`);
  const iItens = [...x.livro.matchAll(/<sheet [^>]*name="([^"]+)"/g)].findIndex((m) => m[1] === "Itens vendidos") + 1;
  assert.equal(((await x.texto(`xl/worksheets/sheet${iItens}.xml`)).match(/<row /g) || []).length, 4, "cabeçalho + 3 itens");
});

test("Excel do Estoque: posição completa dos produtos", async () => {
  const p = await abrirRelatorios();
  await marco(p);
  await aba(p, "Estoque");
  await p.getByTestId("tabela-estoque").getByText("Tijolo baiano 9 furos").waitFor({ timeout: 40000 });
  const x = await baixar(p);
  assert.equal(x.nome, "relatorio-estoque_2025-03-01_a_2025-03-31.xlsx");
  const sheets = [...x.livro.matchAll(/<sheet [^>]*name="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(sheets, ["Resumo", "Estoque"]);
  assert.equal(((await x.texto("xl/worksheets/sheet2.xml")).match(/<row /g) || []).length, 6, "cabeçalho + 5 produtos");
  for (const t of ["Situação", "Abaixo do mínimo", "Tijolo baiano 9 furos"]) assert.ok(x.compartilhadas.includes(t), `faltou "${t}"`);
});

test("Permissões: vendedor não vê Relatórios; gerente vê; perfil só com 'relatorios' não recebe dado nenhum", async () => {
  const antes = `
    insert into papeis (id, nome, permissoes) values ('so_rel', 'Só relatórios', '{"relatorios":"visualizar"}');
    insert into usuarios (nome, email, papel_id) values ('Gerente Teste', 'gerente@teste.com', 'gerente'), ('So Rel', 'sorel@teste.com', 'so_rel');
    insert into auth.users (email, email_confirmed_at) values ('gerente@teste.com', now()), ('sorel@teste.com', now());
  `;
  const v = await app.novaPagina();
  await entrar(v, "vendedor@teste.com");
  await v.getByText("Clientes cadastrados").waitFor({ timeout: 40000 });
  assert.equal(await v.locator("nav").getByText("Relatórios").count(), 0, "vendedor não tem o módulo");

  const g = await abrirRelatorios({ email: "gerente@teste.com", antes });
  await g.getByRole("button", { name: "Exportar para Excel" }).waitFor({ timeout: 40000 });
  for (const r of ["Resumo", "Vendas", "Produtos (curva ABC)", "Clientes", "Estoque", "Financeiro", "Compras"]) {
    assert.equal(await g.locator("nav[aria-label='Relatórios']").getByRole("button", { name: r }).count(), 1, `gerente deveria ver ${r}`);
  }

  const s = await abrirRelatorios({ email: "sorel@teste.com", antes });
  await s.getByText(/Seu perfil não tem acesso aos dados dos relatórios/).waitFor({ timeout: 40000 });
  assert.equal(await s.getByRole("button", { name: "Exportar para Excel" }).count(), 0);
});

test("Usuários: a barra genérica de 'Novo' (que abria o cadastro de produto) não aparece mais", async () => {
  const p = await app.novaPagina();
  await entrar(p, "admin@teste.com");
  await p.getByText("Clientes cadastrados").waitFor({ timeout: 40000 });
  await p.getByRole("button", { name: "Usuários", exact: true }).first().click();
  await p.getByRole("button", { name: /Novo usuário/ }).waitFor();
  assert.equal(await p.getByRole("button", { name: "Novo", exact: true }).count(), 0);
  assert.equal(await p.getByPlaceholder("Buscar produto...").count(), 0);
});

test("Produto: preço de custo opcional, gravado e mostrado ao editar", async () => {
  const p = await app.novaPagina();
  await entrar(p, "admin@teste.com");
  await p.getByText("Clientes cadastrados").waitFor({ timeout: 40000 });
  await p.getByRole("button", { name: "Produtos", exact: true }).first().click();
  await p.getByRole("button", { name: /Novo|Nova/ }).first().click();
  await p.getByPlaceholder("Ex: Cimento CP-II 50kg").fill("Areia lavada");
  await p.getByPlaceholder("0,00").first().fill("100");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.locator("main").getByText("Areia lavada").first().waitFor({ timeout: 15000 });
  assert.equal((await sql(p, "select custo from produtos where nome = 'Areia lavada'"))[0].custo, null, "custo é opcional");

  await p.locator("main tr").filter({ hasText: "Areia lavada" }).locator("button").first().click();
  const campo = p.locator('label:has-text("Preço de custo") + input');
  assert.equal(await campo.inputValue(), "");
  await campo.fill("62.5");
  await p.getByRole("button", { name: "Salvar" }).click();
  await p.waitForFunction(async () => (await (await window.__db).query("select custo::float c from produtos where nome = 'Areia lavada'")).rows[0].c === 62.5);
  await p.locator("main tr").filter({ hasText: "Areia lavada" }).locator("button").first().click();
  assert.equal(await p.locator('label:has-text("Preço de custo") + input').inputValue(), "62.5");
});
