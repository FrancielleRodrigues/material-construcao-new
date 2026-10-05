// Acesso ao Supabase. Toda regra de negócio crítica (estoque, preço, permissão) é aplicada
// no banco (RLS + funções); aqui só traduzimos formatos e mensagens de erro.
import { supabase } from "../lib/supabase";
import * as M from "./mapeamento";

export class ErroApi extends Error {}

function traduzir(error) {
  const msg = error?.message || "";
  const code = String(error?.code || "");
  if (code === "42501" || /row-level security|permission denied/i.test(msg)) {
    return "Você não tem permissão para esta ação.";
  }
  if (code === "23505") {
    if (msg.includes("clientes_documento_uniq")) return "Já existe um cliente com este CPF/CNPJ.";
    if (msg.includes("fornecedores_documento_uniq")) return "Já existe um fornecedor com este CPF/CNPJ.";
    if (msg.includes("produtos_codigo_barras_uniq")) return "Já existe um produto com este código de barras.";
    if (msg.includes("usuarios_email_uniq")) return "Já existe um usuário com este e-mail.";
    return "Já existe um registro com estes dados.";
  }
  // 23001 = RESTRICT (bloqueio ao excluir), 23503 = chave estrangeira
  if (code === "23001" || code === "23503") {
    if (msg.includes("movimentacoes")) return "Este produto tem movimentações de estoque e não pode ser excluído.";
    if (msg.includes("usuarios_papel_id_fkey")) return "Há usuários com este papel. Troque o papel deles antes de excluir.";
    return "Não é possível excluir: existem registros vinculados a este item.";
  }
  if (/failed to fetch|networkerror|fetch failed|load failed/i.test(msg)) {
    return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  }
  // Mensagens das funções do banco (raise exception) já vêm em português.
  return msg || "Algo deu errado. Tente de novo.";
}

async function chamar(promessa) {
  let resposta;
  try {
    resposta = await promessa;
  } catch (e) {
    throw new ErroApi(traduzir(e));
  }
  if (resposta.error) throw new ErroApi(traduzir(resposta.error));
  return resposta.data;
}

const TAM_PAGINA = 1000; // limite padrão de linhas por requisição do Supabase

async function listar(tabela, crescente = true) {
  const todas = [];
  for (let ini = 0; ; ini += TAM_PAGINA) {
    const dados = await chamar(
      supabase.from(tabela).select("*").order("id", { ascending: crescente }).range(ini, ini + TAM_PAGINA - 1)
    );
    todas.push(...dados);
    if (dados.length < TAM_PAGINA) return todas;
  }
}

// ---------- leitura ----------

const CARREGADORES = {
  clientes: async () => (await listar("clientes")).map(M.clientes.de),
  fornecedores: async () => (await listar("fornecedores")).map(M.fornecedores.de),
  produtos: async () => (await listar("produtos")).map(M.produtos.de),
  movimentacoes: async () => (await listar("movimentacoes", false)).map(M.movimentacoes.de),
  lancamentos: async () => (await listar("lancamentos", false)).map(M.lancamentos.de),
  entregas: async () => (await listar("entregas", false)).map(M.entregas.de),
  notasFiscais: async () => (await listar("notas_fiscais", false)).map(M.notasFiscais.de),
  usuarios: async () => (await listar("usuarios")).map(M.usuarios.de),
  papeis: async () => {
    const linhas = await chamar(supabase.from("papeis").select("*").order("nome"));
    return linhas.map(M.papeis.de);
  },
  pedidos: async () => {
    const [linhas, itens] = await Promise.all([listar("pedidos_compra", false), listar("pedidos_compra_itens")]);
    return M.montarPedidos(linhas, itens);
  },
  vendas: async () => {
    const [linhas, itens] = await Promise.all([listar("vendas", false), listar("vendas_itens")]);
    return M.montarVendas(linhas, itens);
  },
  empresaFiscal: async () => {
    const linha = await chamar(supabase.from("empresa_fiscal").select("*").maybeSingle());
    return linha ? M.empresaFiscal.de(linha) : null;
  },
};

export const TODAS_AS_LISTAS = Object.keys(CARREGADORES);

// carregar(["clientes", "produtos"]) → { clientes: [...], produtos: [...] }
export async function carregar(nomes) {
  const resultados = await Promise.all(nomes.map((n) => CARREGADORES[n]()));
  return Object.fromEntries(nomes.map((n, i) => [n, resultados[i]]));
}

// ---------- escrita simples (tabela direta, protegida por RLS) ----------

async function inserir(tabela, linha) {
  return chamar(supabase.from(tabela).insert(linha).select().single());
}

async function atualizar(tabela, id, linha) {
  const afetadas = await chamar(supabase.from(tabela).update(linha).eq("id", id).select());
  // O RLS não dá erro quando bloqueia um update: simplesmente afeta 0 linhas.
  if (afetadas.length === 0) throw new ErroApi("Não foi possível salvar: o registro não existe mais ou você não tem permissão.");
  return afetadas[0];
}

export async function excluir(tabela, id) {
  const afetadas = await chamar(supabase.from(tabela).delete().eq("id", id).select());
  if (afetadas.length === 0) throw new ErroApi("Não foi possível excluir: o registro não existe mais ou você não tem permissão.");
}

const salvarCom = (tabela, mapa) => (dados) =>
  dados.id ? atualizar(tabela, dados.id, mapa.para(dados)) : inserir(tabela, mapa.para(dados));

export const salvarCliente = salvarCom("clientes", M.clientes);
export const salvarFornecedor = salvarCom("fornecedores", M.fornecedores);
export const salvarProduto = salvarCom("produtos", M.produtos);
export const salvarLancamento = salvarCom("lancamentos", M.lancamentos);
export const salvarEntrega = salvarCom("entregas", M.entregas);
export const salvarUsuario = salvarCom("usuarios", M.usuarios);

export const salvarPapel = (dados) =>
  dados.id
    ? atualizar("papeis", dados.id, M.papeis.para(dados))
    : inserir("papeis", { id: `papel_${Date.now()}`, ...M.papeis.para(dados) });

export const alternarPago = (lancamento, hoje) =>
  atualizar("lancamentos", lancamento.id, {
    pago: !lancamento.pago,
    data_pagamento: !lancamento.pago ? hoje : null,
  });

export const mudarStatusEntrega = (id, status) => atualizar("entregas", id, { status });

export const salvarConfigFiscal = (dados) => atualizar("empresa_fiscal", 1, M.empresaFiscal.para(dados));

// ---------- operações atômicas (funções do banco) ----------

export const salvarPedido = (p) =>
  chamar(
    supabase.rpc("salvar_pedido_compra", {
      p_id: p.id ?? null,
      p_fornecedor_id: Number(p.fornecedorId),
      p_data_prevista: p.dataPrevista || null,
      p_observacao: p.observacao || "",
      p_itens: M.pedidoParaRpc(p),
    })
  );

export const registrarRecebimento = (pedidoId) => chamar(supabase.rpc("registrar_recebimento", { p_pedido_id: pedidoId }));

export const registrarMovimentacao = (m) =>
  chamar(
    supabase.rpc("registrar_movimentacao", {
      p_produto_id: m.produtoId,
      p_tipo: m.tipo,
      p_quantidade: m.quantidade,
      p_motivo: m.motivo,
      p_observacao: m.observacao || "",
      p_data: m.data || null,
    })
  );

// Devolve o id da venda criada. Preço e estoque são conferidos no banco.
export const finalizarVenda = (v) =>
  chamar(
    supabase.rpc("finalizar_venda", {
      p_cliente_id: v.clienteId ?? null,
      p_forma_pagamento: v.formaPagamento,
      p_itens: v.itens.map((i) => ({ produto_id: i.produtoId, quantidade: i.quantidade })),
      p_desconto_tipo: v.descontoTipo,
      p_desconto_valor: Number(v.descontoValor) || 0,
      p_tipo_entrega: v.tipoEntrega,
      p_endereco_entrega: v.enderecoEntrega || "",
      p_data_entrega: v.dataEntrega || null,
      p_gerar_nota: Boolean(v.gerarNota),
    })
  );

export const gerarRascunhoNota = (vendaId) => chamar(supabase.rpc("gerar_rascunho_nota", { p_venda_id: vendaId }));

// ---------- autenticação ----------

export async function entrar(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) throw new ErroApi("E-mail ou senha incorretos.");
    if (/email not confirmed/i.test(error.message)) throw new ErroApi("Este e-mail ainda não foi confirmado.");
    throw new ErroApi(traduzir(error));
  }
}

export async function sair() {
  await supabase.auth.signOut();
}
