import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { RELATORIOS, montarRelatorio, planilhaDoRelatorio } from "./modelos.js";
import { gerarXlsx } from "./exportar.js";

const periodo = { inicio: "2026-10-01", fim: "2026-10-31" };
const ctx = { formas: { pix: "PIX", boleto: "Boleto" } };

const vendas = [
  { id: 1, numero: 1001, data: "2026-10-05", clienteId: 1, cliente: "Ana", formaPagamento: "pix", itens: 10, subtotal: 400, desconto: 0, total: 400, tipoEntrega: "retirada", notaGerada: false },
  { id: 2, numero: 1002, data: "2026-10-20", clienteId: 1, cliente: "Ana", formaPagamento: "boleto", itens: 4, subtotal: 280, desconto: 28, total: 252, tipoEntrega: "entrega", notaGerada: true },
  { id: 3, numero: 1003, data: "2026-10-22", clienteId: null, cliente: null, formaPagamento: "pix", itens: 1, subtotal: 100, desconto: 0, total: 100, tipoEntrega: "retirada", notaGerada: false },
];
const itens = [
  { vendaId: 1, numero: 1001, data: "2026-10-05", cliente: "Ana", formaPagamento: "pix", produtoId: 1, produto: "Cimento", categoria: "cimento", unidade: "sc", quantidade: 10, precoUnitario: 40, totalItem: 400, custoUnitario: 25 },
  { vendaId: 2, numero: 1002, data: "2026-10-20", cliente: "Ana", formaPagamento: "boleto", produtoId: 1, produto: "Cimento", categoria: "cimento", unidade: "sc", quantidade: 2, precoUnitario: 40, totalItem: 80, custoUnitario: 25 },
  { vendaId: 2, numero: 1002, data: "2026-10-20", cliente: "Ana", formaPagamento: "boleto", produtoId: 2, produto: "Tijolo", categoria: "tijolo", unidade: "mil", quantidade: 2, precoUnitario: 100, totalItem: 200, custoUnitario: null },
  { vendaId: 3, numero: 1003, data: "2026-10-22", cliente: null, formaPagamento: "pix", produtoId: 2, produto: "Tijolo", categoria: "tijolo", unidade: "mil", quantidade: 1, precoUnitario: 100, totalItem: 100, custoUnitario: null },
];
const lanc = (id, tipo, descricao, valor, vencimento, pago, dataPagamento, parte, diasAtraso) =>
  ({ id, tipo, descricao, valor, vencimento, pago, dataPagamento, parte, formaPagamento: "pix", diasAtraso });
const lancamentos = [
  lanc(1, "receita", "Venda 1", 400, "2026-10-05", true, "2026-10-05", "Ana", 0),
  lanc(2, "receita", "Venda 2", 252, "2026-10-20", false, null, "Ana", 35),
  lanc(3, "despesa", "Compra", 1000, "2026-10-25", true, "2026-10-26", "Forn A", 0),
];
const emAberto = [lancamentos[1], lanc(4, "despesa", "Aluguel", 500, "2099-01-01", false, null, "Imobiliária", 0)];
const estoque = [
  { id: 1, nome: "Cimento", categoria: "cimento", unidade: "sc", estoque: 100, estoqueMin: 20, preco: 40, custo: 25, fornecedor: "Forn A", vendido: 12, ultimaVenda: "2026-10-20" },
  { id: 2, nome: "Tijolo", categoria: "tijolo", unidade: "mil", estoque: 10, estoqueMin: 12, preco: 100, custo: null, fornecedor: null, vendido: 3, ultimaVenda: "2026-10-22" },
  { id: 3, nome: "Parado", categoria: "outros", unidade: "un", estoque: 7, estoqueMin: 2, preco: 10, custo: 5, fornecedor: null, vendido: 0, ultimaVenda: null },
];
const compras = [
  { id: 1, numero: 5001, data: "2026-10-10", fornecedor: "Forn A", status: "recebido", dataPrevista: "2026-10-15", dataRecebimento: "2026-10-14", itens: 100, total: 2000 },
  { id: 2, numero: 5002, data: "2026-10-12", fornecedor: null, status: "pendente", dataPrevista: "2026-10-30", dataRecebimento: null, itens: 5, total: 500 },
];
const dados = { vendas, itens, lancamentos, emAberto, estoque, compras };

const ids = (lista) => lista.map((x) => x.id);
const ind = (modelo, id) => modelo.indicadores.find((i) => i.id === id);

test("lista de relatórios: ids únicos e só pedem bases que existem", () => {
  assert.equal(new Set(ids(RELATORIOS)).size, RELATORIOS.length);
  const conhecidas = new Set(["vendas", "itens", "lancamentos", "emAberto", "estoque", "compras"]);
  for (const r of RELATORIOS) for (const n of [...r.precisa, ...(r.opcionais || [])]) assert.ok(conhecidas.has(n), `${r.id}: ${n}`);
});

test("resumo: indicadores, dois gráficos, tops na tela e a base só no Excel", () => {
  const m = montarRelatorio("resumo", dados, periodo, ctx);
  assert.deepEqual(ids(m.indicadores), ["faturamento", "vendas", "ticket", "descontos", "margem", "vencido", "abaixo"]);
  assert.equal(ind(m, "faturamento").valor, 752);
  assert.equal(ind(m, "vendas").valor, 3);
  assert.equal(ind(m, "margem").valor, 150 / 400, "só a venda 1 tem todos os custos");
  assert.equal(ind(m, "vencido").valor, 252);
  assert.equal(ind(m, "abaixo").valor, 1);
  assert.deepEqual(m.graficos.map((g) => g.tipo), ["colunas", "ranking"]);
  assert.equal(m.graficos[0].pontos.length, 31);
  assert.deepEqual(ids(m.tabelas), ["topProdutos", "topClientes", "vendas", "itens"]);
  assert.deepEqual(m.tabelas.map((t) => !!t.soExcel), [false, false, true, true]);
  assert.equal(m.tabelas[1].linhas[0].cliente, "Ana");
});

test("resumo sem permissão para financeiro/estoque: some só o que depende deles", () => {
  const m = montarRelatorio("resumo", { vendas, itens }, periodo, ctx);
  assert.deepEqual(ids(m.indicadores), ["faturamento", "vendas", "ticket", "descontos", "margem"]);
});

test("margem sem custo informado vira aviso, não número", () => {
  const m = montarRelatorio("vendas", { vendas, itens: itens.map((i) => ({ ...i, custoUnitario: null })) }, periodo, ctx);
  assert.equal(ind(m, "margem").valor, null);
  assert.match(ind(m, "margem").nota, /preço de custo/);
});

test("vendas: linhas legíveis (consumidor, forma, entrega, NF)", () => {
  const m = montarRelatorio("vendas", dados, periodo, ctx);
  assert.deepEqual(ids(m.indicadores), ["faturamento", "vendas", "itensVendidos", "ticket", "descontos", "margem"]);
  assert.equal(ind(m, "itensVendidos").valor, 15);
  const linhas = m.tabelas[0].linhas;
  assert.deepEqual(linhas.map((l) => [l.numero, l.cliente, l.forma, l.entrega, l.nota]), [
    [1001, "Ana", "PIX", "Retirada", false],
    [1002, "Ana", "Boleto", "Entrega", true],
    [1003, "Consumidor não identificado", "PIX", "Retirada", false],
  ]);
  assert.equal(m.tabelas[1].soExcel, true);
  assert.equal(m.tabelas[1].linhas[2].cliente, "Ana");
});

test("produtos: curva ABC, produtos sem custo e resumo por classe", () => {
  const m = montarRelatorio("produtos", dados, periodo, ctx);
  assert.equal(ind(m, "vendidos").valor, 2);
  assert.equal(ind(m, "semCusto").valor, 1, "tijolo");
  const abc = m.tabelas.find((t) => t.id === "abc").linhas;
  assert.deepEqual(abc.map((p) => [p.produto, p.classe]), [["Cimento", "A"], ["Tijolo", "A"]]);
  assert.equal(m.graficos[0].itens[0].rotulo, "Cimento");
});

test("clientes: consumidor não conta como cliente cadastrado; inadimplência quando há acesso ao financeiro", () => {
  const m = montarRelatorio("clientes", dados, periodo, ctx);
  assert.equal(ind(m, "ativos").valor, 1);
  assert.match(ind(m, "maior").valor, /^Ana \(\d+,\d%\)$/);
  assert.equal(ind(m, "inadimplencia").valor, 252);
  assert.deepEqual(ids(m.tabelas), ["clientes", "inadimplentes", "vendas"]);
  assert.deepEqual(m.tabelas[1].linhas, [{ cliente: "Ana", valor: 252, titulos: 1, maiorAtraso: 35 }]);
  const sem = montarRelatorio("clientes", { vendas }, periodo, ctx);
  assert.deepEqual(ids(sem.tabelas), ["clientes", "vendas"]);
  assert.equal(ind(sem, "inadimplencia"), undefined);
});

test("estoque: abaixo do mínimo primeiro, depois sem giro", () => {
  const m = montarRelatorio("estoque", dados, periodo, ctx);
  assert.deepEqual(m.tabelas[0].linhas.map((p) => [p.nome, p.situacao]), [
    ["Tijolo", "Abaixo do mínimo"], ["Parado", "Sem giro no período"], ["Cimento", "Normal"],
  ]);
  assert.equal(ind(m, "valorVenda").valor, 4000 + 1000 + 70);
  assert.match(ind(m, "valorCusto").nota, /2 de 3/);
});

test("financeiro: fluxo com duas séries, situação de cada lançamento e contas em aberto", () => {
  const m = montarRelatorio("financeiro", dados, periodo, ctx);
  assert.equal(ind(m, "recebido").valor, 400);
  assert.equal(ind(m, "pago").valor, 1000);
  assert.equal(ind(m, "saldo").valor, -600);
  assert.equal(ind(m, "aReceber").valor, 252);
  assert.equal(ind(m, "vencidoReceber").valor, 252);
  assert.deepEqual(m.graficos[0].series.map((s) => s.id), ["recebido", "pago"]);
  const lancs = m.tabelas.find((t) => t.id === "lancamentos").linhas;
  assert.deepEqual(lancs.map((l) => [l.tipo, l.situacao, l.diasAtraso]), [["Receita", "Pago", null], ["Receita", "Vencido", 35], ["Despesa", "Pago", null]]);
  assert.deepEqual(m.tabelas.find((t) => t.id === "emAberto").linhas.map((l) => l.situacao), ["Vencido", "A vencer"]);
  assert.equal(m.graficos[1].itens.find((f) => f.rotulo === "31 a 60 dias").valor, 252);
});

test("compras: pedidos, pendentes e fornecedores", () => {
  const m = montarRelatorio("compras", dados, periodo, ctx);
  assert.equal(ind(m, "total").valor, 2500);
  assert.equal(ind(m, "pendentes").valor, 1);
  assert.equal(ind(m, "prazo").valor, 4);
  assert.deepEqual(m.tabelas.find((t) => t.id === "compras").linhas.map((c) => [c.fornecedor, c.situacao]), [["Forn A", "Recebido"], ["Sem fornecedor", "Pendente"]]);
});

test("planilha: nome do arquivo, aba de resumo com o período e uma aba por tabela", () => {
  const m = montarRelatorio("vendas", dados, periodo, ctx);
  const p = planilhaDoRelatorio(m, periodo, "2026-11-24");
  assert.equal(p.arquivo, "relatorio-vendas_2026-10-01_a_2026-10-31.xlsx");
  assert.deepEqual(p.abas.map((a) => a.nome), ["Resumo", "Vendas", "Itens vendidos"]);
  const [relatorio, periodoLinha, gerado] = p.abas[0].indicadores;
  assert.equal(relatorio.valor, "Vendas do período");
  assert.equal(periodoLinha.valor, "01/10/2026 a 31/10/2026");
  assert.equal(gerado.valor, "24/11/2026");
});

test("todos os relatórios geram um Excel válido, com a base completa", async () => {
  for (const r of RELATORIOS) {
    const m = montarRelatorio(r.id, dados, periodo, ctx);
    const p = planilhaDoRelatorio(m, periodo, "2026-11-24");
    for (const aba of p.abas) assert.ok(aba.nome.length <= 31 && aba.nome.length > 0, `${r.id}: nome de aba "${aba.nome}"`);
    const blob = await gerarXlsx(p.abas);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const livro = await zip.file("xl/workbook.xml").async("string");
    for (const aba of p.abas) assert.ok(livro.includes(`name="${aba.nome}"`), `${r.id}: aba ${aba.nome}`);
    // a base (soExcel) tem todas as linhas: cabeçalho + 1 linha por registro
    if (m.tabelas.some((t) => t.id === "vendas" && t.soExcel)) {
      const i = p.abas.findIndex((a) => a.nome === "Vendas");
      const xml = await zip.file(`xl/worksheets/sheet${i + 1}.xml`).async("string");
      assert.equal((xml.match(/<row /g) || []).length, vendas.length + 1, `${r.id}: linhas da aba Vendas`);
    }
  }
});
