import { hojeISO, isoRelativo } from "../utils/format";
import { permissoesTotais } from "./constantes";

export const CLIENTES_INICIAIS = [
  {
    id: 1, tipo: "PJ", nome: "Construtora Horizonte Ltda", documento: "12.345.678/0001-90",
    telefone: "(22) 99811-2345", email: "contato@horizonteconstrutora.com.br",
    inscricaoEstadual: "12345678", indicadorIE: "contribuinte",
    endereco: { cep: "28890-000", logradouro: "Av. Brasil", numero: "1200", complemento: "Sala 3", bairro: "Centro", cidade: "Rio das Ostras", uf: "RJ" },
  },
  {
    id: 2, tipo: "PF", nome: "Marcos Vinícius Rocha", documento: "123.456.789-00",
    telefone: "(22) 98877-6655", email: "marcos.rocha@email.com",
    inscricaoEstadual: "", indicadorIE: "nao_contribuinte",
    endereco: { cep: "28895-000", logradouro: "Rua das Palmeiras", numero: "45", complemento: "", bairro: "Costazul", cidade: "Rio das Ostras", uf: "RJ" },
  },
];

export const FORNECEDORES_INICIAIS = [
  {
    id: 1, tipo: "PJ", nome: "Votoran Distribuidora de Materiais", documento: "45.678.912/0001-33",
    telefone: "(27) 3333-4455", email: "vendas@votorandist.com.br", categoria: "cimento",
    condicaoPagamento: "30 dias",
    endereco: { cep: "29100-000", logradouro: "Rod. do Sol, km 12", numero: "500", complemento: "", bairro: "Distrito Industrial", cidade: "Vila Velha", uf: "ES" },
    observacao: "",
  },
  {
    id: 2, tipo: "PJ", nome: "Ferragens Litoral Ltda", documento: "12.987.654/0001-21",
    telefone: "(22) 99900-1122", email: "contato@ferragenslitoral.com.br", categoria: "ferragem",
    condicaoPagamento: "à vista",
    endereco: { cep: "28900-000", logradouro: "Av. das Indústrias", numero: "88", complemento: "", bairro: "Centro", cidade: "Rio das Ostras", uf: "RJ" },
    observacao: "",
  },
];

export const PEDIDOS_INICIAIS = [
  {
    id: 1, numero: 5001, fornecedorId: 1, data: isoRelativo(-3), dataPrevista: isoRelativo(2),
    itens: [
      { produtoId: 1, nome: "Cimento CP-II 50kg", quantidade: 100, precoUnitario: 32.5 },
      { produtoId: 3, nome: "Vergalhão CA-50 10mm", quantidade: 40, precoUnitario: 39.9 },
    ],
    status: "pendente", dataRecebimento: null, observacao: "",
  },
];

export const PAPEIS_INICIAIS = [
  { id: "admin", nome: "Administrador", fixo: true, permissoes: permissoesTotais("editar") },
  {
    id: "gerente", nome: "Gerente", fixo: false,
    permissoes: { ...permissoesTotais("editar"), fiscal: "visualizar", usuarios: "visualizar" },
  },
  {
    id: "vendedor", nome: "Vendedor", fixo: false,
    permissoes: {
      clientes: "editar", fornecedores: "nenhum", compras: "nenhum", produtos: "visualizar",
      venda: "editar", estoque: "visualizar", financeiro: "nenhum", fiscal: "nenhum",
      entregas: "visualizar", usuarios: "nenhum",
    },
  },
  {
    id: "caixa", nome: "Caixa / Financeiro", fixo: false,
    permissoes: {
      clientes: "visualizar", fornecedores: "visualizar", compras: "visualizar", produtos: "visualizar",
      venda: "editar", estoque: "visualizar", financeiro: "editar", fiscal: "visualizar",
      entregas: "visualizar", usuarios: "nenhum",
    },
  },
];

export const USUARIOS_INICIAIS = [
  { id: 1, nome: "Você", email: "voce@construgestao.com", papelId: "admin", ativo: true },
  { id: 2, nome: "Marcos Vendas", email: "marcos@construgestao.com", papelId: "vendedor", ativo: true },
  { id: 3, nome: "Renata Caixa", email: "renata@construgestao.com", papelId: "caixa", ativo: true },
];

export const PRODUTOS_INICIAIS = [
  { id: 1, nome: "Cimento CP-II 50kg", categoria: "cimento", unidade: "sc", preco: 34.9, estoque: 120, estoqueMin: 30, codigoBarras: "7891000100016", fornecedorId: 1 },
  { id: 2, nome: "Tijolo baiano 9 furos", categoria: "tijolo", unidade: "milheiro", preco: 890, estoque: 8, estoqueMin: 10, codigoBarras: "7891000100023", fornecedorId: null },
  { id: 3, nome: "Vergalhão CA-50 10mm", categoria: "ferragem", unidade: "barra", preco: 42.5, estoque: 60, estoqueMin: 20, codigoBarras: "7891000100030", fornecedorId: 2 },
  { id: 4, nome: "Tinta acrílica branca 18L", categoria: "tinta", unidade: "lata", preco: 289, estoque: 15, estoqueMin: 5, codigoBarras: "7891000100047", fornecedorId: null },
  { id: 5, nome: "Torneira de parede cromada", categoria: "hidraulica", unidade: "un", preco: 89.9, estoque: 25, estoqueMin: 5, codigoBarras: "7891000100054", fornecedorId: 2 },
];

export const MOVIMENTACOES_INICIAIS = [
  { id: 1, produtoId: 1, tipo: "entrada", quantidade: 200, motivo: "compra", observacao: "Reposição mensal", data: hojeISO() },
  { id: 2, produtoId: 2, tipo: "saida", quantidade: 30, motivo: "venda", observacao: "Venda Construtora Horizonte", data: hojeISO() },
  { id: 3, produtoId: 3, tipo: "entrada", quantidade: 20, motivo: "devolucao", observacao: "", data: "2026-09-10" },
  { id: 4, produtoId: 4, tipo: "saida", quantidade: 3, motivo: "perda", observacao: "Lata amassada no transporte", data: "2026-09-08" },
];

export const LANCAMENTOS_INICIAIS = [
  {
    id: 1, tipo: "receita", descricao: "Venda de materiais - obra Costazul", valor: 4380,
    vencimento: isoRelativo(-6), pago: true, dataPagamento: isoRelativo(-6),
    clienteId: 1, contraparte: "", formaPagamento: "pix", observacao: "NF 1024",
  },
  {
    id: 2, tipo: "receita", descricao: "Venda de cimento e ferragens", valor: 1250,
    vencimento: isoRelativo(9), pago: false, dataPagamento: null,
    clienteId: 2, contraparte: "", formaPagamento: "boleto", observacao: "",
  },
  {
    id: 3, tipo: "receita", descricao: "Venda a prazo - reforma comercial", valor: 2760,
    vencimento: isoRelativo(-3), pago: false, dataPagamento: null,
    clienteId: 1, contraparte: "", formaPagamento: "transferencia", observacao: "",
  },
  {
    id: 4, tipo: "despesa", descricao: "Compra de cimento - fornecedor Votoran", valor: 3200,
    vencimento: isoRelativo(-10), pago: true, dataPagamento: isoRelativo(-10),
    clienteId: null, contraparte: "Votoran Distribuidora", formaPagamento: "boleto", observacao: "",
  },
  {
    id: 5, tipo: "despesa", descricao: "Aluguel do depósito", valor: 2100,
    vencimento: isoRelativo(-1), pago: false, dataPagamento: null,
    clienteId: null, contraparte: "Imobiliária Rio das Ostras", formaPagamento: "transferencia", observacao: "",
  },
  {
    id: 6, tipo: "despesa", descricao: "Conta de energia elétrica", valor: 640,
    vencimento: isoRelativo(5), pago: false, dataPagamento: null,
    clienteId: null, contraparte: "Enel", formaPagamento: "boleto", observacao: "",
  },
];

export const VENDAS_INICIAIS = [
  {
    id: 1, data: hojeISO(), numero: 1001, clienteId: 2, formaPagamento: "pix",
    itens: [
      { produtoId: 5, nome: "Torneira de parede cromada", quantidade: 2, precoUnitario: 89.9 },
      { produtoId: 1, nome: "Cimento CP-II 50kg", quantidade: 5, precoUnitario: 34.9 },
    ],
  },
];

export const EMPRESA_FISCAL_INICIAL = {
  razaoSocial: "", nomeFantasia: "", cnpj: "", ie: "",
  regimeTributario: "simples_nacional",
  ambiente: "homologacao",
  provedor: "",
  certificadoInstalado: false,
  serieNFe: "1",
  proximoNumero: 1,
};

export const ENTREGAS_INICIAIS = [
  {
    id: 1, vendaId: 1, clienteId: 2,
    endereco: "Rua das Palmeiras, 45 - Costazul, Rio das Ostras/RJ",
    itensDescricao: "2x Torneira de parede cromada, 5x Cimento CP-II 50kg",
    dataPrevista: isoRelativo(1), motorista: "", veiculo: "", status: "pendente", observacao: "",
  },
];
