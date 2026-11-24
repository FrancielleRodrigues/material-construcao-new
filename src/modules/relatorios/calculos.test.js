import { test } from "node:test";
import assert from "node:assert/strict";
import {
  somarDias, diasDoPeriodo, periodoDoPreset, granularidade, resumoVendas, vendasPorPeriodo, porFormaPagamento,
  curvaABC, resumoABC, rankingClientes, resumoEmAberto, fluxoDeCaixa, analiseEstoque, analiseCompras, SEM_CLIENTE,
} from "./calculos.js";

// Mesmos números do teste do banco (supabase/tests/relatorios.test.mjs), outubro de 2026.
const vendas = [
  { id: 1, data: "2026-10-05", clienteId: 1, cliente: "Ana", formaPagamento: "pix", itens: 10, subtotal: 400, desconto: 0, total: 400 },
  { id: 2, data: "2026-10-20", clienteId: 1, cliente: "Ana", formaPagamento: "boleto", itens: 4, subtotal: 280, desconto: 28, total: 252 },
];
const itens = [
  { vendaId: 1, produtoId: 1, produto: "Cimento", categoria: "cimento", unidade: "sc", quantidade: 10, precoUnitario: 40, totalItem: 400, custoUnitario: 25 },
  { vendaId: 2, produtoId: 1, produto: "Cimento", categoria: "cimento", unidade: "sc", quantidade: 2, precoUnitario: 40, totalItem: 80, custoUnitario: 25 },
  { vendaId: 2, produtoId: 2, produto: "Tijolo", categoria: "tijolo", unidade: "mil", quantidade: 2, precoUnitario: 100, totalItem: 200, custoUnitario: null },
];

test("datas: soma de dias, tamanho do período e virada de mês/ano", () => {
  assert.equal(somarDias("2026-02-27", 3), "2026-03-02");
  assert.equal(somarDias("2028-02-28", 1), "2028-02-29");
  assert.equal(somarDias("2026-01-01", -1), "2025-12-31");
  assert.equal(diasDoPeriodo("2026-10-01", "2026-10-31"), 31);
  assert.equal(diasDoPeriodo("2026-10-05", "2026-10-05"), 1);
  assert.equal(diasDoPeriodo("2026-10-31", "2026-10-01"), 0);
});

test("atalhos de período", () => {
  const h = "2026-11-24";
  assert.deepEqual(periodoDoPreset("hoje", h), { inicio: h, fim: h });
  assert.deepEqual(periodoDoPreset("7d", h), { inicio: "2026-11-18", fim: h });
  assert.deepEqual(periodoDoPreset("30d", h), { inicio: "2026-10-26", fim: h });
  assert.deepEqual(periodoDoPreset("mes", h), { inicio: "2026-11-01", fim: h });
  assert.deepEqual(periodoDoPreset("mes_anterior", h), { inicio: "2026-10-01", fim: "2026-10-31" });
  assert.deepEqual(periodoDoPreset("ano", h), { inicio: "2026-01-01", fim: h });
  assert.deepEqual(periodoDoPreset("mes_anterior", "2028-03-10"), { inicio: "2028-02-01", fim: "2028-02-29" }, "ano bissexto");
  assert.deepEqual(periodoDoPreset("mes_anterior", "2026-01-15"), { inicio: "2025-12-01", fim: "2025-12-31" }, "virada de ano");
});

test("granularidade: por dia até 62 dias; por mês acima", () => {
  assert.equal(granularidade("2026-10-01", "2026-12-01"), "dia"); // 62 dias
  assert.equal(granularidade("2026-10-01", "2026-12-02"), "mes"); // 63 dias
});

test("resumo de vendas: faturamento, ticket, descontos e margem só onde há custo", () => {
  const r = resumoVendas(vendas, itens);
  assert.equal(r.faturamento, 652);
  assert.equal(r.vendas, 2);
  assert.equal(r.ticketMedio, 326);
  assert.equal(r.descontos, 28);
  assert.equal(r.itensVendidos, 14);
  // só a venda 1 tem todos os itens com custo: 400 - 10×25 = 150, sobre 400 de receita
  assert.equal(r.lucro, 150);
  assert.equal(r.margem, 0.375);
  assert.equal(r.coberturaCusto, 400 / 652);
});

test("resumo de vendas: sem nenhum custo informado não inventa margem; sem vendas não quebra", () => {
  const semCusto = itens.map((i) => ({ ...i, custoUnitario: null }));
  const r = resumoVendas(vendas, semCusto);
  assert.equal(r.lucro, null);
  assert.equal(r.margem, null);
  assert.equal(r.coberturaCusto, 0);
  assert.deepEqual(resumoVendas([], []), { faturamento: 0, vendas: 0, ticketMedio: 0, descontos: 0, itensVendidos: 0, lucro: null, margem: null, coberturaCusto: 0 });
});

test("vendas por período: dia a dia com zeros, e por mês quando o período é longo", () => {
  const dia = vendasPorPeriodo(vendas, "2026-10-01", "2026-10-31");
  assert.equal(dia.granularidade, "dia");
  assert.equal(dia.pontos.length, 31);
  assert.deepEqual(dia.pontos[4], { chave: "2026-10-05", rotulo: "05/10", valor: 400, vendas: 1 });
  assert.equal(dia.pontos[19].valor, 252);
  assert.equal(dia.pontos[0].valor, 0);
  assert.equal(dia.pontos.reduce((s, p) => s + p.valor, 0), 652);

  const mes = vendasPorPeriodo(vendas, "2026-01-01", "2026-11-24");
  assert.equal(mes.granularidade, "mes");
  assert.equal(mes.pontos.length, 11);
  assert.deepEqual(mes.pontos[9], { chave: "2026-10-01", rotulo: "out/26", valor: 652, vendas: 2 });
  assert.equal(mes.pontos[0].rotulo, "jan/26");

  // venda fora do período é ignorada
  assert.equal(vendasPorPeriodo(vendas, "2026-11-01", "2026-11-30").pontos.every((p) => p.valor === 0), true);
});

test("forma de pagamento: maior primeiro, com participação", () => {
  const r = porFormaPagamento(vendas, { pix: "PIX", boleto: "Boleto" });
  assert.deepEqual(r.map((x) => [x.rotulo, x.valor, x.vendas]), [["PIX", 400, 1], ["Boleto", 252, 1]]);
  assert.ok(Math.abs(r[0].participacao - 400 / 652) < 1e-9);
});

test("curva ABC: desconto rateado nos itens, custo só quando conhecido", () => {
  const abc = curvaABC(itens, vendas);
  // Cimento: 400 + 80×(252/280)=72 → 472. Tijolo: 200×0,9 = 180.
  assert.deepEqual(abc.map((p) => [p.produto, p.receita, p.classe]), [["Cimento", 472, "A"], ["Tijolo", 180, "A"]]);
  assert.equal(abc[0].quantidade, 12);
  assert.equal(abc[0].custo, 300);
  assert.equal(abc[0].lucro, 172);
  assert.ok(Math.abs(abc[0].margem - 172 / 472) < 1e-9);
  assert.equal(abc[1].custo, null, "tijolo sem custo informado");
  assert.equal(abc[1].lucro, null);
  assert.equal(abc[1].margem, null);
  assert.ok(Math.abs(abc[1].acumulado - 1) < 1e-9);
  assert.equal(abc.reduce((s, p) => s + p.receita, 0), 652, "o desconto rateado fecha com o faturamento");
});

test("curva ABC: A até 80%, B até 95%, C o resto", () => {
  const receitas = [800, 100, 50, 30, 20];
  const v = receitas.map((r, i) => ({ id: i + 1, subtotal: r, total: r }));
  const it = receitas.map((r, i) => ({ vendaId: i + 1, produtoId: i + 1, produto: `P${i + 1}`, quantidade: 1, totalItem: r, custoUnitario: null }));
  const abc = curvaABC(it, v);
  assert.deepEqual(abc.map((p) => p.classe), ["A", "B", "B", "C", "C"]);
  assert.deepEqual(resumoABC(abc).map((c) => [c.classe, c.produtos, c.receita]), [["A", 1, 800], ["B", 2, 150], ["C", 2, 50]]);
  assert.deepEqual(curvaABC([], []), []);
});

test("ranking de clientes: consumidor sem cadastro agrupado, ordenado por faturamento", () => {
  const todas = [...vendas, { id: 3, data: "2026-11-03", clienteId: null, cliente: null, formaPagamento: "pix", itens: 1, subtotal: 40, desconto: 0, total: 40 }];
  const r = rankingClientes(todas);
  assert.deepEqual(r.map((c) => [c.cliente, c.vendas, c.faturamento, c.ticketMedio, c.ultimaCompra]), [
    ["Ana", 2, 652, 326, "2026-10-20"],
    [SEM_CLIENTE, 1, 40, 40, "2026-11-03"],
  ]);
  assert.ok(Math.abs(r[0].participacao - 652 / 692) < 1e-9);
});

test("contas em aberto: vencido x a vencer, faixas de atraso e inadimplência por cliente", () => {
  const l = (tipo, valor, diasAtraso, parte = "") => ({ tipo, valor, diasAtraso, parte });
  const r = resumoEmAberto([
    l("receita", 252, 35, "Ana"), l("receita", 100, 5, "Ana"), l("receita", 50, 0, "Bruno"), l("receita", 70, 120, "Bruno"),
    l("despesa", 500, 0, "Aluguel"), l("despesa", 40, 10, "Luz"),
  ]);
  assert.deepEqual(r.receber, { total: 472, vencido: 422, aVencer: 50, titulosVencidos: 3 });
  assert.deepEqual(r.pagar, { total: 540, vencido: 40, aVencer: 500 });
  assert.deepEqual(r.faixasAtraso.map((f) => [f.id, f.valor, f.titulos]), [["1-30", 100, 1], ["31-60", 252, 1], ["61-90", 0, 0], ["90+", 70, 1]]);
  assert.deepEqual(r.inadimplentes, [
    { cliente: "Ana", valor: 352, titulos: 2, maiorAtraso: 35 },
    { cliente: "Bruno", valor: 70, titulos: 1, maiorAtraso: 120 },
  ]);
  assert.equal(resumoEmAberto([]).receber.total, 0);
});

test("fluxo de caixa: realizado pela data do pagamento, previsto pelo vencimento", () => {
  const l = (tipo, valor, pago, vencimento, dataPagamento = null) => ({ tipo, valor, pago, vencimento, dataPagamento });
  const lancs = [
    l("receita", 300, true, "2026-11-01", "2026-11-05"),
    l("despesa", 1000, true, "2026-11-10", "2026-11-12"),
    l("receita", 200, false, "2026-11-20"),
    l("despesa", 50, false, "2026-11-25"),
    l("receita", 999, true, "2026-10-28", "2026-10-30"), // pago fora do período: não entra
    l("receita", 777, false, "2026-12-05"),               // vence fora do período: não entra
  ];
  const f = fluxoDeCaixa(lancs, "2026-11-01", "2026-11-30");
  assert.equal(f.granularidade, "dia");
  assert.equal(f.pontos.length, 30);
  assert.deepEqual(f.totais, { recebido: 300, pago: 1000, saldo: -700, aReceber: 200, aPagar: 50 });
  assert.equal(f.pontos[4].recebido, 300);
  assert.equal(f.pontos[11].pago, 1000);
  const ano = fluxoDeCaixa(lancs, "2026-01-01", "2026-12-31");
  assert.equal(ano.granularidade, "mes");
  assert.equal(ano.pontos.length, 12);
  assert.equal(ano.pontos[10].recebido, 300); // novembro
  assert.equal(ano.pontos[9].recebido, 999);  // outubro
});

test("estoque: abaixo do mínimo, sem giro, cobertura em dias e valores", () => {
  const base = [
    { id: 1, nome: "Cimento", estoque: 100, estoqueMin: 20, preco: 40, custo: 25, vendido: 12, ultimaVenda: "2026-11-03" },
    { id: 2, nome: "Tijolo", estoque: 10, estoqueMin: 12, preco: 100, custo: null, vendido: 2, ultimaVenda: "2026-11-02" },
    { id: 3, nome: "Parado", estoque: 7, estoqueMin: 2, preco: 10, custo: 5, vendido: 0, ultimaVenda: null },
  ];
  const { linhas, resumo } = analiseEstoque(base, "2026-10-01", "2026-10-31");
  assert.deepEqual(linhas.map((p) => p.situacao), ["Normal", "Abaixo do mínimo", "Sem giro no período"]);
  assert.equal(linhas[0].coberturaDias, 258); // 100 / (12 vendidos em 31 dias)
  assert.equal(linhas[2].coberturaDias, null);
  assert.deepEqual(resumo, { produtos: 3, abaixoDoMinimo: 1, semGiro: 1, valorVenda: 5070, valorCusto: 2535, produtosComCusto: 2 });
  assert.equal(analiseEstoque([], "2026-10-01", "2026-10-31").resumo.valorCusto, null);
});

test("compras: total, pendentes, prazo médio de recebimento e ranking de fornecedores", () => {
  const { resumo, porFornecedor } = analiseCompras([
    { fornecedor: "Forn A", total: 2000, status: "recebido", data: "2026-10-10", dataRecebimento: "2026-10-14" },
    { fornecedor: "Forn A", total: 1500, status: "pendente", data: "2026-11-05", dataRecebimento: null },
    { fornecedor: "Forn B", total: 500, status: "recebido", data: "2026-11-01", dataRecebimento: "2026-11-07" },
  ]);
  assert.deepEqual(resumo, { pedidos: 3, total: 4000, pendentes: 1, valorPendente: 1500, prazoMedioDias: 5 });
  assert.deepEqual(porFornecedor.map((f) => [f.fornecedor, f.pedidos, f.total, f.participacao]), [["Forn A", 2, 3500, 0.875], ["Forn B", 1, 500, 0.125]]);
  assert.equal(analiseCompras([]).resumo.prazoMedioDias, null);
});
