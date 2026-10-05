import React, { useState, useMemo, useEffect } from "react";
import {
  Users, Package, Plus, Search, X, Pencil, Trash2,
  Phone, MapPin, Ruler, Boxes, Warehouse, Wallet,
  FileText, Truck, AlertTriangle, ChevronRight, Building2,
  Mail, Loader2, CheckCircle2, Menu, ArrowUpCircle, ArrowDownCircle,
  History, ClipboardList, ArrowRightLeft, TrendingUp, TrendingDown,
  CalendarClock, Check, Landmark, LayoutDashboard, ArrowRight, Zap,
  Barcode, ShoppingCart, Receipt, Minus, ScanLine,
  FileClock, FileCheck2, Settings2, ShieldAlert, KeyRound, Printer, Info, ShieldCheck,
  Navigation, PackageCheck, PackageX, UserRound, CalendarDays, Factory, PackageOpen,
  UserCog, ChevronDown, Eye, Lock
} from "lucide-react";

const IE_OPCOES = [
  { id: "contribuinte", label: "Contribuinte de ICMS" },
  { id: "isento", label: "Contribuinte isento" },
  { id: "nao_contribuinte", label: "Não contribuinte" },
];

async function buscarCep(cep) {
  const limpo = cep.replace(/\D/g, "");
  if (limpo.length !== 8) return null;
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    if (!resp.ok) return null;
    const dados = await resp.json();
    if (dados.erro) return null;
    return {
      logradouro: dados.logradouro || "",
      bairro: dados.bairro || "",
      cidade: dados.localidade || "",
      uf: dados.uf || "",
    };
  } catch (erro) {
    console.error("Falha ao consultar o CEP:", erro);
    return null;
  }
}

function formatarEndereco(e) {
  if (!e) return "";
  const linha1 = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const linha2 = [e.bairro, e.cidade && e.uf ? `${e.cidade}/${e.uf}` : e.cidade].filter(Boolean).join(" - ");
  return [linha1, linha2].filter(Boolean).join(" - ");
}

const CATEGORIAS = [
  { id: "cimento", label: "Cimento e argamassa", dot: "bg-stone-500", chip: "bg-stone-100 text-stone-700" },
  { id: "tijolo", label: "Tijolos e blocos", dot: "bg-orange-500", chip: "bg-orange-50 text-orange-700" },
  { id: "ferragem", label: "Ferragens", dot: "bg-slate-500", chip: "bg-slate-100 text-slate-700" },
  { id: "tinta", label: "Tintas", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
  { id: "eletrica", label: "Elétrica", dot: "bg-yellow-500", chip: "bg-yellow-50 text-yellow-700" },
  { id: "hidraulica", label: "Hidráulica", dot: "bg-teal-500", chip: "bg-teal-50 text-teal-700" },
  { id: "madeira", label: "Madeira", dot: "bg-amber-700", chip: "bg-amber-100 text-amber-800" },
  { id: "acabamento", label: "Acabamento", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
];

const NAV_ITEMS = [
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

const TITULOS_ABA = {
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

const MOTIVOS_ENTRADA = [
  { id: "compra", label: "Compra / reposição" },
  { id: "devolucao", label: "Devolução de cliente" },
  { id: "ajuste", label: "Ajuste de inventário" },
];

const MOTIVOS_SAIDA = [
  { id: "venda", label: "Venda" },
  { id: "perda", label: "Perda / avaria" },
  { id: "uso_interno", label: "Uso interno" },
  { id: "ajuste", label: "Ajuste de inventário" },
];

const FORMAS_PAGAMENTO = [
  { id: "pix", label: "PIX" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "cartao_credito", label: "Cartão de crédito" },
  { id: "cartao_debito", label: "Cartão de débito" },
  { id: "boleto", label: "Boleto" },
  { id: "transferencia", label: "Transferência" },
];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function isoRelativo(diasDelta) {
  const d = new Date();
  d.setDate(d.getDate() + diasDelta);
  return d.toISOString().slice(0, 10);
}

function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

const CLIENTES_INICIAIS = [
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

const FORNECEDORES_INICIAIS = [
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

const PEDIDOS_INICIAIS = [
  {
    id: 1, numero: 5001, fornecedorId: 1, data: isoRelativo(-3), dataPrevista: isoRelativo(2),
    itens: [
      { produtoId: 1, nome: "Cimento CP-II 50kg", quantidade: 100, precoUnitario: 32.5 },
      { produtoId: 3, nome: "Vergalhão CA-50 10mm", quantidade: 40, precoUnitario: 39.9 },
    ],
    status: "pendente", dataRecebimento: null, observacao: "",
  },
];

const MODULOS_PERMISSAO = [
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

const NIVEIS_PERMISSAO = [
  { id: "nenhum", label: "Sem acesso" },
  { id: "visualizar", label: "Só visualizar" },
  { id: "editar", label: "Visualizar e editar" },
];

function permissoesTotais(nivel) {
  return Object.fromEntries(MODULOS_PERMISSAO.map((m) => [m.id, nivel]));
}

const PAPEIS_INICIAIS = [
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

const USUARIOS_INICIAIS = [
  { id: 1, nome: "Você", email: "voce@construgestao.com", papelId: "admin", ativo: true },
  { id: 2, nome: "Marcos Vendas", email: "marcos@construgestao.com", papelId: "vendedor", ativo: true },
  { id: 3, nome: "Renata Caixa", email: "renata@construgestao.com", papelId: "caixa", ativo: true },
];

const PRODUTOS_INICIAIS = [
  { id: 1, nome: "Cimento CP-II 50kg", categoria: "cimento", unidade: "sc", preco: 34.9, estoque: 120, estoqueMin: 30, codigoBarras: "7891000100016", fornecedorId: 1 },
  { id: 2, nome: "Tijolo baiano 9 furos", categoria: "tijolo", unidade: "milheiro", preco: 890, estoque: 8, estoqueMin: 10, codigoBarras: "7891000100023", fornecedorId: null },
  { id: 3, nome: "Vergalhão CA-50 10mm", categoria: "ferragem", unidade: "barra", preco: 42.5, estoque: 60, estoqueMin: 20, codigoBarras: "7891000100030", fornecedorId: 2 },
  { id: 4, nome: "Tinta acrílica branca 18L", categoria: "tinta", unidade: "lata", preco: 289, estoque: 15, estoqueMin: 5, codigoBarras: "7891000100047", fornecedorId: null },
  { id: 5, nome: "Torneira de parede cromada", categoria: "hidraulica", unidade: "un", preco: 89.9, estoque: 25, estoqueMin: 5, codigoBarras: "7891000100054", fornecedorId: 2 },
];

const MOVIMENTACOES_INICIAIS = [
  { id: 1, produtoId: 1, tipo: "entrada", quantidade: 200, motivo: "compra", observacao: "Reposição mensal", data: hojeISO() },
  { id: 2, produtoId: 2, tipo: "saida", quantidade: 30, motivo: "venda", observacao: "Venda Construtora Horizonte", data: hojeISO() },
  { id: 3, produtoId: 3, tipo: "entrada", quantidade: 20, motivo: "devolucao", observacao: "", data: "2026-09-10" },
  { id: 4, produtoId: 4, tipo: "saida", quantidade: 3, motivo: "perda", observacao: "Lata amassada no transporte", data: "2026-09-08" },
];

const LANCAMENTOS_INICIAIS = [
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

const VENDAS_INICIAIS = [
  {
    id: 1, data: hojeISO(), numero: 1001, clienteId: 2, formaPagamento: "pix",
    itens: [
      { produtoId: 5, nome: "Torneira de parede cromada", quantidade: 2, precoUnitario: 89.9 },
      { produtoId: 1, nome: "Cimento CP-II 50kg", quantidade: 5, precoUnitario: 34.9 },
    ],
  },
];

const EMPRESA_FISCAL_INICIAL = {
  razaoSocial: "", nomeFantasia: "", cnpj: "", ie: "",
  regimeTributario: "simples_nacional",
  ambiente: "homologacao",
  provedor: "",
  certificadoInstalado: false,
  serieNFe: "1",
  proximoNumero: 1,
};

const REGIMES_TRIBUTARIOS = [
  { id: "simples_nacional", label: "Simples Nacional" },
  { id: "lucro_presumido", label: "Lucro Presumido" },
  { id: "lucro_real", label: "Lucro Real" },
];

const PROVEDORES_NFE = [
  { id: "focus_nfe", label: "Focus NFe" },
  { id: "enotas", label: "eNotas" },
  { id: "nfeio", label: "NFe.io" },
  { id: "direto_sefaz", label: "Integração direta com a SEFAZ" },
];

const STATUS_ENTREGA = [
  { id: "pendente", label: "Pendente", icon: FileClock, chip: "bg-amber-50 text-amber-700" },
  { id: "em_rota", label: "Em rota", icon: Navigation, chip: "bg-sky-50 text-sky-700" },
  { id: "entregue", label: "Entregue", icon: PackageCheck, chip: "bg-emerald-50 text-emerald-700" },
  { id: "cancelada", label: "Cancelada", icon: PackageX, chip: "bg-stone-100 text-stone-500" },
];

const ENTREGAS_INICIAIS = [
  {
    id: 1, vendaId: 1, clienteId: 2,
    endereco: "Rua das Palmeiras, 45 - Costazul, Rio das Ostras/RJ",
    itensDescricao: "2x Torneira de parede cromada, 5x Cimento CP-II 50kg",
    dataPrevista: isoRelativo(1), motorista: "", veiculo: "", status: "pendente", observacao: "",
  },
];

function cn(...arr) {
  return arr.filter(Boolean).join(" ");
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const atualizar = () => setMatches(mq.matches);
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, [query]);
  return matches;
}

function moeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function totalVenda(venda) {
  return venda.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
}

function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase();
}

function CategoriaBadge({ categoriaId }) {
  const cat = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!cat) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", cat.chip)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cat.dot)} />
      {cat.label}
    </span>
  );
}

function BuscaFornecedor({ fornecedores, value, onChange, placeholder }) {
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);

  const selecionado = value ? fornecedores.find((f) => f.id === Number(value)) : null;

  const resultados = useMemo(() => {
    if (!termo.trim()) return fornecedores.slice(0, 8);
    return fornecedores.filter((f) => f.nome.toLowerCase().includes(termo.toLowerCase())).slice(0, 8);
  }, [fornecedores, termo]);

  if (selecionado) {
    return (
      <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5">
        <div className="min-w-0 flex items-center gap-1.5">
          <Factory size={14} className="text-stone-400 shrink-0" />
          <span className="text-sm text-stone-800 truncate">{selecionado.nome}</span>
        </div>
        <button
          type="button"
          onClick={() => { onChange(""); setTermo(""); }}
          className="text-stone-400 hover:text-stone-700 shrink-0"
          aria-label="Trocar fornecedor"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
      <input
        value={termo}
        onChange={(e) => { setTermo(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        className={cn(inputClasses, "pl-8")}
        placeholder={placeholder || "Buscar fornecedor pelo nome..."}
      />
      {aberto && (
        <div className="absolute z-10 left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {resultados.length === 0 ? (
            <p className="text-sm text-stone-400 px-3 py-3">Nenhum fornecedor encontrado.</p>
          ) : (
            resultados.map((f) => (
              <button
                key={f.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(f.id); setTermo(""); setAberto(false); }}
                className="w-full text-left px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
              >
                <Factory size={13} className="text-stone-400 shrink-0" />
                <span className="truncate">{f.nome}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, valor, icon: Icon, tom }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl px-4 py-3.5 flex items-center gap-3">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tom)}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-stone-500 leading-snug">{label}</p>
        <p className="text-lg font-semibold text-stone-900 leading-tight mt-0.5">{valor}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, acao, onAcao }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-14 h-14 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center mb-4">
        <Icon size={24} className="text-stone-400" />
      </div>
      <p className="font-semibold text-stone-800">{title}</p>
      <p className="text-sm text-stone-500 mt-1 max-w-xs">{subtitle}</p>
      {acao && (
        <button
          onClick={onAcao}
          className="mt-5 inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> {acao}
        </button>
      )}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-stone-600 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

const inputClasses =
  "w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-shadow";

function Painel({ titulo, subtitulo, onFechar, children, largo }) {
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div
        className={cn(
          "bg-white w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden",
          "max-h-[85vh]",
          largo ? "max-w-2xl" : "max-w-md"
        )}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-stone-200 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900">{titulo}</h2>
            {subtitulo && <p className="text-xs text-stone-400 mt-0.5 truncate">{subtitulo}</p>}
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5" style={{ minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ titulo, descricao, textoConfirmar, onConfirmar, onCancelar }) {
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onCancelar]);

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-[60] p-6">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle size={18} className="text-red-600" />
        </div>
        <h2 className="text-base font-semibold text-stone-900 mb-1.5">{titulo}</h2>
        <p className="text-sm text-stone-500">{descricao}</p>
        <div className="flex gap-2 pt-6">
          <button
            onClick={onCancelar}
            className="flex-1 border border-stone-300 hover:bg-stone-50 rounded-lg py-2.5 text-sm font-medium text-stone-700 transition-colors"
            autoFocus
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {textoConfirmar || "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RodapePainel({ onSalvar, onCancelar }) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        onClick={onSalvar}
        className="flex-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
      >
        Salvar
      </button>
      <button
        onClick={onCancelar}
        className="flex-1 border border-stone-300 hover:bg-stone-50 rounded-lg py-2.5 text-sm font-medium text-stone-700 transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}

const ETAPAS_CLIENTE = [
  { id: "geral", titulo: "Dados gerais" },
  { id: "fiscal", titulo: "Dados fiscais" },
  { id: "endereco", titulo: "Endereço" },
];

function Stepper({ etapas, etapaAtual }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      {etapas.map((etapa, i) => {
        const concluida = i < etapaAtual;
        const atual = i === etapaAtual;
        return (
          <React.Fragment key={etapa.id}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                  concluida && "bg-teal-800 text-white",
                  atual && "bg-teal-800 text-white ring-4 ring-teal-800/15",
                  !concluida && !atual && "bg-stone-100 text-stone-400"
                )}
              >
                {concluida ? <CheckCircle2 size={13} /> : i + 1}
              </div>
              <span className={cn("text-sm font-medium hidden sm:inline", atual ? "text-stone-900" : "text-stone-400")}>
                {etapa.titulo}
              </span>
            </div>
            {i < etapas.length - 1 && (
              <div className={cn("h-px flex-1 min-w-[16px]", concluida ? "bg-teal-800" : "bg-stone-200")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ClienteForm({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState(() => {
    const base = {
      tipo: "PF", nome: "", documento: "", telefone: "", email: "",
      inscricaoEstadual: "", indicadorIE: "nao_contribuinte",
      endereco: { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" },
    };
    if (!inicial) return base;
    return { ...base, ...inicial, endereco: { ...base.endereco, ...(inicial.endereco || {}) } };
  });
  const [erro, setErro] = useState("");
  const [statusCep, setStatusCep] = useState("idle"); // idle | buscando | encontrado | nao_encontrado
  const [etapa, setEtapa] = useState(0);
  const isSm = useMediaQuery("(min-width: 640px)");

  function setEndereco(campo, valor) {
    setForm((f) => ({ ...f, endereco: { ...f.endereco, [campo]: valor } }));
  }

  async function onCepChange(valor) {
    const mascarado = valor.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
    setEndereco("cep", mascarado);
    if (mascarado.replace(/\D/g, "").length === 8) {
      setStatusCep("buscando");
      const resultado = await buscarCep(mascarado);
      if (resultado) {
        setForm((f) => ({ ...f, endereco: { ...f.endereco, ...resultado, cep: mascarado } }));
        setStatusCep("encontrado");
      } else {
        setStatusCep("nao_encontrado");
      }
    } else {
      setStatusCep("idle");
    }
  }

  function validarEtapaAtual() {
    if (etapa === 0 && (!form.nome.trim() || !form.documento.trim())) {
      setErro("Preencha nome e CPF/CNPJ.");
      return false;
    }
    if (etapa === 2 && (!form.endereco.cep || !form.endereco.numero.trim())) {
      setErro("Preencha o CEP e o número do endereço.");
      return false;
    }
    setErro("");
    return true;
  }

  function avancar() {
    if (!validarEtapaAtual()) return;
    setEtapa((e) => Math.min(e + 1, ETAPAS_CLIENTE.length - 1));
  }

  function voltar() {
    setErro("");
    setEtapa((e) => Math.max(e - 1, 0));
  }

  function salvar() {
    if (!validarEtapaAtual()) return;
    onSalvar(form);
  }

  return (
    <Painel
      titulo={inicial?.id ? "Editar cliente" : "Novo cliente"}
      subtitulo={`Etapa ${etapa + 1} de ${ETAPAS_CLIENTE.length} — ${ETAPAS_CLIENTE[etapa].titulo}`}
      onFechar={onCancelar}
    >
      <Stepper etapas={ETAPAS_CLIENTE} etapaAtual={etapa} />

      {etapa === 0 && (
        <div className="space-y-5">
          <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-xs">
            {["PF", "PJ"].map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, tipo: t })}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  form.tipo === t ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                )}
              >
                {t === "PF" ? "Pessoa física" : "Pessoa jurídica"}
              </button>
            ))}
          </div>

          <Campo label="Nome / Razão social">
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className={inputClasses}
              placeholder="Ex: Construtora Horizonte Ltda"
              autoFocus
            />
          </Campo>

          <Campo label={form.tipo === "PF" ? "CPF" : "CNPJ"}>
            <input
              value={form.documento}
              onChange={(e) => setForm({ ...form, documento: e.target.value })}
              className={inputClasses}
              placeholder={form.tipo === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
            />
          </Campo>

          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Telefone">
              <input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className={inputClasses}
                placeholder="(00) 00000-0000"
              />
            </Campo>
            <Campo label="E-mail">
              <div style={{ position: "relative" }}>
                <Mail size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={cn(inputClasses, "pl-8")}
                  placeholder="cliente@email.com"
                />
              </div>
            </Campo>
          </div>
        </div>
      )}

      {etapa === 1 && (
        <div className="space-y-5">
          <p className="text-xs text-stone-500 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5">
            Esses dados são usados para preencher a nota fiscal eletrônica automaticamente quando o módulo fiscal for ativado.
          </p>

          {form.tipo === "PJ" && (
            <Campo label="Inscrição estadual">
              <input
                value={form.inscricaoEstadual}
                onChange={(e) => setForm({ ...form, inscricaoEstadual: e.target.value })}
                className={inputClasses}
                placeholder="Número da IE"
                disabled={form.indicadorIE === "isento"}
                autoFocus
              />
            </Campo>
          )}

          <Campo label="Indicador de inscrição estadual">
            <select
              value={form.indicadorIE}
              onChange={(e) => setForm({ ...form, indicadorIE: e.target.value })}
              className={cn(inputClasses, "bg-white")}
              autoFocus={form.tipo === "PF"}
            >
              {IE_OPCOES.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </Campo>
        </div>
      )}

      {etapa === 2 && (
        <div className="space-y-5">
          <Campo label="CEP">
            <div style={{ position: "relative" }} className="max-w-[200px]">
              <input
                value={form.endereco.cep}
                onChange={(e) => onCepChange(e.target.value)}
                className={inputClasses}
                placeholder="00000-000"
                inputMode="numeric"
                autoFocus
              />
              <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                {statusCep === "buscando" && <Loader2 size={14} className="text-stone-400 animate-spin" />}
                {statusCep === "encontrado" && <CheckCircle2 size={14} className="text-emerald-600" />}
              </div>
            </div>
            {statusCep === "nao_encontrado" && (
              <p className="text-xs text-red-600 mt-1.5">CEP não encontrado. Preencha o endereço manualmente.</p>
            )}
            {statusCep === "idle" && (
              <p className="text-xs text-stone-400 mt-1.5">Digite o CEP para buscar o endereço automaticamente.</p>
            )}
          </Campo>

          <Campo label="Logradouro">
            <input
              value={form.endereco.logradouro}
              onChange={(e) => setEndereco("logradouro", e.target.value)}
              className={inputClasses}
              placeholder="Preenchido automaticamente pelo CEP"
            />
          </Campo>

          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Número">
              <input
                value={form.endereco.numero}
                onChange={(e) => setEndereco("numero", e.target.value)}
                className={inputClasses}
                placeholder="Ex: 1200"
              />
            </Campo>
            <Campo label="Complemento">
              <input
                value={form.endereco.complemento}
                onChange={(e) => setEndereco("complemento", e.target.value)}
                className={inputClasses}
                placeholder="Sala, bloco... (opcional)"
              />
            </Campo>
          </div>

          <Campo label="Bairro">
            <input
              value={form.endereco.bairro}
              onChange={(e) => setEndereco("bairro", e.target.value)}
              className={inputClasses}
              placeholder="Preenchido automaticamente pelo CEP"
            />
          </Campo>

          <div className={cn("grid gap-4", isSm ? "grid-cols-[1fr_100px]" : "grid-cols-1")}>
            <Campo label="Cidade">
              <input
                value={form.endereco.cidade}
                onChange={(e) => setEndereco("cidade", e.target.value)}
                className={inputClasses}
                placeholder="Preenchido pelo CEP"
              />
            </Campo>
            <Campo label="UF">
              <input
                value={form.endereco.uf}
                onChange={(e) => setEndereco("uf", e.target.value.toUpperCase().slice(0, 2))}
                className={inputClasses}
                placeholder="RJ"
              />
            </Campo>
          </div>
        </div>
      )}

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-5">{erro}</p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-6 mt-6 border-t border-stone-100">
        <div className="flex gap-2">
          {etapa > 0 && (
            <button
              onClick={voltar}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium text-stone-600 border border-stone-300 hover:bg-stone-50 transition-colors"
            >
              Voltar
            </button>
          )}
          <button
            onClick={onCancelar}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
        <div className="hidden sm:block flex-1" />
        {etapa < ETAPAS_CLIENTE.length - 1 ? (
          <button
            onClick={avancar}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-medium bg-teal-800 hover:bg-teal-900 text-white transition-colors"
          >
            Continuar
          </button>
        ) : (
          <button
            onClick={salvar}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-medium bg-teal-800 hover:bg-teal-900 text-white transition-colors"
          >
            Salvar cliente
          </button>
        )}
      </div>
    </Painel>
  );
}

const ETAPAS_FORNECEDOR = [
  { id: "geral", titulo: "Dados gerais" },
  { id: "fornecimento", titulo: "Fornecimento" },
  { id: "endereco", titulo: "Endereço" },
];

function FornecedorForm({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || {
      tipo: "PJ", nome: "", documento: "", telefone: "", email: "",
      categoria: CATEGORIAS[0].id, condicaoPagamento: "", observacao: "",
      endereco: { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" },
    }
  );
  const [erro, setErro] = useState("");
  const [statusCep, setStatusCep] = useState("idle");
  const [etapa, setEtapa] = useState(0);
  const isSm = useMediaQuery("(min-width: 640px)");

  function setEndereco(campo, valor) {
    setForm((f) => ({ ...f, endereco: { ...f.endereco, [campo]: valor } }));
  }

  async function onCepChange(valor) {
    const mascarado = valor.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
    setEndereco("cep", mascarado);
    if (mascarado.replace(/\D/g, "").length === 8) {
      setStatusCep("buscando");
      const resultado = await buscarCep(mascarado);
      if (resultado) {
        setForm((f) => ({ ...f, endereco: { ...f.endereco, ...resultado, cep: mascarado } }));
        setStatusCep("encontrado");
      } else {
        setStatusCep("nao_encontrado");
      }
    } else {
      setStatusCep("idle");
    }
  }

  function validarEtapaAtual() {
    if (etapa === 0 && (!form.nome.trim() || !form.documento.trim())) {
      setErro("Preencha nome/razão social e CPF/CNPJ.");
      return false;
    }
    setErro("");
    return true;
  }

  function avancar() {
    if (!validarEtapaAtual()) return;
    setEtapa((e) => Math.min(e + 1, ETAPAS_FORNECEDOR.length - 1));
  }

  function voltar() {
    setErro("");
    setEtapa((e) => Math.max(e - 1, 0));
  }

  function salvar() {
    if (!validarEtapaAtual()) return;
    onSalvar(form);
  }

  return (
    <Painel
      titulo={inicial ? "Editar fornecedor" : "Novo fornecedor"}
      subtitulo={`Etapa ${etapa + 1} de ${ETAPAS_FORNECEDOR.length} — ${ETAPAS_FORNECEDOR[etapa].titulo}`}
      onFechar={onCancelar}
    >
      <Stepper etapas={ETAPAS_FORNECEDOR} etapaAtual={etapa} />

      {etapa === 0 && (
        <div className="space-y-5">
          <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-xs">
            {["PJ", "PF"].map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, tipo: t })}
                className={cn(
                  "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                  form.tipo === t ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                )}
              >
                {t === "PF" ? "Pessoa física" : "Pessoa jurídica"}
              </button>
            ))}
          </div>

          <Campo label="Nome / Razão social">
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className={inputClasses}
              placeholder="Ex: Votoran Distribuidora de Materiais"
              autoFocus
            />
          </Campo>

          <Campo label={form.tipo === "PF" ? "CPF" : "CNPJ"}>
            <input
              value={form.documento}
              onChange={(e) => setForm({ ...form, documento: e.target.value })}
              className={inputClasses}
              placeholder={form.tipo === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
            />
          </Campo>

          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Telefone">
              <input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className={inputClasses}
                placeholder="(00) 00000-0000"
              />
            </Campo>
            <Campo label="E-mail">
              <div style={{ position: "relative" }}>
                <Mail size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={cn(inputClasses, "pl-8")}
                  placeholder="fornecedor@email.com"
                />
              </div>
            </Campo>
          </div>
        </div>
      )}

      {etapa === 1 && (
        <div className="space-y-5">
          <Campo label="O que fornece">
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className={cn(inputClasses, "bg-white")}
              autoFocus
            >
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </Campo>

          <Campo label="Condição de pagamento">
            <input
              value={form.condicaoPagamento}
              onChange={(e) => setForm({ ...form, condicaoPagamento: e.target.value })}
              className={inputClasses}
              placeholder="Ex: 30 dias, à vista..."
            />
          </Campo>

          <Campo label="Observação (opcional)">
            <input
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              className={inputClasses}
              placeholder="Contato preferencial, prazo de entrega..."
            />
          </Campo>
        </div>
      )}

      {etapa === 2 && (
        <div className="space-y-5">
          <Campo label="CEP">
            <div style={{ position: "relative" }} className="max-w-[200px]">
              <input
                value={form.endereco.cep}
                onChange={(e) => onCepChange(e.target.value)}
                className={inputClasses}
                placeholder="00000-000"
                inputMode="numeric"
                autoFocus
              />
              <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}>
                {statusCep === "buscando" && <Loader2 size={14} className="text-stone-400 animate-spin" />}
                {statusCep === "encontrado" && <CheckCircle2 size={14} className="text-emerald-600" />}
              </div>
            </div>
            {statusCep === "nao_encontrado" && (
              <p className="text-xs text-red-600 mt-1.5">CEP não encontrado. Preencha o endereço manualmente.</p>
            )}
            {statusCep === "idle" && (
              <p className="text-xs text-stone-400 mt-1.5">Digite o CEP para buscar o endereço automaticamente.</p>
            )}
          </Campo>

          <Campo label="Logradouro">
            <input
              value={form.endereco.logradouro}
              onChange={(e) => setEndereco("logradouro", e.target.value)}
              className={inputClasses}
              placeholder="Preenchido automaticamente pelo CEP"
            />
          </Campo>

          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Número">
              <input
                value={form.endereco.numero}
                onChange={(e) => setEndereco("numero", e.target.value)}
                className={inputClasses}
                placeholder="Ex: 500"
              />
            </Campo>
            <Campo label="Complemento">
              <input
                value={form.endereco.complemento}
                onChange={(e) => setEndereco("complemento", e.target.value)}
                className={inputClasses}
                placeholder="Sala, bloco... (opcional)"
              />
            </Campo>
          </div>

          <Campo label="Bairro">
            <input
              value={form.endereco.bairro}
              onChange={(e) => setEndereco("bairro", e.target.value)}
              className={inputClasses}
              placeholder="Preenchido automaticamente pelo CEP"
            />
          </Campo>

          <div className={cn("grid gap-4", isSm ? "grid-cols-[1fr_100px]" : "grid-cols-1")}>
            <Campo label="Cidade">
              <input
                value={form.endereco.cidade}
                onChange={(e) => setEndereco("cidade", e.target.value)}
                className={inputClasses}
                placeholder="Preenchido pelo CEP"
              />
            </Campo>
            <Campo label="UF">
              <input
                value={form.endereco.uf}
                onChange={(e) => setEndereco("uf", e.target.value.toUpperCase().slice(0, 2))}
                className={inputClasses}
                placeholder="ES"
              />
            </Campo>
          </div>
        </div>
      )}

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-5">{erro}</p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-6 mt-6 border-t border-stone-100">
        <div className="flex gap-2">
          {etapa > 0 && (
            <button
              onClick={voltar}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium text-stone-600 border border-stone-300 hover:bg-stone-50 transition-colors"
            >
              Voltar
            </button>
          )}
          <button
            onClick={onCancelar}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
        <div className="hidden sm:block flex-1" />
        {etapa < ETAPAS_FORNECEDOR.length - 1 ? (
          <button
            onClick={avancar}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-medium bg-teal-800 hover:bg-teal-900 text-white transition-colors"
          >
            Continuar
          </button>
        ) : (
          <button
            onClick={salvar}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-medium bg-teal-800 hover:bg-teal-900 text-white transition-colors"
          >
            Salvar fornecedor
          </button>
        )}
      </div>
    </Painel>
  );
}

function ProdutoForm({ inicial, fornecedores, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || { nome: "", categoria: CATEGORIAS[0].id, unidade: "un", preco: "", estoque: "", estoqueMin: "", codigoBarras: "", fornecedorId: "" }
  );
  const [erro, setErro] = useState("");
  const isSm = useMediaQuery("(min-width: 640px)");

  function salvar() {
    if (!form.nome.trim() || form.preco === "") {
      setErro("Preencha nome e preço.");
      return;
    }
    onSalvar({
      ...form,
      preco: parseFloat(form.preco) || 0,
      estoque: parseInt(form.estoque) || 0,
      estoqueMin: parseInt(form.estoqueMin) || 0,
      fornecedorId: form.fornecedorId ? Number(form.fornecedorId) : null,
    });
  }

  return (
    <Painel titulo={inicial ? "Editar produto" : "Novo produto"} onFechar={onCancelar}>
      <div className="space-y-5">
        <Campo label="Nome do produto">
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className={inputClasses}
            placeholder="Ex: Cimento CP-II 50kg"
          />
        </Campo>

        <Campo label="Código de barras (opcional)">
          <div style={{ position: "relative" }}>
            <Barcode size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
            <input
              value={form.codigoBarras}
              onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
              className={cn(inputClasses, "pl-8")}
              placeholder="Bipe ou digite o código"
            />
          </div>
          <p className="text-xs text-stone-400 mt-1.5">Usado para localizar o produto rapidamente na Venda (PDV).</p>
        </Campo>

        <Campo label="Categoria">
          <select
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            className={cn(inputClasses, "bg-white")}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Fornecedor (opcional)">
          <BuscaFornecedor
            fornecedores={fornecedores}
            value={form.fornecedorId}
            onChange={(id) => setForm({ ...form, fornecedorId: id })}
          />
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Unidade">
            <input
              value={form.unidade}
              onChange={(e) => setForm({ ...form, unidade: e.target.value })}
              className={inputClasses}
              placeholder="sc, un, m²..."
            />
          </Campo>
          <Campo label="Preço (R$)">
            <input
              type="number"
              step="0.01"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              className={inputClasses}
              placeholder="0,00"
            />
          </Campo>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Estoque atual">
            <input
              type="number"
              value={form.estoque}
              onChange={(e) => setForm({ ...form, estoque: e.target.value })}
              className={inputClasses}
              placeholder="0"
            />
          </Campo>
          <Campo label="Estoque mínimo">
            <input
              type="number"
              value={form.estoqueMin}
              onChange={(e) => setForm({ ...form, estoqueMin: e.target.value })}
              className={inputClasses}
              placeholder="0"
            />
          </Campo>
        </div>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}

function TipoMovimentoChip({ tipo }) {
  const entrada = tipo === "entrada";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        entrada ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      )}
    >
      {entrada ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}
      {entrada ? "Entrada" : "Saída"}
    </span>
  );
}

function BarraEstoque({ produto }) {
  const alvo = Math.max(produto.estoqueMin * 2, 1);
  const pct = Math.min(100, Math.round((produto.estoque / alvo) * 100));
  const baixo = produto.estoque <= produto.estoqueMin;
  return (
    <div className="w-full max-w-[120px]">
      <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full", baixo ? "bg-red-500" : "bg-teal-700")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MovimentacaoForm({ produtos, produtoInicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    produtoId: produtoInicial?.id || (produtos[0]?.id ?? ""),
    tipo: "entrada",
    quantidade: "",
    motivo: "",
    observacao: "",
    data: hojeISO(),
  });
  const [erro, setErro] = useState("");

  const produtoSelecionado = produtos.find((p) => p.id === Number(form.produtoId));
  const motivos = form.tipo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA;

  function salvar() {
    const qtd = parseFloat(form.quantidade);
    if (!form.produtoId) {
      setErro("Selecione um produto.");
      return;
    }
    if (!qtd || qtd <= 0) {
      setErro("Informe uma quantidade válida.");
      return;
    }
    if (!form.motivo) {
      setErro("Selecione o motivo da movimentação.");
      return;
    }
    if (form.tipo === "saida" && produtoSelecionado && qtd > produtoSelecionado.estoque) {
      setErro(`Estoque insuficiente. Disponível: ${produtoSelecionado.estoque} ${produtoSelecionado.unidade}.`);
      return;
    }
    onSalvar({ ...form, produtoId: Number(form.produtoId), quantidade: qtd });
  }

  return (
    <Painel titulo="Nova movimentação de estoque" subtitulo="Entrada ou saída de produtos" onFechar={onCancelar}>
      <div className="space-y-5">
        <div className="flex gap-2 p-1 bg-stone-100 rounded-lg">
          {[
            { id: "entrada", label: "Entrada", icon: ArrowUpCircle },
            { id: "saida", label: "Saída", icon: ArrowDownCircle },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setForm({ ...form, tipo: t.id, motivo: "" })}
              className={cn(
                "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                form.tipo === t.id ? "bg-white shadow-sm" : "text-stone-500",
                form.tipo === t.id && t.id === "entrada" && "text-emerald-700",
                form.tipo === t.id && t.id === "saida" && "text-red-700"
              )}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        <Campo label="Produto">
          <select
            value={form.produtoId}
            onChange={(e) => setForm({ ...form, produtoId: e.target.value })}
            className={cn(inputClasses, "bg-white")}
          >
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          {produtoSelecionado && (
            <p className="text-xs text-stone-400 mt-1.5">
              Estoque atual: {produtoSelecionado.estoque} {produtoSelecionado.unidade}
            </p>
          )}
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label={`Quantidade${produtoSelecionado ? ` (${produtoSelecionado.unidade})` : ""}`}>
            <input
              type="number"
              min="0"
              value={form.quantidade}
              onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
              className={inputClasses}
              placeholder="0"
              autoFocus
            />
          </Campo>
          <Campo label="Data">
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className={inputClasses}
            />
          </Campo>
        </div>

        <Campo label="Motivo">
          <select
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            className={cn(inputClasses, "bg-white")}
          >
            <option value="">Selecione...</option>
            {motivos.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Observação (opcional)">
          <input
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            className={inputClasses}
            placeholder="Ex: nota fiscal, cliente, condição do item..."
          />
        </Campo>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}

function PedidoForm({ inicial, fornecedores, produtos, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || { fornecedorId: "", dataPrevista: hojeISO(), itens: [], observacao: "" }
  );
  const [produtoAdd, setProdutoAdd] = useState(produtos[0]?.id || "");
  const [qtdAdd, setQtdAdd] = useState("1");
  const [precoAdd, setPrecoAdd] = useState(produtos[0]?.preco?.toFixed(2) || "");
  const [erro, setErro] = useState("");
  const isSm = useMediaQuery("(min-width: 640px)");

  function aoTrocarProdutoAdd(id) {
    setProdutoAdd(id);
    const p = produtos.find((x) => x.id === Number(id));
    if (p) setPrecoAdd(p.preco.toFixed(2));
  }

  const produtosDoFornecedor = form.fornecedorId
    ? produtos.filter((p) => p.fornecedorId === Number(form.fornecedorId))
    : [];
  const opcoesProduto = produtosDoFornecedor.length > 0 ? produtosDoFornecedor : produtos;

  function adicionarItem() {
    const produto = produtos.find((p) => p.id === Number(produtoAdd));
    const qtd = parseInt(qtdAdd) || 0;
    const preco = parseFloat(precoAdd) || 0;
    if (!produto || qtd <= 0) {
      setErro("Selecione um produto e uma quantidade válida.");
      return;
    }
    const existente = form.itens.find((i) => i.produtoId === produto.id);
    setForm({
      ...form,
      itens: existente
        ? form.itens.map((i) => (i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + qtd, precoUnitario: preco } : i))
        : [...form.itens, { produtoId: produto.id, nome: produto.nome, quantidade: qtd, precoUnitario: preco }],
    });
    setQtdAdd("1");
    setErro("");
  }

  function removerItem(produtoId) {
    setForm({ ...form, itens: form.itens.filter((i) => i.produtoId !== produtoId) });
  }

  function alterarQtdItem(produtoId, novaQtd) {
    if (novaQtd < 1) return removerItem(produtoId);
    setForm({ ...form, itens: form.itens.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: novaQtd } : i)) });
  }

  const total = form.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);

  function salvar() {
    if (!form.fornecedorId) {
      setErro("Selecione o fornecedor.");
      return;
    }
    if (form.itens.length === 0) {
      setErro("Adicione ao menos um item ao pedido.");
      return;
    }
    onSalvar({ ...form, fornecedorId: Number(form.fornecedorId) });
  }

  return (
    <Painel titulo={inicial ? "Editar pedido de compra" : "Novo pedido de compra"} onFechar={onCancelar} largo>
      <div className="space-y-5">
        <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
          <Campo label="Fornecedor">
            <BuscaFornecedor
              fornecedores={fornecedores}
              value={form.fornecedorId}
              onChange={(fid) => {
                setForm({ ...form, fornecedorId: fid });
                const filtrados = fid ? produtos.filter((p) => p.fornecedorId === Number(fid)) : [];
                const primeiro = (filtrados.length > 0 ? filtrados : produtos)[0];
                if (primeiro) {
                  setProdutoAdd(primeiro.id);
                  setPrecoAdd(primeiro.preco.toFixed(2));
                }
              }}
            />
          </Campo>
          <Campo label="Previsão de entrega">
            <input
              type="date"
              value={form.dataPrevista}
              onChange={(e) => setForm({ ...form, dataPrevista: e.target.value })}
              className={inputClasses}
            />
          </Campo>
        </div>

        <div className="pt-1 border-t border-stone-100" />
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Itens do pedido</p>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={produtoAdd}
            onChange={(e) => aoTrocarProdutoAdd(e.target.value)}
            className={cn(inputClasses, "bg-white flex-1")}
          >
            {opcoesProduto.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <input
            value={qtdAdd}
            onChange={(e) => setQtdAdd(e.target.value.replace(/\D/g, ""))}
            placeholder="Qtd"
            inputMode="numeric"
            style={{ width: "80px" }}
            className={cn(inputClasses, "shrink-0 text-center")}
          />
          <input
            value={precoAdd}
            onChange={(e) => setPrecoAdd(e.target.value)}
            placeholder="Preço unit."
            type="number"
            step="0.01"
            style={{ width: "110px" }}
            className={cn(inputClasses, "shrink-0")}
          />
          <button
            onClick={adicionarItem}
            className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>

        {form.itens.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6 bg-stone-50 rounded-lg border border-stone-100">Nenhum item adicionado ainda.</p>
        ) : (
          <div className="border border-stone-200 rounded-lg divide-y divide-stone-100">
            {form.itens.map((item) => (
              <div key={item.produtoId} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-800 truncate">{item.nome}</p>
                  <p className="text-xs text-stone-400">{moeda(item.precoUnitario)} / un.</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => alterarQtdItem(item.produtoId, item.quantidade - 1)} className="w-7 h-7 rounded-md border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50">
                    <Minus size={13} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantidade}</span>
                  <button onClick={() => alterarQtdItem(item.produtoId, item.quantidade + 1)} className="w-7 h-7 rounded-md border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50">
                    <Plus size={13} />
                  </button>
                </div>
                <span className="w-24 text-right text-sm font-medium text-stone-800 tabular-nums shrink-0">{moeda(item.quantidade * item.precoUnitario)}</span>
                <button onClick={() => removerItem(item.produtoId)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:text-red-600 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-3 bg-stone-50">
              <span className="text-sm font-semibold text-stone-900">Total do pedido</span>
              <span className="text-lg font-bold text-teal-800 tabular-nums">{moeda(total)}</span>
            </div>
          </div>
        )}

        <Campo label="Observação (opcional)">
          <input
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            className={inputClasses}
            placeholder="Condições combinadas, prazo, contato..."
          />
        </Campo>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}

function UsuarioForm({ inicial, papeis, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || { nome: "", email: "", papelId: papeis.find((p) => !p.fixo)?.id || papeis[0]?.id || "", ativo: true }
  );
  const [erro, setErro] = useState("");

  function salvar() {
    if (!form.nome.trim() || !form.email.trim()) {
      setErro("Preencha nome e e-mail.");
      return;
    }
    if (!form.papelId) {
      setErro("Selecione um papel.");
      return;
    }
    onSalvar(form);
  }

  return (
    <Painel titulo={inicial ? "Editar usuário" : "Novo usuário"} onFechar={onCancelar}>
      <div className="space-y-5">
        <Campo label="Nome">
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className={inputClasses}
            placeholder="Nome completo"
            autoFocus
          />
        </Campo>

        <Campo label="E-mail">
          <div style={{ position: "relative" }}>
            <Mail size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={cn(inputClasses, "pl-8")}
              placeholder="usuario@empresa.com"
            />
          </div>
        </Campo>

        <Campo label="Papel">
          <select
            value={form.papelId}
            onChange={(e) => setForm({ ...form, papelId: e.target.value })}
            className={cn(inputClasses, "bg-white")}
          >
            {papeis.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <p className="text-xs text-stone-400 mt-1.5">Define o que esse usuário pode ver e editar no sistema.</p>
        </Campo>

        <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            className="w-4 h-4 rounded border-stone-300 text-teal-800 focus:ring-teal-700/30"
          />
          Usuário ativo (desmarque para bloquear o acesso sem excluir o cadastro)
        </label>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}

function PapelForm({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || { nome: "", fixo: false, permissoes: permissoesTotais("nenhum") }
  );
  const [erro, setErro] = useState("");

  function salvar() {
    if (!form.nome.trim()) {
      setErro("Dê um nome para o papel.");
      return;
    }
    onSalvar(form);
  }

  return (
    <Painel titulo={inicial ? "Editar papel" : "Novo papel"} onFechar={onCancelar} largo>
      <div className="space-y-5">
        <Campo label="Nome do papel">
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className={inputClasses}
            placeholder="Ex: Estoquista, Supervisor..."
            autoFocus
          />
        </Campo>

        <div className="pt-1 border-t border-stone-100" />
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Permissões por módulo</p>

        <div className="border border-stone-200 rounded-lg divide-y divide-stone-100">
          {MODULOS_PERMISSAO.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-sm text-stone-700">{m.label}</span>
              <div className="flex gap-1 p-1 bg-stone-100 rounded-lg shrink-0">
                {NIVEIS_PERMISSAO.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setForm({ ...form, permissoes: { ...form.permissoes, [m.id]: n.id } })}
                    title={n.label}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      form.permissoes[m.id] === n.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-400"
                    )}
                  >
                    {n.id === "nenhum" ? "—" : n.id === "visualizar" ? <Eye size={13} /> : <Pencil size={13} />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-400">— sem acesso · olho: só visualizar · lápis: visualizar e editar</p>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}

function statusLancamento(l) {
  if (l.pago) return "pago";
  if (l.vencimento < hojeISO()) return "vencido";
  return "pendente";
}

function StatusChip({ status }) {
  const mapa = {
    pago: { label: "Pago", cls: "bg-emerald-50 text-emerald-700" },
    vencido: { label: "Vencido", cls: "bg-red-50 text-red-700" },
    pendente: { label: "Pendente", cls: "bg-amber-50 text-amber-700" },
  };
  const s = mapa[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", s.cls)}>
      {s.label}
    </span>
  );
}

function TipoLancamentoChip({ tipo }) {
  const receita = tipo === "receita";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        receita ? "bg-teal-50 text-teal-700" : "bg-stone-100 text-stone-600"
      )}
    >
      {receita ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {receita ? "Receita" : "Despesa"}
    </span>
  );
}

function LancamentoForm({ inicial, clientes, fornecedores, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || {
      tipo: "receita", descricao: "", valor: "", vencimento: hojeISO(),
      clienteId: "", fornecedorId: "", contraparte: "", formaPagamento: "pix", observacao: "", pago: false, dataPagamento: null,
    }
  );
  const [erro, setErro] = useState("");

  function salvar() {
    if (!form.descricao.trim()) {
      setErro("Informe uma descrição.");
      return;
    }
    const valor = parseFloat(form.valor);
    if (!valor || valor <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    if (!form.vencimento) {
      setErro("Informe a data de vencimento.");
      return;
    }
    onSalvar({
      ...form,
      valor,
      clienteId: form.tipo === "receita" && form.clienteId ? Number(form.clienteId) : null,
      fornecedorId: form.tipo === "despesa" && form.fornecedorId ? Number(form.fornecedorId) : null,
      contraparte: form.tipo === "despesa" ? form.contraparte : "",
    });
  }

  return (
    <Painel
      titulo={inicial ? "Editar lançamento" : "Novo lançamento"}
      subtitulo={form.tipo === "receita" ? "Conta a receber" : "Conta a pagar"}
      onFechar={onCancelar}
    >
      <div className="space-y-5">
        <div className="flex gap-2 p-1 bg-stone-100 rounded-lg">
          {[
            { id: "receita", label: "Receita (a receber)", icon: TrendingUp },
            { id: "despesa", label: "Despesa (a pagar)", icon: TrendingDown },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setForm({ ...form, tipo: t.id })}
              className={cn(
                "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                form.tipo === t.id ? "bg-white shadow-sm" : "text-stone-500",
                form.tipo === t.id && t.id === "receita" && "text-teal-800",
                form.tipo === t.id && t.id === "despesa" && "text-stone-800"
              )}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        <Campo label="Descrição">
          <input
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            className={inputClasses}
            placeholder={form.tipo === "receita" ? "Ex: Venda de materiais - obra X" : "Ex: Compra de cimento, aluguel..."}
            autoFocus
          />
        </Campo>

        {form.tipo === "receita" ? (
          <Campo label="Cliente (opcional)">
            <select
              value={form.clienteId}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
              className={cn(inputClasses, "bg-white")}
            >
              <option value="">Nenhum</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Campo>
        ) : (
          <>
            <Campo label="Fornecedor">
              <BuscaFornecedor
                fornecedores={fornecedores}
                value={form.fornecedorId}
                onChange={(fid) => {
                  const forn = fornecedores.find((f) => f.id === Number(fid));
                  setForm({ ...form, fornecedorId: fid, contraparte: forn ? forn.nome : form.contraparte });
                }}
                placeholder="Buscar fornecedor ou digitar manualmente..."
              />
            </Campo>
            {!form.fornecedorId && (
              <Campo label="Nome do fornecedor / beneficiário">
                <input
                  value={form.contraparte}
                  onChange={(e) => setForm({ ...form, contraparte: e.target.value })}
                  className={inputClasses}
                  placeholder="Ex: Votoran Distribuidora"
                />
              </Campo>
            )}
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Valor (R$)">
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className={inputClasses}
              placeholder="0,00"
            />
          </Campo>
          <Campo label="Vencimento">
            <input
              type="date"
              value={form.vencimento}
              onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
              className={inputClasses}
            />
          </Campo>
        </div>

        <Campo label="Forma de pagamento">
          <select
            value={form.formaPagamento}
            onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}
            className={cn(inputClasses, "bg-white")}
          >
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Observação (opcional)">
          <input
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            className={inputClasses}
            placeholder="Ex: número da NF, parcela..."
          />
        </Campo>

        <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.pago}
            onChange={(e) => setForm({ ...form, pago: e.target.checked, dataPagamento: e.target.checked ? hojeISO() : null })}
            className="w-4 h-4 rounded border-stone-300 text-teal-800 focus:ring-teal-700/30"
          />
          Já {form.tipo === "receita" ? "recebido" : "pago"}
        </label>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}

function CupomModal({ venda, cliente, onNovaVenda, onFechar }) {
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const subtotal = venda.subtotal ?? totalVenda(venda);
  const desconto = venda.desconto?.valorCalculado || 0;
  const total = venda.total ?? subtotal;

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold text-stone-900">Venda concluída</h2>
          </div>
          <button onClick={onFechar} className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5" style={{ minHeight: 0 }}>
          <div className="text-center mb-5 pb-5 border-b border-dashed border-stone-200">
            <p className="text-xs text-stone-400 uppercase tracking-wide">Comprovante de venda nº {venda.numero}</p>
            <p className="text-xs text-stone-400 mt-0.5">{formatarData(venda.data)} · {cliente ? cliente.nome : "Consumidor não identificado"}</p>
          </div>

          <div className="space-y-2.5 mb-5">
            {venda.itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm gap-3">
                <div className="min-w-0">
                  <p className="text-stone-800 truncate">{item.nome}</p>
                  <p className="text-xs text-stone-400">{item.quantidade} × {moeda(item.precoUnitario)}</p>
                </div>
                <span className="font-medium text-stone-700 tabular-nums shrink-0">{moeda(item.quantidade * item.precoUnitario)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-4 border-t border-stone-200">
            <div className="flex items-center justify-between text-sm text-stone-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{moeda(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-700">
                <span>Desconto{venda.desconto?.tipo === "percentual" ? ` (${venda.desconto.valor}%)` : ""}</span>
                <span className="tabular-nums">− {moeda(desconto)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-sm font-semibold text-stone-900">Total</span>
              <span className="text-lg font-bold text-teal-800 tabular-nums">{moeda(total)}</span>
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {FORMAS_PAGAMENTO.find((f) => f.id === venda.formaPagamento)?.label}
          </p>

          {(venda.tipoEntrega === "entrega" || venda.notaGerada) && (
            <div className="flex flex-col gap-1.5 mt-4">
              {venda.tipoEntrega === "entrega" && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-sky-50 text-sky-700 px-2.5 py-1.5 rounded-lg w-fit">
                  <Truck size={12} /> Entrega registrada em Entregas
                </span>
              )}
              {venda.notaGerada && (
                <span className="inline-flex items-center gap-1.5 text-xs bg-teal-50 text-teal-700 px-2.5 py-1.5 rounded-lg w-fit">
                  <FileCheck2 size={12} /> Rascunho de NF-e gerado em Fiscal
                </span>
              )}
            </div>
          )}

          <p className="text-xs text-stone-400 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5 mt-4">
            Este é um comprovante interno, sem valor fiscal. A emissão de NFC-e/NF-e será feita pelo módulo Fiscal quando integrado à SEFAZ.
          </p>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-stone-100 shrink-0">
          <button
            onClick={() => window.print()}
            className="flex-1 border border-stone-300 hover:bg-stone-50 rounded-lg py-2.5 text-sm font-medium text-stone-700 transition-colors"
          >
            Imprimir
          </button>
          <button
            onClick={onNovaVenda}
            className="flex-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Nova venda
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigFiscalForm({ inicial, onSalvar }) {
  const [form, setForm] = useState(inicial);
  const [salvo, setSalvo] = useState(false);
  const isSm = useMediaQuery("(min-width: 640px)");

  function salvar() {
    onSalvar(form);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 space-y-6">
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Dados do emitente</p>
        <div className="space-y-4">
          <Campo label="Razão social">
            <input
              value={form.razaoSocial}
              onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
              className={inputClasses}
              placeholder="Ex: Construgestão Materiais Ltda"
            />
          </Campo>
          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Nome fantasia">
              <input
                value={form.nomeFantasia}
                onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
                className={inputClasses}
                placeholder="Nome usado no dia a dia"
              />
            </Campo>
            <Campo label="CNPJ">
              <input
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                className={inputClasses}
                placeholder="00.000.000/0000-00"
              />
            </Campo>
          </div>
          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Inscrição estadual">
              <input
                value={form.ie}
                onChange={(e) => setForm({ ...form, ie: e.target.value })}
                className={inputClasses}
                placeholder="Número da IE"
              />
            </Campo>
            <Campo label="Regime tributário">
              <select
                value={form.regimeTributario}
                onChange={(e) => setForm({ ...form, regimeTributario: e.target.value })}
                className={cn(inputClasses, "bg-white")}
              >
                {REGIMES_TRIBUTARIOS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </Campo>
          </div>
        </div>
      </div>

      <div className="pt-5 border-t border-stone-100">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Emissão de NF-e</p>
        <div className="space-y-4">
          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Provedor de emissão">
              <select
                value={form.provedor}
                onChange={(e) => setForm({ ...form, provedor: e.target.value })}
                className={cn(inputClasses, "bg-white")}
              >
                <option value="">Nenhum selecionado</option>
                {PROVEDORES_NFE.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Ambiente">
              <div className="flex gap-2 p-1 bg-stone-100 rounded-lg">
                {[
                  { id: "homologacao", label: "Homologação" },
                  { id: "producao", label: "Produção" },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setForm({ ...form, ambiente: a.id })}
                    className={cn(
                      "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                      form.ambiente === a.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </Campo>
          </div>

          <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
            <Campo label="Série da NF-e">
              <input
                value={form.serieNFe}
                onChange={(e) => setForm({ ...form, serieNFe: e.target.value })}
                className={inputClasses}
                placeholder="1"
              />
            </Campo>
            <Campo label="Próximo número">
              <input
                type="number"
                min="1"
                value={form.proximoNumero}
                onChange={(e) => setForm({ ...form, proximoNumero: parseInt(e.target.value) || 1 })}
                className={inputClasses}
              />
            </Campo>
          </div>

          <div className="bg-stone-50 border border-stone-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <KeyRound size={16} className="text-stone-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-700">Certificado digital (A1)</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  O upload do certificado exige um backend seguro — não é possível armazená-lo com segurança direto no navegador. Essa etapa fica disponível quando o backend for conectado.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-stone-700 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.certificadoInstalado}
                onChange={(e) => setForm({ ...form, certificadoInstalado: e.target.checked })}
                className="w-4 h-4 rounded border-stone-300 text-teal-800 focus:ring-teal-700/30"
              />
              Simular certificado instalado (apenas para teste do fluxo)
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={salvar}
          className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Salvar configurações
        </button>
        {salvo && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 size={15} /> Salvo
          </span>
        )}
      </div>
    </div>
  );
}

function NotaPreviewModal({ nota, cliente, empresaFiscal, onFechar }) {
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const total = nota.venda ? totalVenda(nota.venda) : 0;

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
              <FileText size={16} className="text-stone-500" />
            </div>
            <h2 className="text-base font-semibold text-stone-900">NF-e nº {nota.numero} · Série {nota.serie}</h2>
          </div>
          <button onClick={onFechar} className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5" style={{ minHeight: 0 }}>
          <div className="text-center bg-stone-50 border border-dashed border-stone-300 rounded-lg px-4 py-3 mb-5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Modelo — sem validade fiscal</p>
            <p className="text-xs text-stone-400 mt-1">Rascunho gerado localmente. Não foi transmitido à SEFAZ.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-5">
            <div>
              <p className="text-xs text-stone-400">Emitente</p>
              <p className="text-stone-800">{empresaFiscal.razaoSocial || "Razão social não configurada"}</p>
              <p className="text-xs text-stone-400 mt-0.5">{empresaFiscal.cnpj || "CNPJ não configurado"}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Destinatário</p>
              <p className="text-stone-800">{cliente ? cliente.nome : "Consumidor não identificado"}</p>
              {cliente && <p className="text-xs text-stone-400 mt-0.5">{cliente.documento}</p>}
            </div>
          </div>

          <div className="space-y-2.5 mb-5 pt-4 border-t border-stone-100">
            {nota.venda?.itens.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm gap-3">
                <div className="min-w-0">
                  <p className="text-stone-800 truncate">{item.nome}</p>
                  <p className="text-xs text-stone-400">{item.quantidade} × {moeda(item.precoUnitario)}</p>
                </div>
                <span className="font-medium text-stone-700 tabular-nums shrink-0">{moeda(item.quantidade * item.precoUnitario)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <span className="text-sm font-semibold text-stone-900">Valor total</span>
            <span className="text-lg font-bold text-teal-800 tabular-nums">{moeda(total)}</span>
          </div>

          <p className="text-xs text-stone-400 mt-5">
            Chave de acesso: pendente de emissão · Ambiente: {empresaFiscal.ambiente === "producao" ? "Produção" : "Homologação"}
          </p>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-stone-100 shrink-0">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-1.5 border border-stone-300 hover:bg-stone-50 rounded-lg py-2.5 text-sm font-medium text-stone-700 transition-colors"
          >
            <Printer size={15} /> Imprimir modelo
          </button>
          <button
            onClick={onFechar}
            className="flex-1 bg-stone-800 hover:bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusEntregaChip({ status }) {
  const s = STATUS_ENTREGA.find((x) => x.id === status);
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", s.chip)}>
      <Icon size={12} /> {s.label}
    </span>
  );
}

function EntregaForm({ inicial, vendas, clientes, clientesPorId, onSalvar, onCancelar }) {
  const [form, setForm] = useState(
    inicial || {
      vendaId: "", clienteId: "", endereco: "", itensDescricao: "",
      dataPrevista: hojeISO(), motorista: "", veiculo: "", observacao: "",
    }
  );
  const [erro, setErro] = useState("");
  const isSm = useMediaQuery("(min-width: 640px)");
  const modoAvulsa = !form.vendaId;

  const [cepEntrega, setCepEntrega] = useState("");
  const [numeroEntrega, setNumeroEntrega] = useState("");
  const [statusCepEntrega, setStatusCepEntrega] = useState("idle");
  const [enderecoEncontrado, setEnderecoEncontrado] = useState(null);

  async function onCepEntregaChange(valor) {
    const mascarado = valor.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
    setCepEntrega(mascarado);
    if (mascarado.replace(/\D/g, "").length === 8) {
      setStatusCepEntrega("buscando");
      const resultado = await buscarCep(mascarado);
      if (resultado) {
        setEnderecoEncontrado(resultado);
        setStatusCepEntrega("encontrado");
        setForm((f) => ({ ...f, endereco: formatarEndereco({ ...resultado, numero: numeroEntrega }) }));
      } else {
        setStatusCepEntrega("nao_encontrado");
      }
    } else {
      setStatusCepEntrega("idle");
    }
  }

  function onNumeroEntregaChange(valor) {
    setNumeroEntrega(valor);
    if (enderecoEncontrado) {
      setForm((f) => ({ ...f, endereco: formatarEndereco({ ...enderecoEncontrado, numero: valor }) }));
    }
  }

  function selecionarVenda(vendaId) {
    if (!vendaId) {
      setForm({ ...form, vendaId: "" });
      return;
    }
    const venda = vendas.find((v) => v.id === Number(vendaId));
    if (!venda) return;
    const cliente = venda.clienteId ? clientesPorId[venda.clienteId] : null;
    setForm({
      ...form,
      vendaId: venda.id,
      clienteId: venda.clienteId || "",
      endereco: cliente ? formatarEndereco(cliente.endereco) : form.endereco,
      itensDescricao: venda.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", "),
    });
  }

  function selecionarClienteAvulso(clienteId) {
    const cliente = clienteId ? clientesPorId[Number(clienteId)] : null;
    setForm({
      ...form,
      clienteId,
      endereco: cliente ? formatarEndereco(cliente.endereco) : "",
    });
  }

  function salvar() {
    if (!form.clienteId && !form.endereco.trim()) {
      setErro("Informe o cliente ou o endereço de entrega.");
      return;
    }
    if (!form.dataPrevista) {
      setErro("Informe a data prevista.");
      return;
    }
    onSalvar({ ...form, vendaId: form.vendaId ? Number(form.vendaId) : null, clienteId: form.clienteId ? Number(form.clienteId) : null });
  }

  return (
    <Painel titulo={inicial ? "Editar entrega" : "Nova entrega"} onFechar={onCancelar}>
      <div className="space-y-5">
        <Campo label="Vincular a uma venda (opcional)">
          <select
            value={form.vendaId}
            onChange={(e) => selecionarVenda(e.target.value)}
            className={cn(inputClasses, "bg-white")}
          >
            <option value="">Entrega avulsa (sem venda vinculada)</option>
            {vendas.map((v) => (
              <option key={v.id} value={v.id}>
                Venda nº {v.numero} · {v.clienteId ? clientesPorId[v.clienteId]?.nome : "Consumidor não identificado"}
              </option>
            ))}
          </select>
        </Campo>

        {modoAvulsa && (
          <Campo label="Cliente">
            <select
              value={form.clienteId}
              onChange={(e) => selecionarClienteAvulso(e.target.value)}
              className={cn(inputClasses, "bg-white")}
            >
              <option value="">Nenhum (informar endereço manualmente)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Campo>
        )}

        <Campo label="Buscar endereço por CEP (opcional)">
          <div className="flex gap-2">
            <div style={{ position: "relative" }} className="flex-1">
              <input
                value={cepEntrega}
                onChange={(e) => onCepEntregaChange(e.target.value)}
                className={inputClasses}
                placeholder="00000-000"
                inputMode="numeric"
              />
              <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}>
                {statusCepEntrega === "buscando" && <Loader2 size={14} className="text-stone-400 animate-spin" />}
                {statusCepEntrega === "encontrado" && <CheckCircle2 size={14} className="text-emerald-600" />}
              </div>
            </div>
            <input
              value={numeroEntrega}
              onChange={(e) => onNumeroEntregaChange(e.target.value)}
              className={inputClasses}
              placeholder="Número"
              style={{ width: "110px" }}
            />
          </div>
          {statusCepEntrega === "nao_encontrado" && (
            <p className="text-xs text-red-600 mt-1.5">CEP não encontrado. Preencha o endereço manualmente abaixo.</p>
          )}
        </Campo>

        <Campo label="Endereço de entrega">
          <input
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            className={inputClasses}
            placeholder="Rua, número - Bairro, Cidade/UF"
          />
        </Campo>

        <Campo label="Itens / carga">
          <input
            value={form.itensDescricao}
            onChange={(e) => setForm({ ...form, itensDescricao: e.target.value })}
            className={inputClasses}
            placeholder="Ex: 2x Torneira, 5x Cimento CP-II"
          />
        </Campo>

        <div className={cn("grid gap-4", isSm ? "grid-cols-2" : "grid-cols-1")}>
          <Campo label="Data prevista">
            <input
              type="date"
              value={form.dataPrevista}
              onChange={(e) => setForm({ ...form, dataPrevista: e.target.value })}
              className={inputClasses}
            />
          </Campo>
          <Campo label="Motorista (opcional)">
            <input
              value={form.motorista}
              onChange={(e) => setForm({ ...form, motorista: e.target.value })}
              className={inputClasses}
              placeholder="Nome do motorista"
            />
          </Campo>
        </div>

        <Campo label="Veículo (opcional)">
          <input
            value={form.veiculo}
            onChange={(e) => setForm({ ...form, veiculo: e.target.value })}
            className={inputClasses}
            placeholder="Ex: Caminhão ABC-1234"
          />
        </Campo>

        <Campo label="Observação (opcional)">
          <input
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            className={inputClasses}
            placeholder="Instruções para a entrega"
          />
        </Campo>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</p>
        )}

        <RodapePainel onSalvar={salvar} onCancelar={onCancelar} />
      </div>
    </Painel>
  );
}

export default function CadastroClientesProdutos() {
  const [aba, setAba] = useState("inicio");
  const [clientes, setClientes] = useState(CLIENTES_INICIAIS);
  const [fornecedores, setFornecedores] = useState(FORNECEDORES_INICIAIS);
  const [pedidos, setPedidos] = useState(PEDIDOS_INICIAIS);
  const [formPedido, setFormPedido] = useState(null);
  const [usuarios, setUsuarios] = useState(USUARIOS_INICIAIS);
  const [papeis, setPapeis] = useState(PAPEIS_INICIAIS);
  const [usuarioLogadoId, setUsuarioLogadoId] = useState(1);
  const [formUsuario, setFormUsuario] = useState(null);
  const [formPapel, setFormPapel] = useState(null);
  const [subUsuarios, setSubUsuarios] = useState("usuarios");
  const [menuSessaoAberto, setMenuSessaoAberto] = useState(false);
  const [filtroPedido, setFiltroPedido] = useState("todos");
  const [produtos, setProdutos] = useState(PRODUTOS_INICIAIS);
  const [movimentacoes, setMovimentacoes] = useState(MOVIMENTACOES_INICIAIS);
  const [lancamentos, setLancamentos] = useState(LANCAMENTOS_INICIAIS);
  const [busca, setBusca] = useState("");
  const [formCliente, setFormCliente] = useState(null);
  const [formFornecedor, setFormFornecedor] = useState(null);
  const [formProduto, setFormProduto] = useState(null);
  const [formMovimentacao, setFormMovimentacao] = useState(null);
  const [formLancamento, setFormLancamento] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const [vendas, setVendas] = useState(VENDAS_INICIAIS);
  const [carrinho, setCarrinho] = useState([]);
  const [bipCodigo, setBipCodigo] = useState("");
  const [bipQuantidade, setBipQuantidade] = useState("1");
  const [erroBip, setErroBip] = useState("");
  const [docClienteVenda, setDocClienteVenda] = useState("");
  const [formaPagamentoVenda, setFormaPagamentoVenda] = useState("pix");
  const [cupomAtual, setCupomAtual] = useState(null);
  const [descontoTipo, setDescontoTipo] = useState("percentual");
  const [descontoValor, setDescontoValor] = useState("");
  const [tipoEntregaVenda, setTipoEntregaVenda] = useState("retirada");
  const [enderecoEntregaVenda, setEnderecoEntregaVenda] = useState("");
  const [dataEntregaVenda, setDataEntregaVenda] = useState(hojeISO());
  const [cepVenda, setCepVenda] = useState("");
  const [numeroVenda, setNumeroVenda] = useState("");
  const [statusCepVenda, setStatusCepVenda] = useState("idle");
  const [enderecoEncontradoVenda, setEnderecoEncontradoVenda] = useState(null);
  const [gerarNotaVenda, setGerarNotaVenda] = useState(true);
  const [etapaVenda, setEtapaVenda] = useState("inicio"); // inicio | cliente | produtos
  const [empresaFiscal, setEmpresaFiscal] = useState(EMPRESA_FISCAL_INICIAL);
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [subFiscal, setSubFiscal] = useState("pendentes");
  const [notaPreview, setNotaPreview] = useState(null);
  const [entregas, setEntregas] = useState(ENTREGAS_INICIAIS);
  const [formEntrega, setFormEntrega] = useState(null);
  const [filtroEntrega, setFiltroEntrega] = useState("todas");
  const [subEstoque, setSubEstoque] = useState("posicao");
  const [filtroFinanceiro, setFiltroFinanceiro] = useState("todos");
  const [menuAberto, setMenuAberto] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const atualizar = () => setIsDesktop(mq.matches);
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => mq.removeEventListener("change", atualizar);
  }, []);

  const clientesFiltrados = useMemo(
    () => clientes.filter((c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) || c.documento.includes(busca)
    ),
    [clientes, busca]
  );

  const fornecedoresFiltrados = useMemo(
    () => fornecedores.filter((f) =>
      f.nome.toLowerCase().includes(busca.toLowerCase()) || f.documento.includes(busca)
    ),
    [fornecedores, busca]
  );

  const fornecedoresPorId = useMemo(
    () => Object.fromEntries(fornecedores.map((f) => [f.id, f])),
    [fornecedores]
  );

  const papeisPorId = useMemo(
    () => Object.fromEntries(papeis.map((p) => [p.id, p])),
    [papeis]
  );
  const usuarioAtual = usuarios.find((u) => u.id === usuarioLogadoId) || usuarios[0];
  const papelAtual = usuarioAtual ? papeisPorId[usuarioAtual.papelId] : null;
  const nivelPermissao = (moduloId) => papelAtual?.permissoes?.[moduloId] || "nenhum";
  const podeVer = (moduloId) => nivelPermissao(moduloId) !== "nenhum";
  const podeEditar = (moduloId) => nivelPermissao(moduloId) === "editar";

  useEffect(() => {
    if (aba !== "inicio" && aba !== "venda" && !podeVer(aba)) {
      setAba("inicio");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioLogadoId]);

  const pedidosFiltrados = useMemo(
    () =>
      [...pedidos]
        .filter((p) => filtroPedido === "todos" || p.status === filtroPedido)
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)),
    [pedidos, filtroPedido]
  );
  const totalPedido = (p) => p.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
  const pedidosPendentesCount = pedidos.filter((p) => p.status === "pendente").length;
  const valorPedidosPendentes = pedidos.filter((p) => p.status === "pendente").reduce((s, p) => s + totalPedido(p), 0);
  const pedidosAtrasados = pedidos.filter((p) => p.status === "pendente" && p.dataPrevista < hojeISO()).length;

  const produtosFiltrados = useMemo(
    () => produtos.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase())),
    [produtos, busca]
  );

  const produtosPorId = useMemo(
    () => Object.fromEntries(produtos.map((p) => [p.id, p])),
    [produtos]
  );

  const clientesPorId = useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c])),
    [clientes]
  );

  const digitosDocVenda = docClienteVenda.replace(/\D/g, "");
  const clienteVendaEncontrado = useMemo(() => {
    if (digitosDocVenda.length !== 11 && digitosDocVenda.length !== 14) return null;
    return clientes.find((c) => c.documento.replace(/\D/g, "") === digitosDocVenda) || null;
  }, [digitosDocVenda, clientes]);
  const clienteVendaNaoEncontrado = (digitosDocVenda.length === 11 || digitosDocVenda.length === 14) && !clienteVendaEncontrado;

  const subtotalCarrinho = carrinho.reduce((s, i) => s + i.quantidade * (produtosPorId[i.produtoId]?.preco || 0), 0);
  const valorDescontoBruto = descontoTipo === "percentual"
    ? subtotalCarrinho * ((parseFloat(descontoValor) || 0) / 100)
    : (parseFloat(descontoValor) || 0);
  const valorDesconto = Math.min(Math.max(valorDescontoBruto, 0), subtotalCarrinho);
  const totalComDesconto = subtotalCarrinho - valorDesconto;

  const movimentacoesFiltradas = useMemo(
    () =>
      [...movimentacoes]
        .filter((m) => (produtosPorId[m.produtoId]?.nome || "").toLowerCase().includes(busca.toLowerCase()))
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id)),
    [movimentacoes, produtosPorId, busca]
  );

  const lancamentosFiltrados = useMemo(
    () =>
      [...lancamentos]
        .filter((l) => filtroFinanceiro === "todos" || (filtroFinanceiro === "receber" ? l.tipo === "receita" : l.tipo === "despesa"))
        .filter((l) => {
          const nomeContraparte = l.tipo === "receita" ? (clientesPorId[l.clienteId]?.nome || "") : l.contraparte;
          return l.descricao.toLowerCase().includes(busca.toLowerCase()) || nomeContraparte.toLowerCase().includes(busca.toLowerCase());
        })
        .sort((a, b) => (a.vencimento < b.vencimento ? 1 : a.vencimento > b.vencimento ? -1 : b.id - a.id)),
    [lancamentos, clientesPorId, busca, filtroFinanceiro]
  );

  const vendasComNota = useMemo(() => new Set(notasFiscais.map((n) => n.vendaId)), [notasFiscais]);
  const vendasPendentesNota = useMemo(
    () => vendas.filter((v) => !vendasComNota.has(v.id)),
    [vendas, vendasComNota]
  );
  const notasComVenda = useMemo(
    () => notasFiscais.map((n) => ({ ...n, venda: vendas.find((v) => v.id === n.vendaId) })),
    [notasFiscais, vendas]
  );
  const integracaoConfigurada = Boolean(empresaFiscal.cnpj && empresaFiscal.provedor && empresaFiscal.certificadoInstalado);

  const entregasFiltradas = useMemo(() => {
    const digitosBusca = busca.replace(/\D/g, "");
    return [...entregas]
      .filter((e) => filtroEntrega === "todas" || e.status === filtroEntrega)
      .filter((e) => {
        if (!busca.trim()) return true;
        const cliente = e.clienteId ? clientesPorId[e.clienteId] : null;
        if (!cliente) return false;
        const nomeMatch = cliente.nome.toLowerCase().includes(busca.toLowerCase());
        const docMatch = digitosBusca && cliente.documento.replace(/\D/g, "").includes(digitosBusca);
        return nomeMatch || docMatch;
      })
      .sort((a, b) => (a.dataPrevista < b.dataPrevista ? -1 : a.dataPrevista > b.dataPrevista ? 1 : 0));
  }, [entregas, filtroEntrega, busca, clientesPorId]);
  const entregasPendentes = entregas.filter((e) => e.status === "pendente").length;
  const entregasEmRota = entregas.filter((e) => e.status === "em_rota").length;
  const entregasAtrasadas = entregas.filter((e) => (e.status === "pendente" || e.status === "em_rota") && e.dataPrevista < hojeISO()).length;
  const entregasHoje = entregas.filter((e) => e.status === "entregue" && e.dataPrevista === hojeISO()).length;

  const produtosEstoqueBaixo = produtos.filter((p) => p.estoque <= p.estoqueMin).length;
  const valorEmEstoque = produtos.reduce((soma, p) => soma + p.preco * p.estoque, 0);
  const movimentacoesHoje = movimentacoes.filter((m) => m.data === hojeISO()).length;

  const aReceber = lancamentos.filter((l) => l.tipo === "receita" && !l.pago).reduce((s, l) => s + l.valor, 0);
  const aPagar = lancamentos.filter((l) => l.tipo === "despesa" && !l.pago).reduce((s, l) => s + l.valor, 0);
  const vencidos = lancamentos.filter((l) => statusLancamento(l) === "vencido").length;
  const saldoMes = lancamentos
    .filter((l) => l.pago && l.dataPagamento && l.dataPagamento.slice(0, 7) === hojeISO().slice(0, 7))
    .reduce((s, l) => s + (l.tipo === "receita" ? l.valor : -l.valor), 0);

  function salvarCliente(dados) {
    setClientes(dados.id ? clientes.map((c) => (c.id === dados.id ? dados : c)) : [...clientes, { ...dados, id: Date.now() }]);
    setFormCliente(null);
    if (aba === "venda" && !dados.id) {
      setDocClienteVenda(dados.documento);
      setEtapaVenda("produtos");
    }
  }

  function salvarFornecedor(dados) {
    setFornecedores(dados.id ? fornecedores.map((f) => (f.id === dados.id ? dados : f)) : [...fornecedores, { ...dados, id: Date.now() }]);
    setFormFornecedor(null);
  }

  function salvarPedido(dados) {
    if (dados.id) {
      setPedidos(pedidos.map((p) => (p.id === dados.id ? dados : p)));
    } else {
      const numero = 5000 + pedidos.length + 1;
      setPedidos([{ ...dados, id: Date.now(), numero, data: hojeISO(), status: "pendente", dataRecebimento: null }, ...pedidos]);
    }
    setFormPedido(null);
  }

  function salvarUsuario(dados) {
    setUsuarios(dados.id ? usuarios.map((u) => (u.id === dados.id ? dados : u)) : [...usuarios, { ...dados, id: Date.now() }]);
    setFormUsuario(null);
  }

  function salvarPapel(dados) {
    setPapeis(dados.id ? papeis.map((p) => (p.id === dados.id ? dados : p)) : [...papeis, { ...dados, id: `papel_${Date.now()}` }]);
    setFormPapel(null);
  }


  function registrarRecebimento(pedido) {
    setProdutos(produtos.map((p) => {
      const item = pedido.itens.find((i) => i.produtoId === p.id);
      return item ? { ...p, estoque: p.estoque + item.quantidade } : p;
    }));

    setMovimentacoes([
      ...pedido.itens.map((i) => ({
        id: Date.now() + i.produtoId,
        produtoId: i.produtoId,
        tipo: "entrada",
        quantidade: i.quantidade,
        motivo: "compra",
        observacao: `Pedido de compra nº ${pedido.numero}`,
        data: hojeISO(),
      })),
      ...movimentacoes,
    ]);

    const fornecedor = fornecedoresPorId[pedido.fornecedorId];
    setLancamentos([
      {
        id: Date.now() + 1,
        tipo: "despesa",
        descricao: `Compra - Pedido nº ${pedido.numero}`,
        valor: totalPedido(pedido),
        vencimento: hojeISO(),
        pago: false,
        dataPagamento: null,
        clienteId: null,
        fornecedorId: pedido.fornecedorId,
        contraparte: fornecedor ? fornecedor.nome : "",
        formaPagamento: "boleto",
        observacao: "",
      },
      ...lancamentos,
    ]);

    setPedidos(pedidos.map((p) => (p.id === pedido.id ? { ...p, status: "recebido", dataRecebimento: hojeISO() } : p)));
  }

  function salvarProduto(dados) {
    setProdutos(dados.id ? produtos.map((p) => (p.id === dados.id ? dados : p)) : [...produtos, { ...dados, id: Date.now() }]);
    setFormProduto(null);
  }

  function salvarMovimentacao(dados) {
    setProdutos(produtos.map((p) => {
      if (p.id !== dados.produtoId) return p;
      const delta = dados.tipo === "entrada" ? dados.quantidade : -dados.quantidade;
      return { ...p, estoque: Math.max(0, p.estoque + delta) };
    }));
    setMovimentacoes([{ ...dados, id: Date.now() }, ...movimentacoes]);
    setFormMovimentacao(null);
  }

  function salvarLancamento(dados) {
    setLancamentos(dados.id ? lancamentos.map((l) => (l.id === dados.id ? dados : l)) : [...lancamentos, { ...dados, id: Date.now() }]);
    setFormLancamento(null);
  }

  function alternarPago(lancamento) {
    setLancamentos(lancamentos.map((l) =>
      l.id === lancamento.id ? { ...l, pago: !l.pago, dataPagamento: !l.pago ? hojeISO() : null } : l
    ));
  }

  function confirmarExclusao() {
    if (!confirmacao) return;
    if (confirmacao.tipo === "cliente") setClientes(clientes.filter((c) => c.id !== confirmacao.id));
    if (confirmacao.tipo === "fornecedor") setFornecedores(fornecedores.filter((f) => f.id !== confirmacao.id));
    if (confirmacao.tipo === "pedido") setPedidos(pedidos.filter((p) => p.id !== confirmacao.id));
    if (confirmacao.tipo === "usuario") setUsuarios(usuarios.filter((u) => u.id !== confirmacao.id));
    if (confirmacao.tipo === "papel") setPapeis(papeis.filter((p) => p.id !== confirmacao.id));
    if (confirmacao.tipo === "produto") setProdutos(produtos.filter((p) => p.id !== confirmacao.id));
    if (confirmacao.tipo === "lancamento") setLancamentos(lancamentos.filter((l) => l.id !== confirmacao.id));
    setConfirmacao(null);
  }

  function adicionarAoCarrinho() {
    const codigo = bipCodigo.trim();
    const qtd = parseInt(bipQuantidade) || 1;
    if (!codigo) {
      setErroBip("Informe ou bipe o código de barras do produto.");
      return;
    }

    const produto = produtos.find((p) => p.codigoBarras === codigo);
    if (!produto) {
      setErroBip("Produto não encontrado para esse código.");
      return;
    }

    const jaNoCarrinho = carrinho.find((i) => i.produtoId === produto.id);
    const qtdAtual = jaNoCarrinho ? jaNoCarrinho.quantidade : 0;
    if (qtdAtual + qtd > produto.estoque) {
      setErroBip(`Estoque insuficiente. Disponível: ${produto.estoque} ${produto.unidade}.`);
      return;
    }

    setCarrinho(
      jaNoCarrinho
        ? carrinho.map((i) => (i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + qtd } : i))
        : [...carrinho, { produtoId: produto.id, quantidade: qtd }]
    );
    setBipCodigo("");
    setBipQuantidade("1");
    setErroBip("");
  }

  function alterarQtdCarrinho(produtoId, novaQtd) {
    const produto = produtosPorId[produtoId];
    if (novaQtd < 1) {
      setCarrinho(carrinho.filter((i) => i.produtoId !== produtoId));
      return;
    }
    if (produto && novaQtd > produto.estoque) return;
    setCarrinho(carrinho.map((i) => (i.produtoId === produtoId ? { ...i, quantidade: novaQtd } : i)));
  }

  function removerDoCarrinho(produtoId) {
    setCarrinho(carrinho.filter((i) => i.produtoId !== produtoId));
  }

  async function onCepVendaChange(valor) {
    const mascarado = valor.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
    setCepVenda(mascarado);
    if (mascarado.replace(/\D/g, "").length === 8) {
      setStatusCepVenda("buscando");
      const resultado = await buscarCep(mascarado);
      if (resultado) {
        setEnderecoEncontradoVenda(resultado);
        setStatusCepVenda("encontrado");
        setEnderecoEntregaVenda(formatarEndereco({ ...resultado, numero: numeroVenda }));
      } else {
        setStatusCepVenda("nao_encontrado");
      }
    } else {
      setStatusCepVenda("idle");
    }
  }

  function onNumeroVendaChange(valor) {
    setNumeroVenda(valor);
    if (enderecoEncontradoVenda) {
      setEnderecoEntregaVenda(formatarEndereco({ ...enderecoEncontradoVenda, numero: valor }));
    }
  }

  function finalizarVenda() {
    if (carrinho.length === 0) return;

    const itens = carrinho.map((i) => {
      const produto = produtosPorId[i.produtoId];
      return { produtoId: i.produtoId, nome: produto.nome, quantidade: i.quantidade, precoUnitario: produto.preco };
    });
    const subtotal = itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
    const desconto = Math.min(Math.max(
      descontoTipo === "percentual" ? subtotal * ((parseFloat(descontoValor) || 0) / 100) : (parseFloat(descontoValor) || 0),
      0
    ), subtotal);
    const total = subtotal - desconto;
    const numero = 1000 + vendas.length + 1;
    const clienteId = clienteVendaEncontrado ? clienteVendaEncontrado.id : null;
    const novaVendaObj = {
      id: Date.now(),
      numero,
      data: hojeISO(),
      clienteId,
      formaPagamento: formaPagamentoVenda,
      itens,
      subtotal,
      desconto: { tipo: descontoTipo, valor: parseFloat(descontoValor) || 0, valorCalculado: desconto },
      total,
      tipoEntrega: tipoEntregaVenda,
      enderecoEntrega: tipoEntregaVenda === "entrega" ? enderecoEntregaVenda : "",
      notaGerada: gerarNotaVenda,
    };

    setProdutos(produtos.map((p) => {
      const item = carrinho.find((i) => i.produtoId === p.id);
      return item ? { ...p, estoque: p.estoque - item.quantidade } : p;
    }));

    setMovimentacoes([
      ...itens.map((i) => ({
        id: Date.now() + i.produtoId,
        produtoId: i.produtoId,
        tipo: "saida",
        quantidade: i.quantidade,
        motivo: "venda",
        observacao: `Venda PDV nº ${numero}`,
        data: hojeISO(),
      })),
      ...movimentacoes,
    ]);

    setLancamentos([
      {
        id: Date.now() + 1,
        tipo: "receita",
        descricao: `Venda PDV nº ${numero}`,
        valor: total,
        vencimento: hojeISO(),
        pago: formaPagamentoVenda !== "boleto",
        dataPagamento: formaPagamentoVenda !== "boleto" ? hojeISO() : null,
        clienteId,
        contraparte: "",
        formaPagamento: formaPagamentoVenda,
        observacao: "",
      },
      ...lancamentos,
    ]);

    if (tipoEntregaVenda === "entrega") {
      setEntregas([
        {
          id: Date.now() + 2,
          vendaId: novaVendaObj.id,
          clienteId,
          endereco: enderecoEntregaVenda,
          itensDescricao: itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", "),
          dataPrevista: dataEntregaVenda,
          motorista: "", veiculo: "", status: "pendente", observacao: `Gerada a partir da venda PDV nº ${numero}`,
        },
        ...entregas,
      ]);
    }

    if (gerarNotaVenda) {
      setNotasFiscais([
        {
          id: Date.now() + 3,
          vendaId: novaVendaObj.id,
          numero: empresaFiscal.proximoNumero,
          serie: empresaFiscal.serieNFe,
          status: "rascunho",
          dataGeracao: hojeISO(),
        },
        ...notasFiscais,
      ]);
      setEmpresaFiscal({ ...empresaFiscal, proximoNumero: empresaFiscal.proximoNumero + 1 });
    }

    setVendas([novaVendaObj, ...vendas]);
    setCupomAtual(novaVendaObj);
    setCarrinho([]);
    setDocClienteVenda("");
    setDescontoTipo("percentual");
    setDescontoValor("");
    setTipoEntregaVenda("retirada");
    setEnderecoEntregaVenda("");
    setDataEntregaVenda(hojeISO());
    setGerarNotaVenda(true);
    setEtapaVenda("inicio");
    setCepVenda("");
    setNumeroVenda("");
    setStatusCepVenda("idle");
    setEnderecoEncontradoVenda(null);
  }


  function salvarConfigFiscal(dados) {
    setEmpresaFiscal(dados);
  }

  function gerarRascunhoNota(venda) {
    const nota = {
      id: Date.now(),
      vendaId: venda.id,
      numero: empresaFiscal.proximoNumero,
      serie: empresaFiscal.serieNFe,
      status: "rascunho",
      dataGeracao: hojeISO(),
    };
    setNotasFiscais([nota, ...notasFiscais]);
    setEmpresaFiscal({ ...empresaFiscal, proximoNumero: empresaFiscal.proximoNumero + 1 });
  }

  function salvarEntrega(dados) {
    setEntregas(dados.id ? entregas.map((e) => (e.id === dados.id ? dados : e)) : [...entregas, { ...dados, id: Date.now(), status: "pendente" }]);
    setFormEntrega(null);
  }

  function avancarStatusEntrega(entrega) {
    const ordem = ["pendente", "em_rota", "entregue"];
    const idx = ordem.indexOf(entrega.status);
    if (idx === -1 || idx === ordem.length - 1) return;
    setEntregas(entregas.map((e) => (e.id === entrega.id ? { ...e, status: ordem[idx + 1] } : e)));
  }

  function cancelarEntrega(id) {
    setEntregas(entregas.map((e) => (e.id === id ? { ...e, status: "cancelada" } : e)));
  }

  return (
    <div className="min-h-screen bg-stone-50 flex font-sans">
      {!isDesktop && menuAberto && (
        <div
          className="fixed inset-0 bg-stone-900/50 z-40"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside
        className={cn(
          "w-64 sm:w-56 bg-stone-900 flex flex-col shrink-0 z-50 transition-transform duration-200",
          isDesktop
            ? "sticky top-0 h-screen"
            : cn("fixed inset-y-0 left-0", menuAberto ? "translate-x-0" : "-translate-x-full")
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-800 flex items-center justify-center">
              <Boxes size={17} className="text-teal-200" />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">ConstruGestão</span>
          </div>
          {!isDesktop && (
            <button
              onClick={() => setMenuAberto(false)}
              className="text-stone-400 hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.filter((item) => item.id === "inicio" || !item.ativo || podeVer(item.id)).map((item) => {
            const Icon = item.icon;
            const ativoAgora = aba === item.id;
            return (
              <button
                key={item.id}
                disabled={!item.ativo}
                onClick={() => { setAba(item.id); setBusca(""); setMenuAberto(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                  !item.ativo && "text-stone-600 cursor-not-allowed",
                  item.ativo && ativoAgora && "bg-teal-800 text-white font-medium",
                  item.ativo && !ativoAgora && "text-stone-300 hover:bg-stone-800 hover:text-white"
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span className="flex-1">{item.label}</span>
                {!item.ativo && <span className="text-[10px] text-stone-600">em breve</span>}
                {item.ativo && item.id !== "inicio" && nivelPermissao(item.id) === "visualizar" && (
                  <Eye size={12} className="text-stone-500 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ position: "relative" }} className="border-t border-stone-800 p-3">
          <button
            onClick={() => setMenuSessaoAberto(!menuSessaoAberto)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-stone-800 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-teal-800 text-teal-100 text-xs font-semibold flex items-center justify-center shrink-0">
              {iniciais(usuarioAtual?.nome || "?")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{usuarioAtual?.nome}</p>
              <p className="text-[11px] text-stone-400 truncate">{papelAtual?.nome}</p>
            </div>
            <ChevronDown size={14} className="text-stone-500 shrink-0" />
          </button>
          {menuSessaoAberto && (
            <div className="absolute bottom-full left-3 right-3 mb-1.5 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide px-3 pt-2.5 pb-1">Trocar sessão (teste)</p>
              {usuarios.filter((u) => u.ativo).map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setUsuarioLogadoId(u.id); setMenuSessaoAberto(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center justify-between gap-2",
                    u.id === usuarioLogadoId ? "text-teal-800 font-medium" : "text-stone-600"
                  )}
                >
                  <span className="truncate">{u.nome}</span>
                  <span className="text-xs text-stone-400 shrink-0">{papeisPorId[u.papelId]?.nome}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-stone-200 px-4 sm:px-8 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {!isDesktop && (
                <button
                  onClick={() => setMenuAberto(true)}
                  className="text-stone-500 hover:text-stone-800 -ml-1 p-1 shrink-0"
                  aria-label="Abrir menu"
                >
                  <Menu size={22} />
                </button>
              )}
              <div className="min-w-0">
                {aba !== "inicio" && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
                    <span>Cadastros</span>
                    <ChevronRight size={12} />
                    <span className="text-stone-600 font-medium">{TITULOS_ABA[aba]}</span>
                  </div>
                )}
                <h1 className="text-lg sm:text-xl font-semibold text-stone-900 truncate">
                  {TITULOS_ABA[aba]}
                </h1>
              </div>
            </div>

            {isDesktop && aba !== "inicio" && aba !== "venda" && aba !== "fiscal" && (
              <div className="flex items-center gap-3 shrink-0">
                <div style={{ position: "relative", width: "260px" }}>
                  <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder={
                      aba === "clientes" ? "Buscar por nome ou documento..." :
                      aba === "fornecedores" ? "Buscar por nome ou documento..." :
                      aba === "financeiro" ? "Buscar por descrição..." :
                      aba === "entregas" ? "Buscar cliente por CPF ou CNPJ..." :
                      aba === "compras" ? "Buscar por fornecedor..." :
                      "Buscar produto..."
                    }
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white transition-shadow"
                  />
                </div>
                {podeEditar(aba) && (aba === "estoque" ? (
                  <button
                    onClick={() => setFormMovimentacao({})}
                    className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    <Plus size={16} /> Nova
                  </button>
                ) : aba === "financeiro" ? (
                  <button
                    onClick={() => setFormLancamento({})}
                    className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    <Plus size={16} /> Novo
                  </button>
                ) : aba === "entregas" ? (
                  <button
                    onClick={() => setFormEntrega({})}
                    className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    <Plus size={16} /> Nova
                  </button>
                ) : aba === "compras" ? (
                  <button
                    onClick={() => setFormPedido({})}
                    className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    <Plus size={16} /> Novo
                  </button>
                ) : (
                  <button
                    onClick={() => (aba === "clientes" ? setFormCliente({}) : aba === "fornecedores" ? setFormFornecedor({}) : setFormProduto({}))}
                    className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  >
                    <Plus size={16} /> Novo
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <main className="px-4 sm:px-8 py-5 sm:py-6 max-w-6xl">
          {aba === "inicio" && (
            <div className="space-y-6">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem" }}>
                <KpiCard label="Clientes cadastrados" valor={clientes.length} icon={Users} tom="bg-teal-50 text-teal-700" />
                <KpiCard label="Produtos cadastrados" valor={produtos.length} icon={Package} tom="bg-teal-50 text-teal-700" />
                <KpiCard label="Itens com estoque baixo" valor={produtosEstoqueBaixo} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
                <KpiCard label="Valor total em estoque" valor={moeda(valorEmEstoque)} icon={Boxes} tom="bg-amber-50 text-amber-700" />
                <KpiCard
                  label="Saldo do mês"
                  valor={moeda(saldoMes)}
                  icon={Landmark}
                  tom={saldoMes >= 0 ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-600"}
                />
                <KpiCard label="A receber" valor={moeda(aReceber)} icon={TrendingUp} tom="bg-emerald-50 text-emerald-700" />
                <KpiCard label="A pagar" valor={moeda(aPagar)} icon={TrendingDown} tom="bg-amber-50 text-amber-700" />
                <KpiCard label="Lançamentos vencidos" valor={vencidos} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
              </div>

              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Ações rápidas</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem" }}>
                  {[
                    { label: "Nova venda", icon: ScanLine, onClick: () => setAba("venda") },
                    { label: "Novo cliente", icon: Users, onClick: () => { setAba("clientes"); setFormCliente({}); } },
                    { label: "Novo fornecedor", icon: Factory, onClick: () => { setAba("fornecedores"); setFormFornecedor({}); } },
                    { label: "Novo pedido", icon: PackageOpen, onClick: () => { setAba("compras"); setFormPedido({}); } },
                    { label: "Novo produto", icon: Package, onClick: () => { setAba("produtos"); setFormProduto({}); } },
                    { label: "Movimentar estoque", icon: ArrowRightLeft, onClick: () => { setAba("estoque"); setFormMovimentacao({}); } },
                    { label: "Novo lançamento", icon: Wallet, onClick: () => { setAba("financeiro"); setFormLancamento({}); } },
                  ].map((a) => (
                    <button
                      key={a.label}
                      onClick={a.onClick}
                      className="bg-white border border-stone-200 rounded-xl px-4 py-4 flex flex-col items-center gap-2 text-center hover:border-teal-700/40 hover:bg-teal-50/30 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center">
                        <a.icon size={17} />
                      </div>
                      <span className="text-xs font-medium text-stone-700">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                    <p className="font-semibold text-stone-800 text-sm">Contas a vencer</p>
                    <button
                      onClick={() => setAba("financeiro")}
                      className="text-xs text-teal-800 font-medium flex items-center gap-1 hover:underline"
                    >
                      Ver tudo <ArrowRight size={12} />
                    </button>
                  </div>
                  {lancamentos.filter((l) => !l.pago).length === 0 ? (
                    <p className="text-sm text-stone-400 px-5 py-6 text-center">Nenhuma conta pendente.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {[...lancamentos]
                        .filter((l) => !l.pago)
                        .sort((a, b) => (a.vencimento > b.vencimento ? 1 : -1))
                        .slice(0, 5)
                        .map((l) => {
                          const status = statusLancamento(l);
                          return (
                            <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-stone-800 truncate">{l.descricao}</p>
                                <p className="text-xs text-stone-400">{formatarData(l.vencimento)}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={cn("text-sm font-medium tabular-nums", l.tipo === "receita" ? "text-emerald-700" : "text-stone-700")}>
                                  {moeda(l.valor)}
                                </span>
                                <StatusChip status={status} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                    <p className="font-semibold text-stone-800 text-sm">Estoque baixo</p>
                    <button
                      onClick={() => { setAba("estoque"); setSubEstoque("posicao"); }}
                      className="text-xs text-teal-800 font-medium flex items-center gap-1 hover:underline"
                    >
                      Ver tudo <ArrowRight size={12} />
                    </button>
                  </div>
                  {produtos.filter((p) => p.estoque <= p.estoqueMin).length === 0 ? (
                    <p className="text-sm text-stone-400 px-5 py-6 text-center">Nenhum item abaixo do mínimo.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {produtos.filter((p) => p.estoque <= p.estoqueMin).slice(0, 5).map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{p.nome}</p>
                            <div className="mt-1"><CategoriaBadge categoriaId={p.categoria} /></div>
                          </div>
                          <span className="text-sm font-medium text-red-600 tabular-nums shrink-0">
                            {p.estoque} {p.unidade}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {aba === "produtos" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Produtos cadastrados" valor={produtos.length} icon={Package} tom="bg-teal-50 text-teal-700" />
              <KpiCard label="Estoque baixo" valor={produtosEstoqueBaixo} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
              <KpiCard label="Valor total em estoque" valor={moeda(valorEmEstoque)} icon={Wallet} tom="bg-amber-50 text-amber-700" />
            </div>
          )}
          {aba === "clientes" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Clientes cadastrados" valor={clientes.length} icon={Users} tom="bg-teal-50 text-teal-700" />
              <KpiCard label="Pessoas jurídicas" valor={clientes.filter((c) => c.tipo === "PJ").length} icon={Building2} tom="bg-slate-50 text-slate-700" />
              <KpiCard label="Pessoas físicas" valor={clientes.filter((c) => c.tipo === "PF").length} icon={Users} tom="bg-amber-50 text-amber-700" />
            </div>
          )}
          {aba === "fornecedores" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Fornecedores cadastrados" valor={fornecedores.length} icon={Factory} tom="bg-teal-50 text-teal-700" />
              <KpiCard label="Pessoas jurídicas" valor={fornecedores.filter((f) => f.tipo === "PJ").length} icon={Building2} tom="bg-slate-50 text-slate-700" />
              <KpiCard label="Pessoas físicas" valor={fornecedores.filter((f) => f.tipo === "PF").length} icon={Users} tom="bg-amber-50 text-amber-700" />
            </div>
          )}
          {aba === "estoque" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Itens com estoque baixo" valor={produtosEstoqueBaixo} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
              <KpiCard label="Valor total em estoque" valor={moeda(valorEmEstoque)} icon={Wallet} tom="bg-amber-50 text-amber-700" />
              <KpiCard label="Movimentações hoje" valor={movimentacoesHoje} icon={ArrowRightLeft} tom="bg-teal-50 text-teal-700" />
            </div>
          )}

          {aba === "estoque" && (
            <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-xs mb-4">
              {[
                { id: "posicao", label: "Posição atual", icon: ClipboardList },
                { id: "historico", label: "Histórico", icon: History },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubEstoque(s.id)}
                  className={cn(
                    "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                    subEstoque === s.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                  )}
                >
                  <s.icon size={14} /> {s.label}
                </button>
              ))}
            </div>
          )}

          {aba === "financeiro" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard
                label="Saldo do mês"
                valor={moeda(saldoMes)}
                icon={Landmark}
                tom={saldoMes >= 0 ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-600"}
              />
              <KpiCard label="A receber" valor={moeda(aReceber)} icon={TrendingUp} tom="bg-emerald-50 text-emerald-700" />
              <KpiCard label="A pagar" valor={moeda(aPagar)} icon={TrendingDown} tom="bg-amber-50 text-amber-700" />
              <KpiCard label="Lançamentos vencidos" valor={vencidos} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
            </div>
          )}

          {aba === "financeiro" && (
            <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-md mb-4">
              {[
                { id: "todos", label: "Todos" },
                { id: "receber", label: "A receber" },
                { id: "pagar", label: "A pagar" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltroFinanceiro(f.id)}
                  className={cn(
                    "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                    filtroFinanceiro === f.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {aba === "entregas" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Pendentes" valor={entregasPendentes} icon={FileClock} tom="bg-amber-50 text-amber-700" />
              <KpiCard label="Em rota" valor={entregasEmRota} icon={Navigation} tom="bg-sky-50 text-sky-700" />
              <KpiCard label="Atrasadas" valor={entregasAtrasadas} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
              <KpiCard label="Entregues hoje" valor={entregasHoje} icon={PackageCheck} tom="bg-emerald-50 text-emerald-700" />
            </div>
          )}

          {aba === "entregas" && (
            <div className="flex gap-2 p-1 bg-stone-100 rounded-lg overflow-x-auto mb-4">
              {[{ id: "todas", label: "Todas" }, ...STATUS_ENTREGA].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltroEntrega(f.id)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                    filtroEntrega === f.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {aba === "compras" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <KpiCard label="Pedidos pendentes" valor={pedidosPendentesCount} icon={PackageOpen} tom="bg-amber-50 text-amber-700" />
              <KpiCard label="Valor pendente" valor={moeda(valorPedidosPendentes)} icon={Wallet} tom="bg-teal-50 text-teal-700" />
              <KpiCard label="Atrasados" valor={pedidosAtrasados} icon={AlertTriangle} tom="bg-red-50 text-red-600" />
            </div>
          )}

          {aba === "compras" && (
            <div className="flex gap-2 p-1 bg-stone-100 rounded-lg overflow-x-auto mb-4">
              {[
                { id: "todos", label: "Todos" },
                { id: "pendente", label: "Pendentes" },
                { id: "recebido", label: "Recebidos" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltroPedido(f.id)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                    filtroPedido === f.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {!isDesktop && aba !== "inicio" && aba !== "venda" && aba !== "fiscal" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div style={{ position: "relative" }} className="flex-1 sm:max-w-sm">
                <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder={
                    aba === "clientes" ? "Buscar por nome ou documento..." :
                      aba === "fornecedores" ? "Buscar por nome ou documento..." :
                    aba === "financeiro" ? "Buscar por descrição ou cliente/fornecedor..." :
                    aba === "entregas" ? "Buscar cliente por CPF ou CNPJ..." :
                    aba === "compras" ? "Buscar por fornecedor..." :
                    "Buscar produto..."
                  }
                  className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white transition-shadow"
                />
              </div>
              {podeEditar(aba) && (aba === "estoque" ? (
                <button
                  onClick={() => setFormMovimentacao({})}
                  className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full sm:w-auto"
                >
                  <Plus size={16} /> Nova
                </button>
              ) : aba === "financeiro" ? (
                <button
                  onClick={() => setFormLancamento({})}
                  className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full sm:w-auto"
                >
                  <Plus size={16} /> Novo
                </button>
              ) : aba === "entregas" ? (
                <button
                  onClick={() => setFormEntrega({})}
                  className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full sm:w-auto"
                >
                  <Plus size={16} /> Nova
                </button>
              ) : aba === "compras" ? (
                <button
                  onClick={() => setFormPedido({})}
                  className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full sm:w-auto"
                >
                  <Plus size={16} /> Novo
                </button>
              ) : (
                <button
                  onClick={() => (aba === "clientes" ? setFormCliente({}) : aba === "fornecedores" ? setFormFornecedor({}) : setFormProduto({}))}
                  className="flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors w-full sm:w-auto"
                >
                  <Plus size={16} /> Novo
                </button>
              ))}
            </div>
          )}

          {aba === "venda" && etapaVenda === "inicio" && (
            <div className="max-w-md mx-auto bg-white rounded-xl border border-stone-200 p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
                <ScanLine size={24} className="text-teal-700" />
              </div>
              <h2 className="text-lg font-semibold text-stone-900 mb-1.5">Nova venda</h2>
              <p className="text-sm text-stone-500 mb-6">Identifique o cliente para começar a venda.</p>
              <button
                onClick={() => setEtapaVenda("cliente")}
                className="w-full flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
              >
                <Plus size={16} /> Iniciar venda
              </button>
            </div>
          )}

          {aba === "venda" && etapaVenda === "cliente" && (
            <div className="max-w-md mx-auto bg-white rounded-xl border border-stone-200 p-6 space-y-4">
              <p className="text-xs font-semibold text-teal-800">Cliente</p>
              <Campo label="CPF ou CNPJ">
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                  <input
                    autoFocus
                    value={docClienteVenda}
                    onChange={(e) => setDocClienteVenda(e.target.value)}
                    className={cn(inputClasses, "pl-8")}
                    placeholder="Digite o CPF ou CNPJ"
                    inputMode="numeric"
                    onKeyDown={(e) => { if (e.key === "Enter" && clienteVendaEncontrado) setEtapaVenda("produtos"); }}
                  />
                </div>

                {clienteVendaEncontrado ? (
                  <div className="flex items-center justify-between gap-2 mt-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span className="text-sm text-emerald-800 truncate">{clienteVendaEncontrado.nome}</span>
                    </div>
                    <button
                      onClick={() => setDocClienteVenda("")}
                      className="text-emerald-700 hover:text-emerald-900 shrink-0"
                      aria-label="Remover cliente"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : clienteVendaNaoEncontrado ? (
                  <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                    <p className="text-sm text-amber-800 mb-2">Cliente não encontrado.</p>
                    <button
                      onClick={() => setFormCliente({
                        tipo: digitosDocVenda.length === 14 ? "PJ" : "PF",
                        documento: docClienteVenda,
                      })}
                      className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus size={14} /> Cadastrar cliente agora
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 mt-1.5">Deixe em branco para consumidor não identificado.</p>
                )}
              </Campo>

              <div className="pt-2">
                {clienteVendaEncontrado ? (
                  <button
                    onClick={() => setEtapaVenda("produtos")}
                    className="w-full flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    onClick={() => { setDocClienteVenda(""); setEtapaVenda("produtos"); }}
                    className="w-full text-sm text-stone-500 hover:text-stone-700 py-2"
                  >
                    Continuar sem identificar cliente
                  </button>
                )}
              </div>
            </div>
          )}

          {aba === "venda" && etapaVenda === "produtos" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5">
                  <p className="text-xs font-semibold text-teal-800 mb-3">1. Produtos <span className="text-stone-400 font-normal normal-case">— bipe ou digite o código, o estoque é validado automaticamente</span></p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div style={{ position: "relative" }} className="flex-1">
                      <ScanLine size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} className="text-stone-400" />
                      <input
                        value={bipCodigo}
                        onChange={(e) => { setBipCodigo(e.target.value); setErroBip(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") adicionarAoCarrinho(); }}
                        placeholder="Bipe ou digite o código de barras"
                        className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-shadow"
                      />
                    </div>
                    <div className="flex gap-3">
                      <input
                        value={bipQuantidade}
                        onChange={(e) => setBipQuantidade(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => { if (e.key === "Enter") adicionarAoCarrinho(); }}
                        placeholder="Qtd"
                        inputMode="numeric"
                        style={{ width: "4.5rem" }}
                        className="shrink-0 px-3 py-2.5 border border-stone-300 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 transition-shadow"
                      />
                      <button
                        onClick={adicionarAoCarrinho}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                      >
                        <Plus size={16} /> Adicionar
                      </button>
                    </div>
                  </div>
                  {erroBip && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">{erroBip}</p>
                  )}
                  <p className="text-xs text-stone-400 mt-3">
                    Códigos de exemplo: {produtos.slice(0, 3).map((p) => p.codigoBarras).join(" · ")}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  {carrinho.length === 0 ? (
                    <EmptyState icon={ShoppingCart} title="Carrinho vazio" subtitle="Bipe o código de um produto para começar a venda." />
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {carrinho.map((item) => {
                        const produto = produtosPorId[item.produtoId];
                        if (!produto) return null;
                        return (
                          <div key={item.produtoId} className="flex items-center gap-3 p-4">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-stone-800 truncate">{produto.nome}</p>
                              <p className="text-xs text-stone-400">{moeda(produto.preco)} / {produto.unidade}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => alterarQtdCarrinho(item.produtoId, item.quantidade - 1)}
                                className="w-7 h-7 rounded-md border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50"
                                aria-label="Diminuir"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantidade}</span>
                              <button
                                onClick={() => alterarQtdCarrinho(item.produtoId, item.quantidade + 1)}
                                className="w-7 h-7 rounded-md border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 disabled:opacity-30"
                                disabled={item.quantidade >= produto.estoque}
                                aria-label="Aumentar"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                            <span className="w-24 text-right font-medium text-stone-800 tabular-nums shrink-0">
                              {moeda(item.quantidade * produto.preco)}
                            </span>
                            <button
                              onClick={() => removerDoCarrinho(item.produtoId)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:text-red-600 shrink-0"
                              aria-label="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 space-y-5 lg:sticky lg:top-6">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Resumo da venda</p>

                <div>
                  <p className="text-xs font-semibold text-teal-800 mb-2">2. Cliente</p>
                  <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-100 rounded-lg px-3 py-2.5">
                    <div className="min-w-0 flex items-center gap-1.5">
                      {clienteVendaEncontrado ? (
                        <>
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <span className="text-sm text-stone-800 truncate">{clienteVendaEncontrado.nome}</span>
                        </>
                      ) : (
                        <span className="text-sm text-stone-500">Consumidor não identificado</span>
                      )}
                    </div>
                    <button
                      onClick={() => setEtapaVenda("cliente")}
                      className="text-xs font-medium text-teal-700 hover:text-teal-900 shrink-0"
                    >
                      Trocar
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100">
                  <p className="text-xs font-semibold text-teal-800 mb-2">3. Desconto</p>
                  <div className="flex gap-2">
                    <div className="flex gap-1 p-1 bg-stone-100 rounded-lg shrink-0">
                      {[{ id: "percentual", label: "%" }, { id: "valor", label: "R$" }].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setDescontoTipo(t.id)}
                          className={cn(
                            "w-10 py-1.5 rounded-md text-xs font-medium transition-colors",
                            descontoTipo === t.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={descontoValor}
                      onChange={(e) => setDescontoValor(e.target.value)}
                      placeholder="0"
                      className={inputClasses}
                    />
                  </div>
                  {valorDesconto > 0 && (
                    <p className="text-xs text-emerald-700 mt-1.5">Desconto de {moeda(valorDesconto)} aplicado</p>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100">
                  <p className="text-xs font-semibold text-teal-800 mb-2">4. Entrega ou retirada</p>
                  <div className="flex gap-2 p-1 bg-stone-100 rounded-lg mb-3">
                    <button
                      onClick={() => setTipoEntregaVenda("retirada")}
                      className={cn(
                        "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                        tipoEntregaVenda === "retirada" ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                      )}
                    >
                      Retirada no balcão
                    </button>
                    <button
                      onClick={() => {
                        setTipoEntregaVenda("entrega");
                        if (!enderecoEntregaVenda && clienteVendaEncontrado) {
                          setEnderecoEntregaVenda(formatarEndereco(clienteVendaEncontrado.endereco));
                        }
                      }}
                      className={cn(
                        "flex-1 py-2 rounded-md text-sm font-medium transition-colors",
                        tipoEntregaVenda === "entrega" ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                      )}
                    >
                      Entrega
                    </button>
                  </div>
                  {tipoEntregaVenda === "entrega" && (
                    <div className="space-y-3">
                      <Campo label="Buscar endereço por CEP (opcional)">
                        <div className="flex gap-2">
                          <div style={{ position: "relative" }} className="flex-1">
                            <input
                              value={cepVenda}
                              onChange={(e) => onCepVendaChange(e.target.value)}
                              className={inputClasses}
                              placeholder="00000-000"
                              inputMode="numeric"
                            />
                            <div style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)" }}>
                              {statusCepVenda === "buscando" && <Loader2 size={14} className="text-stone-400 animate-spin" />}
                              {statusCepVenda === "encontrado" && <CheckCircle2 size={14} className="text-emerald-600" />}
                            </div>
                          </div>
                          <input
                            value={numeroVenda}
                            onChange={(e) => onNumeroVendaChange(e.target.value)}
                            className={inputClasses}
                            placeholder="Número"
                            style={{ width: "100px" }}
                          />
                        </div>
                        {statusCepVenda === "nao_encontrado" && (
                          <p className="text-xs text-red-600 mt-1.5">CEP não encontrado. Preencha abaixo manualmente.</p>
                        )}
                      </Campo>
                      <Campo label="Endereço de entrega">
                        <input
                          value={enderecoEntregaVenda}
                          onChange={(e) => setEnderecoEntregaVenda(e.target.value)}
                          className={inputClasses}
                          placeholder="Rua, número - Bairro, Cidade/UF"
                        />
                      </Campo>
                      <Campo label="Data prevista">
                        <input
                          type="date"
                          value={dataEntregaVenda}
                          onChange={(e) => setDataEntregaVenda(e.target.value)}
                          className={inputClasses}
                        />
                      </Campo>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100">
                  <p className="text-xs font-semibold text-teal-800 mb-2">5. Pagamento</p>
                  <Campo label="Forma de pagamento">
                    <select
                      value={formaPagamentoVenda}
                      onChange={(e) => setFormaPagamentoVenda(e.target.value)}
                      className={cn(inputClasses, "bg-white")}
                    >
                      {FORMAS_PAGAMENTO.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  </Campo>
                </div>

                <div className="pt-4 border-t border-stone-100">
                  <p className="text-xs font-semibold text-teal-800 mb-2">6. Documento fiscal</p>
                  <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gerarNotaVenda}
                      onChange={(e) => setGerarNotaVenda(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-300 text-teal-800 focus:ring-teal-700/30"
                    />
                    Gerar rascunho de NF-e ao finalizar
                  </label>
                  <p className="text-xs text-stone-400 mt-1">Sem validade fiscal — fica disponível em Fiscal → Rascunhos.</p>
                </div>

                <div className="pt-4 border-t border-stone-200 space-y-1.5">
                  <div className="flex items-center justify-between text-sm text-stone-500">
                    <span>Itens</span>
                    <span className="tabular-nums">{carrinho.reduce((s, i) => s + i.quantidade, 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-stone-500">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{moeda(subtotalCarrinho)}</span>
                  </div>
                  {valorDesconto > 0 && (
                    <div className="flex items-center justify-between text-sm text-emerald-700">
                      <span>Desconto</span>
                      <span className="tabular-nums">− {moeda(valorDesconto)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-semibold text-stone-900">Total</span>
                    <span className="text-xl font-bold text-teal-800 tabular-nums">{moeda(totalComDesconto)}</span>
                  </div>
                </div>

                <button
                  onClick={finalizarVenda}
                  disabled={carrinho.length === 0 || (tipoEntregaVenda === "entrega" && !enderecoEntregaVenda.trim())}
                  className="w-full flex items-center justify-center gap-1.5 bg-teal-800 hover:bg-teal-900 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Receipt size={16} /> Finalizar venda
                </button>
              </div>
            </div>
          )}

          {aba === "clientes" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {clientesFiltrados.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nenhum cliente encontrado"
                  subtitle="Cadastre o primeiro cliente para começar a usar o sistema."
                  acao="Novo"
                  onAcao={() => setFormCliente({})}
                />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Cliente</th>
                        <th className="text-left px-5 py-3 font-medium">Documento</th>
                        <th className="text-left px-5 py-3 font-medium">Contato</th>
                        <th className="text-left px-5 py-3 font-medium">Endereço</th>
                        <th className="px-5 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {clientesFiltrados.map((c) => (
                        <tr key={c.id} className="group hover:bg-stone-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                                {iniciais(c.nome)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-stone-800 truncate">{c.nome}</p>
                                <p className="text-xs text-stone-400">{c.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">{c.documento}</td>
                          <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-stone-400" />{c.telefone}</span>
                          </td>
                          <td className="px-5 py-3.5 text-stone-600">
                            <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-stone-400 shrink-0" />{formatarEndereco(c.endereco)}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setFormCliente(c)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setConfirmacao({ tipo: "cliente", id: c.id, nome: c.nome })} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-red-600 hover:border hover:border-stone-200">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {clientesFiltrados.map((c) => (
                      <div key={c.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                            {iniciais(c.nome)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-stone-800 truncate">{c.nome}</p>
                            <p className="text-xs text-stone-400 mb-2">{c.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"} · {c.documento}</p>
                            <p className="text-xs text-stone-600 flex items-center gap-1.5 mb-1">
                              <Phone size={12} className="text-stone-400 shrink-0" />{c.telefone}
                            </p>
                            <p className="text-xs text-stone-600 flex items-start gap-1.5">
                              <MapPin size={12} className="text-stone-400 shrink-0 mt-0.5" />{formatarEndereco(c.endereco)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => setFormCliente(c)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setConfirmacao({ tipo: "cliente", id: c.id, nome: c.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "fornecedores" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {fornecedoresFiltrados.length === 0 ? (
                <EmptyState
                  icon={Factory}
                  title="Nenhum fornecedor encontrado"
                  subtitle="Cadastre o primeiro fornecedor para começar a usar o sistema."
                  acao="Novo"
                  onAcao={() => setFormFornecedor({})}
                />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Fornecedor</th>
                        <th className="text-left px-5 py-3 font-medium">Documento</th>
                        <th className="text-left px-5 py-3 font-medium">Fornece</th>
                        <th className="text-left px-5 py-3 font-medium">Contato</th>
                        <th className="text-left px-5 py-3 font-medium">Pagamento</th>
                        <th className="px-5 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {fornecedoresFiltrados.map((f) => (
                        <tr key={f.id} className="group hover:bg-stone-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                                {iniciais(f.nome)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-stone-800 truncate">{f.nome}</p>
                                <p className="text-xs text-stone-400">{f.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">{f.documento}</td>
                          <td className="px-5 py-3.5"><CategoriaBadge categoriaId={f.categoria} /></td>
                          <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-stone-400" />{f.telefone}</span>
                          </td>
                          <td className="px-5 py-3.5 text-stone-500">{f.condicaoPagamento || "—"}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setFormFornecedor(f)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setConfirmacao({ tipo: "fornecedor", id: f.id, nome: f.nome })} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-red-600 hover:border hover:border-stone-200">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {fornecedoresFiltrados.map((f) => (
                      <div key={f.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                            {iniciais(f.nome)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-stone-800 truncate">{f.nome}</p>
                            <p className="text-xs text-stone-400 mb-2">{f.tipo === "PF" ? "Pessoa física" : "Pessoa jurídica"} · {f.documento}</p>
                            <div className="mb-2"><CategoriaBadge categoriaId={f.categoria} /></div>
                            <p className="text-xs text-stone-600 flex items-center gap-1.5 mb-1">
                              <Phone size={12} className="text-stone-400 shrink-0" />{f.telefone}
                            </p>
                            {f.condicaoPagamento && (
                              <p className="text-xs text-stone-400">Pagamento: {f.condicaoPagamento}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button onClick={() => setFormFornecedor(f)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setConfirmacao({ tipo: "fornecedor", id: f.id, nome: f.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "produtos" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {produtosFiltrados.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Nenhum produto encontrado"
                  subtitle="Cadastre o primeiro produto para começar a controlar o estoque."
                  acao="Novo"
                  onAcao={() => setFormProduto({})}
                />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Produto</th>
                        <th className="text-left px-5 py-3 font-medium">Categoria</th>
                        <th className="text-left px-5 py-3 font-medium">Fornecedor</th>
                        <th className="text-left px-5 py-3 font-medium">Unidade</th>
                        <th className="text-left px-5 py-3 font-medium">Preço</th>
                        <th className="text-left px-5 py-3 font-medium">Estoque</th>
                        <th className="px-5 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {produtosFiltrados.map((p) => (
                        <tr key={p.id} className="group hover:bg-stone-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-stone-800">{p.nome}</td>
                          <td className="px-5 py-3.5"><CategoriaBadge categoriaId={p.categoria} /></td>
                          <td className="px-5 py-3.5 text-stone-500">
                            {p.fornecedorId && fornecedoresPorId[p.fornecedorId] ? fornecedoresPorId[p.fornecedorId].nome : "—"}
                          </td>
                          <td className="px-5 py-3.5 text-stone-600">
                            <span className="inline-flex items-center gap-1.5"><Ruler size={13} className="text-stone-400" />{p.unidade}</span>
                          </td>
                          <td className="px-5 py-3.5 text-stone-700 tabular-nums">{moeda(p.preco)}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={cn("font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-700")}>
                                {p.estoque}
                              </span>
                              {p.estoque <= p.estoqueMin && (
                                <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                                  <AlertTriangle size={11} /> Baixo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setFormProduto(p)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setConfirmacao({ tipo: "produto", id: p.id, nome: p.nome })} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-red-600 hover:border hover:border-stone-200">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {produtosFiltrados.map((p) => (
                      <div key={p.id} className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-medium text-stone-800 min-w-0">{p.nome}</p>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => setFormProduto(p)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setConfirmacao({ tipo: "produto", id: p.id, nome: p.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="mb-2"><CategoriaBadge categoriaId={p.categoria} /></div>
                        {p.fornecedorId && fornecedoresPorId[p.fornecedorId] && (
                          <p className="text-xs text-stone-400 mb-2 flex items-center gap-1"><Factory size={11} />{fornecedoresPorId[p.fornecedorId].nome}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-stone-600">
                          <span className="inline-flex items-center gap-1.5"><Ruler size={12} className="text-stone-400" />{p.unidade}</span>
                          <span className="tabular-nums font-medium text-stone-700">{moeda(p.preco)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn("text-xs font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-500")}>
                            Estoque: {p.estoque}
                          </span>
                          {p.estoque <= p.estoqueMin && (
                            <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                              <AlertTriangle size={11} /> Baixo
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "estoque" && subEstoque === "posicao" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {produtosFiltrados.length === 0 ? (
                <EmptyState icon={Warehouse} title="Nenhum produto encontrado" subtitle="Cadastre produtos para começar a controlar o estoque." />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Produto</th>
                        <th className="text-left px-5 py-3 font-medium">Categoria</th>
                        <th className="text-left px-5 py-3 font-medium">Estoque</th>
                        <th className="text-left px-5 py-3 font-medium">Nível</th>
                        <th className="text-left px-5 py-3 font-medium">Mínimo</th>
                        <th className="px-5 py-3 w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {produtosFiltrados.map((p) => (
                        <tr key={p.id} className="group hover:bg-stone-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-stone-800">{p.nome}</td>
                          <td className="px-5 py-3.5"><CategoriaBadge categoriaId={p.categoria} /></td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={cn("font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-700")}>
                                {p.estoque} {p.unidade}
                              </span>
                              {p.estoque <= p.estoqueMin && (
                                <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                                  <AlertTriangle size={11} /> Baixo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5"><BarraEstoque produto={p} /></td>
                          <td className="px-5 py-3.5 text-stone-500 tabular-nums">{p.estoqueMin} {p.unidade}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setFormMovimentacao({ produtoId: p.id })}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200"
                                aria-label="Movimentar"
                              >
                                <ArrowRightLeft size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {produtosFiltrados.map((p) => (
                      <div key={p.id} className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-medium text-stone-800 min-w-0">{p.nome}</p>
                          <button
                            onClick={() => setFormMovimentacao({ produtoId: p.id })}
                            className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 shrink-0"
                            aria-label="Movimentar"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                        </div>
                        <div className="mb-2"><CategoriaBadge categoriaId={p.categoria} /></div>
                        <div className="flex items-center justify-between text-xs text-stone-600 mb-2">
                          <span className={cn("font-medium tabular-nums", p.estoque <= p.estoqueMin ? "text-red-600" : "text-stone-700")}>
                            {p.estoque} {p.unidade}
                          </span>
                          <span className="text-stone-400">mínimo: {p.estoqueMin} {p.unidade}</span>
                        </div>
                        <BarraEstoque produto={p} />
                        {p.estoque <= p.estoqueMin && (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full mt-2">
                            <AlertTriangle size={11} /> Estoque baixo
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "estoque" && subEstoque === "historico" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {movimentacoesFiltradas.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Nenhuma movimentação encontrada"
                  subtitle="Registre entradas e saídas para acompanhar o histórico do estoque."
                  acao="Nova"
                  onAcao={() => setFormMovimentacao({})}
                />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Data</th>
                        <th className="text-left px-5 py-3 font-medium">Produto</th>
                        <th className="text-left px-5 py-3 font-medium">Tipo</th>
                        <th className="text-left px-5 py-3 font-medium">Quantidade</th>
                        <th className="text-left px-5 py-3 font-medium">Motivo</th>
                        <th className="text-left px-5 py-3 font-medium">Observação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {movimentacoesFiltradas.map((m) => {
                        const produto = produtosPorId[m.produtoId];
                        const motivo = (m.tipo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA).find((mo) => mo.id === m.motivo);
                        return (
                          <tr key={m.id} className="hover:bg-stone-50/70 transition-colors">
                            <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">{formatarData(m.data)}</td>
                            <td className="px-5 py-3.5 font-medium text-stone-800">{produto?.nome || "—"}</td>
                            <td className="px-5 py-3.5"><TipoMovimentoChip tipo={m.tipo} /></td>
                            <td className="px-5 py-3.5 tabular-nums">
                              <span className={cn("font-medium", m.tipo === "entrada" ? "text-emerald-700" : "text-red-600")}>
                                {m.tipo === "entrada" ? "+" : "-"}{m.quantidade} {produto?.unidade}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-stone-600">{motivo?.label || "—"}</td>
                            <td className="px-5 py-3.5 text-stone-400 max-w-[220px] truncate">{m.observacao || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {movimentacoesFiltradas.map((m) => {
                      const produto = produtosPorId[m.produtoId];
                      const motivo = (m.tipo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA).find((mo) => mo.id === m.motivo);
                      return (
                        <div key={m.id} className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <p className="font-medium text-stone-800 min-w-0">{produto?.nome || "—"}</p>
                            <TipoMovimentoChip tipo={m.tipo} />
                          </div>
                          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                            <span>{formatarData(m.data)}</span>
                            <span className={cn("font-medium tabular-nums", m.tipo === "entrada" ? "text-emerald-700" : "text-red-600")}>
                              {m.tipo === "entrada" ? "+" : "-"}{m.quantidade} {produto?.unidade}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500">{motivo?.label}</p>
                          {m.observacao && <p className="text-xs text-stone-400 mt-1">{m.observacao}</p>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "financeiro" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {lancamentosFiltrados.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="Nenhum lançamento encontrado"
                  subtitle="Registre contas a receber e a pagar para acompanhar o financeiro."
                  acao="Novo"
                  onAcao={() => setFormLancamento({})}
                />
              ) : (
                <>
                  <table className="w-full text-sm hidden md:table">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide border-b border-stone-200">
                        <th className="text-left px-5 py-3 font-medium">Descrição</th>
                        <th className="text-left px-5 py-3 font-medium">Tipo</th>
                        <th className="text-left px-5 py-3 font-medium">Cliente / Fornecedor</th>
                        <th className="text-left px-5 py-3 font-medium">Vencimento</th>
                        <th className="text-left px-5 py-3 font-medium">Valor</th>
                        <th className="text-left px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 w-28"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {lancamentosFiltrados.map((l) => {
                        const status = statusLancamento(l);
                        const contraparte = l.tipo === "receita" ? (clientesPorId[l.clienteId]?.nome || "—") : (l.contraparte || "—");
                        return (
                          <tr key={l.id} className="group hover:bg-stone-50/70 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-stone-800">{l.descricao}</td>
                            <td className="px-5 py-3.5"><TipoLancamentoChip tipo={l.tipo} /></td>
                            <td className="px-5 py-3.5 text-stone-600">{contraparte}</td>
                            <td className="px-5 py-3.5 text-stone-600 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5"><CalendarClock size={13} className="text-stone-400" />{formatarData(l.vencimento)}</span>
                            </td>
                            <td className="px-5 py-3.5 tabular-nums font-medium">
                              <span className={l.tipo === "receita" ? "text-emerald-700" : "text-stone-700"}>{moeda(l.valor)}</span>
                            </td>
                            <td className="px-5 py-3.5"><StatusChip status={status} /></td>
                            <td className="px-5 py-3.5">
                              <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => alternarPago(l)}
                                  className={cn(
                                    "w-7 h-7 rounded-md flex items-center justify-center border",
                                    l.pago ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-stone-400 hover:bg-white hover:text-emerald-700 hover:border-stone-200 border-transparent"
                                  )}
                                  aria-label="Marcar como pago"
                                  title={l.pago ? "Marcado como pago" : "Marcar como pago"}
                                >
                                  <Check size={14} />
                                </button>
                                <button onClick={() => setFormLancamento(l)} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-teal-800 hover:border hover:border-stone-200">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => setConfirmacao({ tipo: "lancamento", id: l.id, nome: l.descricao })} className="w-7 h-7 rounded-md flex items-center justify-center text-stone-400 hover:bg-white hover:text-red-600 hover:border hover:border-stone-200">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="divide-y divide-stone-100 md:hidden">
                    {lancamentosFiltrados.map((l) => {
                      const status = statusLancamento(l);
                      const contraparte = l.tipo === "receita" ? (clientesPorId[l.clienteId]?.nome || "—") : (l.contraparte || "—");
                      return (
                        <div key={l.id} className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <p className="font-medium text-stone-800 min-w-0">{l.descricao}</p>
                            <span className={cn("font-medium tabular-nums shrink-0", l.tipo === "receita" ? "text-emerald-700" : "text-stone-700")}>
                              {moeda(l.valor)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <TipoLancamentoChip tipo={l.tipo} />
                            <StatusChip status={status} />
                          </div>
                          <div className="flex items-center justify-between text-xs text-stone-500">
                            <span>{contraparte}</span>
                            <span className="inline-flex items-center gap-1"><CalendarClock size={12} />{formatarData(l.vencimento)}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => alternarPago(l)}
                              className={cn(
                                "flex-1 py-1.5 rounded-md text-xs font-medium border flex items-center justify-center gap-1",
                                l.pago ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-stone-600 border-stone-200"
                              )}
                            >
                              <Check size={13} /> {l.pago ? "Pago" : "Marcar como pago"}
                            </button>
                            <button onClick={() => setFormLancamento(l)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => setConfirmacao({ tipo: "lancamento", id: l.id, nome: l.descricao })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {aba === "fiscal" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Este módulo organiza a emissão fiscal, mas ainda não está integrado à SEFAZ. As notas geradas aqui são <strong>rascunhos sem validade fiscal</strong> — a emissão oficial exige certificado digital e um provedor de NF-e conectado a um backend.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: "0.75rem" }}>
                <KpiCard label="Vendas pendentes de nota" valor={vendasPendentesNota.length} icon={FileClock} tom="bg-amber-50 text-amber-700" />
                <KpiCard label="Rascunhos gerados" valor={notasFiscais.length} icon={FileCheck2} tom="bg-teal-50 text-teal-700" />
                <KpiCard
                  label="Integração"
                  valor={integracaoConfigurada ? "Configurada" : "Não configurada"}
                  icon={integracaoConfigurada ? ShieldCheck : ShieldAlert}
                  tom={integracaoConfigurada ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}
                />
              </div>

              <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-md">
                {[
                  { id: "pendentes", label: "Pendentes", icon: FileClock },
                  { id: "rascunhos", label: "Rascunhos", icon: FileCheck2 },
                  { id: "config", label: "Configurações", icon: Settings2 },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubFiscal(s.id)}
                    className={cn(
                      "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                      subFiscal === s.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                    )}
                  >
                    <s.icon size={14} /> {s.label}
                  </button>
                ))}
              </div>

              {subFiscal === "pendentes" && (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  {vendasPendentesNota.length === 0 ? (
                    <EmptyState icon={FileCheck2} title="Nenhuma venda pendente" subtitle="Todas as vendas já têm um rascunho de NF-e gerado." />
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {vendasPendentesNota.map((v) => {
                        const cliente = v.clienteId ? clientesPorId[v.clienteId] : null;
                        return (
                          <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                            <div className="min-w-0">
                              <p className="font-medium text-stone-800">Venda nº {v.numero}</p>
                              <p className="text-xs text-stone-400">{formatarData(v.data)} · {cliente ? cliente.nome : "Consumidor não identificado"}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-medium text-stone-700 tabular-nums">{moeda(v.total ?? totalVenda(v))}</span>
                              <button
                                onClick={() => gerarRascunhoNota(v)}
                                className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                              >
                                <FileCheck2 size={14} /> Gerar rascunho
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {subFiscal === "rascunhos" && (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  {notasComVenda.length === 0 ? (
                    <EmptyState icon={FileText} title="Nenhum rascunho gerado" subtitle="Gere rascunhos a partir das vendas pendentes na aba anterior." />
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {notasComVenda.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setNotaPreview(n)}
                          className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-stone-50/70 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-stone-800">NF-e nº {n.numero} · Série {n.serie}</p>
                            <p className="text-xs text-stone-400">Venda nº {n.venda?.numero} · gerada em {formatarData(n.dataGeracao)}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">
                              <FileClock size={12} /> Rascunho
                            </span>
                            <ChevronRight size={16} className="text-stone-300" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {subFiscal === "config" && (
                <ConfigFiscalForm inicial={empresaFiscal} onSalvar={salvarConfigFiscal} />
              )}
            </div>
          )}

          {aba === "entregas" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                {entregasFiltradas.length === 0 ? (
                  <EmptyState
                    icon={Truck}
                    title="Nenhuma entrega encontrada"
                    subtitle="Cadastre uma entrega vinculada a uma venda ou avulsa."
                    acao="Nova"
                    onAcao={() => setFormEntrega({})}
                  />
                ) : (
                  <div className="divide-y divide-stone-100">
                    {entregasFiltradas.map((e) => {
                      const cliente = e.clienteId ? clientesPorId[e.clienteId] : null;
                      const atrasada = (e.status === "pendente" || e.status === "em_rota") && e.dataPrevista < hojeISO();
                      return (
                        <div key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-medium text-stone-800">{cliente ? cliente.nome : "Cliente não identificado"}</p>
                              <StatusEntregaChip status={e.status} />
                              {atrasada && (
                                <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                                  <AlertTriangle size={11} /> Atrasada
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-500 flex items-start gap-1.5 mb-0.5">
                              <MapPin size={12} className="text-stone-400 shrink-0 mt-0.5" /> {e.endereco || "Endereço não informado"}
                            </p>
                            <p className="text-xs text-stone-400">{e.itensDescricao}</p>
                            <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-3 flex-wrap">
                              <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {formatarData(e.dataPrevista)}</span>
                              {e.motorista && <span className="inline-flex items-center gap-1"><UserRound size={11} /> {e.motorista}</span>}
                              {e.veiculo && <span className="inline-flex items-center gap-1"><Truck size={11} /> {e.veiculo}</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {(e.status === "pendente" || e.status === "em_rota") && (
                              <button
                                onClick={() => avancarStatusEntrega(e)}
                                className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                              >
                                {e.status === "pendente" ? <><Navigation size={13} /> Sair para entrega</> : <><PackageCheck size={13} /> Confirmar entrega</>}
                              </button>
                            )}
                            <button onClick={() => setFormEntrega(e)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                              <Pencil size={14} />
                            </button>
                            {e.status !== "cancelada" && e.status !== "entregue" && (
                              <button onClick={() => cancelarEntrega(e.id)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                                <PackageX size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {aba === "compras" && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {pedidosFiltrados.length === 0 ? (
                <EmptyState
                  icon={PackageOpen}
                  title="Nenhum pedido de compra encontrado"
                  subtitle="Registre um pedido ao fornecedor; quando a mercadoria chegar, transforme em compra num clique."
                  acao="Novo"
                  onAcao={() => setFormPedido({})}
                />
              ) : (
                <div className="divide-y divide-stone-100">
                  {pedidosFiltrados.map((p) => {
                    const fornecedor = fornecedoresPorId[p.fornecedorId];
                    const atrasado = p.status === "pendente" && p.dataPrevista < hojeISO();
                    return (
                      <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-medium text-stone-800">Pedido nº {p.numero} · {fornecedor ? fornecedor.nome : "Fornecedor removido"}</p>
                            <span className={cn(
                              "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                              p.status === "recebido" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            )}>
                              {p.status === "recebido" ? <PackageCheck size={11} /> : <PackageOpen size={11} />}
                              {p.status === "recebido" ? "Recebido" : "Pendente"}
                            </span>
                            {atrasado && (
                              <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                                <AlertTriangle size={11} /> Atrasado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400">
                            {p.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ")}
                          </p>
                          <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> Previsão: {formatarData(p.dataPrevista)}</span>
                            {p.dataRecebimento && <span className="inline-flex items-center gap-1"><PackageCheck size={11} /> Recebido: {formatarData(p.dataRecebimento)}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium text-stone-700 tabular-nums">{moeda(totalPedido(p))}</span>
                          {p.status === "pendente" && (
                            <button
                              onClick={() => registrarRecebimento(p)}
                              className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                            >
                              <PackageCheck size={13} /> Registrar recebimento
                            </button>
                          )}
                          {p.status === "pendente" && (
                            <button onClick={() => setFormPedido(p)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                              <Pencil size={14} />
                            </button>
                          )}
                          {p.status === "pendente" && (
                            <button onClick={() => setConfirmacao({ tipo: "pedido", id: p.id, nome: `Pedido nº ${p.numero}` })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {aba === "usuarios" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5">
                <Lock size={16} className="text-stone-400 shrink-0 mt-0.5" />
                <p className="text-sm text-stone-600">
                  Isso controla o que cada papel <strong>vê e pode editar dentro do sistema</strong>. Importante: essa é uma organização no nível da interface — a segurança de verdade (impedir alguém de burlar isso) só existe quando houver um backend validando cada ação. Use o seletor de sessão no rodapé do menu lateral pra testar como fica pra cada papel.
                </p>
              </div>

              <div className="flex gap-2 p-1 bg-stone-100 rounded-lg max-w-xs">
                {[
                  { id: "usuarios", label: "Usuários", icon: UserCog },
                  { id: "papeis", label: "Papéis", icon: Lock },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubUsuarios(s.id)}
                    className={cn(
                      "flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                      subUsuarios === s.id ? "bg-white text-teal-800 shadow-sm" : "text-stone-500"
                    )}
                  >
                    <s.icon size={14} /> {s.label}
                  </button>
                ))}
              </div>

              {subUsuarios === "usuarios" && (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="flex justify-end p-3 border-b border-stone-100">
                    <button
                      onClick={() => setFormUsuario({})}
                      className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus size={14} /> Novo usuário
                    </button>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {usuarios.map((u) => (
                      <div key={u.id} className="flex items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold flex items-center justify-center shrink-0">
                            {iniciais(u.nome)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-stone-800 truncate">{u.nome}</p>
                              {!u.ativo && (
                                <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Bloqueado</span>
                              )}
                              {u.id === usuarioLogadoId && (
                                <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">Sessão atual</span>
                              )}
                            </div>
                            <p className="text-xs text-stone-400 truncate">{u.email} · {papeisPorId[u.papelId]?.nome}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setFormUsuario(u)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                            <Pencil size={14} />
                          </button>
                          {u.id !== usuarioLogadoId && (
                            <button onClick={() => setConfirmacao({ tipo: "usuario", id: u.id, nome: u.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {subUsuarios === "papeis" && (
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                  <div className="flex justify-end p-3 border-b border-stone-100">
                    <button
                      onClick={() => setFormPapel({})}
                      className="flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus size={14} /> Novo papel
                    </button>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {papeis.map((p) => {
                      const emUso = usuarios.some((u) => u.papelId === p.id);
                      const nivelEditar = MODULOS_PERMISSAO.filter((m) => p.permissoes[m.id] === "editar").length;
                      const nivelVer = MODULOS_PERMISSAO.filter((m) => p.permissoes[m.id] === "visualizar").length;
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-stone-800">{p.nome}</p>
                              {p.fixo && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">Acesso total</span>}
                            </div>
                            <p className="text-xs text-stone-400">
                              {nivelEditar} {nivelEditar === 1 ? "módulo" : "módulos"} com edição · {nivelVer} só visualização
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {!p.fixo && (
                              <button onClick={() => setFormPapel(p)} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-teal-800">
                                <Pencil size={14} />
                              </button>
                            )}
                            {!p.fixo && !emUso && (
                              <button onClick={() => setConfirmacao({ tipo: "papel", id: p.id, nome: p.nome })} className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 border border-stone-200 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {formCliente !== null && (
        <ClienteForm inicial={formCliente} onSalvar={salvarCliente} onCancelar={() => setFormCliente(null)} />
      )}
      {formFornecedor !== null && (
        <FornecedorForm inicial={formFornecedor.id ? formFornecedor : null} onSalvar={salvarFornecedor} onCancelar={() => setFormFornecedor(null)} />
      )}
      {formPedido !== null && (
        <PedidoForm
          inicial={formPedido.id ? formPedido : null}
          fornecedores={fornecedores}
          produtos={produtos}
          onSalvar={salvarPedido}
          onCancelar={() => setFormPedido(null)}
        />
      )}
      {formUsuario !== null && (
        <UsuarioForm
          inicial={formUsuario.id ? formUsuario : null}
          papeis={papeis}
          onSalvar={salvarUsuario}
          onCancelar={() => setFormUsuario(null)}
        />
      )}
      {formPapel !== null && (
        <PapelForm
          inicial={formPapel.id ? formPapel : null}
          onSalvar={salvarPapel}
          onCancelar={() => setFormPapel(null)}
        />
      )}
      {formProduto !== null && (
        <ProdutoForm inicial={formProduto.id ? formProduto : null} fornecedores={fornecedores} onSalvar={salvarProduto} onCancelar={() => setFormProduto(null)} />
      )}
      {formMovimentacao !== null && (
        <MovimentacaoForm
          produtos={produtos}
          produtoInicial={formMovimentacao.produtoId ? produtosPorId[formMovimentacao.produtoId] : null}
          onSalvar={salvarMovimentacao}
          onCancelar={() => setFormMovimentacao(null)}
        />
      )}
      {formLancamento !== null && (
        <LancamentoForm
          inicial={formLancamento.id ? formLancamento : null}
          clientes={clientes}
          fornecedores={fornecedores}
          onSalvar={salvarLancamento}
          onCancelar={() => setFormLancamento(null)}
        />
      )}
      {confirmacao && (
        <ConfirmDialog
          titulo={
            confirmacao.tipo === "cliente" ? "Excluir cliente?" :
            confirmacao.tipo === "fornecedor" ? "Excluir fornecedor?" :
            confirmacao.tipo === "pedido" ? "Cancelar pedido?" :
            confirmacao.tipo === "usuario" ? "Excluir usuário?" :
            confirmacao.tipo === "papel" ? "Excluir papel?" :
            confirmacao.tipo === "produto" ? "Excluir produto?" :
            "Excluir lançamento?"
          }
          descricao={`"${confirmacao.nome}" será removido permanentemente. Essa ação não pode ser desfeita.`}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
      {cupomAtual && (
        <CupomModal
          venda={cupomAtual}
          cliente={cupomAtual.clienteId ? clientesPorId[cupomAtual.clienteId] : null}
          onNovaVenda={() => setCupomAtual(null)}
          onFechar={() => setCupomAtual(null)}
        />
      )}
      {notaPreview && (
        <NotaPreviewModal
          nota={notaPreview}
          cliente={notaPreview.venda?.clienteId ? clientesPorId[notaPreview.venda.clienteId] : null}
          empresaFiscal={empresaFiscal}
          onFechar={() => setNotaPreview(null)}
        />
      )}
      {formEntrega !== null && (
        <EntregaForm
          inicial={formEntrega.id ? formEntrega : null}
          vendas={vendas}
          clientes={clientes}
          clientesPorId={clientesPorId}
          onSalvar={salvarEntrega}
          onCancelar={() => setFormEntrega(null)}
        />
      )}
    </div>
  );
}
