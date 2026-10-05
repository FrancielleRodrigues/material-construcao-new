import { Users, Package, Warehouse, Wallet, FileText, Truck, LayoutDashboard, ScanLine, FileClock, Navigation, PackageCheck, PackageX, Factory, PackageOpen, UserCog } from "lucide-react";

export const IE_OPCOES = [
  { id: "contribuinte", label: "Contribuinte de ICMS" },
  { id: "isento", label: "Contribuinte isento" },
  { id: "nao_contribuinte", label: "Não contribuinte" },
];

export const CATEGORIAS = [
  { id: "cimento", label: "Cimento e argamassa", dot: "bg-stone-500", chip: "bg-stone-100 text-stone-700" },
  { id: "tijolo", label: "Tijolos e blocos", dot: "bg-orange-500", chip: "bg-orange-50 text-orange-700" },
  { id: "ferragem", label: "Ferragens", dot: "bg-slate-500", chip: "bg-slate-100 text-slate-700" },
  { id: "tinta", label: "Tintas", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
  { id: "eletrica", label: "Elétrica", dot: "bg-yellow-500", chip: "bg-yellow-50 text-yellow-700" },
  { id: "hidraulica", label: "Hidráulica", dot: "bg-teal-500", chip: "bg-teal-50 text-teal-700" },
  { id: "madeira", label: "Madeira", dot: "bg-amber-700", chip: "bg-amber-100 text-amber-800" },
  { id: "acabamento", label: "Acabamento", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
];

export const NAV_ITEMS = [
  { id: "inicio", label: "Início", icon: LayoutDashboard, ativo: true },
  { id: "clientes", label: "Clientes", icon: Users, ativo: true },
  { id: "fornecedores", label: "Fornecedores", icon: Factory, ativo: true },
  { id: "compras", label: "Compras", icon: PackageOpen, ativo: true },
  { id: "produtos", label: "Produtos", icon: Package, ativo: true },
  { id: "venda", label: "Venda (PDV)", icon: ScanLine, ativo: true },
  { id: "estoque", label: "Estoque", icon: Warehouse, ativo: true },
  { id: "financeiro", label: "Financeiro", icon: Wallet, ativo: true },
  { id: "fiscal", label: "Fiscal", icon: FileText, ativo: true },
  { id: "entregas", label: "Entregas", icon: Truck, ativo: true },
  { id: "usuarios", label: "Usuários", icon: UserCog, ativo: true },
];

export const TITULOS_ABA = {
  inicio: "Início",
  clientes: "Clientes",
  fornecedores: "Fornecedores",
  compras: "Compras",
  produtos: "Produtos",
  venda: "Venda (PDV)",
  estoque: "Estoque",
  financeiro: "Financeiro",
  fiscal: "Fiscal",
  entregas: "Entregas",
  usuarios: "Usuários",
};

export const MOTIVOS_ENTRADA = [
  { id: "compra", label: "Compra / reposição" },
  { id: "devolucao", label: "Devolução de cliente" },
  { id: "ajuste", label: "Ajuste de inventário" },
];

export const MOTIVOS_SAIDA = [
  { id: "venda", label: "Venda" },
  { id: "perda", label: "Perda / avaria" },
  { id: "uso_interno", label: "Uso interno" },
  { id: "ajuste", label: "Ajuste de inventário" },
];

export const FORMAS_PAGAMENTO = [
  { id: "pix", label: "PIX" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "cartao_credito", label: "Cartão de crédito" },
  { id: "cartao_debito", label: "Cartão de débito" },
  { id: "boleto", label: "Boleto" },
  { id: "transferencia", label: "Transferência" },
];

export const MODULOS_PERMISSAO = [
  { id: "clientes", label: "Clientes" },
  { id: "fornecedores", label: "Fornecedores" },
  { id: "compras", label: "Compras" },
  { id: "produtos", label: "Produtos" },
  { id: "venda", label: "Venda (PDV)" },
  { id: "estoque", label: "Estoque" },
  { id: "financeiro", label: "Financeiro" },
  { id: "fiscal", label: "Fiscal" },
  { id: "entregas", label: "Entregas" },
  { id: "usuarios", label: "Usuários" },
];

export const NIVEIS_PERMISSAO = [
  { id: "nenhum", label: "Sem acesso" },
  { id: "visualizar", label: "Só visualizar" },
  { id: "editar", label: "Visualizar e editar" },
];

export function permissoesTotais(nivel) {
  return Object.fromEntries(MODULOS_PERMISSAO.map((m) => [m.id, nivel]));
}

export const REGIMES_TRIBUTARIOS = [
  { id: "simples_nacional", label: "Simples Nacional" },
  { id: "lucro_presumido", label: "Lucro Presumido" },
  { id: "lucro_real", label: "Lucro Real" },
];

export const PROVEDORES_NFE = [
  { id: "focus_nfe", label: "Focus NFe" },
  { id: "enotas", label: "eNotas" },
  { id: "nfeio", label: "NFe.io" },
  { id: "direto_sefaz", label: "Integração direta com a SEFAZ" },
];

export const STATUS_ENTREGA = [
  { id: "pendente", label: "Pendente", icon: FileClock, chip: "bg-amber-50 text-amber-700" },
  { id: "em_rota", label: "Em rota", icon: Navigation, chip: "bg-sky-50 text-sky-700" },
  { id: "entregue", label: "Entregue", icon: PackageCheck, chip: "bg-emerald-50 text-emerald-700" },
  { id: "cancelada", label: "Cancelada", icon: PackageX, chip: "bg-stone-100 text-stone-500" },
];

export const ETAPAS_CLIENTE = [
  { id: "geral", titulo: "Dados gerais" },
  { id: "fiscal", titulo: "Dados fiscais" },
  { id: "endereco", titulo: "Endereço" },
];

export const ETAPAS_FORNECEDOR = [
  { id: "geral", titulo: "Dados gerais" },
  { id: "fornecimento", titulo: "Fornecimento" },
  { id: "endereco", titulo: "Endereço" },
];
