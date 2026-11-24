// Cálculos dos relatórios. Funções PURAS: recebem a base do período (linhas já em camelCase,
// vindas das funções rel_* do banco) e devolvem números prontos para a tela e para o Excel.
// Datas são sempre "AAAA-MM-DD" (sem hora, sem fuso).

export const SEM_CLIENTE = "Consumidor não identificado";

const arred = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const soma = (lista, f) => lista.reduce((s, x) => s + (f(x) || 0), 0);
const pct = (parte, todo) => (todo > 0 ? parte / todo : 0);

// ---------- datas ----------

const paraUTC = (iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
};
const deUTC = (ms) => new Date(ms).toISOString().slice(0, 10);
const DIA = 86400000;

export function somarDias(iso, dias) {
  return deUTC(paraUTC(iso) + dias * DIA);
}

// Quantidade de dias do período, contando os dois extremos.
export function diasDoPeriodo(inicio, fim) {
  return Math.max(0, Math.round((paraUTC(fim) - paraUTC(inicio)) / DIA) + 1);
}

function primeiroDiaDoMes(iso) {
  return iso.slice(0, 8) + "01";
}
function ultimoDiaDoMes(iso) {
  const [a, m] = iso.split("-").map(Number);
  return deUTC(Date.UTC(a, m, 0));
}

export const PRESETS = [
  { id: "hoje", rotulo: "Hoje" },
  { id: "7d", rotulo: "Últimos 7 dias" },
  { id: "30d", rotulo: "Últimos 30 dias" },
  { id: "mes", rotulo: "Este mês" },
  { id: "mes_anterior", rotulo: "Mês passado" },
  { id: "ano", rotulo: "Este ano" },
];

// Período de um atalho, a partir de "hoje" (informado, para o cálculo ser testável).
export function periodoDoPreset(id, hoje) {
  switch (id) {
    case "hoje": return { inicio: hoje, fim: hoje };
    case "7d": return { inicio: somarDias(hoje, -6), fim: hoje };
    case "30d": return { inicio: somarDias(hoje, -29), fim: hoje };
    case "mes": return { inicio: primeiroDiaDoMes(hoje), fim: hoje };
    case "mes_anterior": {
      const ultimo = somarDias(primeiroDiaDoMes(hoje), -1);
      return { inicio: primeiroDiaDoMes(ultimo), fim: ultimo };
    }
    case "ano": return { inicio: hoje.slice(0, 4) + "-01-01", fim: hoje };
    default: return { inicio: primeiroDiaDoMes(hoje), fim: hoje };
  }
}

// Até 62 dias mostra por dia; acima disso, por mês.
export function granularidade(inicio, fim) {
  return diasDoPeriodo(inicio, fim) <= 62 ? "dia" : "mes";
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function rotulo(chave, gran) {
  const [a, m, d] = chave.split("-");
  return gran === "dia" ? `${d}/${m}` : `${MESES[Number(m) - 1]}/${a.slice(2)}`;
}

// Todas as chaves (dia ou mês) do período, na ordem, para o gráfico não ter buracos.
function chavesDoPeriodo(inicio, fim, gran) {
  const chaves = [];
  if (gran === "dia") {
    for (let d = inicio; d <= fim; d = somarDias(d, 1)) chaves.push(d);
  } else {
    for (let m = primeiroDiaDoMes(inicio); m <= fim; m = somarDias(ultimoDiaDoMes(m), 1)) chaves.push(m.slice(0, 7) + "-01");
  }
  return chaves;
}
const chaveDe = (data, gran) => (gran === "dia" ? data : data.slice(0, 7) + "-01");

// ---------- vendas ----------

// Lucro de uma venda = total - custo dos itens; só existe se TODOS os itens têm custo conhecido.
function lucroPorVenda(vendas, itens) {
  const itensPorVenda = new Map();
  for (const i of itens) {
    if (!itensPorVenda.has(i.vendaId)) itensPorVenda.set(i.vendaId, []);
    itensPorVenda.get(i.vendaId).push(i);
  }
  const lucros = new Map();
  for (const v of vendas) {
    const itensDaVenda = itensPorVenda.get(v.id) || [];
    if (itensDaVenda.length > 0 && itensDaVenda.every((i) => i.custoUnitario !== null && i.custoUnitario !== undefined)) {
      lucros.set(v.id, v.total - soma(itensDaVenda, (i) => i.quantidade * i.custoUnitario));
    }
  }
  return lucros;
}

export function resumoVendas(vendas, itens) {
  const faturamento = soma(vendas, (v) => v.total);
  const lucros = lucroPorVenda(vendas, itens);
  const receitaComCusto = soma(vendas.filter((v) => lucros.has(v.id)), (v) => v.total);
  const lucro = [...lucros.values()].reduce((s, x) => s + x, 0);
  return {
    faturamento: arred(faturamento),
    vendas: vendas.length,
    ticketMedio: vendas.length ? arred(faturamento / vendas.length) : 0,
    descontos: arred(soma(vendas, (v) => v.desconto)),
    itensVendidos: soma(vendas, (v) => v.itens),
    lucro: lucros.size ? arred(lucro) : null,
    margem: receitaComCusto > 0 ? lucro / receitaComCusto : null,
    // quanto do faturamento tem custo informado (a margem só vale para essa parte)
    coberturaCusto: pct(receitaComCusto, faturamento),
  };
}

// Série por dia (período curto) ou por mês, com zero nos dias sem venda.
export function vendasPorPeriodo(vendas, inicio, fim) {
  const gran = granularidade(inicio, fim);
  const mapa = new Map(chavesDoPeriodo(inicio, fim, gran).map((c) => [c, { chave: c, rotulo: rotulo(c, gran), valor: 0, vendas: 0 }]));
  for (const v of vendas) {
    const ponto = mapa.get(chaveDe(v.data, gran));
    if (ponto) {
      ponto.valor += v.total;
      ponto.vendas += 1;
    }
  }
  const pontos = [...mapa.values()].map((p) => ({ ...p, valor: arred(p.valor) }));
  return { granularidade: gran, pontos };
}

export function porFormaPagamento(vendas, rotulos = {}) {
  const total = soma(vendas, (v) => v.total);
  const mapa = new Map();
  for (const v of vendas) {
    const atual = mapa.get(v.formaPagamento) || { forma: v.formaPagamento, valor: 0, vendas: 0 };
    atual.valor += v.total;
    atual.vendas += 1;
    mapa.set(v.formaPagamento, atual);
  }
  return [...mapa.values()]
    .map((x) => ({ ...x, rotulo: rotulos[x.forma] || x.forma, valor: arred(x.valor), participacao: pct(x.valor, total) }))
    .sort((a, b) => b.valor - a.valor);
}

// ---------- produtos: curva ABC ----------

// A = produtos que somam os primeiros 80% do faturamento; B = até 95%; C = o resto.
// O produto que cruza a fronteira fica na classe de baixo (a "de dentro"), por isso olhamos o
// acumulado ANTES de somá-lo.
export function curvaABC(itens, vendas) {
  const fator = new Map(vendas.map((v) => [v.id, v.subtotal > 0 ? v.total / v.subtotal : 1]));
  const mapa = new Map();
  for (const i of itens) {
    const chave = i.produtoId ?? `nome:${i.produto}`;
    const p = mapa.get(chave) || {
      produtoId: i.produtoId, produto: i.produto, categoria: i.categoria || "", unidade: i.unidade || "",
      quantidade: 0, receita: 0, custo: 0, custoConhecido: true,
    };
    p.quantidade += i.quantidade;
    p.receita += i.totalItem * (fator.get(i.vendaId) ?? 1); // desconto rateado
    if (i.custoUnitario === null || i.custoUnitario === undefined) p.custoConhecido = false;
    else p.custo += i.quantidade * i.custoUnitario;
    mapa.set(chave, p);
  }
  const lista = [...mapa.values()].sort((a, b) => b.receita - a.receita || a.produto.localeCompare(b.produto));
  const total = soma(lista, (p) => p.receita);
  let acumulado = 0;
  return lista.map((p) => {
    const antes = acumulado;
    acumulado += p.receita;
    const classe = pct(antes, total) < 0.8 ? "A" : pct(antes, total) < 0.95 ? "B" : "C";
    const lucro = p.custoConhecido ? p.receita - p.custo : null;
    return {
      produtoId: p.produtoId, produto: p.produto, categoria: p.categoria, unidade: p.unidade,
      quantidade: p.quantidade, receita: arred(p.receita),
      custo: p.custoConhecido ? arred(p.custo) : null,
      lucro: lucro === null ? null : arred(lucro),
      margem: lucro !== null && p.receita > 0 ? lucro / p.receita : null,
      participacao: pct(p.receita, total), acumulado: pct(acumulado, total), classe,
    };
  });
}

export function resumoABC(abc) {
  const por = (c) => abc.filter((p) => p.classe === c);
  return ["A", "B", "C"].map((classe) => {
    const itens = por(classe);
    return { classe, produtos: itens.length, receita: arred(soma(itens, (p) => p.receita)), participacao: soma(itens, (p) => p.participacao) };
  });
}

// ---------- clientes ----------

export function rankingClientes(vendas) {
  const total = soma(vendas, (v) => v.total);
  const mapa = new Map();
  for (const v of vendas) {
    const chave = v.clienteId ?? "sem";
    const c = mapa.get(chave) || { clienteId: v.clienteId, cliente: v.cliente || SEM_CLIENTE, vendas: 0, faturamento: 0, ultimaCompra: "" };
    c.vendas += 1;
    c.faturamento += v.total;
    if (v.data > c.ultimaCompra) c.ultimaCompra = v.data;
    mapa.set(chave, c);
  }
  return [...mapa.values()]
    .map((c) => ({ ...c, faturamento: arred(c.faturamento), ticketMedio: arred(c.faturamento / c.vendas), participacao: pct(c.faturamento, total) }))
    .sort((a, b) => b.faturamento - a.faturamento || a.cliente.localeCompare(b.cliente));
}

// ---------- financeiro ----------

export const FAIXAS_ATRASO = [
  { id: "1-30", rotulo: "1 a 30 dias", de: 1, ate: 30 },
  { id: "31-60", rotulo: "31 a 60 dias", de: 31, ate: 60 },
  { id: "61-90", rotulo: "61 a 90 dias", de: 61, ate: 90 },
  { id: "90+", rotulo: "Mais de 90 dias", de: 91, ate: Infinity },
];

// Contas em aberto (hoje): quanto já venceu, quanto vai vencer, e a inadimplência por cliente.
export function resumoEmAberto(emAberto) {
  const receber = emAberto.filter((l) => l.tipo === "receita");
  const pagar = emAberto.filter((l) => l.tipo === "despesa");
  const vencidas = receber.filter((l) => l.diasAtraso > 0);
  const porCliente = new Map();
  for (const l of vencidas) {
    const nome = l.parte || SEM_CLIENTE;
    const c = porCliente.get(nome) || { cliente: nome, valor: 0, titulos: 0, maiorAtraso: 0 };
    c.valor += l.valor;
    c.titulos += 1;
    c.maiorAtraso = Math.max(c.maiorAtraso, l.diasAtraso);
    porCliente.set(nome, c);
  }
  return {
    receber: {
      total: arred(soma(receber, (l) => l.valor)),
      vencido: arred(soma(vencidas, (l) => l.valor)),
      aVencer: arred(soma(receber.filter((l) => l.diasAtraso === 0), (l) => l.valor)),
      titulosVencidos: vencidas.length,
    },
    pagar: {
      total: arred(soma(pagar, (l) => l.valor)),
      vencido: arred(soma(pagar.filter((l) => l.diasAtraso > 0), (l) => l.valor)),
      aVencer: arred(soma(pagar.filter((l) => l.diasAtraso === 0), (l) => l.valor)),
    },
    faixasAtraso: FAIXAS_ATRASO.map((f) => {
      const itens = vencidas.filter((l) => l.diasAtraso >= f.de && l.diasAtraso <= f.ate);
      return { id: f.id, rotulo: f.rotulo, valor: arred(soma(itens, (l) => l.valor)), titulos: itens.length };
    }),
    inadimplentes: [...porCliente.values()].map((c) => ({ ...c, valor: arred(c.valor) })).sort((a, b) => b.valor - a.valor),
  };
}

// Fluxo do período: o que entrou/saiu de fato (pela data do pagamento) e o que está previsto
// (não pago, com vencimento no período).
export function fluxoDeCaixa(lancamentos, inicio, fim) {
  const gran = granularidade(inicio, fim);
  const mapa = new Map(chavesDoPeriodo(inicio, fim, gran).map((c) => [c, { chave: c, rotulo: rotulo(c, gran), recebido: 0, pago: 0, aReceber: 0, aPagar: 0 }]));
  const dentro = (d) => d && d >= inicio && d <= fim;
  for (const l of lancamentos) {
    if (l.pago && dentro(l.dataPagamento)) {
      const p = mapa.get(chaveDe(l.dataPagamento, gran));
      if (p) p[l.tipo === "receita" ? "recebido" : "pago"] += l.valor;
    } else if (!l.pago && dentro(l.vencimento)) {
      const p = mapa.get(chaveDe(l.vencimento, gran));
      if (p) p[l.tipo === "receita" ? "aReceber" : "aPagar"] += l.valor;
    }
  }
  const pontos = [...mapa.values()].map((p) => ({
    ...p, recebido: arred(p.recebido), pago: arred(p.pago), aReceber: arred(p.aReceber), aPagar: arred(p.aPagar),
    saldo: arred(p.recebido - p.pago),
  }));
  const t = (campo) => arred(soma(pontos, (p) => p[campo]));
  return {
    granularidade: gran, pontos,
    totais: { recebido: t("recebido"), pago: t("pago"), saldo: arred(t("recebido") - t("pago")), aReceber: t("aReceber"), aPagar: t("aPagar") },
  };
}

// ---------- estoque ----------

export function analiseEstoque(estoque, inicio, fim) {
  const dias = Math.max(1, diasDoPeriodo(inicio, fim));
  const linhas = estoque.map((p) => {
    const abaixoDoMinimo = p.estoque <= p.estoqueMin;
    const semGiro = p.vendido === 0 && p.estoque > 0;
    return {
      ...p,
      valorVenda: arred(p.estoque * p.preco),
      valorCusto: p.custo === null ? null : arred(p.estoque * p.custo),
      situacao: abaixoDoMinimo ? "Abaixo do mínimo" : semGiro ? "Sem giro no período" : "Normal",
      abaixoDoMinimo, semGiro,
      // quantos dias o estoque dura mantendo o ritmo de vendas do período
      coberturaDias: p.vendido > 0 ? Math.round(p.estoque / (p.vendido / dias)) : null,
    };
  });
  const comCusto = linhas.filter((p) => p.valorCusto !== null);
  return {
    linhas,
    resumo: {
      produtos: linhas.length,
      abaixoDoMinimo: linhas.filter((p) => p.abaixoDoMinimo).length,
      semGiro: linhas.filter((p) => p.semGiro).length,
      valorVenda: arred(soma(linhas, (p) => p.valorVenda)),
      valorCusto: comCusto.length ? arred(soma(comCusto, (p) => p.valorCusto)) : null,
      produtosComCusto: comCusto.length,
    },
  };
}

// ---------- compras ----------

export function analiseCompras(compras) {
  const total = soma(compras, (c) => c.total);
  const recebidas = compras.filter((c) => c.status === "recebido" && c.dataRecebimento);
  const pendentes = compras.filter((c) => c.status === "pendente");
  const mapa = new Map();
  for (const c of compras) {
    const nome = c.fornecedor || "Sem fornecedor";
    const f = mapa.get(nome) || { fornecedor: nome, pedidos: 0, total: 0 };
    f.pedidos += 1;
    f.total += c.total;
    mapa.set(nome, f);
  }
  return {
    resumo: {
      pedidos: compras.length,
      total: arred(total),
      pendentes: pendentes.length,
      valorPendente: arred(soma(pendentes, (c) => c.total)),
      // dias entre fazer o pedido e receber
      prazoMedioDias: recebidas.length
        ? Math.round(soma(recebidas, (c) => (paraUTC(c.dataRecebimento) - paraUTC(c.data)) / DIA) / recebidas.length)
        : null,
    },
    porFornecedor: [...mapa.values()]
      .map((f) => ({ ...f, total: arred(f.total), participacao: pct(f.total, total) }))
      .sort((a, b) => b.total - a.total),
  };
}
