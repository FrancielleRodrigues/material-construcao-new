// Conversão entre as linhas do banco (snake_case) e os objetos usados pelas telas (camelCase).
// Cada entidade tem `de` (linha → objeto da tela) e `para` (objeto da tela → colunas graváveis).

const vazioParaNulo = (v) => (v === "" || v === undefined ? null : v);
const numeroOuNulo = (v) => (v === "" || v === undefined || v === null ? null : Number(v));
const texto = (v) => v ?? "";

export const clientes = {
  de: (r) => ({
    id: r.id, tipo: r.tipo, nome: r.nome, documento: r.documento, telefone: r.telefone, email: r.email,
    inscricaoEstadual: r.inscricao_estadual, indicadorIE: r.indicador_ie, endereco: r.endereco || {},
  }),
  para: (c) => ({
    tipo: c.tipo, nome: c.nome, documento: c.documento, telefone: texto(c.telefone), email: texto(c.email),
    inscricao_estadual: texto(c.inscricaoEstadual), indicador_ie: c.indicadorIE || "nao_contribuinte",
    endereco: c.endereco || {},
  }),
};

export const fornecedores = {
  de: (r) => ({
    id: r.id, tipo: r.tipo, nome: r.nome, documento: r.documento, telefone: r.telefone, email: r.email,
    categoria: r.categoria, condicaoPagamento: r.condicao_pagamento, endereco: r.endereco || {}, observacao: r.observacao,
  }),
  para: (f) => ({
    tipo: f.tipo, nome: f.nome, documento: f.documento, telefone: texto(f.telefone), email: texto(f.email),
    categoria: texto(f.categoria), condicao_pagamento: texto(f.condicaoPagamento), endereco: f.endereco || {},
    observacao: texto(f.observacao),
  }),
};

export const produtos = {
  de: (r) => ({
    id: r.id, nome: r.nome, categoria: r.categoria, unidade: r.unidade, preco: Number(r.preco),
    estoque: Number(r.estoque), estoqueMin: Number(r.estoque_min), codigoBarras: r.codigo_barras || "",
    fornecedorId: r.fornecedor_id ?? null,
  }),
  para: (p) => ({
    nome: p.nome, categoria: texto(p.categoria), unidade: p.unidade || "un", preco: Number(p.preco) || 0,
    estoque: Number(p.estoque) || 0, estoque_min: Number(p.estoqueMin) || 0,
    codigo_barras: vazioParaNulo(p.codigoBarras), fornecedor_id: numeroOuNulo(p.fornecedorId),
  }),
};

export const movimentacoes = {
  de: (r) => ({
    id: r.id, produtoId: r.produto_id, tipo: r.tipo, quantidade: Number(r.quantidade), motivo: r.motivo,
    observacao: r.observacao, data: r.data,
  }),
};

export const lancamentos = {
  de: (r) => ({
    id: r.id, tipo: r.tipo, descricao: r.descricao, valor: Number(r.valor), vencimento: r.vencimento, pago: r.pago,
    dataPagamento: r.data_pagamento, clienteId: r.cliente_id, fornecedorId: r.fornecedor_id,
    contraparte: r.contraparte, formaPagamento: r.forma_pagamento, observacao: r.observacao,
  }),
  para: (l) => ({
    tipo: l.tipo, descricao: l.descricao, valor: Number(l.valor), vencimento: l.vencimento, pago: Boolean(l.pago),
    data_pagamento: vazioParaNulo(l.dataPagamento), cliente_id: numeroOuNulo(l.clienteId),
    fornecedor_id: numeroOuNulo(l.fornecedorId), contraparte: texto(l.contraparte),
    forma_pagamento: texto(l.formaPagamento), observacao: texto(l.observacao),
  }),
};

export const entregas = {
  de: (r) => ({
    id: r.id, vendaId: r.venda_id, clienteId: r.cliente_id, endereco: r.endereco, itensDescricao: r.itens_descricao,
    dataPrevista: r.data_prevista || "", motorista: r.motorista, veiculo: r.veiculo, status: r.status, observacao: r.observacao,
  }),
  para: (e) => ({
    venda_id: numeroOuNulo(e.vendaId), cliente_id: numeroOuNulo(e.clienteId), endereco: texto(e.endereco),
    itens_descricao: texto(e.itensDescricao), data_prevista: vazioParaNulo(e.dataPrevista), motorista: texto(e.motorista),
    veiculo: texto(e.veiculo), observacao: texto(e.observacao),
  }),
};

export const notasFiscais = {
  de: (r) => ({
    id: r.id, vendaId: r.venda_id, numero: r.numero, serie: r.serie, status: r.status, dataGeracao: r.data_geracao,
  }),
};

export const empresaFiscal = {
  de: (r) => ({
    razaoSocial: r.razao_social, nomeFantasia: r.nome_fantasia, cnpj: r.cnpj, ie: r.ie,
    regimeTributario: r.regime_tributario, ambiente: r.ambiente, provedor: r.provedor,
    certificadoInstalado: r.certificado_instalado, serieNFe: r.serie_nfe, proximoNumero: r.proximo_numero,
  }),
  para: (e) => ({
    razao_social: texto(e.razaoSocial), nome_fantasia: texto(e.nomeFantasia), cnpj: texto(e.cnpj), ie: texto(e.ie),
    regime_tributario: e.regimeTributario, ambiente: e.ambiente, provedor: texto(e.provedor),
    certificado_instalado: Boolean(e.certificadoInstalado), serie_nfe: texto(e.serieNFe) || "1",
    proximo_numero: Math.max(1, parseInt(e.proximoNumero) || 1),
  }),
};

export const usuarios = {
  de: (r) => ({ id: r.id, nome: r.nome, email: r.email, papelId: r.papel_id, ativo: r.ativo }),
  para: (u) => ({ nome: u.nome.trim(), email: u.email.trim(), papel_id: u.papelId, ativo: Boolean(u.ativo) }),
};

export const papeis = {
  de: (r) => ({ id: r.id, nome: r.nome, fixo: r.fixo, permissoes: r.permissoes || {} }),
  para: (p) => ({ nome: p.nome.trim(), permissoes: p.permissoes || {} }),
};

// Pedidos e vendas vêm em duas tabelas (cabeçalho + itens); montamos o objeto único da tela.
export function montarPedidos(linhas, itens) {
  const porPedido = {};
  for (const i of itens) {
    (porPedido[i.pedido_id] ??= []).push({
      produtoId: i.produto_id, nome: i.nome, quantidade: Number(i.quantidade), precoUnitario: Number(i.preco_unitario),
    });
  }
  return linhas.map((r) => ({
    id: r.id, numero: r.numero, fornecedorId: r.fornecedor_id, data: r.data, dataPrevista: r.data_prevista || "",
    status: r.status, dataRecebimento: r.data_recebimento, observacao: r.observacao, itens: porPedido[r.id] || [],
  }));
}

export function montarVendas(linhas, itens) {
  const porVenda = {};
  for (const i of itens) {
    (porVenda[i.venda_id] ??= []).push({
      produtoId: i.produto_id, nome: i.nome, quantidade: Number(i.quantidade), precoUnitario: Number(i.preco_unitario),
    });
  }
  return linhas.map((r) => ({
    id: r.id, numero: r.numero, data: r.data, clienteId: r.cliente_id, formaPagamento: r.forma_pagamento,
    itens: porVenda[r.id] || [], subtotal: Number(r.subtotal),
    desconto: { tipo: r.desconto_tipo, valor: Number(r.desconto_valor), valorCalculado: Number(r.desconto_calculado) },
    total: Number(r.total), tipoEntrega: r.tipo_entrega, enderecoEntrega: r.endereco_entrega, notaGerada: r.nota_gerada,
  }));
}

export function pedidoParaRpc(p) {
  return p.itens.map((i) => ({
    produto_id: i.produtoId ?? null, nome: i.nome, quantidade: Number(i.quantidade), preco_unitario: Number(i.precoUnitario),
  }));
}
