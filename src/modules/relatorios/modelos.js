// Monta o "modelo" de cada relatório: indicadores, gráficos e tabelas, a partir da base do período.
// Puro (sem React): a tela só desenha o modelo e o Excel exporta as mesmas tabelas.
//
// Tabela: { id, titulo, subtitulo?, nomeAba, colunas: [{ titulo, campo, tipo }], linhas, soExcel? }
//   soExcel = é a base detalhada: vai para a planilha, mas não ocupa a tela.
// Indicador: { id, rotulo, valor, tipo, icone, tom, nota? }
// Gráfico: { tipo: "colunas" | "ranking", ... }  (ver graficos.jsx)

import {
  SEM_CLIENTE, resumoVendas, vendasPorPeriodo, porFormaPagamento, curvaABC, resumoABC, rankingClientes,
  resumoEmAberto, fluxoDeCaixa, analiseEstoque, analiseCompras,
} from "./calculos.js";
import { formatar } from "./formatos.js";

export const COR_1 = "#2a78d6"; // azul   (série 1 / uma série só)
export const COR_2 = "#eb6834"; // laranja (série 2)

// Cada relatório e o que ele precisa buscar no banco.
export const RELATORIOS = [
  { id: "resumo", rotulo: "Resumo", precisa: ["vendas", "itens"], opcionais: ["emAberto", "estoque"], modulos: ["venda", "entregas", "fiscal"] },
  { id: "vendas", rotulo: "Vendas", precisa: ["vendas", "itens"], modulos: ["venda", "entregas", "fiscal"] },
  { id: "produtos", rotulo: "Produtos (curva ABC)", precisa: ["vendas", "itens"], modulos: ["venda", "entregas", "fiscal"] },
  { id: "clientes", rotulo: "Clientes", precisa: ["vendas"], opcionais: ["emAberto"], modulos: ["venda", "entregas", "fiscal"] },
  { id: "estoque", rotulo: "Estoque", precisa: ["estoque"], modulos: ["produtos", "estoque", "venda", "compras"] },
  { id: "financeiro", rotulo: "Financeiro", precisa: ["lancamentos", "emAberto"], modulos: ["financeiro"] },
  { id: "compras", rotulo: "Compras", precisa: ["compras"], modulos: ["compras"] },
];

// ---------- colunas das tabelas ----------

const col = (titulo, campo, tipo = "texto") => ({ titulo, campo, tipo });

const COLUNAS = {
  vendas: [
    col("Nº", "numero", "inteiro"), col("Data", "data", "data"), col("Cliente", "cliente"),
    col("Forma de pagamento", "forma"), col("Itens", "itens", "quantidade"), col("Subtotal", "subtotal", "moeda"),
    col("Desconto", "desconto", "moeda"), col("Total", "total", "moeda"), col("Entrega", "entrega"),
    col("Rascunho de NF-e", "nota", "booleano"),
  ],
  itens: [
    col("Venda nº", "numero", "inteiro"), col("Data", "data", "data"), col("Cliente", "cliente"),
    col("Forma de pagamento", "forma"), col("Produto", "produto"), col("Categoria", "categoria"), col("Unid.", "unidade"),
    col("Quantidade", "quantidade", "quantidade"), col("Preço unitário", "precoUnitario", "moeda"),
    col("Total do item", "totalItem", "moeda"), col("Custo unitário", "custoUnitario", "moeda"),
  ],
  abc: [
    col("Classe", "classe"), col("Produto", "produto"), col("Categoria", "categoria"), col("Unid.", "unidade"),
    col("Quantidade", "quantidade", "quantidade"), col("Faturamento", "receita", "moeda"),
    col("Participação", "participacao", "percentual"), col("Acumulado", "acumulado", "percentual"),
    col("Custo", "custo", "moeda"), col("Lucro", "lucro", "moeda"), col("Margem", "margem", "percentual"),
  ],
  resumoABC: [col("Classe", "classe"), col("Produtos", "produtos", "inteiro"), col("Faturamento", "receita", "moeda"), col("Participação", "participacao", "percentual")],
  topProdutos: [
    col("Produto", "produto"), col("Quantidade", "quantidade", "quantidade"), col("Faturamento", "receita", "moeda"),
    col("Participação", "participacao", "percentual"), col("Classe", "classe"),
  ],
  clientes: [
    col("Cliente", "cliente"), col("Vendas", "vendas", "inteiro"), col("Faturamento", "faturamento", "moeda"),
    col("Ticket médio", "ticketMedio", "moeda"), col("Última compra", "ultimaCompra", "data"), col("Participação", "participacao", "percentual"),
  ],
  inadimplentes: [
    col("Cliente", "cliente"), col("Títulos vencidos", "titulos", "inteiro"), col("Valor vencido", "valor", "moeda"),
    col("Maior atraso (dias)", "maiorAtraso", "inteiro"),
  ],
  lancamentos: [
    col("Tipo", "tipo"), col("Descrição", "descricao"), col("Cliente / fornecedor", "parte"), col("Vencimento", "vencimento", "data"),
    col("Valor", "valor", "moeda"), col("Situação", "situacao"), col("Pago em", "dataPagamento", "data"),
    col("Forma de pagamento", "forma"), col("Dias de atraso", "diasAtraso", "inteiro"),
  ],
  fluxo: [
    col("Período", "rotulo"), col("Recebido", "recebido", "moeda"), col("Pago", "pago", "moeda"), col("Saldo", "saldo", "moeda"),
    col("A receber (previsto)", "aReceber", "moeda"), col("A pagar (previsto)", "aPagar", "moeda"),
  ],
  faixas: [col("Atraso", "rotulo"), col("Títulos", "titulos", "inteiro"), col("Valor", "valor", "moeda")],
  estoque: [
    col("Produto", "nome"), col("Categoria", "categoria"), col("Unid.", "unidade"), col("Estoque", "estoque", "quantidade"),
    col("Mínimo", "estoqueMin", "quantidade"), col("Preço de venda", "preco", "moeda"), col("Custo", "custo", "moeda"),
    col("Valor a preço de venda", "valorVenda", "moeda"), col("Valor a custo", "valorCusto", "moeda"),
    col("Vendido no período", "vendido", "quantidade"), col("Última venda", "ultimaVenda", "data"),
    col("Cobertura (dias)", "coberturaDias", "inteiro"), col("Situação", "situacao"), col("Fornecedor", "fornecedor"),
  ],
  compras: [
    col("Pedido nº", "numero", "inteiro"), col("Data", "data", "data"), col("Fornecedor", "fornecedor"), col("Situação", "situacao"),
    col("Itens", "itens", "quantidade"), col("Total", "total", "moeda"), col("Previsão", "dataPrevista", "data"),
    col("Recebido em", "dataRecebimento", "data"),
  ],
  fornecedores: [col("Fornecedor", "fornecedor"), col("Pedidos", "pedidos", "inteiro"), col("Total comprado", "total", "moeda"), col("Participação", "participacao", "percentual")],
};

// ---------- linhas das tabelas ----------

const rotuloForma = (ctx, forma) => ctx.formas[forma] || forma;

const linhasVendas = (vendas, ctx) =>
  vendas.map((v) => ({
    ...v, cliente: v.cliente || SEM_CLIENTE, forma: rotuloForma(ctx, v.formaPagamento),
    entrega: v.tipoEntrega === "entrega" ? "Entrega" : "Retirada", nota: v.notaGerada,
  }));

const linhasItens = (itens, ctx) =>
  itens.map((i) => ({ ...i, cliente: i.cliente || SEM_CLIENTE, forma: rotuloForma(ctx, i.formaPagamento) }));

const linhasLancamentos = (lancs, ctx) =>
  lancs.map((l) => ({
    ...l, tipo: l.tipo === "receita" ? "Receita" : "Despesa", forma: rotuloForma(ctx, l.formaPagamento),
    situacao: l.pago ? "Pago" : l.diasAtraso > 0 ? "Vencido" : "A vencer",
    diasAtraso: l.pago ? null : l.diasAtraso,
  }));

const ORDEM_SITUACAO = { "Abaixo do mínimo": 0, "Sem giro no período": 1, Normal: 2 };

// ---------- peças ----------

const indicador = (id, rotulo, valor, tipo, icone, tom, nota) => ({ id, rotulo, valor, tipo, icone, tom, nota });
const TOM = { azul: "bg-teal-50 text-teal-700", ambar: "bg-amber-50 text-amber-700", vermelho: "bg-red-50 text-red-600", cinza: "bg-slate-50 text-slate-700" };

const tabela = (id, titulo, nomeAba, colunas, linhas, extra = {}) => ({ id, titulo, nomeAba, colunas, linhas, ...extra });

const graficoRanking = (id, titulo, itens, formato = "moeda", subtitulo = "") => ({ tipo: "ranking", id, titulo, subtitulo, itens, formato });

function indicadoresDeVendas(r) {
  return [
    indicador("faturamento", "Faturamento", r.faturamento, "moeda", "dinheiro", TOM.azul),
    indicador("vendas", "Vendas", r.vendas, "inteiro", "carrinho", TOM.cinza),
    indicador("ticket", "Ticket médio", r.ticketMedio, "moeda", "recibo", TOM.ambar),
    indicador("descontos", "Descontos concedidos", r.descontos, "moeda", "etiqueta", TOM.cinza),
    indicador(
      "margem", "Margem de lucro", r.margem, "percentual", "grafico", r.margem === null ? TOM.cinza : TOM.azul,
      r.margem === null
        ? "Informe o preço de custo nos produtos para ver a margem."
        : `Calculada sobre ${formatar(r.coberturaCusto, "percentual")} do faturamento (vendas com todos os custos informados).`
    ),
  ];
}

function graficoVendasNoTempo(vendas, periodo) {
  const serie = vendasPorPeriodo(vendas, periodo.inicio, periodo.fim);
  return {
    tipo: "colunas", id: "vendas-tempo", formato: "moeda",
    titulo: serie.granularidade === "dia" ? "Faturamento por dia" : "Faturamento por mês",
    series: [{ id: "valor", nome: "Faturamento", cor: COR_1 }],
    pontos: serie.pontos.map((p) => ({ chave: p.chave, rotulo: p.rotulo, valores: { valor: p.valor }, extra: `${p.vendas} ${p.vendas === 1 ? "venda" : "vendas"}` })),
  };
}

function graficoFormas(vendas, ctx) {
  const formas = porFormaPagamento(vendas, ctx.formas);
  return graficoRanking("formas", "Formas de pagamento", formas.map((f) => ({ rotulo: f.rotulo, valor: f.valor, detalhe: `${formatar(f.participacao, "percentual")} · ${f.vendas} ${f.vendas === 1 ? "venda" : "vendas"}` })));
}

// ---------- relatórios ----------

function resumo(d, periodo, ctx) {
  const r = resumoVendas(d.vendas, d.itens);
  const abc = curvaABC(d.itens, d.vendas);
  const clientes = rankingClientes(d.vendas);
  const indicadores = indicadoresDeVendas(r);
  if (d.emAberto) {
    const a = resumoEmAberto(d.emAberto);
    indicadores.push(indicador("vencido", "Contas a receber vencidas", a.receber.vencido, "moeda", "alerta", a.receber.vencido > 0 ? TOM.vermelho : TOM.cinza, `${a.receber.titulosVencidos} título(s) vencido(s), de qualquer data.`));
  }
  if (d.estoque) {
    const e = analiseEstoque(d.estoque, periodo.inicio, periodo.fim).resumo;
    indicadores.push(indicador("abaixo", "Produtos abaixo do mínimo", e.abaixoDoMinimo, "inteiro", "alerta", e.abaixoDoMinimo > 0 ? TOM.vermelho : TOM.cinza, "Situação atual do estoque."));
  }
  return {
    id: "resumo", titulo: "Resumo do período", indicadores,
    graficos: [graficoVendasNoTempo(d.vendas, periodo), graficoFormas(d.vendas, ctx)],
    tabelas: [
      tabela("topProdutos", "Produtos que mais faturaram", "Top produtos", COLUNAS.topProdutos, abc.slice(0, 10), { subtitulo: "Os 10 maiores do período." }),
      tabela("topClientes", "Maiores clientes", "Top clientes", COLUNAS.clientes, clientes.slice(0, 10), { subtitulo: "Os 10 maiores do período." }),
      tabela("vendas", "Vendas", "Vendas", COLUNAS.vendas, linhasVendas(d.vendas, ctx), { soExcel: true }),
      tabela("itens", "Itens vendidos", "Itens vendidos", COLUNAS.itens, linhasItens(d.itens, ctx), { soExcel: true }),
    ],
  };
}

function vendas(d, periodo, ctx) {
  const r = resumoVendas(d.vendas, d.itens);
  const indicadores = indicadoresDeVendas(r);
  indicadores.splice(2, 0, indicador("itensVendidos", "Itens vendidos", r.itensVendidos, "quantidade", "caixa", TOM.cinza));
  return {
    id: "vendas", titulo: "Vendas do período", indicadores,
    graficos: [graficoVendasNoTempo(d.vendas, periodo), graficoFormas(d.vendas, ctx)],
    tabelas: [
      tabela("vendas", "Vendas", "Vendas", COLUNAS.vendas, linhasVendas(d.vendas, ctx), { subtitulo: "Uma linha por venda." }),
      tabela("itens", "Itens vendidos", "Itens vendidos", COLUNAS.itens, linhasItens(d.itens, ctx), { soExcel: true }),
    ],
  };
}

function produtos(d, periodo, ctx) {
  const abc = curvaABC(d.itens, d.vendas);
  const r = resumoVendas(d.vendas, d.itens);
  const classes = resumoABC(abc);
  const a = classes.find((c) => c.classe === "A");
  const semCusto = abc.filter((p) => p.custo === null).length;
  return {
    id: "produtos", titulo: "Produtos e curva ABC",
    indicadores: [
      indicador("vendidos", "Produtos vendidos", abc.length, "inteiro", "caixa", TOM.cinza),
      indicador("faturamento", "Faturamento", r.faturamento, "moeda", "dinheiro", TOM.azul),
      indicador("classeA", "Classe A (80% do faturamento)", a ? a.produtos : 0, "inteiro", "estrela", TOM.azul, a ? `Esses produtos somam ${formatar(a.participacao, "percentual")} do faturamento.` : ""),
      indicador("margem", "Margem de lucro", r.margem, "percentual", "grafico", r.margem === null ? TOM.cinza : TOM.azul, r.margem === null ? "Informe o preço de custo nos produtos." : ""),
      indicador("semCusto", "Produtos sem custo informado", semCusto, "inteiro", "alerta", semCusto > 0 ? TOM.ambar : TOM.cinza, "Sem custo não há margem para o produto."),
    ],
    graficos: [graficoRanking("top-produtos", "Faturamento por produto (10 maiores)", abc.slice(0, 10).map((p) => ({ rotulo: p.produto, valor: p.receita, detalhe: `${formatar(p.participacao, "percentual")} · classe ${p.classe}` })))],
    tabelas: [
      tabela("resumoABC", "Resumo por classe", "Resumo ABC", COLUNAS.resumoABC, classes, { subtitulo: "A: até 80% do faturamento · B: até 95% · C: o restante." }),
      tabela("abc", "Curva ABC", "Curva ABC", COLUNAS.abc, abc),
      tabela("itens", "Itens vendidos", "Itens vendidos", COLUNAS.itens, linhasItens(d.itens, ctx), { soExcel: true }),
    ],
  };
}

function clientes(d, periodo, ctx) {
  const ranking = rankingClientes(d.vendas);
  const identificados = ranking.filter((c) => c.clienteId !== null);
  const r = resumoVendas(d.vendas, []);
  const maior = identificados[0];
  const indicadores = [
    indicador("ativos", "Clientes que compraram", identificados.length, "inteiro", "pessoas", TOM.cinza, "Cadastrados que compraram no período."),
    indicador("ticket", "Ticket médio", r.ticketMedio, "moeda", "recibo", TOM.ambar),
    indicador("maior", "Maior cliente", maior ? `${maior.cliente} (${formatar(maior.participacao, "percentual")})` : "—", "texto", "estrela", TOM.azul),
  ];
  const tabelas = [tabela("clientes", "Ranking de clientes", "Clientes", COLUNAS.clientes, ranking)];
  if (d.emAberto) {
    const a = resumoEmAberto(d.emAberto);
    indicadores.push(indicador("inadimplencia", "Inadimplência (vencido a receber)", a.receber.vencido, "moeda", "alerta", a.receber.vencido > 0 ? TOM.vermelho : TOM.cinza, "Contas vencidas e não pagas, de qualquer data."));
    tabelas.push(tabela("inadimplentes", "Clientes com contas vencidas", "Inadimplência", COLUNAS.inadimplentes, a.inadimplentes, { subtitulo: "Situação de hoje, independente do período." }));
  }
  tabelas.push(tabela("vendas", "Vendas", "Vendas", COLUNAS.vendas, linhasVendas(d.vendas, ctx), { soExcel: true }));
  return {
    id: "clientes", titulo: "Clientes", indicadores,
    graficos: [graficoRanking("top-clientes", "Faturamento por cliente (10 maiores)", ranking.slice(0, 10).map((c) => ({ rotulo: c.cliente, valor: c.faturamento, detalhe: `${formatar(c.participacao, "percentual")} · ${c.vendas} ${c.vendas === 1 ? "venda" : "vendas"}` })))],
    tabelas,
  };
}

function estoque(d, periodo) {
  const { linhas, resumo: r } = analiseEstoque(d.estoque, periodo.inicio, periodo.fim);
  const ordenadas = [...linhas].sort((a, b) => ORDEM_SITUACAO[a.situacao] - ORDEM_SITUACAO[b.situacao] || a.nome.localeCompare(b.nome));
  const maiores = [...linhas].sort((a, b) => b.valorVenda - a.valorVenda).filter((p) => p.valorVenda > 0).slice(0, 10);
  return {
    id: "estoque", titulo: "Estoque",
    indicadores: [
      indicador("produtos", "Produtos cadastrados", r.produtos, "inteiro", "caixa", TOM.cinza),
      indicador("abaixo", "Abaixo do mínimo", r.abaixoDoMinimo, "inteiro", "alerta", r.abaixoDoMinimo > 0 ? TOM.vermelho : TOM.cinza, "Precisam de reposição."),
      indicador("semGiro", "Sem giro no período", r.semGiro, "inteiro", "pausa", r.semGiro > 0 ? TOM.ambar : TOM.cinza, "Têm estoque e não venderam nada no período."),
      indicador("valorVenda", "Valor em estoque (preço de venda)", r.valorVenda, "moeda", "dinheiro", TOM.azul),
      indicador("valorCusto", "Valor em estoque (custo)", r.valorCusto, "moeda", "dinheiro", TOM.cinza, r.produtosComCusto < r.produtos ? `Só ${r.produtosComCusto} de ${r.produtos} produtos têm custo informado.` : ""),
    ],
    graficos: [graficoRanking("valor-estoque", "Onde está o dinheiro parado (10 maiores, a preço de venda)", maiores.map((p) => ({ rotulo: p.nome, valor: p.valorVenda, detalhe: `${formatar(p.estoque, "quantidade")} ${p.unidade}` })))],
    tabelas: [tabela("estoque", "Posição do estoque", "Estoque", COLUNAS.estoque, ordenadas, { subtitulo: "Abaixo do mínimo primeiro, depois os sem giro. O período filtra só as colunas de venda e cobertura." })],
  };
}

function financeiro(d, periodo, ctx) {
  const fluxo = fluxoDeCaixa(d.lancamentos, periodo.inicio, periodo.fim);
  const a = resumoEmAberto(d.emAberto);
  const t = fluxo.totais;
  const saldoTom = t.saldo < 0 ? TOM.vermelho : TOM.azul;
  const linhasFluxo = fluxo.pontos.map((p) => ({ ...p }));
  return {
    id: "financeiro", titulo: "Financeiro",
    indicadores: [
      indicador("recebido", "Recebido no período", t.recebido, "moeda", "entrada", TOM.azul, "Receitas pagas no período."),
      indicador("pago", "Pago no período", t.pago, "moeda", "saida", TOM.ambar, "Despesas pagas no período."),
      indicador("saldo", "Saldo do período", t.saldo, "moeda", "dinheiro", saldoTom, "Recebido menos pago."),
      indicador("aReceber", "A receber (previsto)", t.aReceber, "moeda", "relogio", TOM.cinza, "Não pagas, com vencimento no período."),
      indicador("aPagar", "A pagar (previsto)", t.aPagar, "moeda", "relogio", TOM.cinza, "Não pagas, com vencimento no período."),
      indicador("vencidoReceber", "Vencido a receber", a.receber.vencido, "moeda", "alerta", a.receber.vencido > 0 ? TOM.vermelho : TOM.cinza, "De qualquer data, até hoje."),
      indicador("vencidoPagar", "Vencido a pagar", a.pagar.vencido, "moeda", "alerta", a.pagar.vencido > 0 ? TOM.vermelho : TOM.cinza, "De qualquer data, até hoje."),
    ],
    graficos: [
      {
        tipo: "colunas", id: "fluxo", formato: "moeda",
        titulo: fluxo.granularidade === "dia" ? "Entradas e saídas por dia" : "Entradas e saídas por mês",
        series: [{ id: "recebido", nome: "Recebido", cor: COR_1 }, { id: "pago", nome: "Pago", cor: COR_2 }],
        pontos: fluxo.pontos.map((p) => ({ chave: p.chave, rotulo: p.rotulo, valores: { recebido: p.recebido, pago: p.pago } })),
      },
      graficoRanking("atraso", "Contas a receber vencidas, por tempo de atraso", a.faixasAtraso.map((f) => ({ rotulo: f.rotulo, valor: f.valor, detalhe: `${f.titulos} ${f.titulos === 1 ? "título" : "títulos"}` })), "moeda", "Situação de hoje."),
    ],
    tabelas: [
      tabela("lancamentos", "Lançamentos do período", "Lançamentos", COLUNAS.lancamentos, linhasLancamentos(d.lancamentos, ctx), { subtitulo: "Vencem ou foram pagos no período." }),
      tabela("emAberto", "Contas em aberto (hoje)", "Em aberto", COLUNAS.lancamentos, linhasLancamentos(d.emAberto, ctx), { subtitulo: "Tudo que ainda não foi pago, de qualquer data." }),
      tabela("inadimplentes", "Clientes com contas vencidas", "Inadimplência", COLUNAS.inadimplentes, a.inadimplentes),
      tabela("fluxo", "Fluxo de caixa", "Fluxo de caixa", COLUNAS.fluxo, linhasFluxo, { soExcel: true }),
    ],
  };
}

function compras(d) {
  const { resumo: r, porFornecedor } = analiseCompras(d.compras);
  return {
    id: "compras", titulo: "Compras",
    indicadores: [
      indicador("pedidos", "Pedidos de compra", r.pedidos, "inteiro", "caixa", TOM.cinza),
      indicador("total", "Total comprado", r.total, "moeda", "dinheiro", TOM.azul),
      indicador("pendentes", "Pedidos pendentes", r.pendentes, "inteiro", "relogio", r.pendentes > 0 ? TOM.ambar : TOM.cinza, "Ainda não recebidos."),
      indicador("valorPendente", "Valor pendente", r.valorPendente, "moeda", "relogio", TOM.cinza),
      indicador("prazo", "Prazo médio de recebimento", r.prazoMedioDias, "inteiro", "relogio", TOM.cinza, "Dias entre o pedido e o recebimento."),
    ],
    graficos: [graficoRanking("fornecedores", "Compras por fornecedor", porFornecedor.slice(0, 10).map((f) => ({ rotulo: f.fornecedor, valor: f.total, detalhe: `${formatar(f.participacao, "percentual")} · ${f.pedidos} ${f.pedidos === 1 ? "pedido" : "pedidos"}` })))],
    tabelas: [
      tabela("fornecedores", "Por fornecedor", "Por fornecedor", COLUNAS.fornecedores, porFornecedor),
      tabela("compras", "Pedidos de compra", "Pedidos", COLUNAS.compras, d.compras.map((c) => ({ ...c, fornecedor: c.fornecedor || "Sem fornecedor", situacao: c.status === "recebido" ? "Recebido" : "Pendente" }))),
    ],
  };
}

const CONSTRUTORES = { resumo, vendas, produtos, clientes, estoque, financeiro, compras };

export function montarRelatorio(id, dados, periodo, ctx) {
  return CONSTRUTORES[id](dados, periodo, ctx);
}

// Nome do arquivo e abas do Excel: um "Resumo" (período + indicadores) e uma aba por tabela.
export function planilhaDoRelatorio(modelo, periodo, geradoEm) {
  const indicadores = [
    { rotulo: "Relatório", valor: modelo.titulo, destaque: true },
    { rotulo: "Período", valor: `${formatar(periodo.inicio, "data")} a ${formatar(periodo.fim, "data")}` },
    { rotulo: "Gerado em", valor: formatar(geradoEm, "data") },
    ...modelo.indicadores.map((i) => ({ rotulo: i.rotulo, valor: i.valor, tipo: i.tipo })),
  ];
  return {
    arquivo: `relatorio-${modelo.id}_${periodo.inicio}_a_${periodo.fim}.xlsx`,
    abas: [
      { nome: "Resumo", indicadores },
      ...modelo.tabelas.map((t) => ({ nome: t.nomeAba, colunas: t.colunas, linhas: t.linhas })),
    ],
  };
}
